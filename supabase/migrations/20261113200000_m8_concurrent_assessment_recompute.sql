-- M8 concurrent recompute hardening: serialize dashboard/contribution overlap
-- for the same membership. Covers first-time inserts, updates, and audit rows.
-- Final stored assessment always reflects latest eligible contributions.

create or replace function public.recompute_member_weekly_assessments_at(
  p_challenge_id uuid,
  p_user_id uuid,
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
  v_local date;
  v_current_week date;
  v_end_week date;
  v_week date;
  v_eligible bigint;
  v_status text;
  v_closed boolean;
  v_existing public.weekly_commitment_assessments%rowtype;
  v_inserted public.weekly_commitment_assessments%rowtype;
  v_streak int := 0;
  v_history jsonb := '[]'::jsonb;
  v_row record;
  v_current_status text := 'inactive';
  v_current_eligible bigint := 0;
begin
  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  -- Serialize all recomputes for this member+challenge (first insert, update,
  -- audit, and overlap with contribution corrections / dashboard reads).
  select * into v_mem
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  -- Savings-inactive: never Completed or Missed — clear any stale rows.
  if not v_mem.savings_participation_active or v_mem.status <> 'approved' then
    delete from public.weekly_commitment_assessments
    where membership_id = v_mem.id;
    return jsonb_build_object(
      'savings_participation_active', false,
      'streak_weeks', 0,
      'streak_label', 'Your streak',
      'streak_status', 'inactive',
      'weekly_assessment_status', 'inactive',
      'current_week_start', null,
      'current_week_eligible_minor', 0,
      'weekly_commitment_minor', null,
      'first_assessed_week_start', null,
      'history', '[]'::jsonb,
      'recomputed_at', p_now
    );
  end if;

  select * into v_setup from public.membership_savings_setup where membership_id = v_mem.id;
  if not found then
    delete from public.weekly_commitment_assessments where membership_id = v_mem.id;
    return jsonb_build_object(
      'savings_participation_active', false,
      'streak_weeks', 0,
      'streak_label', 'Your streak',
      'streak_status', 'inactive',
      'weekly_assessment_status', 'inactive',
      'current_week_start', null,
      'current_week_eligible_minor', 0,
      'weekly_commitment_minor', null,
      'first_assessed_week_start', null,
      'history', '[]'::jsonb,
      'recomputed_at', p_now
    );
  end if;

  v_local := public.challenge_local_date(v_chal.time_zone, p_now);
  v_current_week := public.week_start_monday(v_local);
  v_end_week := public.week_start_monday(v_chal.end_date);

  -- Pre-assessment window: before first assessed Monday — no Completed/Missed weeks.
  if v_current_week < v_setup.first_assessed_week_start then
    delete from public.weekly_commitment_assessments
    where membership_id = v_mem.id;
    return jsonb_build_object(
      'savings_participation_active', true,
      'streak_weeks', 0,
      'streak_label', 'Your streak',
      'streak_status', 'none',
      'weekly_assessment_status', 'pre_assessment',
      'current_week_start', v_current_week,
      'current_week_eligible_minor', 0,
      'weekly_commitment_minor', v_setup.weekly_commitment_minor,
      'first_assessed_week_start', v_setup.first_assessed_week_start,
      'history', '[]'::jsonb,
      'recomputed_at', p_now
    );
  end if;

  v_week := v_setup.first_assessed_week_start;
  while v_week <= v_current_week and v_week <= v_end_week loop
    -- Eligible sums read after membership lock so a later recompute (e.g. after
    -- amend/reverse) always sees the latest committed contribution state.
    select coalesce(sum(c.amount_minor), 0) into v_eligible
    from public.contributions c
    where c.challenge_id = p_challenge_id
      and c.user_id = p_user_id
      and c.status = 'active'
      and c.week_start = v_week
      and c.contribution_date >= v_chal.start_date
      and c.contribution_date <= v_chal.end_date;

    -- Pause scheduling OPEN: no pause rows invented. Status 'paused' reserved only.
    v_status := public.assess_week_status(
      v_eligible,
      v_setup.weekly_commitment_minor,
      v_week,
      v_current_week,
      false
    );
    v_closed := v_week < v_current_week;

    select * into v_existing
    from public.weekly_commitment_assessments
    where membership_id = v_mem.id and week_start = v_week
    for update;

    if found then
      if v_existing.status is distinct from v_status
         or v_existing.eligible_sum_minor is distinct from v_eligible
         or v_existing.commitment_minor is distinct from v_setup.weekly_commitment_minor
         or v_existing.week_closed is distinct from v_closed then
        insert into public.weekly_assessment_audit (
          challenge_id, membership_id, user_id, week_start,
          from_status, to_status,
          from_eligible_sum_minor, to_eligible_sum_minor,
          from_commitment_minor, to_commitment_minor,
          detail, at
        ) values (
          p_challenge_id, v_mem.id, p_user_id, v_week,
          v_existing.status, v_status,
          v_existing.eligible_sum_minor, v_eligible,
          v_existing.commitment_minor, v_setup.weekly_commitment_minor,
          'Recompute after eligible contributions / week boundary',
          p_now
        );
      end if;
      update public.weekly_commitment_assessments
      set status = v_status,
          eligible_sum_minor = v_eligible,
          commitment_minor = v_setup.weekly_commitment_minor,
          week_closed = v_closed,
          computed_at = p_now
      where id = v_existing.id;
    else
      -- First-time insert; ON CONFLICT covers any residual race without the lock.
      insert into public.weekly_commitment_assessments (
        challenge_id, membership_id, user_id, week_start,
        status, eligible_sum_minor, commitment_minor, week_closed, computed_at
      ) values (
        p_challenge_id, v_mem.id, p_user_id, v_week,
        v_status, v_eligible, v_setup.weekly_commitment_minor, v_closed, p_now
      )
      on conflict (membership_id, week_start) do nothing
      returning * into v_inserted;

      if found then
        insert into public.weekly_assessment_audit (
          challenge_id, membership_id, user_id, week_start,
          from_status, to_status,
          from_eligible_sum_minor, to_eligible_sum_minor,
          from_commitment_minor, to_commitment_minor,
          detail, at
        ) values (
          p_challenge_id, v_mem.id, p_user_id, v_week,
          null, v_status,
          null, v_eligible,
          null, v_setup.weekly_commitment_minor,
          'Initial week assessment',
          p_now
        );
      else
        select * into v_existing
        from public.weekly_commitment_assessments
        where membership_id = v_mem.id and week_start = v_week
        for update;

        if v_existing.status is distinct from v_status
           or v_existing.eligible_sum_minor is distinct from v_eligible
           or v_existing.commitment_minor is distinct from v_setup.weekly_commitment_minor
           or v_existing.week_closed is distinct from v_closed then
          insert into public.weekly_assessment_audit (
            challenge_id, membership_id, user_id, week_start,
            from_status, to_status,
            from_eligible_sum_minor, to_eligible_sum_minor,
            from_commitment_minor, to_commitment_minor,
            detail, at
          ) values (
            p_challenge_id, v_mem.id, p_user_id, v_week,
            v_existing.status, v_status,
            v_existing.eligible_sum_minor, v_eligible,
            v_existing.commitment_minor, v_setup.weekly_commitment_minor,
            'Recompute after eligible contributions / week boundary',
            p_now
          );
        end if;
        update public.weekly_commitment_assessments
        set status = v_status,
            eligible_sum_minor = v_eligible,
            commitment_minor = v_setup.weekly_commitment_minor,
            week_closed = v_closed,
            computed_at = p_now
        where id = v_existing.id;
      end if;
    end if;

    v_week := v_week + 7;
  end loop;

  -- Drop any rows outside assessed range (should not happen; keep history tidy).
  delete from public.weekly_commitment_assessments
  where membership_id = v_mem.id
    and (
      week_start < v_setup.first_assessed_week_start
      or week_start > v_current_week
      or week_start > v_end_week
    );

  -- Personal streak: consecutive Completed weeks looking back.
  -- in_progress / paused skip without counting; missed breaks (G1.1-09).
  for v_row in
    select status
    from public.weekly_commitment_assessments
    where membership_id = v_mem.id
    order by week_start desc
  loop
    if v_row.status = 'completed' then
      v_streak := v_streak + 1;
    elsif v_row.status in ('in_progress', 'paused') then
      continue;
    else
      -- missed
      exit;
    end if;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.week_start desc), '[]'::jsonb)
  into v_history
  from public.weekly_commitment_assessments a
  where a.membership_id = v_mem.id;

  select status, eligible_sum_minor
  into v_current_status, v_current_eligible
  from public.weekly_commitment_assessments
  where membership_id = v_mem.id and week_start = v_current_week;

  if not found then
    v_current_status := 'pre_assessment';
    v_current_eligible := 0;
  end if;

  return jsonb_build_object(
    'savings_participation_active', true,
    'streak_weeks', v_streak,
    'streak_label', 'Your streak',
    'streak_status', case
      when v_streak > 0 then 'active'
      when exists (
        select 1 from public.weekly_commitment_assessments
        where membership_id = v_mem.id and status = 'missed'
      ) then 'recovering'
      else 'none'
    end,
    'weekly_assessment_status', v_current_status,
    'current_week_start', v_current_week,
    'current_week_eligible_minor', coalesce(v_current_eligible, 0),
    'weekly_commitment_minor', v_setup.weekly_commitment_minor,
    'first_assessed_week_start', v_setup.first_assessed_week_start,
    'history', v_history,
    'recomputed_at', p_now
  );
end;
$$;

revoke all on function public.recompute_member_weekly_assessments_at(uuid, uuid, timestamptz)
  from public;
grant execute on function public.recompute_member_weekly_assessments_at(uuid, uuid, timestamptz)
  to service_role;
