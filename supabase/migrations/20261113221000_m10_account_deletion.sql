-- M10: approved Option A account deletion (transfer / 7-day grace / cancel / finalise).
-- Ownership transfer is authorised+audited for deletion; voluntary leave can reuse the RPC.
-- Calendar multi-year retention periods remain OPEN — not invented.
-- Stop before M11.

-- Allow owner_deletion_grace notifications.
alter table public.notification_outbox
  drop constraint if exists notification_outbox_kind_check;
alter table public.notification_outbox
  add constraint notification_outbox_kind_check
  check (kind in (
    'membership_approved',
    'membership_rejected',
    'owner_deletion_grace'
  ));

-- Owner_user_id may be cleared only after Cancelled/Completed/Draft hand-off prep.
alter table public.challenges
  alter column owner_user_id drop not null;

-- ---------------------------------------------------------------------------
-- Deletion request + per-challenge holds
-- ---------------------------------------------------------------------------
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null check (status in (
    'pending_transfer',
    'grace_pending',
    'ready',
    'completed',
    'cancelled'
  )),
  requested_at timestamptz not null default now(),
  grace_ends_at timestamptz null,
  completed_at timestamptz null,
  detail jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.account_deletion_challenge_holds (
  id uuid primary key default gen_random_uuid(),
  deletion_request_id uuid not null
    references public.account_deletion_requests (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  hold_kind text not null check (hold_kind in ('needs_transfer', 'grace_no_replacement')),
  grace_ends_at timestamptz null,
  resolved_at timestamptz null,
  resolution text null check (
    resolution is null
    or resolution in (
      'transferred',
      'cancelled_challenge',
      'lifecycle_non_blocking',
      'request_cancelled'
    )
  ),
  created_at timestamptz not null default now(),
  unique (deletion_request_id, challenge_id)
);

create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests (status, grace_ends_at);

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_challenge_holds enable row level security;

revoke all on table public.account_deletion_requests from public, anon, authenticated;
revoke all on table public.account_deletion_challenge_holds from public, anon, authenticated;
grant all on table public.account_deletion_requests to service_role;
grant all on table public.account_deletion_challenge_holds to service_role;

drop policy if exists account_deletion_requests_select_own on public.account_deletion_requests;
create policy account_deletion_requests_select_own
  on public.account_deletion_requests
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists account_deletion_holds_select_own on public.account_deletion_challenge_holds;
create policy account_deletion_holds_select_own
  on public.account_deletion_challenge_holds
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.account_deletion_requests r
      where r.id = account_deletion_challenge_holds.deletion_request_id
        and r.user_id = auth.uid()
    )
  );

