-- M10 follow-up: immediate dual-session revocation for account deletion.
-- While revocation is pending, access is denied; completed only after revoke succeeds.
-- Retry-safe. Stop before M11.

-- ---------------------------------------------------------------------------
-- Status: revoking = access denied, deletion not yet reportable as complete
-- ---------------------------------------------------------------------------
alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in (
    'pending_transfer',
    'grace_pending',
    'ready',
    'revoking',
    'completed',
    'cancelled'
  ));

alter table public.account_deletion_requests
  add column if not exists revocation_error text null;

alter table public.account_deletion_requests
  add column if not exists sessions_revoked_at timestamptz null;

-- ---------------------------------------------------------------------------
-- Access denial while revoking or completed
-- ---------------------------------------------------------------------------
create or replace function public.account_access_is_denied(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.account_deletion_requests r
    where r.user_id = p_user_id
      and r.status in ('revoking', 'completed')
  );
$$;

revoke all on function public.account_access_is_denied(uuid) from public, anon;
grant execute on function public.account_access_is_denied(uuid)
  to authenticated, service_role;

create or replace function public.assert_account_access_allowed()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;
  if public.account_access_is_denied(v_uid) then
    raise exception 'ACCOUNT_ACCESS_REVOKED' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.assert_account_access_allowed() from public, anon;
grant execute on function public.assert_account_access_allowed()
  to authenticated, service_role;

-- PostgREST pre-request: deny Data API / RPC calls for revoked accounts.
-- Allow deletion finalise retry + status probes while status = revoking.
create or replace function public.enforce_account_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text := coalesce(current_setting('request.path', true), '');
begin
  if v_path ~* 'finalize_account_deletion'
     or v_path ~* 'get_own_deletion_status'
     or v_path ~* 'account_access_denied_for_me' then
    return;
  end if;
  perform public.assert_account_access_allowed();
end;
$$;

revoke all on function public.enforce_account_access() from public, anon, authenticated;
grant execute on function public.enforce_account_access() to authenticator, service_role;

do $$
begin
  execute $q$alter role authenticator set pgrst.db_pre_request = 'public.enforce_account_access'$q$;
exception
  when insufficient_privilege then
    raise notice 'M10: could not ALTER ROLE authenticator for db_pre_request; per-RPC asserts still apply';
  when others then
    raise notice 'M10: db_pre_request setup skipped: %', sqlerrm;
end;
$$;

notify pgrst, 'reload config';

-- ---------------------------------------------------------------------------
-- Session / refresh revocation (must succeed before completed)
-- ---------------------------------------------------------------------------
create or replace function public.revoke_auth_sessions_for_deletion(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_sessions integer := 0;
  v_refresh integer := 0;
  v_err text := null;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'USER_REQUIRED');
  end if;

  begin
    delete from auth.sessions where user_id = p_user_id;
    get diagnostics v_sessions = row_count;
  exception
    when undefined_table then
      v_err := 'AUTH_SESSIONS_TABLE_MISSING';
    when others then
      v_err := 'AUTH_SESSIONS_DELETE_FAILED:' || sqlerrm;
  end;

  if v_err is not null then
    return jsonb_build_object('ok', false, 'error', v_err, 'sessions_deleted', v_sessions);
  end if;

  begin
    delete from auth.refresh_tokens where user_id = p_user_id;
    get diagnostics v_refresh = row_count;
  exception
    when undefined_table then
      v_err := 'AUTH_REFRESH_TABLE_MISSING';
    when others then
      v_err := 'AUTH_REFRESH_DELETE_FAILED:' || sqlerrm;
  end;

  if v_err is not null then
    return jsonb_build_object(
      'ok', false,
      'error', v_err,
      'sessions_deleted', v_sessions,
      'refresh_deleted', v_refresh
    );
  end if;

  -- Ban only after session rows are cleared so getUser/refresh fail for peers.
  begin
    update auth.users
    set banned_until = 'infinity'::timestamptz,
        updated_at = now()
    where id = p_user_id;
  exception
    when others then
      return jsonb_build_object(
        'ok', false,
        'error', 'AUTH_BAN_FAILED:' || sqlerrm,
        'sessions_deleted', v_sessions,
        'refresh_deleted', v_refresh
      );
  end;

  return jsonb_build_object(
    'ok', true,
    'sessions_deleted', v_sessions,
    'refresh_deleted', v_refresh,
    'banned', true
  );
