-- M9 harden: progress milestone history retention (G1.1-08 / locked Example C).
-- Recalculate current progress from corrected eligible savings.
-- Do not remove historically announced milestones if progress later dips.
-- Do not re-announce duplicates on re-cross (same identity + original timestamp).
-- Privacy (G1.1-06-R1): opt-out hides others' milestone announcements; saver retains own history.
-- Streak awards / pause / reopen / ownership transfer remain OPEN — not invented.

-- ---------------------------------------------------------------------------
-- Persisted announcements (append-only for a given challenge/user/threshold)
-- ---------------------------------------------------------------------------
create table if not exists public.progress_milestone_announcements (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  membership_id uuid not null references public.challenge_memberships (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  milestone_percent int not null check (milestone_percent in (25, 50, 75, 100)),
  announced_at timestamptz not null,
  source_contribution_id uuid null references public.contributions (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id, milestone_percent)
);

create index if not exists progress_milestone_announcements_challenge_at_idx
  on public.progress_milestone_announcements (challenge_id, announced_at desc);

alter table public.progress_milestone_announcements enable row level security;

drop policy if exists progress_milestone_announcements_select_member
  on public.progress_milestone_announcements;
create policy progress_milestone_announcements_select_member
  on public.progress_milestone_announcements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.challenge_memberships m
      where m.challenge_id = progress_milestone_announcements.challenge_id
        and m.user_id = auth.uid()
        and m.status = 'approved'
    )
    and (
      progress_milestone_announcements.user_id = auth.uid()
      or exists (
        select 1
        from public.challenge_memberships owner_m
        where owner_m.challenge_id = progress_milestone_announcements.challenge_id
          and owner_m.user_id = progress_milestone_announcements.user_id
          and owner_m.status = 'approved'
          and owner_m.share_monetary_info is true
      )
    )
  );

revoke all on table public.progress_milestone_announcements from public;
grant select on table public.progress_milestone_announcements to authenticated;
grant all on table public.progress_milestone_announcements to service_role;

comment on table public.progress_milestone_announcements is
  'M9 G1.1-08 historical progress milestone announcements. Retained after correction dips; never duplicated on re-cross.';

