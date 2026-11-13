-- M4 park: block post-activation target edits for signed-in members until
-- G1.1-10 progress/milestone rules are approved. Initial activate unchanged.
-- Service-role helper retains prior prospective-update behaviour for test evidence only.

create or replace function public.update_savings_target(
  p_challenge_id uuid,
  p_target_minor bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Signed-in path: always reject. Do not invent G1.1-10 progress/milestone behaviour.
  raise exception 'TARGET_CHANGE_DEFERRED'
    using hint = 'Post-activation target changes are parked until G1.1-10 progress/milestone rules are approved.';
end;
$$;

revoke all on function public.update_savings_target(uuid, bigint) from public;
grant execute on function public.update_savings_target(uuid, bigint) to authenticated;

comment on function public.update_savings_target(uuid, bigint) is
  'Parked: signed-in members cannot change target after activation until G1.1-10 progress/milestone rules are approved.';

-- ---------------------------------------------------------------------------
-- Test infra only (service_role): prior G1.1-10 baseline prospective update
-- ---------------------------------------------------------------------------
create or replace function public.update_savings_target_for_tests(
  p_challenge_id uuid,
  p_user_id uuid,
  p_target_minor bigint,
  p_now timestamptz default now()
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
  v_from bigint;
  v_effective date;
begin
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
  where challenge_id = p_challenge_id and user_id = p_user_id and status = 'approved';
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

  v_effective := public.next_weekly_period_start(v_chal.time_zone, p_now);

  update public.membership_savings_setup
  set target_minor = p_target_minor,
      target_effective_from = v_effective,
      updated_at = p_now
  where membership_id = v_mem.id
  returning * into v_setup;

  insert into public.savings_setup_audit (
    challenge_id, membership_id, actor_user_id, action,
    from_target_minor, to_target_minor,
    from_weekly_commitment_minor, to_weekly_commitment_minor,
    effective_from, first_assessed_week_start, detail, at
  ) values (
    p_challenge_id, v_mem.id, p_user_id, 'target_change',
    v_from, p_target_minor,
    v_setup.weekly_commitment_minor, v_setup.weekly_commitment_minor,
    v_effective, v_setup.first_assessed_week_start,
    'Test-infra prospective target change (parked for signed-in users until G1.1-10 approved)',
    p_now
  );

  return jsonb_build_object(
    'membership', to_jsonb(v_mem),
    'setup', to_jsonb(v_setup),
    'unchanged', false
  );
end;
$$;

revoke all on function public.update_savings_target_for_tests(uuid, uuid, bigint, timestamptz) from public;
revoke all on function public.update_savings_target_for_tests(uuid, uuid, bigint, timestamptz) from anon, authenticated;
grant execute on function public.update_savings_target_for_tests(uuid, uuid, bigint, timestamptz) to service_role;
