-- M2: private challenges, memberships, lifecycle audit (no cancel/invite/savings UI)

create extension if not exists pgcrypto;

create type public.challenge_lifecycle_status as enum (
  'Draft',
  'Scheduled',
  'Active',
  'Completed',
  'Cancelled'
);

create type public.membership_status as enum (
  'pending',
  'approved',
  'declined',
  'left',
  'removed'
);

create type public.membership_role as enum ('owner', 'member');

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0 and char_length(name) <= 80),
  description text null check (description is null or char_length(description) <= 500),
  start_date date not null,
  end_date date not null,
  currency text not null check (char_length(currency) = 3),
  time_zone text not null,
  lifecycle_status public.challenge_lifecycle_status not null,
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  visibility text not null default 'private' check (visibility = 'private'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenges_end_after_start check (end_date > start_date)
);

create table public.challenge_memberships (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null,
  savings_participation_active boolean not null default false,
  share_monetary_info boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenge_memberships_unique_user unique (challenge_id, user_id)
);

create table public.challenge_lifecycle_audit (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  actor_user_id uuid null references auth.users (id) on delete set null,
  action text not null,
  from_status public.challenge_lifecycle_status null,
  to_status public.challenge_lifecycle_status null,
  reason text not null,
  at timestamptz not null default now()
);

create index challenge_memberships_user_idx on public.challenge_memberships (user_id);
create index challenge_memberships_challenge_idx on public.challenge_memberships (challenge_id);
create index challenge_lifecycle_audit_challenge_idx on public.challenge_lifecycle_audit (challenge_id, at);
create index challenges_lifecycle_idx on public.challenges (lifecycle_status);

alter table public.challenges enable row level security;
alter table public.challenge_memberships enable row level security;
alter table public.challenge_lifecycle_audit enable row level security;

-- Approved members can read their private challenges.
create policy challenges_select_approved_member
  on public.challenges
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.challenge_memberships m
      where m.challenge_id = challenges.id
        and m.user_id = auth.uid()
        and m.status = 'approved'
    )
  );

create policy memberships_select_own_or_same_challenge
  on public.challenge_memberships
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.challenge_memberships me
      where me.challenge_id = challenge_memberships.challenge_id
        and me.user_id = auth.uid()
        and me.status = 'approved'
    )
  );

create policy audit_select_approved_member
  on public.challenge_lifecycle_audit
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.challenge_memberships m
      where m.challenge_id = challenge_lifecycle_audit.challenge_id
        and m.user_id = auth.uid()
        and m.status = 'approved'
    )
  );

-- No direct insert/update/delete from clients; mutations go through RPCs.
revoke insert, update, delete on public.challenges from authenticated, anon;
revoke insert, update, delete on public.challenge_memberships from authenticated, anon;
revoke insert, update, delete on public.challenge_lifecycle_audit from authenticated, anon;

create or replace function public.challenge_today(tz text, at timestamptz default now())
returns date
language sql
stable
as $$
  select (at at time zone tz)::date;
$$;

create or replace function public.expected_challenge_lifecycle(
  start_date date,
  end_date date,
  tz text,
  at timestamptz default now()
)
returns public.challenge_lifecycle_status
language sql
stable
as $$
  select case
    when public.challenge_today(tz, at) < start_date then 'Scheduled'::public.challenge_lifecycle_status
    when public.challenge_today(tz, at) > end_date then 'Completed'::public.challenge_lifecycle_status
    else 'Active'::public.challenge_lifecycle_status
  end;
$$;

/**
 * Atomic private challenge create + approved owner membership + audit.
 * Runs as a single transaction (PL/pgSQL function body).
 */