end;
$$;

revoke all on function public.revoke_auth_sessions_for_deletion(uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_auth_sessions_for_deletion(uuid) to service_role;

-- Anonymise identity without deleting sessions (sessions handled separately).
create or replace function public.anonymise_user_for_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
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

  update public.challenges
  set owner_user_id = null,
      updated_at = now()
  where owner_user_id = p_user_id;

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

  delete from public.notification_outbox where recipient_user_id = p_user_id;

  update auth.users
  set
    email = 'deleted-' || p_user_id::text || '@invalid.local',
    encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf')),
    email_confirmed_at = null,
    phone = null,
    raw_user_meta_data = jsonb_build_object('display_name', 'Deleted user', 'deleted', true),
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('banned', true, 'deletion_revoking', true),
    updated_at = now()
  where id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Finalise: revoking → revoke sessions → completed only on success (retryable)
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
  v_revoke jsonb;
  v_already_revoking boolean := false;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

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
      'completed_at', v_req.completed_at,
      'sessions_revoked_at', v_req.sessions_revoked_at
    );
  end if;
  if v_req.status = 'cancelled' then
    raise exception 'DELETION_REQUEST_CANCELLED';
  end if;

  v_already_revoking := (v_req.status = 'revoking');

  -- Retry path: ownership/anonymise already done; only retry session revocation.
  if not v_already_revoking then
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

      if v_chal.owner_user_id is distinct from v_uid then
        update public.account_deletion_challenge_holds
        set resolved_at = v_now, resolution = 'transferred'
        where id = v_hold.id;
        v_transferred_holds := v_transferred_holds + 1;
        continue;
      end if;

      if v_chal.lifecycle_status not in ('Active', 'Scheduled') then
        update public.account_deletion_challenge_holds
        set resolved_at = v_now, resolution = 'lifecycle_non_blocking'
        where id = v_hold.id;
        continue;
      end if;

      select count(*)::integer into v_eligible_count
      from public.eligible_ownership_replacements(v_chal.id, v_uid);

      if v_eligible_count > 0 then
        raise exception 'DELETION_TRANSFER_REQUIRED';
      end if;

      if v_hold.hold_kind = 'grace_no_replacement' then
        if v_hold.grace_ends_at is null or v_hold.grace_ends_at > v_now then
          raise exception 'DELETION_GRACE_ACTIVE';
        end if;
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

      raise exception 'DELETION_TRANSFER_REQUIRED';
    end loop;

    if exists (
      select 1
      from public.challenges c
      where c.owner_user_id = v_uid
        and c.lifecycle_status in ('Active', 'Scheduled')
    ) then
      raise exception 'DELETION_TRANSFER_REQUIRED';
    end if;

    -- Enter revoking: access denied immediately; not yet complete.
    update public.account_deletion_requests
    set status = 'revoking',
        updated_at = v_now,
        revocation_error = null,
        detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
          'cancelled_challenges', v_cancelled,
          'transferred_holds', v_transferred_holds,
          'revoking_at', v_now
        )
    where id = v_req.id
    returning * into v_req;

    perform public.anonymise_user_for_deletion(v_uid);
  end if;

  v_revoke := public.revoke_auth_sessions_for_deletion(v_uid);

  if coalesce((v_revoke->>'ok')::boolean, false) is not true then
    update public.account_deletion_requests
    set status = 'revoking',
        revocation_error = coalesce(v_revoke->>'error', 'SESSION_REVOCATION_FAILED'),
        updated_at = now(),
        detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
          'revocation_attempt_at', now(),
          'revocation_result', v_revoke
        )
    where id = v_req.id
    returning * into v_req;

    return jsonb_build_object(
      'status', 'revoking',
      'request_id', v_req.id,
      'revocation_error', v_req.revocation_error,
      'message', 'Access revoked pending successful session revocation. Retry finalise; deletion is not complete until sessions are revoked.'
    );
  end if;

  update public.account_deletion_requests
  set status = 'completed',
      completed_at = v_now,
      sessions_revoked_at = v_now,
      revocation_error = null,
      updated_at = v_now,
      detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object(
        'revocation_result', v_revoke,
        'finalised_at', v_now
      )
  where id = v_req.id
  returning * into v_req;

  return jsonb_build_object(
    'status', 'completed',
    'cancelled_challenges', coalesce((v_req.detail->>'cancelled_challenges')::int, v_cancelled),
    'transferred_holds', coalesce((v_req.detail->>'transferred_holds')::int, v_transferred_holds),
    'completed_at', v_req.completed_at,
    'sessions_revoked_at', v_req.sessions_revoked_at
  );
