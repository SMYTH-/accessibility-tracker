-- M6: personal dashboard + sharing-member totals (G1.1-06-R1)
-- Live sharers only; no historical aggregate endpoint; privacy fixtures for tests.
-- Stop before M7 privacy settings UX.

-- ---------------------------------------------------------------------------
-- Helpers: eligible saved for one membership (active, in-period)
-- ---------------------------------------------------------------------------
create or replace function public.member_eligible_saved_minor(
  p_challenge_id uuid,
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(c.amount_minor), 0)::bigint
  from public.contributions c
  where c.challenge_id = p_challenge_id
    and c.user_id = p_user_id
    and c.status = 'active'
    and c.contribution_date >= p_start_date
    and c.contribution_date <= p_end_date;
$$;

revoke all on function public.member_eligible_saved_minor(uuid, uuid, date, date) from public;
grant execute on function public.member_eligible_saved_minor(uuid, uuid, date, date) to authenticated, service_role;

create or replace function public.progress_percent(p_saved bigint, p_target bigint)
returns int
language sql
immutable
as $$
  select case
    when p_target is null or p_target <= 0 then null
    else least(100, floor((p_saved::numeric * 100) / p_target::numeric)::int)
  end;
$$;

revoke all on function public.progress_percent(bigint, bigint) from public;
grant execute on function public.progress_percent(bigint, bigint) to authenticated, service_role;

create or replace function public.milestones_reached(p_saved bigint, p_target bigint)
returns int[]
language plpgsql
immutable
as $$
declare
  v_pct int;
  v_out int[] := array[]::int[];
begin
  v_pct := public.progress_percent(p_saved, p_target);
  if v_pct is null then
    return v_out;
  end if;
  if v_pct >= 25 then v_out := array_append(v_out, 25); end if;
  if v_pct >= 50 then v_out := array_append(v_out, 50); end if;
  if v_pct >= 75 then v_out := array_append(v_out, 75); end if;
  if v_pct >= 100 then v_out := array_append(v_out, 100); end if;
  return v_out;
end;
$$;

revoke all on function public.milestones_reached(bigint, bigint) from public;
grant execute on function public.milestones_reached(bigint, bigint) to authenticated, service_role;

create or replace function public.milestone_recognition_label(p_milestones int[])
returns text
language plpgsql
immutable
as $$
declare
  v_hi int;
begin
  if p_milestones is null or cardinality(p_milestones) = 0 then
    return null;
  end if;
  v_hi := p_milestones[cardinality(p_milestones)];
  if v_hi = 25 then return '25% Quarter milestone · reached'; end if;
  if v_hi = 50 then return '50% Halfway milestone · reached'; end if;
  if v_hi = 75 then return '75% Three-quarters milestone · reached'; end if;
  if v_hi = 100 then return '100% Target milestone · reached'; end if;
  return null;
end;
$$;