create or replace function public.create_private_challenge(
  p_name text,
  p_description text,
  p_start_date date,
  p_end_date date,
  p_currency text,
  p_time_zone text,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_status public.challenge_lifecycle_status;
  v_challenge public.challenges%rowtype;
  v_membership public.challenge_memberships%rowtype;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Challenge name is required.';
  end if;
  if length(trim(p_name)) > 80 then
    raise exception 'Challenge name must be 80 characters or fewer.';
  end if;
  if p_description is not null and length(p_description) > 500 then
    raise exception 'Description must be 500 characters or fewer.';
  end if;
  if p_end_date <= p_start_date then
    raise exception 'End date must be after the start date.';
  end if;
  if p_currency is null or length(trim(p_currency)) = 0 then
    raise exception 'Currency is required.';
  end if;
  if p_time_zone is null or length(trim(p_time_zone)) = 0 then
    raise exception 'Time zone is required.';
  end if;

  begin
    perform public.challenge_today(p_time_zone, p_now);
  exception when others then
    raise exception 'Choose a valid IANA time zone.';
  end;

  v_today := public.challenge_today(p_time_zone, p_now);
  if p_start_date < v_today then
    raise exception 'Start date cannot be in the past (today in % is %).', p_time_zone, v_today;
  end if;

  if p_start_date = v_today then
    v_status := 'Active';
  else
    v_status := 'Scheduled';
  end if;

  insert into public.challenges (
    name, description, start_date, end_date, currency, time_zone,
    lifecycle_status, owner_user_id, visibility, created_at, updated_at
  ) values (
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    p_start_date,
    p_end_date,
    upper(trim(p_currency)),
    trim(p_time_zone),
    v_status,
    v_uid,
    'private',
    p_now,
    p_now
  )
  returning * into v_challenge;

  insert into public.challenge_memberships (
    challenge_id, user_id, role, status,
    savings_participation_active, share_monetary_info, created_at, updated_at
  ) values (
    v_challenge.id, v_uid, 'owner', 'approved',
    false, true, p_now, p_now
  )
  returning * into v_membership;

  insert into public.challenge_lifecycle_audit (
    challenge_id, actor_user_id, action, from_status, to_status, reason, at
  ) values (
    v_challenge.id,
    v_uid,
    'create',
    null,
    v_status,
    format('Created private challenge as %s', v_status),
    p_now
  );

  return jsonb_build_object(
    'challenge', to_jsonb(v_challenge),
    'membership', to_jsonb(v_membership)
  );
end;
$$;

revoke all on function public.create_private_challenge(text, text, date, date, text, text, timestamptz) from public;
grant execute on function public.create_private_challenge(text, text, date, date, text, text, timestamptz) to authenticated;

/**
 * Apply approved automatic lifecycle transitions for challenges the caller can see
 * (or all, when called with service role / bypass).
 */
create or replace function public.reconcile_challenge_lifecycles(
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_expected public.challenge_lifecycle_status;
  v_count int := 0;
begin
  for r in
    select c.*
    from public.challenges c
    where c.lifecycle_status in ('Scheduled', 'Active')
      and (
        auth.uid() is null
        or exists (
          select 1 from public.challenge_memberships m
          where m.challenge_id = c.id
            and m.user_id = auth.uid()
            and m.status = 'approved'
        )
      )
  loop
    v_expected := public.expected_challenge_lifecycle(r.start_date, r.end_date, r.time_zone, p_now);
    if v_expected is distinct from r.lifecycle_status then
      if (r.lifecycle_status = 'Scheduled' and v_expected = 'Active')
         or (r.lifecycle_status = 'Active' and v_expected = 'Completed') then
        update public.challenges
          set lifecycle_status = v_expected,
              updated_at = p_now
          where id = r.id;

        insert into public.challenge_lifecycle_audit (
          challenge_id, actor_user_id, action, from_status, to_status, reason, at
        ) values (
          r.id,
          auth.uid(),
          'lifecycle_transition',
          r.lifecycle_status,
          v_expected,
          case
            when v_expected = 'Active' then 'Local midnight on start date (challenge TZ)'
            else 'Local midnight after end date (challenge TZ)'
          end,
          p_now
        );
        v_count := v_count + 1;
      else
        insert into public.challenge_lifecycle_audit (
          challenge_id, actor_user_id, action, from_status, to_status, reason, at
        ) values (
          r.id,
          auth.uid(),
          'invalid_transition_rejected',
          r.lifecycle_status,
          v_expected,
          format('Invalid lifecycle transition: %s → %s', r.lifecycle_status, v_expected),
          p_now
        );
      end if;
    end if;
  end loop;

  return jsonb_build_object('transitioned', v_count);
end;
$$;

revoke all on function public.reconcile_challenge_lifecycles(timestamptz) from public;
grant execute on function public.reconcile_challenge_lifecycles(timestamptz) to authenticated;

/**
 * Test helper: force membership insert failure after challenge insert inside one txn.
 * Must leave zero orphan challenges for the generated id.
 */
create or replace function public.create_private_challenge_fail_membership(
  p_name text,
  p_start_date date,
  p_end_date date,
  p_currency text,
  p_time_zone text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_today date;
  v_status public.challenge_lifecycle_status;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  v_today := public.challenge_today(p_time_zone, now());
  if p_start_date < v_today then
    raise exception 'Start date cannot be in the past.';
  end if;
  v_status := case when p_start_date = v_today then 'Active' else 'Scheduled' end;

  insert into public.challenges (
    id, name, description, start_date, end_date, currency, time_zone,
    lifecycle_status, owner_user_id, visibility
  ) values (
    v_id, trim(p_name), null, p_start_date, p_end_date, upper(trim(p_currency)),
    trim(p_time_zone), v_status, v_uid, 'private'
  );

  -- Force failure: duplicate owner membership unique constraint after a successful first insert
  insert into public.challenge_memberships (
    challenge_id, user_id, role, status, savings_participation_active, share_monetary_info
  ) values (
    v_id, v_uid, 'owner', 'approved', false, true
  );
  insert into public.challenge_memberships (
    challenge_id, user_id, role, status, savings_participation_active, share_monetary_info
  ) values (
    v_id, v_uid, 'owner', 'approved', false, true
  );
end;
$$;

revoke all on function public.create_private_challenge_fail_membership(text, date, date, text, text) from public;
grant execute on function public.create_private_challenge_fail_membership(text, date, date, text, text) to authenticated;
