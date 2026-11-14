-- M5 concurrent correction hardening: serialize amend/reverse on the same row.
-- Lock the contribution before status check and prior-amount read so each audit
-- entry reflects the actual state immediately before its update.

create or replace function public.amend_contribution(
  p_contribution_id uuid,
  p_amount_minor bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_chal public.challenges%rowtype;
  v_row public.contributions%rowtype;
  v_from bigint;
  v_at timestamptz;
  v_totals jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'AMOUNT_MUST_BE_POSITIVE';
  end if;

  -- Serialize corrections on this contribution before status / prior amount.
  select * into v_row
  from public.contributions
  where id = p_contribution_id
  for update;
  if not found then
    raise exception 'CONTRIBUTION_NOT_FOUND';
  end if;
  if v_row.user_id <> v_uid then
    raise exception 'CONTRIBUTION_FORBIDDEN';
  end if;
  if v_row.status <> 'active' then
    raise exception 'CONTRIBUTION_NOT_ACTIVE';
  end if;

  select * into v_chal from public.challenges where id = v_row.challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  if v_chal.lifecycle_status in ('Completed', 'Cancelled') then
    raise exception 'CHALLENGE_READONLY';
  end if;

  v_at := clock_timestamp();
  v_from := v_row.amount_minor;
  if v_from = p_amount_minor then
    v_totals := public.own_eligible_totals(v_row.challenge_id);
    return jsonb_build_object(
      'contribution', to_jsonb(v_row),
      'unchanged', true,
      'totals', v_totals
    );
  end if;

  update public.contributions
  set amount_minor = p_amount_minor,
      updated_at = v_at
  where id = v_row.id
  returning * into v_row;

  insert into public.contribution_revisions (
    contribution_id, challenge_id, actor_user_id, action,
    from_amount_minor, to_amount_minor, from_status, to_status,
    contribution_date, week_start, detail, at
  ) values (
    v_row.id, v_row.challenge_id, v_uid, 'amend',
    v_from, p_amount_minor, 'active', 'active',
    v_row.contribution_date, v_row.week_start,
    'Self-reported contribution amended; original date and week preserved',
    v_at
  );

  v_totals := public.own_eligible_totals(v_row.challenge_id);
  return jsonb_build_object(
    'contribution', to_jsonb(v_row),
    'unchanged', false,
    'totals', v_totals
  );
end;
$$;

revoke all on function public.amend_contribution(uuid, bigint) from public;
grant execute on function public.amend_contribution(uuid, bigint) to authenticated;

create or replace function public.reverse_contribution(p_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_chal public.challenges%rowtype;
  v_row public.contributions%rowtype;
  v_from bigint;
  v_at timestamptz;
  v_totals jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Serialize corrections on this contribution before status / prior amount.
  select * into v_row
  from public.contributions
  where id = p_contribution_id
  for update;
  if not found then
    raise exception 'CONTRIBUTION_NOT_FOUND';
  end if;
  if v_row.user_id <> v_uid then
    raise exception 'CONTRIBUTION_FORBIDDEN';
  end if;
  if v_row.status <> 'active' then
    raise exception 'CONTRIBUTION_NOT_ACTIVE';
  end if;

  select * into v_chal from public.challenges where id = v_row.challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  if v_chal.lifecycle_status in ('Completed', 'Cancelled') then
    raise exception 'CHALLENGE_READONLY';
  end if;

  v_at := clock_timestamp();
  v_from := v_row.amount_minor;

  update public.contributions
  set status = 'reversed',
      reversed_at = v_at,
      updated_at = v_at
  where id = v_row.id
  returning * into v_row;

  insert into public.contribution_revisions (
    contribution_id, challenge_id, actor_user_id, action,
    from_amount_minor, to_amount_minor, from_status, to_status,
    contribution_date, week_start, detail, at
  ) values (
    v_row.id, v_row.challenge_id, v_uid, 'reverse',
    v_from, v_from, 'active', 'reversed',
    v_row.contribution_date, v_row.week_start,
    'Self-reported contribution reversed; original date and week preserved',
    v_at
  );

  v_totals := public.own_eligible_totals(v_row.challenge_id);
  return jsonb_build_object(
    'contribution', to_jsonb(v_row),
    'totals', v_totals
  );
end;
$$;

revoke all on function public.reverse_contribution(uuid) from public;
grant execute on function public.reverse_contribution(uuid) to authenticated;