revoke all on function public.milestone_recognition_label(int[]) from public;
grant execute on function public.milestone_recognition_label(int[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Sharing-member totals (G1.1-06-R1): current approved sharers only at read time
-- ---------------------------------------------------------------------------
create or replace function public.sharing_member_totals(p_challenge_id uuid)
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
  v_saved bigint := 0;
  v_target bigint := 0;
  v_sharers int := 0;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  select * into v_viewer
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = v_uid and status = 'approved';
  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  select
    coalesce(sum(public.member_eligible_saved_minor(
      m.challenge_id, m.user_id, v_chal.start_date, v_chal.end_date
    )), 0),
    coalesce(sum(s.target_minor), 0),
    count(*)::int
  into v_saved, v_target, v_sharers
  from public.challenge_memberships m
  left join public.membership_savings_setup s on s.membership_id = m.id
  where m.challenge_id = p_challenge_id
    and m.status = 'approved'
    and m.share_monetary_info is true
    and s.membership_id is not null;

  return jsonb_build_object(
    'saved_minor', v_saved,
    'target_minor', v_target,
    'progress_percent', public.progress_percent(v_saved, nullif(v_target, 0)),
    'sharer_count', v_sharers,
    'currency', v_chal.currency,
    'label', 'Sharing members only',
    'scope_explanation',
      'Excludes members who opted out of sharing monetary information. Not a full-group total.',
    'source_label', 'self-reported',
    'generated_at', now()
  );
end;
$$;

revoke all on function public.sharing_member_totals(uuid) from public;
grant execute on function public.sharing_member_totals(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Privacy-safe roster projection (omit monetary keys for opted-out others)
-- ---------------------------------------------------------------------------
create or replace function public.challenge_roster_projection(p_challenge_id uuid)
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
  v_members jsonb := '[]'::jsonb;
  r record;
  v_saved bigint;
  v_target bigint;
  v_row jsonb;
  v_is_self boolean;
  v_show_money boolean;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  select * into v_viewer
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = v_uid and status = 'approved';
  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  for r in
    select
      m.id as membership_id,
      m.user_id,
      m.role,
      m.status,
      m.share_monetary_info,
      m.savings_participation_active,
      coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member') as display_name,
      s.target_minor,
      s.weekly_commitment_minor
    from public.challenge_memberships m
    join auth.users u on u.id = m.user_id
    left join public.membership_savings_setup s on s.membership_id = m.id
    where m.challenge_id = p_challenge_id
      and m.status = 'approved'
    order by m.created_at asc
  loop
    v_is_self := (r.user_id = v_uid);
    v_show_money := v_is_self or r.share_monetary_info is true;

    v_row := jsonb_build_object(
      'membership_id', r.membership_id,
      'user_id', r.user_id,
      'display_name', r.display_name,
      'role', r.role,
      'status', r.status,
      'share_monetary_info', r.share_monetary_info,
      'savings_participation_active', r.savings_participation_active,
      'is_self', v_is_self,
      'privacy_chip', case when not v_show_money then 'Private' else null end
    );

    if v_show_money then
      v_saved := public.member_eligible_saved_minor(
        p_challenge_id, r.user_id, v_chal.start_date, v_chal.end_date
      );
      v_target := r.target_minor;
      v_row := v_row || jsonb_build_object(
        'eligible_total_minor', v_saved,
        'target_minor', v_target,
        'progress_percent', public.progress_percent(v_saved, v_target),
        'weekly_commitment_minor', r.weekly_commitment_minor,
        'currency', v_chal.currency,
        'source_label', 'self-reported'
      );
    end if;
    -- Opted-out others: monetary keys intentionally absent (not zero).

    v_members := v_members || jsonb_build_array(v_row);
  end loop;

  return jsonb_build_object(
    'members', v_members,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.challenge_roster_projection(uuid) from public;
grant execute on function public.challenge_roster_projection(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Activity preview (privacy-filtered; full feed is M9)
-- ---------------------------------------------------------------------------
create or replace function public.challenge_activity_preview(p_challenge_id uuid)
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
  v_events jsonb := '[]'::jsonb;
  r record;
  v_is_self boolean;
  v_show_money boolean;
  v_title text;
  v_meta text;
  v_event jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  select * into v_viewer
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = v_uid and status = 'approved';
  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  for r in
    select
      c.id,
      c.user_id,
      c.amount_minor,
      c.status,
      c.contribution_date,
      c.updated_at,
      m.share_monetary_info,
      coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member') as display_name
    from public.contributions c
    join public.challenge_memberships m
      on m.challenge_id = c.challenge_id and m.user_id = c.user_id and m.status = 'approved'
    join auth.users u on u.id = c.user_id
    where c.challenge_id = p_challenge_id
      and c.status = 'active'
    order by c.updated_at desc
    limit 8
  loop
    v_is_self := (r.user_id = v_uid);
    v_show_money := v_is_self or r.share_monetary_info is true;

    if v_show_money then
      v_title := r.display_name || ' recorded a self-reported contribution';
      v_meta := 'Self-reported · ' || r.contribution_date;
      v_event := jsonb_build_object(
        'id', r.id,
        'kind', 'contribution',
        'user_id', r.user_id,
        'display_name', r.display_name,
        'title', v_title,
        'meta', v_meta,
        'amount_minor', r.amount_minor,
        'currency', v_chal.currency,
        'at', r.updated_at
      );
    else
      -- No amount — Private chip only (G1.1-06)
      v_event := jsonb_build_object(
        'id', r.id,
        'kind', 'private_contribution',
        'user_id', r.user_id,
        'display_name', r.display_name,
        'title', r.display_name || ' · Private',
        'meta', 'Amounts and target hidden',
        'at', r.updated_at
      );
    end if;

    v_events := v_events || jsonb_build_array(v_event);
  end loop;

  return jsonb_build_object(
    'events', v_events,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.challenge_activity_preview(uuid) from public;
grant execute on function public.challenge_activity_preview(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Combined challenge dashboard for approved members
-- ---------------------------------------------------------------------------
create or replace function public.challenge_dashboard(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
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
    -- M8 owns streak calculation; label locked for mid-fi copy.
    'streak_weeks', null,
    'streak_label', 'Your streak',
    'streak_status', 'deferred_to_m8',
    'weekly_assessment_status', 'deferred_to_m8'
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

-- Explicitly no historical sharing-total series API (G1.1-06-R1 §4.3.5).
-- Do not create sharing_member_totals_history or similar.

-- ---------------------------------------------------------------------------
-- Test fixtures (service_role only) — full privacy settings journey is M7
-- ---------------------------------------------------------------------------
create or replace function public.set_share_monetary_info_for_tests(
  p_challenge_id uuid,
  p_user_id uuid,
  p_share boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mem public.challenge_memberships%rowtype;
begin
  if p_share is null then
    raise exception 'SHARE_FLAG_REQUIRED';
  end if;

  update public.challenge_memberships
  set share_monetary_info = p_share, updated_at = now()
  where challenge_id = p_challenge_id
    and user_id = p_user_id
    and status = 'approved'
  returning * into v_mem;

  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  return jsonb_build_object(
    'membership_id', v_mem.id,
    'user_id', v_mem.user_id,
    'challenge_id', v_mem.challenge_id,
    'share_monetary_info', v_mem.share_monetary_info,
    'updated_at', v_mem.updated_at
  );
end;
$$;

revoke all on function public.set_share_monetary_info_for_tests(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_share_monetary_info_for_tests(uuid, uuid, boolean)
  to service_role;

create or replace function public.fixture_approved_member_for_tests(
  p_challenge_id uuid,
  p_user_id uuid,
  p_share_monetary_info boolean default true,
  p_role text default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chal public.challenges%rowtype;
  v_mem public.challenge_memberships%rowtype;
  v_role public.membership_role;
begin
  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  v_role := case when p_role = 'owner' then 'owner'::public.membership_role
    else 'member'::public.membership_role end;

  insert into public.challenge_memberships (
    challenge_id, user_id, role, status,
    savings_participation_active, share_monetary_info,
    privacy_disclosure_acked_at, requested_at, decided_at
  ) values (
    p_challenge_id, p_user_id, v_role, 'approved',
    false, coalesce(p_share_monetary_info, true),
    now(), now(), now()
  )
  on conflict (challenge_id, user_id) do update
    set status = 'approved',
        share_monetary_info = coalesce(p_share_monetary_info, public.challenge_memberships.share_monetary_info),
        decided_at = coalesce(public.challenge_memberships.decided_at, now()),
        updated_at = now()
  returning * into v_mem;

  return jsonb_build_object(
    'membership_id', v_mem.id,
    'user_id', v_mem.user_id,
    'challenge_id', v_mem.challenge_id,
    'status', v_mem.status,
    'share_monetary_info', v_mem.share_monetary_info,
    'role', v_mem.role
  );
end;
$$;

revoke all on function public.fixture_approved_member_for_tests(uuid, uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.fixture_approved_member_for_tests(uuid, uuid, boolean, text)
  to service_role;

create or replace function public.fixture_membership_status_for_tests(
  p_challenge_id uuid,
  p_user_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mem public.challenge_memberships%rowtype;
  v_status public.membership_status;
begin
  v_status := p_status::public.membership_status;

  update public.challenge_memberships
  set status = v_status, updated_at = now()
  where challenge_id = p_challenge_id and user_id = p_user_id
  returning * into v_mem;

  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  return jsonb_build_object(
    'membership_id', v_mem.id,
    'user_id', v_mem.user_id,
    'status', v_mem.status
  );
end;
$$;

revoke all on function public.fixture_membership_status_for_tests(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.fixture_membership_status_for_tests(uuid, uuid, text)
  to service_role;
