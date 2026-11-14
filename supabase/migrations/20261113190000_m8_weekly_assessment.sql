-- M8: weekly commitment assessment, personal streak, recovery (stop before M9)
-- Specs: GAME-01, G1.1-03/05/09/11, approved contribution timing (§3).
-- Pause scheduling / duration / resume remain OPEN — status enum includes paused only.
-- Streak milestone awards (3/6/12) remain OPEN — streak count only.

-- ---------------------------------------------------------------------------
-- Persisted weekly assessments (own-row; safe to recompute / upsert)
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_commitment_assessments (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  membership_id uuid not null references public.challenge_memberships (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  status text not null check (status in ('completed', 'missed', 'in_progress', 'paused')),
  eligible_sum_minor bigint not null default 0 check (eligible_sum_minor >= 0),
  commitment_minor bigint not null check (commitment_minor > 0),
  week_closed boolean not null,
  computed_at timestamptz not null default now(),
  constraint weekly_commitment_assessments_unique unique (membership_id, week_start)
);

create index if not exists weekly_commitment_assessments_user_idx
  on public.weekly_commitment_assessments (challenge_id, user_id, week_start);

create table if not exists public.weekly_assessment_audit (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  membership_id uuid not null references public.challenge_memberships (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  from_status text null,
  to_status text null,
  from_eligible_sum_minor bigint null,
  to_eligible_sum_minor bigint null,
  from_commitment_minor bigint null,
  to_commitment_minor bigint null,
  detail text not null default '',
  at timestamptz not null default now()
);

create index if not exists weekly_assessment_audit_member_idx
  on public.weekly_assessment_audit (membership_id, week_start, at);

alter table public.weekly_commitment_assessments enable row level security;
alter table public.weekly_assessment_audit enable row level security;

revoke insert, update, delete on public.weekly_commitment_assessments from authenticated, anon;
revoke insert, update, delete on public.weekly_assessment_audit from authenticated, anon;

drop policy if exists weekly_assessments_select_own on public.weekly_commitment_assessments;
create policy weekly_assessments_select_own
  on public.weekly_commitment_assessments
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists weekly_assessment_audit_select_own on public.weekly_assessment_audit;
create policy weekly_assessment_audit_select_own
  on public.weekly_assessment_audit
  for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Pure: assess one week (open week never Missed)
-- ---------------------------------------------------------------------------
create or replace function public.assess_week_status(
  p_eligible_sum_minor bigint,
  p_commitment_minor bigint,
  p_week_start date,
  p_current_week_start date,
  p_is_paused boolean default false
)
returns text
language plpgsql
immutable
as $$
begin
  if p_is_paused then
    return 'paused';
  end if;
  if p_eligible_sum_minor >= p_commitment_minor then
    return 'completed';
  end if;
  if p_week_start < p_current_week_start then
    return 'missed';
  end if;
  return 'in_progress';
end;
$$;

revoke all on function public.assess_week_status(bigint, bigint, date, date, boolean) from public;
grant execute on function public.assess_week_status(bigint, bigint, date, date, boolean)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Recompute assessments for one member (deterministic; safe to rerun)
-- ---------------------------------------------------------------------------
create or replace function public.recompute_member_weekly_assessments_at(
  p_challenge_id uuid,
  p_user_id uuid,
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
  v_local date;
  v_current_week date;
  v_end_week date;
  v_week date;
  v_eligible bigint;
  v_status text;
  v_closed boolean;
  v_existing public.weekly_commitment_assessments%rowtype;
  v_streak int := 0;
  v_history jsonb := '[]'::jsonb;
  v_row record;
  v_current_status text := 'inactive';
  v_current_eligible bigint := 0;
begin
  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  select * into v_mem
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = p_user_id;
  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  -- Savings-inactive: never Completed or Missed — clear any stale rows.
  if not v_mem.savings_participation_active or v_mem.status <> 'approved' then
    delete from public.weekly_commitment_assessments
    where membership_id = v_mem.id;
    return jsonb_build_object(
      'savings_participation_active', false,
      'streak_weeks', 0,
      'streak_label', 'Your streak',
      'streak_status', 'inactive',
      'weekly_assessment_status', 'inactive',
      'current_week_start', null,
      'current_week_eligible_minor', 0,
      'weekly_commitment_minor', null,
      'first_assessed_week_start', null,
      'history', '[]'::jsonb,
      'recomputed_at', p_now
    );
  end if;

  select * into v_setup from public.membership_savings_setup where membership_id = v_mem.id;
  if not found then
    delete from public.weekly_commitment_assessments where membership_id = v_mem.id;
    return jsonb_build_object(
      'savings_participation_active', false,
      'streak_weeks', 0,
      'streak_label', 'Your streak',
      'streak_status', 'inactive',
      'weekly_assessment_status', 'inactive',
      'current_week_start', null,
      'current_week_eligible_minor', 0,
      'weekly_commitment_minor', null,
      'first_assessed_week_start', null,
      'history', '[]'::jsonb,
      'recomputed_at', p_now
    );
  end if;

  v_local := public.challenge_local_date(v_chal.time_zone, p_now);
  v_current_week := public.week_start_monday(v_local);
  v_end_week := public.week_start_monday(v_chal.end_date);

  -- Pre-assessment window: before first assessed Monday — no Completed/Missed weeks.
  if v_current_week < v_setup.first_assessed_week_start then
    delete from public.weekly_commitment_assessments
    where membership_id = v_mem.id;
    return jsonb_build_object(
      'savings_participation_active', true,
      'streak_weeks', 0,
      'streak_label', 'Your streak',
      'streak_status', 'none',
      'weekly_assessment_status', 'pre_assessment',
      'current_week_start', v_current_week,
      'current_week_eligible_minor', 0,
      'weekly_commitment_minor', v_setup.weekly_commitment_minor,
      'first_assessed_week_start', v_setup.first_assessed_week_start,
      'history', '[]'::jsonb,
      'recomputed_at', p_now
    );
  end if;

  v_week := v_setup.first_assessed_week_start;
  while v_week <= v_current_week and v_week <= v_end_week loop
    select coalesce(sum(c.amount_minor), 0) into v_eligible
    from public.contributions c
    where c.challenge_id = p_challenge_id
      and c.user_id = p_user_id
      and c.status = 'active'
      and c.week_start = v_week
      and c.contribution_date >= v_chal.start_date
      and c.contribution_date <= v_chal.end_date;

    -- Pause scheduling OPEN: no pause rows invented. Status 'paused' reserved only.
    v_status := public.assess_week_status(
      v_eligible,
      v_setup.weekly_commitment_minor,
      v_week,
      v_current_week,
      false
    );
    v_closed := v_week < v_current_week;

    select * into v_existing
    from public.weekly_commitment_assessments
    where membership_id = v_mem.id and week_start = v_week;

    if found then
      if v_existing.status is distinct from v_status
         or v_existing.eligible_sum_minor is distinct from v_eligible
         or v_existing.commitment_minor is distinct from v_setup.weekly_commitment_minor
         or v_existing.week_closed is distinct from v_closed then
        insert into public.weekly_assessment_audit (
          challenge_id, membership_id, user_id, week_start,
          from_status, to_status,
          from_eligible_sum_minor, to_eligible_sum_minor,
          from_commitment_minor, to_commitment_minor,
          detail, at
        ) values (
          p_challenge_id, v_mem.id, p_user_id, v_week,
          v_existing.status, v_status,
          v_existing.eligible_sum_minor, v_eligible,
          v_existing.commitment_minor, v_setup.weekly_commitment_minor,
          'Recompute after eligible contributions / week boundary',
          p_now
        );
      end if;
      update public.weekly_commitment_assessments
      set status = v_status,
          eligible_sum_minor = v_eligible,
          commitment_minor = v_setup.weekly_commitment_minor,
          week_closed = v_closed,
          computed_at = p_now
      where id = v_existing.id;
    else
      insert into public.weekly_commitment_assessments (
        challenge_id, membership_id, user_id, week_start,
        status, eligible_sum_minor, commitment_minor, week_closed, computed_at
      ) values (
        p_challenge_id, v_mem.id, p_user_id, v_week,
        v_status, v_eligible, v_setup.weekly_commitment_minor, v_closed, p_now
      );
      insert into public.weekly_assessment_audit (
        challenge_id, membership_id, user_id, week_start,
        from_status, to_status,
        from_eligible_sum_minor, to_eligible_sum_minor,
        from_commitment_minor, to_commitment_minor,
        detail, at
      ) values (
        p_challenge_id, v_mem.id, p_user_id, v_week,
        null, v_status,
        null, v_eligible,
        null, v_setup.weekly_commitment_minor,
        'Initial week assessment',
        p_now
      );
    end if;

    v_week := v_week + 7;
  end loop;

  -- Drop any rows outside assessed range (should not happen; keep history tidy).
  delete from public.weekly_commitment_assessments
  where membership_id = v_mem.id
    and (
      week_start < v_setup.first_assessed_week_start
      or week_start > v_current_week
      or week_start > v_end_week
    );

  -- Personal streak: consecutive Completed weeks looking back.
  -- in_progress / paused skip without counting; missed breaks (G1.1-09).
  for v_row in
    select status
    from public.weekly_commitment_assessments
    where membership_id = v_mem.id
    order by week_start desc
  loop
    if v_row.status = 'completed' then
      v_streak := v_streak + 1;
    elsif v_row.status in ('in_progress', 'paused') then
      continue;
    else
      -- missed
      exit;
    end if;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.week_start desc), '[]'::jsonb)
  into v_history
  from public.weekly_commitment_assessments a
  where a.membership_id = v_mem.id;

  select status, eligible_sum_minor
  into v_current_status, v_current_eligible
  from public.weekly_commitment_assessments
  where membership_id = v_mem.id and week_start = v_current_week;

  if not found then
    v_current_status := 'pre_assessment';
    v_current_eligible := 0;
  end if;

  return jsonb_build_object(
    'savings_participation_active', true,
    'streak_weeks', v_streak,
    'streak_label', 'Your streak',
    'streak_status', case
      when v_streak > 0 then 'active'
      when exists (
        select 1 from public.weekly_commitment_assessments
        where membership_id = v_mem.id and status = 'missed'
      ) then 'recovering'
      else 'none'
    end,
    'weekly_assessment_status', v_current_status,
    'current_week_start', v_current_week,
    'current_week_eligible_minor', coalesce(v_current_eligible, 0),
    'weekly_commitment_minor', v_setup.weekly_commitment_minor,
    'first_assessed_week_start', v_setup.first_assessed_week_start,
    'history', v_history,
    'recomputed_at', p_now
  );
end;
$$;

revoke all on function public.recompute_member_weekly_assessments_at(uuid, uuid, timestamptz)
  from public;
grant execute on function public.recompute_member_weekly_assessments_at(uuid, uuid, timestamptz)
  to service_role;

create or replace function public.recompute_own_weekly_assessments(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  return public.recompute_member_weekly_assessments_at(p_challenge_id, v_uid, now());
end;
$$;

revoke all on function public.recompute_own_weekly_assessments(uuid) from public;
grant execute on function public.recompute_own_weekly_assessments(uuid) to authenticated;

-- Own-view summary (recomputes first; commitment + assessment details for self only)
create or replace function public.own_weekly_assessment_summary(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  return public.recompute_member_weekly_assessments_at(p_challenge_id, v_uid, now());
end;
$$;

revoke all on function public.own_weekly_assessment_summary(uuid) from public;
grant execute on function public.own_weekly_assessment_summary(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Patch challenge_dashboard: real streak + current week assessment (own view)
-- ---------------------------------------------------------------------------
create or replace function public.challenge_dashboard(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_chal public.challenges%rowtype;
  v_mem public.challenge_memberships%rowtype;
  v_setup public.membership_savings_setup%rowtype;
  v_totals jsonb;
  v_sharing jsonb;
  v_roster jsonb;
  v_activity jsonb;
  v_assess jsonb;
  v_saved bigint;
  v_target bigint;
  v_pct int;
  v_miles int[];
  v_personal jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  select * into v_mem
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = v_uid and status = 'approved';
  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  select * into v_setup from public.membership_savings_setup where membership_id = v_mem.id;

  v_totals := public.own_eligible_totals(p_challenge_id);
  v_saved := coalesce((v_totals->>'eligible_total_minor')::bigint, 0);
  v_target := case
    when v_totals ? 'target_minor' and v_totals->>'target_minor' is not null
      then (v_totals->>'target_minor')::bigint
    else null
  end;
  v_pct := public.progress_percent(v_saved, v_target);
  v_miles := public.milestones_reached(v_saved, v_target);

  v_assess := public.recompute_member_weekly_assessments_at(p_challenge_id, v_uid, now());

  v_personal := jsonb_build_object(
    'eligible_total_minor', v_saved,
    'commitment_eligible_minor', coalesce((v_totals->>'commitment_eligible_minor')::bigint, 0),
    'pre_assessment_minor', coalesce((v_totals->>'pre_assessment_minor')::bigint, 0),
    'target_minor', v_target,
    'weekly_commitment_minor', v_setup.weekly_commitment_minor,
    'current_progress_percent', v_pct,
    'milestones_reached', to_jsonb(v_miles),
    'highest_milestone_reached', case
      when cardinality(v_miles) > 0 then v_miles[cardinality(v_miles)]
      else null
    end,
    'milestone_recognition_label', public.milestone_recognition_label(v_miles),
    'source_label', 'self-reported',
    'currency', v_chal.currency,
    'savings_participation_active', v_mem.savings_participation_active,
    'share_monetary_info', v_mem.share_monetary_info,
    'first_assessed_week_start', v_setup.first_assessed_week_start,
    'streak_weeks', coalesce((v_assess->>'streak_weeks')::int, 0),
    'streak_label', 'Your streak',
    'streak_status', coalesce(v_assess->>'streak_status', 'inactive'),
    'weekly_assessment_status', coalesce(v_assess->>'weekly_assessment_status', 'inactive'),
    'current_week_start', v_assess->>'current_week_start',
    'current_week_eligible_minor', coalesce((v_assess->>'current_week_eligible_minor')::bigint, 0),
    'assessment_history', coalesce(v_assess->'history', '[]'::jsonb)
  );

  v_sharing := public.sharing_member_totals(p_challenge_id);
  v_roster := public.challenge_roster_projection(p_challenge_id);
  v_activity := public.challenge_activity_preview(p_challenge_id);

  return jsonb_build_object(
    'challenge_id', v_chal.id,
    'challenge_name', v_chal.name,
    'lifecycle_status', v_chal.lifecycle_status,
    'start_date', v_chal.start_date,
    'end_date', v_chal.end_date,
    'currency', v_chal.currency,
    'time_zone', v_chal.time_zone,
    'personal', v_personal,
    'sharing', v_sharing,
    'roster', v_roster->'members',
    'activity_preview', v_activity->'events',
    'generated_at', now()
  );
end;
$$;

revoke all on function public.challenge_dashboard(uuid) from public;
grant execute on function public.challenge_dashboard(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Hook recompute into contribution mutations (amend / reverse / create)
-- ---------------------------------------------------------------------------
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

-- Recompute after ordinary create (internal helper)
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
