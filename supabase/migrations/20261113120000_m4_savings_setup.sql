-- M4: personal savings target + weekly commitment setup (stop before M5 contributions)
-- Specs: GOAL-01/02, G1.1-01/03/04/10; first assessed week Mon vs Tue–Sun (challenge TZ).

-- ---------------------------------------------------------------------------
-- Savings setup (own-row only; financials not on membership for cross-member select)
-- ---------------------------------------------------------------------------
create table if not exists public.membership_savings_setup (
  membership_id uuid primary key references public.challenge_memberships (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  target_minor bigint not null check (target_minor > 0),
  weekly_commitment_minor bigint not null check (weekly_commitment_minor > 0),
  activated_at timestamptz not null default now(),
  first_assessed_week_start date not null,
  -- G1.1-10: current target applies from this Monday (inclusive) for commitment assessment.
  target_effective_from date not null,
  updated_at timestamptz not null default now(),
  constraint membership_savings_setup_unique_user unique (challenge_id, user_id)
);

create index if not exists membership_savings_setup_challenge_idx
  on public.membership_savings_setup (challenge_id);

create table if not exists public.savings_setup_audit (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  membership_id uuid null references public.challenge_memberships (id) on delete set null,
  actor_user_id uuid null references auth.users (id) on delete set null,
  action text not null check (action in ('activate', 'target_change')),
  from_target_minor bigint null,
  to_target_minor bigint null,
  from_weekly_commitment_minor bigint null,
  to_weekly_commitment_minor bigint null,
  effective_from date null,
  first_assessed_week_start date null,
  detail text not null default '',
  at timestamptz not null default now()
);

create index if not exists savings_setup_audit_challenge_idx
  on public.savings_setup_audit (challenge_id, at);

alter table public.membership_savings_setup enable row level security;
alter table public.savings_setup_audit enable row level security;

revoke insert, update, delete on public.membership_savings_setup from authenticated, anon;
revoke insert, update, delete on public.savings_setup_audit from authenticated, anon;

-- Self can read own setup; others cannot read financial columns via table.
drop policy if exists savings_setup_select_own on public.membership_savings_setup;
create policy savings_setup_select_own
  on public.membership_savings_setup
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists savings_setup_audit_select_own on public.savings_setup_audit;
create policy savings_setup_audit_select_own
  on public.savings_setup_audit
  for select
  to authenticated
  using (actor_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Pure helpers: challenge-TZ calendar + first assessed week (Mon vs Tue–Sun)
-- ---------------------------------------------------------------------------
create or replace function public.challenge_local_date(p_tz text, p_at timestamptz)
returns date
language sql
immutable
as $$
  select (p_at at time zone p_tz)::date;
$$;

create or replace function public.first_assessed_week_start(p_tz text, p_activated_at timestamptz)
returns date
language plpgsql
immutable
as $$
declare
  v_local date;
  v_dow int;
begin
  v_local := public.challenge_local_date(p_tz, p_activated_at);
  v_dow := extract(isodow from v_local)::int; -- 1=Mon … 7=Sun
  if v_dow = 1 then
    return v_local;
  end if;
  -- Tuesday–Sunday → following Monday
  return v_local + ((8 - v_dow) * interval '1 day');
end;
$$;

-- Next weekly period start after local calendar day (G1.1-10): always the following Monday.
create or replace function public.next_weekly_period_start(p_tz text, p_at timestamptz)
returns date
language plpgsql
immutable
as $$
declare
  v_local date;
  v_dow int;
begin
  v_local := public.challenge_local_date(p_tz, p_at);
  v_dow := extract(isodow from v_local)::int;
  return v_local + ((8 - v_dow) * interval '1 day');
end;
$$;

revoke all on function public.challenge_local_date(text, timestamptz) from public;
revoke all on function public.first_assessed_week_start(text, timestamptz) from public;
revoke all on function public.next_weekly_period_start(text, timestamptz) from public;
grant execute on function public.challenge_local_date(text, timestamptz) to authenticated, service_role;
grant execute on function public.first_assessed_week_start(text, timestamptz) to authenticated, service_role;
grant execute on function public.next_weekly_period_start(text, timestamptz) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Activate savings (first time): positive target + weekly commitment
-- ---------------------------------------------------------------------------
create or replace function public.activate_savings_setup(
  p_challenge_id uuid,
  p_target_minor bigint,
  p_weekly_commitment_minor bigint
)
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
  v_at timestamptz := now();
  v_first date;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  if p_target_minor is null or p_target_minor <= 0 then
    raise exception 'TARGET_MUST_BE_POSITIVE';
  end if;
  if p_weekly_commitment_minor is null or p_weekly_commitment_minor <= 0 then
    raise exception 'WEEKLY_COMMITMENT_MUST_BE_POSITIVE';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  if v_chal.lifecycle_status in ('Completed', 'Cancelled') then
    raise exception 'CHALLENGE_READONLY';
  end if;

  select * into v_mem
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = v_uid;
  if not found or v_mem.status <> 'approved' then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;
  if v_mem.savings_participation_active then
    raise exception 'SAVINGS_ALREADY_ACTIVE';
  end if;

  v_first := public.first_assessed_week_start(v_chal.time_zone, v_at);

  insert into public.membership_savings_setup (
    membership_id, challenge_id, user_id,
    target_minor, weekly_commitment_minor,
    activated_at, first_assessed_week_start, target_effective_from, updated_at
  ) values (
    v_mem.id, p_challenge_id, v_uid,
    p_target_minor, p_weekly_commitment_minor,
    v_at, v_first, v_first, v_at
  )
  returning * into v_setup;

  update public.challenge_memberships
  set savings_participation_active = true,
      updated_at = v_at
  where id = v_mem.id
  returning * into v_mem;

  insert into public.savings_setup_audit (
    challenge_id, membership_id, actor_user_id, action,
    from_target_minor, to_target_minor,
    from_weekly_commitment_minor, to_weekly_commitment_minor,
    effective_from, first_assessed_week_start, detail, at
  ) values (
    p_challenge_id, v_mem.id, v_uid, 'activate',
    null, p_target_minor,
    null, p_weekly_commitment_minor,
    v_first, v_first,
    'Initial savings setup; participation active',
    v_at
  );

  return jsonb_build_object(
    'membership', to_jsonb(v_mem),
    'setup', to_jsonb(v_setup)
  );
end;
$$;

revoke all on function public.activate_savings_setup(uuid, bigint, bigint) from public;
grant execute on function public.activate_savings_setup(uuid, bigint, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Prospective target change (G1.1-10 baseline) — next weekly period start
-- ---------------------------------------------------------------------------
create or replace function public.update_savings_target(
  p_challenge_id uuid,
  p_target_minor bigint
)
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
  v_at timestamptz := now();
  v_from bigint;
  v_effective date;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  if p_target_minor is null or p_target_minor <= 0 then
    raise exception 'TARGET_MUST_BE_POSITIVE';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  if v_chal.lifecycle_status in ('Completed', 'Cancelled') then
    raise exception 'CHALLENGE_READONLY';
  end if;

  select * into v_mem
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = v_uid and status = 'approved';
  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;
  if not v_mem.savings_participation_active then
    raise exception 'SAVINGS_NOT_ACTIVE';
  end if;

  select * into v_setup
  from public.membership_savings_setup
  where membership_id = v_mem.id;
  if not found then
    raise exception 'SAVINGS_NOT_ACTIVE';
  end if;

  v_from := v_setup.target_minor;
  if v_from = p_target_minor then
    return jsonb_build_object(
      'membership', to_jsonb(v_mem),
      'setup', to_jsonb(v_setup),
      'unchanged', true
    );
  end if;

  v_effective := public.next_weekly_period_start(v_chal.time_zone, v_at);

  update public.membership_savings_setup
  set target_minor = p_target_minor,
      target_effective_from = v_effective,
      updated_at = v_at
  where membership_id = v_mem.id
  returning * into v_setup;

  insert into public.savings_setup_audit (
    challenge_id, membership_id, actor_user_id, action,
    from_target_minor, to_target_minor,
    from_weekly_commitment_minor, to_weekly_commitment_minor,
    effective_from, first_assessed_week_start, detail, at
  ) values (
    p_challenge_id, v_mem.id, v_uid, 'target_change',
    v_from, p_target_minor,
    v_setup.weekly_commitment_minor, v_setup.weekly_commitment_minor,
    v_effective, v_setup.first_assessed_week_start,
    'Prospective target change (G1.1-10); effective next weekly period',
    v_at
  );

  return jsonb_build_object(
    'membership', to_jsonb(v_mem),
    'setup', to_jsonb(v_setup),
    'unchanged', false
  );
end;
$$;

revoke all on function public.update_savings_target(uuid, bigint) from public;
grant execute on function public.update_savings_target(uuid, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Read own setup (approved member)
-- ---------------------------------------------------------------------------
create or replace function public.get_own_savings_setup(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mem public.challenge_memberships%rowtype;
  v_setup public.membership_savings_setup%rowtype;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_mem
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = v_uid and status = 'approved';
  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  select * into v_setup
  from public.membership_savings_setup
  where membership_id = v_mem.id;

  if not found then
    return jsonb_build_object(
      'membership', to_jsonb(v_mem),
      'setup', null,
      'savings_participation_active', false
    );
  end if;

  return jsonb_build_object(
    'membership', to_jsonb(v_mem),
    'setup', to_jsonb(v_setup),
    'savings_participation_active', v_mem.savings_participation_active
  );
end;
$$;

revoke all on function public.get_own_savings_setup(uuid) from public;
grant execute on function public.get_own_savings_setup(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Test infrastructure: frozen-clock activate (service_role only)
-- ---------------------------------------------------------------------------
create or replace function public.activate_savings_setup_at(
  p_challenge_id uuid,
  p_user_id uuid,
  p_target_minor bigint,
  p_weekly_commitment_minor bigint,
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
  v_first date;
begin
  if p_target_minor is null or p_target_minor <= 0 then
    raise exception 'TARGET_MUST_BE_POSITIVE';
  end if;
  if p_weekly_commitment_minor is null or p_weekly_commitment_minor <= 0 then
    raise exception 'WEEKLY_COMMITMENT_MUST_BE_POSITIVE';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  if v_chal.lifecycle_status in ('Completed', 'Cancelled') then
    raise exception 'CHALLENGE_READONLY';
  end if;

  select * into v_mem
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = p_user_id;
  if not found or v_mem.status <> 'approved' then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;
  if v_mem.savings_participation_active then
    raise exception 'SAVINGS_ALREADY_ACTIVE';
  end if;

  v_first := public.first_assessed_week_start(v_chal.time_zone, p_now);

  insert into public.membership_savings_setup (
    membership_id, challenge_id, user_id,
    target_minor, weekly_commitment_minor,
    activated_at, first_assessed_week_start, target_effective_from, updated_at
  ) values (
    v_mem.id, p_challenge_id, p_user_id,
    p_target_minor, p_weekly_commitment_minor,
    p_now, v_first, v_first, p_now
  )
  returning * into v_setup;

  update public.challenge_memberships
  set savings_participation_active = true,
      updated_at = p_now
  where id = v_mem.id
  returning * into v_mem;

  insert into public.savings_setup_audit (
    challenge_id, membership_id, actor_user_id, action,
    from_target_minor, to_target_minor,
    from_weekly_commitment_minor, to_weekly_commitment_minor,
    effective_from, first_assessed_week_start, detail, at
  ) values (
    p_challenge_id, v_mem.id, p_user_id, 'activate',
    null, p_target_minor,
    null, p_weekly_commitment_minor,
    v_first, v_first,
    'Test-infra frozen-clock activate',
    p_now
  );

  return jsonb_build_object(
    'membership', to_jsonb(v_mem),
    'setup', to_jsonb(v_setup)
  );
end;
$$;

revoke all on function public.activate_savings_setup_at(uuid, uuid, bigint, bigint, timestamptz) from public;
grant execute on function public.activate_savings_setup_at(uuid, uuid, bigint, bigint, timestamptz) to service_role;
