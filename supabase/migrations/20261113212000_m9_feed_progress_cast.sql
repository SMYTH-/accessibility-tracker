-- M9: cast activity-feed running totals to bigint for progress_percent(bigint, bigint).
-- Window sum() yields numeric; without cast PostgREST/PG cannot resolve the function.

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
  -- Joins: approved participants (no financial payload).
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
  -- Contributions: privacy filter BEFORE later union/order/limit.
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
  -- Weekly commitment completions: no commitment figures in shared feed.
  -- Private others excluded before sort (G1.1-06; own commitment history stays personal).
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
  -- Progress milestones 25/50/75/100% (G1.1-08). Privacy governs others' milestone activity.
  -- Streak awards remain OPEN — not emitted.
  contrib_running as (
    select
      c.id as contribution_id,
      c.user_id,
      c.updated_at,
      c.contribution_date,
      m.share_monetary_info,
      s.target_minor,
      coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member') as display_name,
      (sum(c.amount_minor) over (
        partition by c.user_id
        order by c.contribution_date, c.updated_at, c.id
        rows between unbounded preceding and current row
      ))::bigint as running_saved,
      (coalesce(
        sum(c.amount_minor) over (
          partition by c.user_id
          order by c.contribution_date, c.updated_at, c.id
          rows between unbounded preceding and 1 preceding
        ),
        0
      ))::bigint as prev_saved
    from public.contributions c
    join public.challenge_memberships m
      on m.challenge_id = c.challenge_id and m.user_id = c.user_id and m.status = 'approved'
    join public.membership_savings_setup s on s.membership_id = m.id
    join auth.users u on u.id = c.user_id
    where c.challenge_id = p_challenge_id
      and c.status = 'active'
      and c.contribution_date >= v_chal.start_date
      and c.contribution_date <= v_chal.end_date
      and s.target_minor > 0
      and (c.user_id = v_uid or m.share_monetary_info is true)
  ),
  milestone_events as (
    select
      ('mile:' || cr.contribution_id::text || ':' || thr.pct::text) as id,
      'milestone_reached'::text as kind,
      cr.user_id,
      cr.display_name,
      case thr.pct
        when 25 then cr.display_name || ' reached 25% Quarter milestone'
        when 50 then cr.display_name || ' reached 50% Halfway milestone'
        when 75 then cr.display_name || ' reached 75% Three-quarters milestone'
        when 100 then cr.display_name || ' reached 100% Target milestone'
      end as title,
      'Personal progress milestone · G1.1-08'::text as meta,
      null::bigint as amount_minor,
      null::text as currency,
      thr.pct as milestone_percent,
      cr.updated_at as at
    from contrib_running cr
    cross join lateral (
      values (25), (50), (75), (100)
    ) as thr(pct)
    where public.progress_percent(cr.prev_saved, cr.target_minor) is distinct from null
      and public.progress_percent(cr.prev_saved, cr.target_minor) < thr.pct
      and public.progress_percent(cr.running_saved, cr.target_minor) >= thr.pct
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

-- 1-arg overload removed: PostgREST cannot choose between it and the
-- 3-arg form with defaults when only p_challenge_id is supplied.

-- Preview uses the same privacy-before-limit feed (limit 8).
create or replace function public.challenge_activity_preview(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_feed jsonb;
begin
  v_feed := public.challenge_activity_feed(p_challenge_id, 8, null);
  return jsonb_build_object(
    'events', coalesce(v_feed->'events', '[]'::jsonb),
    'generated_at', coalesce(v_feed->>'generated_at', now()::text)
  );
end;
$$;

revoke all on function public.challenge_activity_preview(uuid) from public;
grant execute on function public.challenge_activity_preview(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Completed challenge summary (G1.1-12 read-only; privacy preserved)
-- ---------------------------------------------------------------------------
create or replace function public.challenge_completion_summary(p_challenge_id uuid)
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
  v_participant_count int;
  v_active_savers int;
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

  if v_chal.lifecycle_status is distinct from 'Completed' then
    raise exception 'CHALLENGE_NOT_COMPLETED';
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

  v_sharing := public.sharing_member_totals(p_challenge_id);
  v_roster := public.challenge_roster_projection(p_challenge_id);
  v_activity := public.challenge_activity_feed(p_challenge_id, 20, null);

  select count(*)::int into v_participant_count
  from public.challenge_memberships
  where challenge_id = p_challenge_id and status = 'approved';

  select count(*)::int into v_active_savers
  from public.challenge_memberships
  where challenge_id = p_challenge_id
    and status = 'approved'
    and savings_participation_active is true;

  return jsonb_build_object(
    'challenge_id', v_chal.id,
    'challenge_name', v_chal.name,
    'lifecycle_status', v_chal.lifecycle_status,
    'start_date', v_chal.start_date,
    'end_date', v_chal.end_date,
    'currency', v_chal.currency,
    'time_zone', v_chal.time_zone,
    'read_only', true,
    'participant_count', v_participant_count,
    'active_saver_count', v_active_savers,
    'personal', jsonb_build_object(
      'eligible_total_minor', v_saved,
      'target_minor', v_target,
      'current_progress_percent', v_pct,
      'milestones_reached', to_jsonb(v_miles),
      'highest_milestone_reached', case
        when cardinality(v_miles) > 0 then v_miles[cardinality(v_miles)]
        else null
      end,
      'milestone_recognition_label', public.milestone_recognition_label(v_miles),
      'weekly_commitment_minor', v_setup.weekly_commitment_minor,
      'savings_participation_active', v_mem.savings_participation_active,
      'share_monetary_info', v_mem.share_monetary_info,
      'source_label', 'self-reported',
      'currency', v_chal.currency
    ),
    'sharing', v_sharing,
    'roster', v_roster->'members',
    'activity', coalesce(v_activity->'events', '[]'::jsonb),
    'generated_at', now()
  );
end;
$$;

revoke all on function public.challenge_completion_summary(uuid) from public;
grant execute on function public.challenge_completion_summary(uuid) to authenticated;

-- Dashboard preview stays on the hardened feed path (already wired via preview).
comment on function public.challenge_activity_feed(uuid, int, timestamptz) is
  'M9 SOC-01 feed: membership + privacy before sort/paginate. No streak awards.';
comment on function public.challenge_completion_summary(uuid) is
  'M9 G1.1-12 completed summary; read-only; privacy preserved. Reopen OPEN.';
