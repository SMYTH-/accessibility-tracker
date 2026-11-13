-- M10: personal data export (ACC-01), deletion stub (rules pending), rate-limit buckets.
-- Destructive deletion stays disabled until PO approves retention/ownership fallback.
-- Stop before M11.

-- ---------------------------------------------------------------------------
-- Rate-limit buckets (engineering controls for §10.4; thresholds OPEN for product)
-- ---------------------------------------------------------------------------
create table if not exists public.action_rate_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  hit_count integer not null default 0 check (hit_count >= 0)
);

alter table public.action_rate_buckets enable row level security;

revoke all on table public.action_rate_buckets from public, anon, authenticated;
grant all on table public.action_rate_buckets to service_role;

create or replace function public.consume_rate_limit(
  p_action text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_now timestamptz := now();
  v_row public.action_rate_buckets%rowtype;
  v_limit integer := greatest(coalesce(p_limit, 1), 1);
  v_window integer := greatest(coalesce(p_window_seconds, 60), 1);
begin
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'RATE_ACTION_REQUIRED';
  end if;
  if p_subject is null or length(trim(p_subject)) = 0 then
    raise exception 'RATE_SUBJECT_REQUIRED';
  end if;

  v_key := lower(trim(p_action)) || ':' || lower(trim(p_subject));

  select * into v_row
  from public.action_rate_buckets
  where bucket_key = v_key
  for update;

  if not found then
    insert into public.action_rate_buckets (bucket_key, window_started_at, hit_count)
    values (v_key, v_now, 1)
    returning * into v_row;
    return jsonb_build_object(
      'allowed', true,
      'action', lower(trim(p_action)),
      'limit', v_limit,
      'remaining', v_limit - 1,
      'window_seconds', v_window,
      'reset_at', v_row.window_started_at + make_interval(secs => v_window)
    );
  end if;

  if v_row.window_started_at + make_interval(secs => v_window) <= v_now then
    update public.action_rate_buckets
    set window_started_at = v_now,
        hit_count = 1
    where bucket_key = v_key
    returning * into v_row;
    return jsonb_build_object(
      'allowed', true,
      'action', lower(trim(p_action)),
      'limit', v_limit,
      'remaining', v_limit - 1,
      'window_seconds', v_window,
      'reset_at', v_row.window_started_at + make_interval(secs => v_window)
    );
  end if;

  if v_row.hit_count >= v_limit then
    return jsonb_build_object(
      'allowed', false,
      'action', lower(trim(p_action)),
      'limit', v_limit,
      'remaining', 0,
      'window_seconds', v_window,
      'reset_at', v_row.window_started_at + make_interval(secs => v_window),
      'error', 'RATE_LIMITED'
    );
  end if;

  update public.action_rate_buckets
  set hit_count = hit_count + 1
  where bucket_key = v_key
  returning * into v_row;

  return jsonb_build_object(
    'allowed', true,
    'action', lower(trim(p_action)),
    'limit', v_limit,
    'remaining', greatest(v_limit - v_row.hit_count, 0),
    'window_seconds', v_window,
    'reset_at', v_row.window_started_at + make_interval(secs => v_window)
  );
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Export own personal authorised data (ACC-01 / G1.1-06)
-- Only the caller's records + challenge descriptors for their memberships.
-- Never includes other members' monetary fields, emails, or private targets.
-- ---------------------------------------------------------------------------
create or replace function public.export_own_personal_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile jsonb;
  v_memberships jsonb;
  v_challenges jsonb;
  v_savings jsonb;
  v_contributions jsonb;
  v_revisions jsonb;
  v_assessments jsonb;
  v_milestones jsonb;
  v_invites jsonb;
  v_rate jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  v_rate := public.consume_rate_limit('account.export', v_uid::text, 5, 3600);
  if coalesce((v_rate->>'allowed')::boolean, false) is not true then
    raise exception 'RATE_LIMITED';
  end if;

  select jsonb_build_object(
    'user_id', u.id,
    'email', u.email,
    'display_name', coalesce(
      u.raw_user_meta_data->>'display_name',
      split_part(u.email, '@', 1),
      'Member'
    ),
    'email_confirmed_at', u.email_confirmed_at,
    'created_at', u.created_at
  )
  into v_profile
  from auth.users u
  where u.id = v_uid;

  if v_profile is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'membership_id', m.id,
      'challenge_id', m.challenge_id,
      'role', m.role,
      'status', m.status,
      'savings_participation_active', m.savings_participation_active,
      'share_monetary_info', m.share_monetary_info,
      'created_at', m.created_at,
      'updated_at', m.updated_at
    )
    order by m.created_at
  ), '[]'::jsonb)
  into v_memberships
  from public.challenge_memberships m
  where m.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'challenge_id', c.id,
      'name', c.name,
      'description', c.description,
      'start_date', c.start_date,
      'end_date', c.end_date,
      'currency', c.currency,
      'time_zone', c.time_zone,
      'lifecycle_status', c.lifecycle_status,
      'visibility', c.visibility,
      'is_owner', (c.owner_user_id = v_uid),
      'created_at', c.created_at
    )
    order by c.created_at
  ), '[]'::jsonb)
  into v_challenges
  from public.challenges c
  where exists (
    select 1
    from public.challenge_memberships m
    where m.challenge_id = c.id
      and m.user_id = v_uid
  );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'membership_id', s.membership_id,
      'challenge_id', s.challenge_id,
      'target_minor', s.target_minor,
      'weekly_commitment_minor', s.weekly_commitment_minor,
      'activated_at', s.activated_at,
      'first_assessed_week_start', s.first_assessed_week_start,
      'target_effective_from', s.target_effective_from,
      'updated_at', s.updated_at
    )
    order by s.activated_at
  ), '[]'::jsonb)
  into v_savings
  from public.membership_savings_setup s
  where s.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'contribution_id', c.id,
      'challenge_id', c.challenge_id,
      'membership_id', c.membership_id,
      'amount_minor', c.amount_minor,
      'currency', c.currency,
      'contribution_date', c.contribution_date,
      'week_start', c.week_start,
      'status', c.status,
      'source_label', c.source_label,
      'idempotency_key', c.idempotency_key,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'reversed_at', c.reversed_at
    )
    order by c.contribution_date, c.created_at
  ), '[]'::jsonb)
  into v_contributions
  from public.contributions c
  where c.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'revision_id', r.id,
      'contribution_id', r.contribution_id,
      'challenge_id', r.challenge_id,
      'action', r.action,
      'from_amount_minor', r.from_amount_minor,
      'to_amount_minor', r.to_amount_minor,
      'from_status', r.from_status,
      'to_status', r.to_status,
      'contribution_date', r.contribution_date,
      'week_start', r.week_start,
      'detail', r.detail,
      'at', r.at
    )
    order by r.at
  ), '[]'::jsonb)
  into v_revisions
  from public.contribution_revisions r
  join public.contributions c on c.id = r.contribution_id
  where c.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'assessment_id', a.id,
      'challenge_id', a.challenge_id,
      'membership_id', a.membership_id,
      'week_start', a.week_start,
      'status', a.status,
      'eligible_sum_minor', a.eligible_sum_minor,
      'commitment_minor', a.commitment_minor,
      'week_closed', a.week_closed,
      'computed_at', a.computed_at
    )
    order by a.week_start
  ), '[]'::jsonb)
  into v_assessments
  from public.weekly_commitment_assessments a
  where a.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'announcement_id', p.id,
      'challenge_id', p.challenge_id,
      'membership_id', p.membership_id,
      'milestone_percent', p.milestone_percent,
      'announced_at', p.announced_at,
      'source_contribution_id', p.source_contribution_id
    )
    order by p.announced_at
  ), '[]'::jsonb)
  into v_milestones
  from public.progress_milestone_announcements p
  where p.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'invitation_id', i.id,
      'challenge_id', i.challenge_id,
      'expires_at', i.expires_at,
      'created_at', i.created_at,
      'revoked_at', i.revoked_at,
      'is_revoked', (i.revoked_at is not null)
    )
    order by i.created_at
  ), '[]'::jsonb)
  into v_invites
  from public.challenge_invitations i
  where i.created_by = v_uid;

  return jsonb_build_object(
    'schema_version', 1,
    'exported_at', now(),
    'subject_user_id', v_uid,
    'scope', 'personal_authorised_only',
    'privacy_note',
      'Contains only the requester''s personal records and challenge descriptors for memberships they hold. Other members'' emails, amounts, targets, and private monetary fields are excluded (ACC-01 / G1.1-06).',
    'profile', v_profile,
    'memberships', coalesce(v_memberships, '[]'::jsonb),
    'challenges', coalesce(v_challenges, '[]'::jsonb),
    'savings_setups', coalesce(v_savings, '[]'::jsonb),
    'contributions', coalesce(v_contributions, '[]'::jsonb),
    'contribution_revisions', coalesce(v_revisions, '[]'::jsonb),
    'weekly_assessments', coalesce(v_assessments, '[]'::jsonb),
    'progress_milestones', coalesce(v_milestones, '[]'::jsonb),
    'invitations_created', coalesce(v_invites, '[]'::jsonb),
    'rate_limit', v_rate
  );
end;
$$;

revoke all on function public.export_own_personal_data() from public, anon;
grant execute on function public.export_own_personal_data() to authenticated;

-- ---------------------------------------------------------------------------
-- Deletion request stub — destructive path disabled until PO decision
-- ---------------------------------------------------------------------------
create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  -- ACC-01 surface exists; destructive wipe blocked while retention /
  -- anonymisation / ownership-fallback rules remain OPEN.
  raise exception 'DELETION_RULES_PENDING';
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

-- Authz helper used by app-level rate checks without inventing product thresholds.
comment on function public.consume_rate_limit(text, text, integer, integer) is
  'M10 engineering rate-limit bucket. Exact product thresholds remain OPEN; callers pass conservative defaults.';

comment on function public.export_own_personal_data() is
  'ACC-01 personal export for auth.uid() only; excludes other members private monetary data.';

comment on function public.request_account_deletion() is
  'ACC-01 deletion entry point; always raises DELETION_RULES_PENDING until PO approves package.';
