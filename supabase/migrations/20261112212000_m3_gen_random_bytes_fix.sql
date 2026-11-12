-- gen_random_bytes lives in extensions schema on hosted Supabase.
create or replace function public.create_challenge_invitation(
  p_challenge_id uuid,
  p_expires_in_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner public.challenge_memberships%rowtype;
  v_token text;
  v_hash text;
  v_inv public.challenge_invitations%rowtype;
  v_days integer := coalesce(p_expires_in_days, 7);
begin
  v_owner := public.require_challenge_owner(p_challenge_id);

  if v_days < 1 or v_days > 30 then
    raise exception 'INVITE_EXPIRY_INVALID';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := public.sha256_hex(v_token);

  insert into public.challenge_invitations (
    challenge_id, token_hash, created_by, expires_at, created_at
  ) values (
    p_challenge_id, v_hash, v_owner.user_id, now() + make_interval(days => v_days), now()
  )
  returning * into v_inv;

  insert into public.membership_audit (
    challenge_id, membership_id, actor_user_id, subject_user_id,
    action, from_status, to_status, detail, at
  ) values (
    p_challenge_id, null, v_owner.user_id, null,
    'invite_created', null, null,
    format('Invite %s expires %s', v_inv.id, v_inv.expires_at),
    now()
  );

  return jsonb_build_object(
    'invitation', to_jsonb(v_inv),
    'token', v_token,
    'expires_in_days', v_days
  );
end;
$$;

revoke all on function public.create_challenge_invitation(uuid, integer) from public;
grant execute on function public.create_challenge_invitation(uuid, integer) to authenticated;

-- Ensure digest helper also resolves extensions.
create or replace function public.sha256_hex(p_text text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(convert_to(p_text, 'UTF8'), 'sha256'), 'hex');
$$;

notify pgrst, 'reload schema';