end;
$$;

-- Export must deny revoked accounts even if pre-request is unavailable.
create or replace function public.export_own_personal_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile jsonb;
  v_memberships jsonb;
  v_challenges jsonb;
  v_savings jsonb;
  v_contributions jsonb;
  v_revisions jsonb;
  v_assessments jsonb;
  v_milestones jsonb;
  v_invites jsonb;
  v_rate jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  perform public.assert_account_access_allowed();

  v_rate := public.consume_rate_limit('account.export', v_uid::text, 5, 3600);
  if coalesce((v_rate->>'allowed')::boolean, false) is not true then
    raise exception 'RATE_LIMITED';
  end if;

  select jsonb_build_object(
    'user_id', u.id,
    'email', u.email,
    'display_name', coalesce(
      u.raw_user_meta_data->>'display_name',
      split_part(u.email, '@', 1),
      'Member'
    ),
    'email_confirmed_at', u.email_confirmed_at,
    'created_at', u.created_at
  )
  into v_profile
  from auth.users u
  where u.id = v_uid;

  if v_profile is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'membership_id', m.id,
      'challenge_id', m.challenge_id,
      'role', m.role,
      'status', m.status,
      'savings_participation_active', m.savings_participation_active,
      'share_monetary_info', m.share_monetary_info,
      'created_at', m.created_at,
      'updated_at', m.updated_at
    )
    order by m.created_at
  ), '[]'::jsonb)
  into v_memberships
  from public.challenge_memberships m
  where m.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'challenge_id', c.id,
      'name', c.name,
      'description', c.description,
      'start_date', c.start_date,
      'end_date', c.end_date,
      'currency', c.currency,
      'time_zone', c.time_zone,
      'lifecycle_status', c.lifecycle_status,
      'visibility', c.visibility,
      'is_owner', (c.owner_user_id = v_uid),
      'created_at', c.created_at
    )
    order by c.created_at
  ), '[]'::jsonb)
  into v_challenges
  from public.challenges c
  where exists (
    select 1
    from public.challenge_memberships m
    where m.challenge_id = c.id
      and m.user_id = v_uid
  );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'membership_id', s.membership_id,
      'challenge_id', s.challenge_id,
      'target_minor', s.target_minor,
      'weekly_commitment_minor', s.weekly_commitment_minor,
      'activated_at', s.activated_at,
      'first_assessed_week_start', s.first_assessed_week_start,
      'target_effective_from', s.target_effective_from,
      'updated_at', s.updated_at
    )
    order by s.activated_at
  ), '[]'::jsonb)
  into v_savings
  from public.membership_savings_setup s
  where s.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'contribution_id', c.id,
      'challenge_id', c.challenge_id,
      'membership_id', c.membership_id,
      'amount_minor', c.amount_minor,
      'currency', c.currency,
      'contribution_date', c.contribution_date,
      'week_start', c.week_start,
      'status', c.status,
      'source_label', c.source_label,
      'idempotency_key', c.idempotency_key,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'reversed_at', c.reversed_at
    )
    order by c.contribution_date, c.created_at
  ), '[]'::jsonb)
  into v_contributions
  from public.contributions c
  where c.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'revision_id', r.id,
      'contribution_id', r.contribution_id,
      'challenge_id', r.challenge_id,
      'action', r.action,
      'from_amount_minor', r.from_amount_minor,
      'to_amount_minor', r.to_amount_minor,
      'from_status', r.from_status,
      'to_status', r.to_status,
      'contribution_date', r.contribution_date,
      'week_start', r.week_start,
      'detail', r.detail,
      'at', r.at
    )
    order by r.at
  ), '[]'::jsonb)
  into v_revisions
  from public.contribution_revisions r
  join public.contributions c on c.id = r.contribution_id
  where c.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'assessment_id', a.id,
      'challenge_id', a.challenge_id,
      'membership_id', a.membership_id,
      'week_start', a.week_start,
      'status', a.status,
      'eligible_sum_minor', a.eligible_sum_minor,
      'commitment_minor', a.commitment_minor,
      'week_closed', a.week_closed,
      'computed_at', a.computed_at
    )
    order by a.week_start
  ), '[]'::jsonb)
  into v_assessments
  from public.weekly_commitment_assessments a
  where a.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'announcement_id', p.id,
      'challenge_id', p.challenge_id,
      'membership_id', p.membership_id,
      'milestone_percent', p.milestone_percent,
      'announced_at', p.announced_at,
      'source_contribution_id', p.source_contribution_id
    )
    order by p.announced_at
  ), '[]'::jsonb)
  into v_milestones
  from public.progress_milestone_announcements p
  where p.user_id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'invitation_id', i.id,
      'challenge_id', i.challenge_id,
      'expires_at', i.expires_at,
      'created_at', i.created_at,
      'revoked_at', i.revoked_at,
      'is_revoked', (i.revoked_at is not null)
    )
    order by i.created_at
  ), '[]'::jsonb)
  into v_invites
  from public.challenge_invitations i
  where i.created_by = v_uid;

  return jsonb_build_object(
    'schema_version', 1,
    'exported_at', now(),
    'subject_user_id', v_uid,
    'scope', 'personal_authorised_only',
    'privacy_note',
      'Contains only the requester''s personal records and challenge descriptors for memberships they hold. Other members'' emails, amounts, targets, and private monetary fields are excluded (ACC-01 / G1.1-06).',
    'profile', v_profile,
    'memberships', coalesce(v_memberships, '[]'::jsonb),
    'challenges', coalesce(v_challenges, '[]'::jsonb),
    'savings_setups', coalesce(v_savings, '[]'::jsonb),
    'contributions', coalesce(v_contributions, '[]'::jsonb),
    'contribution_revisions', coalesce(v_revisions, '[]'::jsonb),
    'weekly_assessments', coalesce(v_assessments, '[]'::jsonb),
    'progress_milestones', coalesce(v_milestones, '[]'::jsonb),
    'invitations_created', coalesce(v_invites, '[]'::jsonb),
    'rate_limit', v_rate
  );
end;
$$;

-- Lightweight status helper for app middleware / getCurrentUser.
create or replace function public.account_access_denied_for_me()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;
  return public.account_access_is_denied(v_uid);
end;
$$;

revoke all on function public.account_access_denied_for_me() from public, anon;
grant execute on function public.account_access_denied_for_me() to authenticated;

comment on function public.finalize_account_deletion(uuid) is
  'Option A finalise: enter revoking (access denied), revoke sessions, completed only on successful revocation; retryable.';
comment on function public.revoke_auth_sessions_for_deletion(uuid) is
  'Deletes auth sessions + refresh tokens and bans user; failure keeps deletion in revoking.';
