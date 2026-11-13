-- M5: self-reported contribution record / amend / reverse (stop before M6)
-- Specs: SAVE-01/02, G1.1-05; approved timing §3.1 (today-only create; amend/reverse existing only).

-- ---------------------------------------------------------------------------
-- Helpers: Monday week start for a local calendar date
-- ---------------------------------------------------------------------------
create or replace function public.week_start_monday(p_local date)
returns date
language sql
immutable
as $$
  select p_local - ((extract(isodow from p_local)::int - 1) * interval '1 day');
$$;

revoke all on function public.week_start_monday(date) from public;
grant execute on function public.week_start_monday(date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Contributions + revision audit
-- ---------------------------------------------------------------------------
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  membership_id uuid not null references public.challenge_memberships (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,
  -- Immutable original contribution date (challenge-local); never rewritten on amend/reverse.
  contribution_date date not null,
  -- Monday YYYY-MM-DD of the week containing contribution_date (challenge calendar).
  week_start date not null,
  status text not null default 'active' check (status in ('active', 'reversed')),
  source_label text not null default 'self-reported' check (source_label = 'self-reported'),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reversed_at timestamptz null,
  constraint contributions_idempotency_unique unique (challenge_id, user_id, idempotency_key)
);

create index if not exists contributions_challenge_user_idx
  on public.contributions (challenge_id, user_id, contribution_date);

create index if not exists contributions_membership_status_idx
  on public.contributions (membership_id, status);

create table if not exists public.contribution_revisions (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  actor_user_id uuid null references auth.users (id) on delete set null,
  action text not null check (action in ('create', 'amend', 'reverse')),
  from_amount_minor bigint null,
  to_amount_minor bigint null,
  from_status text null,
  to_status text null,
  contribution_date date not null,
  week_start date not null,
  idempotency_key text null,
  detail text not null default '',
  at timestamptz not null default now()
);

create index if not exists contribution_revisions_contribution_idx
  on public.contribution_revisions (contribution_id, at);

create index if not exists contribution_revisions_challenge_idx
  on public.contribution_revisions (challenge_id, at);

alter table public.contributions enable row level security;
alter table public.contribution_revisions enable row level security;

revoke insert, update, delete on public.contributions from authenticated, anon;
revoke insert, update, delete on public.contribution_revisions from authenticated, anon;

drop policy if exists contributions_select_own on public.contributions;
create policy contributions_select_own
  on public.contributions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists contribution_revisions_select_own on public.contribution_revisions;
create policy contribution_revisions_select_own
  on public.contribution_revisions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.contributions c
      where c.id = contribution_id and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Eligible personal totals (G1.1-05): active, in-period, authorised participant
-- Pre-assessment amounts count toward personal progress only (flagged separately).
-- ---------------------------------------------------------------------------
create or replace function public.own_eligible_totals(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_chal public.challenges%rowtype;
  v_mem public.challenge_memberships%rowtype;
  v_setup public.membership_savings_setup%rowtype;
  v_total bigint := 0;
  v_commitment bigint := 0;
  v_pre bigint := 0;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
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

  select
    coalesce(sum(c.amount_minor), 0),
    coalesce(sum(case
      when v_setup.first_assessed_week_start is not null
        and c.week_start >= v_setup.first_assessed_week_start
      then c.amount_minor else 0 end), 0),
    coalesce(sum(case
      when v_setup.first_assessed_week_start is not null
        and c.week_start < v_setup.first_assessed_week_start
      then c.amount_minor else 0 end), 0)
  into v_total, v_commitment, v_pre
  from public.contributions c
  where c.challenge_id = p_challenge_id
    and c.user_id = v_uid
    and c.status = 'active'
    and c.contribution_date >= v_chal.start_date
    and c.contribution_date <= v_chal.end_date;

  return jsonb_build_object(
    'eligible_total_minor', v_total,
    'commitment_eligible_minor', v_commitment,
    'pre_assessment_minor', v_pre,
    'first_assessed_week_start', v_setup.first_assessed_week_start,
    'target_minor', v_setup.target_minor,
    'currency', v_chal.currency,
    'source_label', 'self-reported'
  );
end;
$$;

revoke all on function public.own_eligible_totals(uuid) from public;
grant execute on function public.own_eligible_totals(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Internal create (shared by live + frozen-clock test helper)
-- ---------------------------------------------------------------------------
create or replace function public._record_contribution_internal(
  p_challenge_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_idempotency_key text,
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
  v_existing public.contributions%rowtype;
  v_row public.contributions%rowtype;
  v_local date;
  v_week date;
  v_totals jsonb;
begin
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'AMOUNT_MUST_BE_POSITIVE';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;
  if length(trim(p_idempotency_key)) > 128 then
    raise exception 'IDEMPOTENCY_KEY_INVALID';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  if v_chal.lifecycle_status <> 'Active' then
    raise exception 'CHALLENGE_NOT_ACTIVE';
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

  -- Idempotent replay: same key returns existing row (no double count).
  select * into v_existing
  from public.contributions
  where challenge_id = p_challenge_id
    and user_id = p_user_id
    and idempotency_key = trim(p_idempotency_key);
  if found then
    if auth.uid() is not null then
      v_totals := public.own_eligible_totals(p_challenge_id);
    else
      select
        jsonb_build_object(
          'eligible_total_minor', coalesce(sum(c.amount_minor), 0),
          'commitment_eligible_minor', coalesce(sum(case
            when c.week_start >= v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
          'pre_assessment_minor', coalesce(sum(case
            when c.week_start < v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
          'first_assessed_week_start', v_setup.first_assessed_week_start,
          'target_minor', v_setup.target_minor,
          'currency', v_chal.currency,
          'source_label', 'self-reported'
        )
      into v_totals
      from public.contributions c
      where c.challenge_id = p_challenge_id
        and c.user_id = p_user_id
        and c.status = 'active'
        and c.contribution_date >= v_chal.start_date
        and c.contribution_date <= v_chal.end_date;
    end if;
    return jsonb_build_object(
      'contribution', to_jsonb(v_existing),
      'replayed', true,
      'totals', v_totals
    );
  end if;

  v_local := public.challenge_local_date(v_chal.time_zone, p_now);
  if v_local < v_chal.start_date or v_local > v_chal.end_date then
    raise exception 'OUT_OF_PERIOD';
  end if;

  v_week := public.week_start_monday(v_local);

  insert into public.contributions (
    challenge_id, membership_id, user_id,
    amount_minor, currency, contribution_date, week_start,
    status, source_label, idempotency_key, created_at, updated_at
  ) values (
    p_challenge_id, v_mem.id, p_user_id,
    p_amount_minor, v_chal.currency, v_local, v_week,
    'active', 'self-reported', trim(p_idempotency_key), p_now, p_now
  )
  returning * into v_row;

  insert into public.contribution_revisions (
    contribution_id, challenge_id, actor_user_id, action,
    from_amount_minor, to_amount_minor, from_status, to_status,
    contribution_date, week_start, idempotency_key, detail, at
  ) values (
    v_row.id, p_challenge_id, p_user_id, 'create',
    null, p_amount_minor, null, 'active',
    v_local, v_week, trim(p_idempotency_key),
    'Self-reported contribution recorded',
    p_now
  );

  if auth.uid() is not null then
    v_totals := public.own_eligible_totals(p_challenge_id);
  else
    select
      jsonb_build_object(
        'eligible_total_minor', coalesce(sum(c.amount_minor), 0),
        'commitment_eligible_minor', coalesce(sum(case
          when c.week_start >= v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
        'pre_assessment_minor', coalesce(sum(case
          when c.week_start < v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
        'first_assessed_week_start', v_setup.first_assessed_week_start,
        'target_minor', v_setup.target_minor,
        'currency', v_chal.currency,
        'source_label', 'self-reported'
      )
    into v_totals
    from public.contributions c
    where c.challenge_id = p_challenge_id
      and c.user_id = p_user_id
      and c.status = 'active'
      and c.contribution_date >= v_chal.start_date
      and c.contribution_date <= v_chal.end_date;
  end if;

  return jsonb_build_object(
    'contribution', to_jsonb(v_row),
    'replayed', false,
    'totals', v_totals
  );
exception
  when unique_violation then
    -- Race-safe idempotency: concurrent inserts with same key → return winner.
    select * into v_existing
    from public.contributions
    where challenge_id = p_challenge_id
      and user_id = p_user_id
      and idempotency_key = trim(p_idempotency_key);
    if not found then
      raise;
    end if;
    if auth.uid() is not null then
      v_totals := public.own_eligible_totals(p_challenge_id);
    else
      select * into v_setup
      from public.membership_savings_setup
      where membership_id = v_mem.id;
      select
        jsonb_build_object(
          'eligible_total_minor', coalesce(sum(c.amount_minor), 0),
          'commitment_eligible_minor', coalesce(sum(case
            when c.week_start >= v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
          'pre_assessment_minor', coalesce(sum(case
            when c.week_start < v_setup.first_assessed_week_start then c.amount_minor else 0 end), 0),
          'first_assessed_week_start', v_setup.first_assessed_week_start,
          'target_minor', v_setup.target_minor,
          'currency', v_chal.currency,
          'source_label', 'self-reported'
        )
      into v_totals
      from public.contributions c
      where c.challenge_id = p_challenge_id
        and c.user_id = p_user_id
        and c.status = 'active'
        and c.contribution_date >= v_chal.start_date
        and c.contribution_date <= v_chal.end_date;
    end if;
    return jsonb_build_object(
      'contribution', to_jsonb(v_existing),
      'replayed', true,
      'totals', v_totals
    );
end;
$$;

revoke all on function public._record_contribution_internal(uuid, uuid, bigint, text, timestamptz) from public;

create or replace function public.record_contribution(
  p_challenge_id uuid,
  p_amount_minor bigint,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  return public._record_contribution_internal(
    p_challenge_id, v_uid, p_amount_minor, p_idempotency_key, now()
  );
end;
$$;

revoke all on function public.record_contribution(uuid, bigint, text) from public;
grant execute on function public.record_contribution(uuid, bigint, text) to authenticated;

-- Service-role frozen clock for challenge-TZ date evidence
create or replace function public.record_contribution_at(
  p_challenge_id uuid,
  p_user_id uuid,
  p_amount_minor bigint,
  p_idempotency_key text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._record_contribution_internal(
    p_challenge_id, p_user_id, p_amount_minor, p_idempotency_key, p_now
  );
end;
$$;

revoke all on function public.record_contribution_at(uuid, uuid, bigint, text, timestamptz) from public;
grant execute on function public.record_contribution_at(uuid, uuid, bigint, text, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- Amend existing (keeps contribution_date + week_start); cannot invent closed-week rows
-- ---------------------------------------------------------------------------
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
  v_at timestamptz := now();
  v_totals jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'AMOUNT_MUST_BE_POSITIVE';
  end if;

  select * into v_row from public.contributions where id = p_contribution_id;
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

-- ---------------------------------------------------------------------------
-- Reverse existing (eligible totals exclude reversed)
-- ---------------------------------------------------------------------------
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
  v_at timestamptz := now();
  v_totals jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_row from public.contributions where id = p_contribution_id;
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

-- ---------------------------------------------------------------------------
-- List own contributions + revisions for a challenge
-- ---------------------------------------------------------------------------
create or replace function public.list_own_contributions(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mem public.challenge_memberships%rowtype;
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

  return jsonb_build_object(
    'contributions', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.contribution_date desc, c.created_at desc)
      from public.contributions c
      where c.challenge_id = p_challenge_id and c.user_id = v_uid
    ), '[]'::jsonb),
    'revisions', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.at asc)
      from public.contribution_revisions r
      join public.contributions c on c.id = r.contribution_id
      where r.challenge_id = p_challenge_id and c.user_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_own_contributions(uuid) from public;
grant execute on function public.list_own_contributions(uuid) to authenticated;
