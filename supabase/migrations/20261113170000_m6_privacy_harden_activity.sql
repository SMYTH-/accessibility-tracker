-- M6 privacy harden: lock eligible-saved helper; filter private feed before limit.
-- Stop before M7 privacy settings UX.

-- ---------------------------------------------------------------------------
-- member_eligible_saved_minor: internal to authorised security-definer readers
-- ---------------------------------------------------------------------------
revoke all on function public.member_eligible_saved_minor(uuid, uuid, date, date)
  from public, anon, authenticated;
grant execute on function public.member_eligible_saved_minor(uuid, uuid, date, date)
  to service_role;

-- ---------------------------------------------------------------------------
-- Activity preview: exclude other members' private contributions before
-- ordering / limiting so they cannot displace sharing events in the window.
-- Opted-out self still sees own contribution rows (with amounts).
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
      coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member') as display_name
    from public.contributions c
    join public.challenge_memberships m
      on m.challenge_id = c.challenge_id and m.user_id = c.user_id and m.status = 'approved'
    join auth.users u on u.id = c.user_id
    where c.challenge_id = p_challenge_id
      and c.status = 'active'
      -- Privacy filter BEFORE order/limit: self always; others only when sharing.
      and (c.user_id = v_uid or m.share_monetary_info is true)
    order by c.updated_at desc
    limit 8
  loop
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