grant select on table public.account_deletion_requests to authenticated;
grant select on table public.account_deletion_challenge_holds to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.eligible_ownership_replacements(p_challenge_id uuid, p_owner_user_id uuid)
returns table (user_id uuid, membership_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, m.id
  from public.challenge_memberships m
  where m.challenge_id = p_challenge_id
    and m.status = 'approved'
    and m.user_id is distinct from p_owner_user_id;
$$;

revoke all on function public.eligible_ownership_replacements(uuid, uuid) from public, anon;
grant execute on function public.eligible_ownership_replacements(uuid, uuid)
  to authenticated, service_role;

create or replace function public.notify_owner_deletion_grace(
  p_challenge_id uuid,
  p_owner_user_id uuid,
  p_grace_ends_at timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_count integer := 0;
  r record;
  v_email text;
begin
  select name into v_name from public.challenges where id = p_challenge_id;
  for r in
    select m.id as membership_id, m.user_id
    from public.challenge_memberships m
    where m.challenge_id = p_challenge_id
      and m.status = 'approved'
      and m.user_id is distinct from p_owner_user_id
  loop
    select email into v_email from auth.users where id = r.user_id;
    if v_email is null then
      continue;
    end if;
    insert into public.notification_outbox (
      kind, challenge_id, membership_id, recipient_user_id, recipient_email,
      subject, body, status, created_at
    ) values (
      'owner_deletion_grace',
      p_challenge_id,
      r.membership_id,
      r.user_id,
      v_email,
      format('Challenge owner deletion grace — %s', coalesce(v_name, 'challenge')),
      format(
        'The owner of "%s" requested account deletion and there is no eligible replacement owner yet. A 7-day grace period runs until %s. If ownership is not transferred to an eligible approved member before then, the challenge will be cancelled.',
        coalesce(v_name, 'this challenge'),
        p_grace_ends_at::text
      ),
      'recorded',
      now()
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.notify_owner_deletion_grace(uuid, uuid, timestamptz)
  from public, anon;
grant execute on function public.notify_owner_deletion_grace(uuid, uuid, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Authorised ownership transfer (audited) — G1.1-13 / deletion Option A
-- ---------------------------------------------------------------------------
create or replace function public.transfer_challenge_ownership(
  p_challenge_id uuid,
  p_new_owner_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_chal public.challenges%rowtype;
  v_old public.challenge_memberships%rowtype;
  v_new public.challenge_memberships%rowtype;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if p_challenge_id is null or p_new_owner_user_id is null then
    raise exception 'TRANSFER_ARGS_REQUIRED';
  end if;
  if p_new_owner_user_id = v_uid then
    raise exception 'CANNOT_TRANSFER_TO_SELF';
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id for update;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  if v_chal.owner_user_id is distinct from v_uid then
    raise exception 'NOT_CHALLENGE_OWNER';
  end if;

  select * into v_old
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = v_uid
  for update;
  if not found or v_old.status <> 'approved' or v_old.role <> 'owner' then
    raise exception 'NOT_CHALLENGE_OWNER';
  end if;

  select * into v_new
  from public.challenge_memberships
  where challenge_id = p_challenge_id and user_id = p_new_owner_user_id
  for update;
  if not found or v_new.status <> 'approved' then
    raise exception 'TRANSFEREE_NOT_ELIGIBLE';
  end if;

  update public.challenges
  set owner_user_id = p_new_owner_user_id,
      updated_at = now()
  where id = p_challenge_id
  returning * into v_chal;

  update public.challenge_memberships
  set role = 'member', updated_at = now()
  where id = v_old.id
  returning * into v_old;

  update public.challenge_memberships
  set role = 'owner', updated_at = now()
  where id = v_new.id
  returning * into v_new;

  insert into public.membership_audit (
    challenge_id, membership_id, actor_user_id, subject_user_id,
    action, from_status, to_status, detail
  ) values (
    p_challenge_id, v_new.id, v_uid, p_new_owner_user_id,
    'ownership_transfer',
    v_new.status, v_new.status,
    format('Ownership transferred from %s to %s', v_uid, p_new_owner_user_id)
  );

  -- A valid transfer during grace must prevent cancellation.
  update public.account_deletion_challenge_holds h
  set resolved_at = now(),
      resolution = 'transferred'
  from public.account_deletion_requests r
  where h.deletion_request_id = r.id
    and r.user_id = v_uid
    and r.status in ('pending_transfer', 'grace_pending', 'ready')
    and h.challenge_id = p_challenge_id
    and h.resolved_at is null;

  return jsonb_build_object(
    'challenge_id', p_challenge_id,
    'from_user_id', v_uid,
    'to_user_id', p_new_owner_user_id,
    'lifecycle_status', v_chal.lifecycle_status
  );
end;
$$;

revoke all on function public.transfer_challenge_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_challenge_ownership(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Anonymise + revoke memberships for a user (identity wipe via auth update in app
-- or tombstone helper below). Preserves minimum history for remaining members.
-- ---------------------------------------------------------------------------
create or replace function public.anonymise_user_for_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  -- End active access on all memberships.
  update public.challenge_memberships
  set status = case
        when status in ('approved', 'pending') then 'left'::public.membership_status
        else status
      end,
      savings_participation_active = false,
      role = case when role = 'owner' then 'member'::public.membership_role else role end,
      updated_at = now()
  where user_id = p_user_id
    and status in ('approved', 'pending');

  -- Clear ownership markers on any remaining challenges (should already be
  -- transferred or cancelled; this is a safety net before identity removal).
  update public.challenges
  set owner_user_id = null,
      updated_at = now()
  where owner_user_id = p_user_id;

  -- Strip identifying actor linkage where safe; keep amounts for authorised history.
  update public.contribution_revisions
  set actor_user_id = null,
      detail = case
        when detail is null or detail = '' then 'Actor anonymised on account deletion'
        else detail || ' [actor anonymised on account deletion]'
      end
  where actor_user_id = p_user_id;

  update public.membership_audit
  set actor_user_id = null,
      subject_user_id = case when subject_user_id = p_user_id then null else subject_user_id end,
      detail = case
        when detail is null or detail = '' then 'Identifiers anonymised on account deletion'
        else detail || ' [identifiers anonymised on account deletion]'
      end
  where actor_user_id = p_user_id or subject_user_id = p_user_id;

  update public.challenge_lifecycle_audit
  set actor_user_id = null
  where actor_user_id = p_user_id;

  -- Purge notification PII addressed to the deleted user.
  delete from public.notification_outbox where recipient_user_id = p_user_id;

  -- Tombstone auth identity (non-loginable). Hard delete would cascade-destroy
  -- retained contribution history needed by remaining authorised members.
  update auth.users
  set
    email = 'deleted-' || p_user_id::text || '@invalid.local',
    encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf')),
    email_confirmed_at = null,
    phone = null,
    raw_user_meta_data = jsonb_build_object('display_name', 'Deleted user', 'deleted', true),
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('banned', true),
    updated_at = now()
  where id = p_user_id;

  begin
    delete from auth.sessions where user_id = p_user_id;
  exception
    when undefined_table then null;
    when others then null;
  end;
  begin
    delete from auth.refresh_tokens where user_id = p_user_id;
  exception
    when undefined_table then null;
    when others then null;
  end;
end;
$$;

revoke all on function public.anonymise_user_for_deletion(uuid) from public, anon, authenticated;
grant execute on function public.anonymise_user_for_deletion(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Finalise deletion (recheck ownership + lifecycle; cancel only if still needed)
-- ---------------------------------------------------------------------------
create or replace function public.finalize_account_deletion(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_req public.account_deletion_requests%rowtype;
  v_hold public.account_deletion_challenge_holds%rowtype;
  v_chal public.challenges%rowtype;
  v_eligible_count integer;
  v_cancelled integer := 0;
  v_transferred_holds integer := 0;
  v_now timestamptz := now();
  v_from_status public.challenge_lifecycle_status;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  -- Authenticated callers may only finalise themselves.
  if auth.uid() is not null and auth.uid() is distinct from v_uid then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_req
  from public.account_deletion_requests
  where user_id = v_uid
  for update;

  if not found then
    raise exception 'DELETION_REQUEST_REQUIRED';
  end if;
  if v_req.status = 'completed' then
    return jsonb_build_object(
      'status', 'completed',
      'idempotent', true,
      'completed_at', v_req.completed_at
    );
  end if;
  if v_req.status = 'cancelled' then
    raise exception 'DELETION_REQUEST_CANCELLED';
  end if;

  -- Recheck each open hold.
  for v_hold in
    select * from public.account_deletion_challenge_holds
    where deletion_request_id = v_req.id
      and resolved_at is null
    for update
  loop
    select * into v_chal from public.challenges where id = v_hold.challenge_id for update;
    if not found then
      update public.account_deletion_challenge_holds
      set resolved_at = v_now, resolution = 'lifecycle_non_blocking'
      where id = v_hold.id;
      continue;
    end if;

    -- Transfer during grace (or anytime) already moved ownership.
    if v_chal.owner_user_id is distinct from v_uid then
      update public.account_deletion_challenge_holds
      set resolved_at = v_now, resolution = 'transferred'
      where id = v_hold.id;
      v_transferred_holds := v_transferred_holds + 1;
      continue;
    end if;

    -- No longer Active/Scheduled → non-blocking.
    if v_chal.lifecycle_status not in ('Active', 'Scheduled') then
      update public.account_deletion_challenge_holds
      set resolved_at = v_now, resolution = 'lifecycle_non_blocking'
      where id = v_hold.id;
      continue;
    end if;

    select count(*)::integer into v_eligible_count
    from public.eligible_ownership_replacements(v_chal.id, v_uid);

    if v_eligible_count > 0 then
      -- Eligible replacement exists → must transfer before finalise.
      raise exception 'DELETION_TRANSFER_REQUIRED';
    end if;

    if v_hold.hold_kind = 'grace_no_replacement' then
      if v_hold.grace_ends_at is null or v_hold.grace_ends_at > v_now then
        raise exception 'DELETION_GRACE_ACTIVE';
      end if;
      -- Grace expired, still owner, still no eligible → cancel then clear owner.
      v_from_status := v_chal.lifecycle_status;
      update public.challenges
      set lifecycle_status = 'Cancelled',
          owner_user_id = null,
          updated_at = v_now
      where id = v_chal.id
      returning * into v_chal;

      insert into public.challenge_lifecycle_audit (
        challenge_id, actor_user_id, action, from_status, to_status, reason, at
      ) values (
        v_chal.id, v_uid, 'lifecycle_transition',
        v_from_status,
        'Cancelled',
        'Auto-cancelled after owner deletion grace with no eligible replacement',
        v_now
      );

      update public.account_deletion_challenge_holds
      set resolved_at = v_now, resolution = 'cancelled_challenge'
      where id = v_hold.id;
      v_cancelled := v_cancelled + 1;
      continue;
    end if;

    -- needs_transfer with zero eligible somehow → start grace instead of orphaning.
    if v_hold.hold_kind = 'needs_transfer' and v_eligible_count = 0 then
      raise exception 'DELETION_TRANSFER_REQUIRED';
    end if;

    raise exception 'DELETION_TRANSFER_REQUIRED';
  end loop;

  -- Any still-owned Active/Scheduled without a hold? Block.
  if exists (
    select 1
    from public.challenges c
    where c.owner_user_id = v_uid
      and c.lifecycle_status in ('Active', 'Scheduled')
  ) then
    raise exception 'DELETION_TRANSFER_REQUIRED';
  end if;

  perform public.anonymise_user_for_deletion(v_uid);

  update public.account_deletion_requests
  set status = 'completed',
      completed_at = v_now,
      updated_at = v_now,
      detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
        'cancelled_challenges', v_cancelled,
        'transferred_holds', v_transferred_holds,
        'finalised_at', v_now
      )
  where id = v_req.id
  returning * into v_req;

  return jsonb_build_object(
    'status', 'completed',
    'cancelled_challenges', v_cancelled,
    'transferred_holds', v_transferred_holds,
    'completed_at', v_req.completed_at
  );
end;
$$;

revoke all on function public.finalize_account_deletion(uuid) from public, anon;
grant execute on function public.finalize_account_deletion(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Request deletion (idempotent). Starts transfer requirement or 7-day grace.
-- ---------------------------------------------------------------------------
create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.account_deletion_requests%rowtype;
  v_chal record;
  v_eligible_count integer;
  v_grace_ends timestamptz;
  v_needs_transfer boolean := false;
  v_grace boolean := false;
  v_holds jsonb := '[]'::jsonb;
  v_notified integer := 0;
  v_final jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_req
  from public.account_deletion_requests
  where user_id = v_uid
  for update;

  if found and v_req.status = 'completed' then
    return jsonb_build_object(
      'status', 'completed',
      'idempotent', true,
      'completed_at', v_req.completed_at
    );
  end if;

  if not found then
    insert into public.account_deletion_requests (user_id, status)
    values (v_uid, 'ready')
    returning * into v_req;
  elsif v_req.status = 'cancelled' then
    update public.account_deletion_requests
    set status = 'ready',
        requested_at = now(),
        grace_ends_at = null,
        completed_at = null,
        updated_at = now(),
        detail = '{}'::jsonb
    where id = v_req.id
    returning * into v_req;
  end if;

  v_grace_ends := now() + interval '7 days';

  for v_chal in
    select c.*
    from public.challenges c
    where c.owner_user_id = v_uid
      and c.lifecycle_status in ('Active', 'Scheduled')
    for update
  loop
    select count(*)::integer into v_eligible_count
    from public.eligible_ownership_replacements(v_chal.id, v_uid);

    if v_eligible_count > 0 then
      v_needs_transfer := true;
      insert into public.account_deletion_challenge_holds (
        deletion_request_id, challenge_id, hold_kind
      ) values (
        v_req.id, v_chal.id, 'needs_transfer'
      )
      on conflict (deletion_request_id, challenge_id) do update
        set hold_kind = excluded.hold_kind,
            grace_ends_at = null,
            resolved_at = null,
            resolution = null
      where account_deletion_challenge_holds.resolved_at is null
         or account_deletion_challenge_holds.resolution is distinct from 'transferred';

      v_holds := v_holds || jsonb_build_array(jsonb_build_object(
        'challenge_id', v_chal.id,
        'name', v_chal.name,
        'lifecycle_status', v_chal.lifecycle_status,
        'hold_kind', 'needs_transfer',
        'eligible_replacements', v_eligible_count
      ));
    else
      v_grace := true;
      insert into public.account_deletion_challenge_holds (
        deletion_request_id, challenge_id, hold_kind, grace_ends_at
      ) values (
        v_req.id, v_chal.id, 'grace_no_replacement', v_grace_ends
      )
      on conflict (deletion_request_id, challenge_id) do update
        set hold_kind = 'grace_no_replacement',
            grace_ends_at = coalesce(
              account_deletion_challenge_holds.grace_ends_at,
              excluded.grace_ends_at
            ),
            resolved_at = null,
            resolution = null
      where account_deletion_challenge_holds.resolved_at is null;

      v_notified := v_notified + public.notify_owner_deletion_grace(
        v_chal.id, v_uid,
        coalesce(
          (select h.grace_ends_at
           from public.account_deletion_challenge_holds h
           where h.deletion_request_id = v_req.id and h.challenge_id = v_chal.id),
          v_grace_ends
        )
      );

      v_holds := v_holds || jsonb_build_array(jsonb_build_object(
        'challenge_id', v_chal.id,
        'name', v_chal.name,
        'lifecycle_status', v_chal.lifecycle_status,
        'hold_kind', 'grace_no_replacement',
        'grace_ends_at', coalesce(
          (select h.grace_ends_at
           from public.account_deletion_challenge_holds h
           where h.deletion_request_id = v_req.id and h.challenge_id = v_chal.id),
          v_grace_ends
        ),
        'eligible_replacements', 0
      ));
    end if;
  end loop;

  if v_needs_transfer then
    update public.account_deletion_requests
    set status = 'pending_transfer',
        grace_ends_at = case when v_grace then least(coalesce(grace_ends_at, v_grace_ends), v_grace_ends) else grace_ends_at end,
        updated_at = now(),
        detail = jsonb_build_object('holds', v_holds, 'notifications', v_notified)
    where id = v_req.id
    returning * into v_req;

    return jsonb_build_object(
      'status', 'pending_transfer',
      'request_id', v_req.id,
      'holds', v_holds,
      'message', 'Transfer ownership of Active/Scheduled challenges to an eligible approved member before deletion can finalise.'
    );
  end if;

  if v_grace then
    update public.account_deletion_requests
    set status = 'grace_pending',
        grace_ends_at = coalesce(
          (select min(h.grace_ends_at)
           from public.account_deletion_challenge_holds h
           where h.deletion_request_id = v_req.id and h.resolved_at is null),
          v_grace_ends
        ),
        updated_at = now(),
        detail = jsonb_build_object('holds', v_holds, 'notifications', v_notified)
    where id = v_req.id
    returning * into v_req;

    return jsonb_build_object(
      'status', 'grace_pending',
      'request_id', v_req.id,
      'grace_ends_at', v_req.grace_ends_at,
      'holds', v_holds,
      'notifications', v_notified,
      'message', 'No eligible replacement owner. Remaining members notified; 7-day grace started. A valid transfer during grace prevents cancellation.'
    );
  end if;

  update public.account_deletion_requests
  set status = 'ready',
      updated_at = now(),
      detail = jsonb_build_object('holds', v_holds)
  where id = v_req.id;

  v_final := public.finalize_account_deletion(v_uid);
  return v_final || jsonb_build_object('request_id', v_req.id);
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

-- ---------------------------------------------------------------------------
-- Status read + grace tick (service / lifecycle)
-- ---------------------------------------------------------------------------
create or replace function public.get_own_deletion_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.account_deletion_requests%rowtype;
  v_holds jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_req from public.account_deletion_requests where user_id = v_uid;
  if not found then
    return jsonb_build_object('status', 'none');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'challenge_id', h.challenge_id,
      'hold_kind', h.hold_kind,
      'grace_ends_at', h.grace_ends_at,
      'resolved_at', h.resolved_at,
      'resolution', h.resolution
    )
    order by h.created_at
  ), '[]'::jsonb)
  into v_holds
  from public.account_deletion_challenge_holds h
  where h.deletion_request_id = v_req.id;

  return jsonb_build_object(
    'status', v_req.status,
    'request_id', v_req.id,
    'requested_at', v_req.requested_at,
    'grace_ends_at', v_req.grace_ends_at,
    'completed_at', v_req.completed_at,
    'holds', v_holds,
    'detail', v_req.detail
  );
end;
$$;

revoke all on function public.get_own_deletion_status() from public, anon;
grant execute on function public.get_own_deletion_status() to authenticated;

create or replace function public.tick_account_deletion_grace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_ok integer := 0;
  v_skip integer := 0;
  v_err integer := 0;
  v_detail text;
begin
  for r in
    select id, user_id
    from public.account_deletion_requests
    where status = 'grace_pending'
      and grace_ends_at is not null
      and grace_ends_at <= now()
  loop
    begin
      perform public.finalize_account_deletion(r.user_id);
      v_ok := v_ok + 1;
    exception
      when others then
        get stacked diagnostics v_detail = message_text;
        if v_detail like '%DELETION_TRANSFER_REQUIRED%'
           or v_detail like '%DELETION_GRACE_ACTIVE%' then
          v_skip := v_skip + 1;
        else
          v_err := v_err + 1;
        end if;
    end;
  end loop;

  return jsonb_build_object(
    'finalised', v_ok,
    'skipped', v_skip,
    'errors', v_err
  );
end;
$$;

revoke all on function public.tick_account_deletion_grace() from public, anon, authenticated;
grant execute on function public.tick_account_deletion_grace() to service_role;

-- List eligible transferees for a challenge the caller owns.
create or replace function public.list_ownership_transfer_candidates(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_items jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if not exists (
    select 1 from public.challenges c
    where c.id = p_challenge_id and c.owner_user_id = v_uid
  ) then
    raise exception 'NOT_CHALLENGE_OWNER';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', e.user_id,
      'membership_id', e.membership_id,
      'display_name', coalesce(
        u.raw_user_meta_data->>'display_name',
        split_part(u.email, '@', 1),
        'Member'
      ),
      'email', u.email
    )
    order by coalesce(u.raw_user_meta_data->>'display_name', u.email)
  ), '[]'::jsonb)
  into v_items
  from public.eligible_ownership_replacements(p_challenge_id, v_uid) e
  join auth.users u on u.id = e.user_id;

  return jsonb_build_object('challenge_id', p_challenge_id, 'candidates', coalesce(v_items, '[]'::jsonb));
end;
$$;

revoke all on function public.list_ownership_transfer_candidates(uuid) from public, anon;
grant execute on function public.list_ownership_transfer_candidates(uuid) to authenticated;

comment on function public.request_account_deletion() is
  'ACC-01 Option A: request deletion; transfer or 7-day grace then cancel; finalise when clear.';
comment on function public.finalize_account_deletion(uuid) is
  'Recheck ownership/lifecycle; cancel only if grace expired with no replacement; anonymise identity.';
comment on function public.transfer_challenge_ownership(uuid, uuid) is
  'Authorised audited ownership transfer; resolves deletion grace holds (prevents cancel).';
