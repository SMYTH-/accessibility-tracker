-- M7: signed-in privacy opt-out (PRIV-01 / G1.1-06).
-- One control per approved membership: hide amounts AND target.
-- Re-opt-in and small-group suppression remain OPEN — do not invent.
-- Stop before M8.

-- ---------------------------------------------------------------------------
-- Opt out of sharing monetary information (authenticated, self only)
-- ---------------------------------------------------------------------------
create or replace function public.set_own_share_monetary_info(
  p_challenge_id uuid,
  p_share boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mem public.challenge_memberships%rowtype;
  v_prev boolean;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_challenge_id is null then
    raise exception 'CHALLENGE_REQUIRED';
  end if;

  if p_share is null then
    raise exception 'SHARE_FLAG_REQUIRED';
  end if;

  select * into v_mem
  from public.challenge_memberships
  where challenge_id = p_challenge_id
    and user_id = v_uid
    and status = 'approved'
  for update;

  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  v_prev := v_mem.share_monetary_info;

  -- Already at requested state (idempotent).
  if v_prev is not distinct from p_share then
    return jsonb_build_object(
      'membership_id', v_mem.id,
      'user_id', v_mem.user_id,
      'challenge_id', v_mem.challenge_id,
      'share_monetary_info', v_mem.share_monetary_info,
      'changed', false,
      'updated_at', v_mem.updated_at
    );
  end if;

  -- Opt-out only for MVP. Re-enabling sharing is OPEN (not invented).
  if v_prev is false and p_share is true then
    raise exception 'REOPT_IN_DEFERRED';
  end if;

  if p_share is not false then
    raise exception 'SHARE_FLAG_INVALID';
  end if;

  update public.challenge_memberships
  set share_monetary_info = false,
      updated_at = now()
  where id = v_mem.id
  returning * into v_mem;

  insert into public.membership_audit (
    challenge_id, membership_id, actor_user_id, subject_user_id,
    action, from_status, to_status, detail
  ) values (
    v_mem.challenge_id, v_mem.id, v_uid, v_uid,
    'share_monetary_info_opt_out',
    v_mem.status, v_mem.status,
    'Opted out of sharing monetary amounts and target. Previously viewed figures cannot be unseen.'
  );

  return jsonb_build_object(
    'membership_id', v_mem.id,
    'user_id', v_mem.user_id,
    'challenge_id', v_mem.challenge_id,
    'share_monetary_info', v_mem.share_monetary_info,
    'changed', true,
    'updated_at', v_mem.updated_at
  );
end;
$$;

revoke all on function public.set_own_share_monetary_info(uuid, boolean)
  from public, anon;
grant execute on function public.set_own_share_monetary_info(uuid, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Own privacy settings list (approved memberships only)
-- ---------------------------------------------------------------------------
create or replace function public.list_own_privacy_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_items jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'challenge_id', c.id,
      'challenge_name', c.name,
      'lifecycle_status', c.lifecycle_status,
      'currency', c.currency,
      'membership_id', m.id,
      'role', m.role,
      'share_monetary_info', m.share_monetary_info,
      'savings_participation_active', m.savings_participation_active,
      'updated_at', m.updated_at
    )
    order by c.created_at desc
  ), '[]'::jsonb)
  into v_items
  from public.challenge_memberships m
  join public.challenges c on c.id = m.challenge_id
  where m.user_id = v_uid
    and m.status = 'approved';

  return jsonb_build_object(
    'items', v_items,
    'default_visible', true,
    'reopt_in_status', 'open_deferred',
    'small_group_suppression_status', 'open'
  );
end;
$$;

revoke all on function public.list_own_privacy_settings()
  from public, anon;
grant execute on function public.list_own_privacy_settings()
  to authenticated;