-- ---------------------------------------------------------------------------
-- Sync: insert newly earned thresholds only (never delete)
-- ---------------------------------------------------------------------------
create or replace function public.sync_progress_milestone_announcements(
  p_challenge_id uuid,
  p_user_id uuid,
  p_at timestamptz default clock_timestamp(),
  p_source_contribution_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chal public.challenges%rowtype;
  v_mem public.challenge_memberships%rowtype;
  v_setup public.membership_savings_setup%rowtype;
  v_saved bigint;
  v_target bigint;
  v_miles int[];
  v_pct int;
  v_at timestamptz := coalesce(p_at, clock_timestamp());
begin
  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    return;
  end if;

  select * into v_mem
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = p_user_id and status = 'approved';
  if not found then
    return;
  end if;

  select * into v_setup from public.membership_savings_setup where membership_id = v_mem.id;
  if not found or coalesce(v_setup.target_minor, 0) <= 0 then
    return;
  end if;

  select coalesce(sum(c.amount_minor), 0)::bigint
  into v_saved
  from public.contributions c
  where c.challenge_id = p_challenge_id
    and c.user_id = p_user_id
    and c.status = 'active'
    and c.contribution_date >= v_chal.start_date
    and c.contribution_date <= v_chal.end_date;

  v_target := v_setup.target_minor;
  v_miles := public.milestones_reached(v_saved, v_target);
  if v_miles is null or cardinality(v_miles) = 0 then
    return;
  end if;

  foreach v_pct in array v_miles
  loop
    insert into public.progress_milestone_announcements (
      challenge_id, membership_id, user_id, milestone_percent,
      announced_at, source_contribution_id
    ) values (
      p_challenge_id, v_mem.id, p_user_id, v_pct,
      v_at, p_source_contribution_id
    )
    on conflict (challenge_id, user_id, milestone_percent) do nothing;
  end loop;
end;
$$;

revoke all on function public.sync_progress_milestone_announcements(uuid, uuid, timestamptz, uuid)
  from public;
grant execute on function public.sync_progress_milestone_announcements(uuid, uuid, timestamptz, uuid)
  to authenticated, service_role;

comment on function public.sync_progress_milestone_announcements(uuid, uuid, timestamptz, uuid) is
  'Insert newly earned 25/50/75/100% announcements only. Never removes history; never duplicates.';

-- ---------------------------------------------------------------------------
-- Backfill from current active contribution crossings (non-destructive)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  c_row record;
  v_chal public.challenges%rowtype;
  v_target bigint;
  v_prev bigint;
  v_running bigint;
  thr int;
begin
  for r in
    select distinct c.challenge_id, c.user_id, m.id as membership_id, s.target_minor
    from public.contributions c
    join public.challenge_memberships m
      on m.challenge_id = c.challenge_id and m.user_id = c.user_id and m.status = 'approved'
    join public.membership_savings_setup s on s.membership_id = m.id
    where c.status = 'active'
      and s.target_minor > 0
  loop
    select * into v_chal from public.challenges where id = r.challenge_id;
    if not found then
      continue;
    end if;
    v_target := r.target_minor;
    v_prev := 0;
    v_running := 0;
    for c_row in
      select c.updated_at, c.amount_minor
      from public.contributions c
      where c.challenge_id = r.challenge_id
        and c.user_id = r.user_id
        and c.status = 'active'
        and c.contribution_date >= v_chal.start_date
        and c.contribution_date <= v_chal.end_date
      order by c.contribution_date, c.updated_at, c.id
    loop
      v_running := v_running + c_row.amount_minor;
      foreach thr in array array[25, 50, 75, 100]
      loop
        if public.progress_percent(v_prev, v_target) is distinct from null
          and public.progress_percent(v_prev, v_target) < thr
          and public.progress_percent(v_running, v_target) >= thr
        then
          insert into public.progress_milestone_announcements (
            challenge_id, membership_id, user_id, milestone_percent, announced_at
          ) values (
            r.challenge_id, r.membership_id, r.user_id, thr, c_row.updated_at
          )
          on conflict (challenge_id, user_id, milestone_percent) do nothing;
        end if;
      end loop;
      v_prev := v_running;
    end loop;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hook sync into create / amend / reverse
-- ---------------------------------------------------------------------------
create or replace function public._record_contribution_internal(
  p_challenge_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_idempotency_key text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chal public.challenges%rowtype;
  v_mem public.challenge_memberships%rowtype;
  v_setup public.membership_savings_setup%rowtype;
  v_existing public.contributions%rowtype;
  v_row public.contributions%rowtype;
  v_local date;
  v_week date;
  v_totals jsonb;
  v_assess jsonb;
begin
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'AMOUNT_MUST_BE_POSITIVE';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  if v_chal.lifecycle_status in ('Completed', 'Cancelled') then
    raise exception 'CHALLENGE_READONLY';
  end if;
  if v_chal.lifecycle_status <> 'Active' then
    raise exception 'CHALLENGE_NOT_ACTIVE';
  end if;

  select * into v_mem
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = p_user_id;
  if not found or v_mem.status <> 'approved' then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;
  if not v_mem.savings_participation_active then
    raise exception 'SAVINGS_SETUP_REQUIRED';
  end if;

  select * into v_setup from public.membership_savings_setup where membership_id = v_mem.id;
  if not found then
    raise exception 'SAVINGS_SETUP_REQUIRED';
  end if;

  select * into v_existing
  from public.contributions
  where challenge_id = p_challenge_id
    and user_id = p_user_id
    and idempotency_key = trim(p_idempotency_key);
  if found then
    if auth.uid() is not null then
      v_totals := public.own_eligible_totals(p_challenge_id);
    else
      select
        jsonb_build_object(
          'eligible_total_minor', coalesce(sum(c.amount_minor), 0),
          'commitment_eligible_minor', coalesce(sum(case
            when c.week_start >= v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
          'pre_assessment_minor', coalesce(sum(case
            when c.week_start < v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
          'first_assessed_week_start', v_setup.first_assessed_week_start,
          'target_minor', v_setup.target_minor,
          'currency', v_chal.currency,
          'source_label', 'self-reported'
        )
      into v_totals
      from public.contributions c
      where c.challenge_id = p_challenge_id
        and c.user_id = p_user_id
        and c.status = 'active'
        and c.contribution_date >= v_chal.start_date
        and c.contribution_date <= v_chal.end_date;
    end if;
    perform public.sync_progress_milestone_announcements(
      p_challenge_id, p_user_id, coalesce(v_existing.updated_at, p_now), v_existing.id
    );
    v_assess := public.recompute_member_weekly_assessments_at(p_challenge_id, p_user_id, p_now);
    return jsonb_build_object(
      'contribution', to_jsonb(v_existing),
      'replayed', true,
      'totals', v_totals,
      'assessment', v_assess
    );
  end if;

  v_local := public.challenge_local_date(v_chal.time_zone, p_now);
  if v_local < v_chal.start_date or v_local > v_chal.end_date then
    raise exception 'OUT_OF_PERIOD';
  end if;

  v_week := public.week_start_monday(v_local);

  insert into public.contributions (
    challenge_id, membership_id, user_id,
    amount_minor, currency, contribution_date, week_start,
    status, source_label, idempotency_key, created_at, updated_at
  ) values (
    p_challenge_id, v_mem.id, p_user_id,
    p_amount_minor, v_chal.currency, v_local, v_week,
    'active', 'self-reported', trim(p_idempotency_key), p_now, p_now
  )
  returning * into v_row;

  insert into public.contribution_revisions (
    contribution_id, challenge_id, actor_user_id, action,
    from_amount_minor, to_amount_minor, from_status, to_status,
    contribution_date, week_start, idempotency_key, detail, at
  ) values (
    v_row.id, p_challenge_id, p_user_id, 'create',
    null, p_amount_minor, null, 'active',
    v_local, v_week, trim(p_idempotency_key),
    'Self-reported contribution recorded',
    p_now
  );

  if auth.uid() is not null then
    v_totals := public.own_eligible_totals(p_challenge_id);
  else
    select
      jsonb_build_object(
        'eligible_total_minor', coalesce(sum(c.amount_minor), 0),
        'commitment_eligible_minor', coalesce(sum(case
          when c.week_start >= v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
        'pre_assessment_minor', coalesce(sum(case
          when c.week_start < v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
        'first_assessed_week_start', v_setup.first_assessed_week_start,
        'target_minor', v_setup.target_minor,
        'currency', v_chal.currency,
        'source_label', 'self-reported'
      )
    into v_totals
    from public.contributions c
    where c.challenge_id = p_challenge_id
      and c.user_id = p_user_id
      and c.status = 'active'
      and c.contribution_date >= v_chal.start_date
      and c.contribution_date <= v_chal.end_date;
  end if;

  perform public.sync_progress_milestone_announcements(
    p_challenge_id, p_user_id, p_now, v_row.id
  );
  v_assess := public.recompute_member_weekly_assessments_at(p_challenge_id, p_user_id, p_now);

  return jsonb_build_object(
    'contribution', to_jsonb(v_row),
    'replayed', false,
    'totals', v_totals,
    'assessment', v_assess
  );
exception
  when unique_violation then
    select * into v_existing
    from public.contributions
    where challenge_id = p_challenge_id
      and user_id = p_user_id
      and idempotency_key = trim(p_idempotency_key);
    if not found then
      raise;
    end if;
    if auth.uid() is not null then
      v_totals := public.own_eligible_totals(p_challenge_id);
    else
      select * into v_setup
      from public.membership_savings_setup
      where membership_id = v_mem.id;
      select
        jsonb_build_object(
          'eligible_total_minor', coalesce(sum(c.amount_minor), 0),
          'commitment_eligible_minor', coalesce(sum(case
            when c.week_start >= v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
          'pre_assessment_minor', coalesce(sum(case
            when c.week_start < v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
          'first_assessed_week_start', v_setup.first_assessed_week_start,
          'target_minor', v_setup.target_minor,
          'currency', v_chal.currency,
          'source_label', 'self-reported'
        )
      into v_totals
      from public.contributions c
      where c.challenge_id = p_challenge_id
        and c.user_id = p_user_id
        and c.status = 'active'
        and c.contribution_date >= v_chal.start_date
        and c.contribution_date <= v_chal.end_date;
    end if;
    perform public.sync_progress_milestone_announcements(
      p_challenge_id, p_user_id, coalesce(v_existing.updated_at, p_now), v_existing.id
    );
    v_assess := public.recompute_member_weekly_assessments_at(p_challenge_id, p_user_id, p_now);
    return jsonb_build_object(
      'contribution', to_jsonb(v_existing),
      'replayed', true,
      'totals', v_totals,
      'assessment', v_assess
    );
end;
$$;

revoke all on function public._record_contribution_internal(uuid, uuid, bigint, text, timestamptz)
  from public;

create or replace function public.amend_contribution(
  p_contribution_id uuid,
  p_amount_minor bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_chal public.challenges%rowtype;
  v_row public.contributions%rowtype;
  v_from bigint;
  v_at timestamptz;
  v_totals jsonb;
  v_assess jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'AMOUNT_MUST_BE_POSITIVE';
  end if;

  select * into v_row
  from public.contributions
  where id = p_contribution_id
  for update;
  if not found then
    raise exception 'CONTRIBUTION_NOT_FOUND';
  end if;
  if v_row.user_id <> v_uid then
    raise exception 'CONTRIBUTION_FORBIDDEN';
  end if;
  if v_row.status <> 'active' then
    raise exception 'CONTRIBUTION_NOT_ACTIVE';
  end if;

  select * into v_chal from public.challenges where id = v_row.challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  if v_chal.lifecycle_status in ('Completed', 'Cancelled') then
    raise exception 'CHALLENGE_READONLY';
  end if;

  v_at := clock_timestamp();
  v_from := v_row.amount_minor;
  if v_from = p_amount_minor then
    v_totals := public.own_eligible_totals(v_row.challenge_id);
    perform public.sync_progress_milestone_announcements(
      v_row.challenge_id, v_uid, v_at, v_row.id
    );
    v_assess := public.recompute_member_weekly_assessments_at(v_row.challenge_id, v_uid, v_at);
    return jsonb_build_object(
      'contribution', to_jsonb(v_row),
      'unchanged', true,
      'totals', v_totals,
      'assessment', v_assess
    );
  end if;

  update public.contributions
  set amount_minor = p_amount_minor,
      updated_at = v_at
  where id = v_row.id
  returning * into v_row;

  insert into public.contribution_revisions (
    contribution_id, challenge_id, actor_user_id, action,
    from_amount_minor, to_amount_minor, from_status, to_status,
    contribution_date, week_start, detail, at
  ) values (
    v_row.id, v_row.challenge_id, v_uid, 'amend',
    v_from, p_amount_minor, 'active', 'active',
    v_row.contribution_date, v_row.week_start,
    'Self-reported contribution amended; original date and week preserved',
    v_at
  );

  v_totals := public.own_eligible_totals(v_row.challenge_id);
  -- Sync may insert newly crossed thresholds; never deletes dipped history.
  perform public.sync_progress_milestone_announcements(
    v_row.challenge_id, v_uid, v_at, v_row.id
  );
  v_assess := public.recompute_member_weekly_assessments_at(v_row.challenge_id, v_uid, v_at);

  return jsonb_build_object(
    'contribution', to_jsonb(v_row),
    'unchanged', false,
    'totals', v_totals,
    'assessment', v_assess
  );
end;
$$;

revoke all on function public.amend_contribution(uuid, bigint) from public;
grant execute on function public.amend_contribution(uuid, bigint) to authenticated;

create or replace function public.reverse_contribution(p_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_chal public.challenges%rowtype;
  v_row public.contributions%rowtype;
  v_from bigint;
  v_at timestamptz;
  v_totals jsonb;
  v_assess jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_row
  from public.contributions
  where id = p_contribution_id
  for update;
  if not found then
    raise exception 'CONTRIBUTION_NOT_FOUND';
  end if;
  if v_row.user_id <> v_uid then
    raise exception 'CONTRIBUTION_FORBIDDEN';
  end if;
  if v_row.status <> 'active' then
    raise exception 'CONTRIBUTION_NOT_ACTIVE';
  end if;

  select * into v_chal from public.challenges where id = v_row.challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  if v_chal.lifecycle_status in ('Completed', 'Cancelled') then
    raise exception 'CHALLENGE_READONLY';
  end if;

  v_at := clock_timestamp();
  v_from := v_row.amount_minor;

  update public.contributions
  set status = 'reversed',
      reversed_at = v_at,
      updated_at = v_at
  where id = v_row.id
  returning * into v_row;

  insert into public.contribution_revisions (
    contribution_id, challenge_id, actor_user_id, action,
    from_amount_minor, to_amount_minor, from_status, to_status,
    contribution_date, week_start, detail, at
  ) values (
    v_row.id, v_row.challenge_id, v_uid, 'reverse',
    v_from, v_from, 'active', 'reversed',
    v_row.contribution_date, v_row.week_start,
    'Self-reported contribution reversed; row retained for audit',
    v_at
  );

  v_totals := public.own_eligible_totals(v_row.challenge_id);
  -- Reverse may drop current progress below a threshold; history is retained.
  perform public.sync_progress_milestone_announcements(
    v_row.challenge_id, v_uid, v_at, v_row.id
  );
  v_assess := public.recompute_member_weekly_assessments_at(v_row.challenge_id, v_uid, v_at);

  return jsonb_build_object(
    'contribution', to_jsonb(v_row),
    'totals', v_totals,
    'assessment', v_assess
  );
end;
$$;

revoke all on function public.reverse_contribution(uuid) from public;
grant execute on function public.reverse_contribution(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Activity feed: milestones from retained announcements (not live crossings)
-- ---------------------------------------------------------------------------
create or replace function public.challenge_activity_feed(
  p_challenge_id uuid,
  p_limit int default 50,
  p_before timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_chal public.challenges%rowtype;
  v_viewer public.challenge_memberships%rowtype;
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
  v_events jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  -- Membership gate BEFORE any event projection / sort / page.
  select * into v_viewer
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = v_uid and status = 'approved';
  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  with
  join_events as (
    select
      ('join:' || m.id::text) as id,
      'member_joined'::text as kind,
      m.user_id,
      coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member') as display_name,
      coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member')
        || ' joined the challenge' as title,
      'Approved member'::text as meta,
      null::bigint as amount_minor,
      null::text as currency,
      null::int as milestone_percent,
      coalesce(m.decided_at, m.created_at) as at
    from public.challenge_memberships m
    join auth.users u on u.id = m.user_id
    where m.challenge_id = p_challenge_id
      and m.status = 'approved'
  ),
  contribution_events as (
    select
      ('contrib:' || c.id::text) as id,
      'contribution'::text as kind,
      c.user_id,
      coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member') as display_name,
      coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member')
        || ' recorded a self-reported contribution' as title,
      ('Self-reported · ' || c.contribution_date::text) as meta,
      c.amount_minor,
      v_chal.currency::text as currency,
      null::int as milestone_percent,
      c.updated_at as at
    from public.contributions c
    join public.challenge_memberships m
      on m.challenge_id = c.challenge_id and m.user_id = c.user_id and m.status = 'approved'
    join auth.users u on u.id = c.user_id
    where c.challenge_id = p_challenge_id
      and c.status = 'active'
      and (c.user_id = v_uid or m.share_monetary_info is true)
  ),
  commitment_events as (
    select
      ('commit:' || a.id::text) as id,
      'commitment_completed'::text as kind,
      a.user_id,
      coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member') as display_name,
      coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member')
        || ' completed weekly commitment' as title,
      ('Week of ' || a.week_start::text) as meta,
      null::bigint as amount_minor,
      null::text as currency,
      null::int as milestone_percent,
      a.computed_at as at
    from public.weekly_commitment_assessments a
    join public.challenge_memberships m
      on m.challenge_id = a.challenge_id and m.user_id = a.user_id and m.status = 'approved'
    join auth.users u on u.id = a.user_id
    where a.challenge_id = p_challenge_id
      and a.status = 'completed'
      and (a.user_id = v_uid or m.share_monetary_info is true)
  ),
  -- Retained progress milestones (G1.1-08). Privacy governs others' announcements.
  -- Streak awards remain OPEN — not emitted.
  milestone_events as (
    select
      ('mile:' || a.id::text) as id,
      'milestone_reached'::text as kind,
      a.user_id,
      coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member') as display_name,
      case a.milestone_percent
        when 25 then coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member')
          || ' reached 25% Quarter milestone'
        when 50 then coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member')
          || ' reached 50% Halfway milestone'
        when 75 then coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member')
          || ' reached 75% Three-quarters milestone'
        when 100 then coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member')
          || ' reached 100% Target milestone'
      end as title,
      'Personal progress milestone · G1.1-08'::text as meta,
      null::bigint as amount_minor,
      null::text as currency,
      a.milestone_percent as milestone_percent,
      a.announced_at as at
    from public.progress_milestone_announcements a
    join public.challenge_memberships m
      on m.challenge_id = a.challenge_id and m.user_id = a.user_id and m.status = 'approved'
    join auth.users u on u.id = a.user_id
    where a.challenge_id = p_challenge_id
      and (a.user_id = v_uid or m.share_monetary_info is true)
  ),
  completion_events as (
    select
      ('done:' || a.id::text) as id,
      'challenge_completed'::text as kind,
      coalesce(a.actor_user_id, v_chal.owner_user_id) as user_id,
      'Challenge'::text as display_name,
      'Challenge completed'::text as title,
      coalesce(a.reason, 'End date reached') as meta,
      null::bigint as amount_minor,
      null::text as currency,
      null::int as milestone_percent,
      a.at
    from public.challenge_lifecycle_audit a
    where a.challenge_id = p_challenge_id
      and a.to_status = 'Completed'
  ),
  all_events as (
    select * from join_events
    union all
    select * from contribution_events
    union all
    select * from commitment_events
    union all
    select * from milestone_events
    union all
    select * from completion_events
  ),
  filtered as (
    select *
    from all_events e
    where (p_before is null or e.at < p_before)
  ),
  page as (
    select *
    from filtered
    order by at desc, id desc
    limit v_limit
  )
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', p.id,
          'kind', p.kind,
          'user_id', p.user_id,
          'display_name', p.display_name,
          'title', p.title,
          'meta', p.meta,
          'amount_minor', p.amount_minor,
          'currency', p.currency,
          'milestone_percent', p.milestone_percent,
          'at', p.at
        )
      )
      order by p.at desc, p.id desc
    ),
    '[]'::jsonb
  )
  into v_events
  from page p;

  return jsonb_build_object(
    'events', coalesce(v_events, '[]'::jsonb),
    'limit', v_limit,
    'before', p_before,
    'generated_at', now(),
    'read_only', v_chal.lifecycle_status in ('Completed', 'Cancelled')
  );
end;
$$;

revoke all on function public.challenge_activity_feed(uuid, int, timestamptz) from public;
grant execute on function public.challenge_activity_feed(uuid, int, timestamptz) to authenticated;

comment on function public.challenge_activity_feed(uuid, int, timestamptz) is
  'M9 SOC-01 feed: membership + privacy before sort/paginate. Milestone history retained on correction dips; no duplicate re-announce. No streak awards.';
