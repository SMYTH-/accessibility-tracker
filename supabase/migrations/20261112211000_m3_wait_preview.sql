-- Safe wait preview for anyone with a membership row (pending/declined/etc).
-- Returns G1.1-07 fields only — no currency, TZ, amounts, or owner PII.

create or replace function public.get_membership_wait_preview(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mem public.challenge_memberships%rowtype;
  v_c public.challenges%rowtype;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_mem
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = v_uid;
  if not found then
    return null;
  end if;

  select * into v_c from public.challenges where id = p_challenge_id;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'membership', to_jsonb(v_mem),
    'preview', jsonb_build_object(
      'name', v_c.name,
      'description', v_c.description,
      'start_date', v_c.start_date,
      'end_date', v_c.end_date,
      'participant_count', public.approved_participant_count(v_c.id)
    )
  );
end;
$$;

revoke all on function public.get_membership_wait_preview(uuid) from public;
grant execute on function public.get_membership_wait_preview(uuid) to authenticated;
