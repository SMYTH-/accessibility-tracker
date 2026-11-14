-- M2 hardening: live create/reconcile use database time only.
-- Frozen-clock + forced-rollback helpers are test infrastructure (service_role).

-- Remove authenticated clock-overridable overloads.
drop function if exists public.create_private_challenge(text, text, date, date, text, text, timestamptz);
drop function if exists public.reconcile_challenge_lifecycles(timestamptz);

-- Live create: no caller clock.
create or replace function public.create_private_challenge(
  p_name text,
  p_description text,
  p_start_date date,
  p_end_date date,
  p_currency text,
  p_time_zone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
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
    perform public.challenge_today(p_time_zone, v_now);
  exception when others then
    raise exception 'Choose a valid IANA time zone.';
  end;

  v_today := public.challenge_today(p_time_zone, v_now);
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
    v_now,
    v_now
  )
  returning * into v_challenge;

  insert into public.challenge_memberships (
    challenge_id, user_id, role, status,
    savings_participation_active, share_monetary_info, created_at, updated_at
  ) values (
    v_challenge.id, v_uid, 'owner', 'approved',
    false, true, v_now, v_now
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
    v_now
  );

  return jsonb_build_object(
    'challenge', to_jsonb(v_challenge),
    'membership', to_jsonb(v_membership)
  );
end;
$$;

revoke all on function public.create_private_challenge(text, text, date, date, text, text) from public;
grant execute on function public.create_private_challenge(text, text, date, date, text, text) to authenticated;

-- Live reconcile: database time only.
create or replace function public.reconcile_challenge_lifecycles()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_now timestamptz := now();
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
    v_expected := public.expected_challenge_lifecycle(r.start_date, r.end_date, r.time_zone, v_now);
    if v_expected is distinct from r.lifecycle_status then
      if (r.lifecycle_status = 'Scheduled' and v_expected = 'Active')
         or (r.lifecycle_status = 'Active' and v_expected = 'Completed') then
        update public.challenges
          set lifecycle_status = v_expected,
              updated_at = v_now
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
          v_now
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
          v_now
        );
      end if;
    end if;
  end loop;

  return jsonb_build_object('transitioned', v_count);
end;
$$;

revoke all on function public.reconcile_challenge_lifecycles() from public;
grant execute on function public.reconcile_challenge_lifecycles() to authenticated;

-- Test infrastructure only: frozen-clock reconcile (not granted to authenticated).
create or replace function public.reconcile_challenge_lifecycles_at(p_now timestamptz)
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
          null,
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
      end if;
    end if;
  end loop;

  return jsonb_build_object('transitioned', v_count);
end;
$$;

revoke all on function public.reconcile_challenge_lifecycles_at(timestamptz) from public;
revoke all on function public.reconcile_challenge_lifecycles_at(timestamptz) from authenticated, anon;
grant execute on function public.reconcile_challenge_lifecycles_at(timestamptz) to service_role;

-- Forced-rollback helper: revoke authenticated; service_role only.
revoke all on function public.create_private_challenge_fail_membership(text, date, date, text, text)
  from public, authenticated, anon;
grant execute on function public.create_private_challenge_fail_membership(text, date, date, text, text)
  to service_role;

-- Fail helper currently uses auth.uid(); for service_role tests, accept explicit owner.
create or replace function public.create_private_challenge_fail_membership(
  p_name text,
  p_start_date date,
  p_end_date date,
  p_currency text,
  p_time_zone text,
  p_owner_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_owner_user_id, auth.uid());
  v_id uuid := gen_random_uuid();
  v_today date;
  v_status public.challenge_lifecycle_status;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  v_today := public.challenge_today(p_time_zone, v_now);
  if p_start_date < v_today then
    raise exception 'Start date cannot be in the past.';
  end if;
  v_status := case when p_start_date = v_today then 'Active' else 'Scheduled' end;

  insert into public.challenges (
    id, name, description, start_date, end_date, currency, time_zone,
    lifecycle_status, owner_user_id, visibility, created_at, updated_at
  ) values (
    v_id, trim(p_name), null, p_start_date, p_end_date, upper(trim(p_currency)),
    trim(p_time_zone), v_status, v_uid, 'private', v_now, v_now
  );

  insert into public.challenge_memberships (
    challenge_id, user_id, role, status, savings_participation_active, share_monetary_info,
    created_at, updated_at
  ) values (
    v_id, v_uid, 'owner', 'approved', false, true, v_now, v_now
  );
  insert into public.challenge_memberships (
    challenge_id, user_id, role, status, savings_participation_active, share_monetary_info,
    created_at, updated_at
  ) values (
    v_id, v_uid, 'owner', 'approved', false, true, v_now, v_now
  );
end;
$$;

-- Drop old 5-arg fail helper if present after replace ambiguity.
drop function if exists public.create_private_challenge_fail_membership(text, date, date, text, text);

revoke all on function public.create_private_challenge_fail_membership(text, date, date, text, text, uuid)
  from public, authenticated, anon;
grant execute on function public.create_private_challenge_fail_membership(text, date, date, text, text, uuid)
  to service_role;
