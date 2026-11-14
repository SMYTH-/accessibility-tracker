-- M3: invitations, membership requests, disclosure ack, leave/remove, NOTIF outbox
-- Specs: CHAL-02/03, PRIV-01 disclosure, G1.1-07/13/14, NOTIF-01. Stop before M4.

-- ---------------------------------------------------------------------------
-- Columns on memberships
-- ---------------------------------------------------------------------------
alter table public.challenge_memberships
  add column if not exists privacy_disclosure_acked_at timestamptz null,
  add column if not exists invitation_id uuid null,
  add column if not exists requested_at timestamptz null,
  add column if not exists decided_at timestamptz null,
  add column if not exists decided_by uuid null references auth.users (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_invitations (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint challenge_invitations_expiry_after_create check (expires_at > created_at)
);

create index if not exists challenge_invitations_challenge_idx
  on public.challenge_invitations (challenge_id, created_at desc);

alter table public.challenge_memberships
  drop constraint if exists challenge_memberships_invitation_fk;
alter table public.challenge_memberships
  add constraint challenge_memberships_invitation_fk
  foreign key (invitation_id) references public.challenge_invitations (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Membership audit + notification outbox (NOTIF-01)
-- ---------------------------------------------------------------------------
create table if not exists public.membership_audit (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  membership_id uuid null references public.challenge_memberships (id) on delete set null,
  actor_user_id uuid null references auth.users (id) on delete set null,
  subject_user_id uuid null references auth.users (id) on delete set null,
  action text not null,
  from_status public.membership_status null,
  to_status public.membership_status null,
  detail text not null default '',
  at timestamptz not null default now()
);

create index if not exists membership_audit_challenge_idx
  on public.membership_audit (challenge_id, at);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('membership_approved', 'membership_rejected')),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  membership_id uuid null references public.challenge_memberships (id) on delete set null,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'recorded'
    check (status in ('recorded', 'queued', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz null,
  error text null
);

create index if not exists notification_outbox_recipient_idx
  on public.notification_outbox (recipient_user_id, created_at desc);

alter table public.challenge_invitations enable row level security;
alter table public.membership_audit enable row level security;
alter table public.notification_outbox enable row level security;

-- No direct client mutations; RPCs only.
revoke insert, update, delete on public.challenge_invitations from authenticated, anon;
revoke insert, update, delete on public.membership_audit from authenticated, anon;
revoke insert, update, delete on public.notification_outbox from authenticated, anon;

-- Owners can list their challenge invites; invitees never read token_hash via table.
drop policy if exists invitations_select_owner on public.challenge_invitations;
create policy invitations_select_owner
  on public.challenge_invitations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.challenge_memberships m
      where m.challenge_id = challenge_invitations.challenge_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
        and m.status = 'approved'
    )
  );

drop policy if exists membership_audit_select_own_challenge on public.membership_audit;
create policy membership_audit_select_own_challenge
  on public.membership_audit
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.challenge_memberships m
      where m.challenge_id = membership_audit.challenge_id
        and m.user_id = auth.uid()
        and m.status = 'approved'
    )
  );

drop policy if exists notification_outbox_select_own on public.notification_outbox;
create policy notification_outbox_select_own
  on public.notification_outbox
  for select
  to authenticated
  using (recipient_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.sha256_hex(p_text text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(convert_to(p_text, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.approved_participant_count(p_challenge_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.challenge_memberships m
  where m.challenge_id = p_challenge_id
    and m.status = 'approved';
$$;

create or replace function public.require_challenge_owner(p_challenge_id uuid)
returns public.challenge_memberships
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
  where challenge_id = p_challenge_id
    and user_id = v_uid
    and role = 'owner'
    and status = 'approved';
  if not found then
    raise exception 'OWNER_REQUIRED' using errcode = '42501';
  end if;
  return v_mem;
end;
$$;

create or replace function public.enqueue_membership_notification(
  p_kind text,
  p_challenge_id uuid,
  p_membership_id uuid,
  p_recipient_user_id uuid,
  p_challenge_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_subject text;
  v_body text;
  v_id uuid;
begin
  select email into v_email from auth.users where id = p_recipient_user_id;
  if v_email is null then
    raise exception 'RECIPIENT_EMAIL_MISSING';
  end if;

  if p_kind = 'membership_approved' then
    v_subject := format('Membership approved — %s', p_challenge_name);
    v_body := format(
      'Your request to join "%s" was approved. You are an approved member; savings setup is still required before recording contributions.',
      p_challenge_name
    );
  elsif p_kind = 'membership_rejected' then
    v_subject := format('Membership declined — %s', p_challenge_name);
    v_body := format(
      'Your request to join "%s" was declined. You do not have access to this private challenge.',
      p_challenge_name
    );
  else
    raise exception 'UNKNOWN_NOTIFICATION_KIND';
  end if;

  insert into public.notification_outbox (
    kind, challenge_id, membership_id, recipient_user_id, recipient_email,
    subject, body, status, created_at
  ) values (
    p_kind, p_challenge_id, p_membership_id, p_recipient_user_id, v_email,
    v_subject, v_body, 'recorded', now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Create invite (default 7-day expiry) — returns plaintext token once
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Revoke invite
-- ---------------------------------------------------------------------------
create or replace function public.revoke_challenge_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.challenge_invitations%rowtype;
begin
  select * into v_inv from public.challenge_invitations where id = p_invitation_id;
  if not found then
    raise exception 'INVITE_NOT_FOUND';
  end if;

  perform public.require_challenge_owner(v_inv.challenge_id);

  if v_inv.revoked_at is not null then
    return jsonb_build_object('invitation', to_jsonb(v_inv), 'already_revoked', true);
  end if;

  update public.challenge_invitations
    set revoked_at = now()
    where id = p_invitation_id
    returning * into v_inv;

  insert into public.membership_audit (
    challenge_id, actor_user_id, action, detail, at
  ) values (
    v_inv.challenge_id, auth.uid(), 'invite_revoked',
    format('Invite %s revoked', v_inv.id), now()
  );

  return jsonb_build_object('invitation', to_jsonb(v_inv), 'already_revoked', false);
end;
$$;

revoke all on function public.revoke_challenge_invitation(uuid) from public;
grant execute on function public.revoke_challenge_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Preview — G1.1-07 fields only; works for anon + authenticated
-- ---------------------------------------------------------------------------
create or replace function public.get_invitation_preview(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.challenge_invitations%rowtype;
  v_c public.challenges%rowtype;
  v_hash text;
begin
  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'INVITE_INVALID';
  end if;

  v_hash := public.sha256_hex(trim(p_token));
  select * into v_inv from public.challenge_invitations where token_hash = v_hash;
  if not found then
    raise exception 'INVITE_INVALID';
  end if;
  if v_inv.revoked_at is not null then
    raise exception 'INVITE_REVOKED';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'INVITE_EXPIRED';
  end if;

  select * into v_c from public.challenges where id = v_inv.challenge_id;
  if not found then
    raise exception 'INVITE_INVALID';
  end if;

  -- Never include currency, TZ, owner id, amounts, targets, or financials.
  return jsonb_build_object(
    'invitation_id', v_inv.id,
    'challenge_id', v_c.id,
    'name', v_c.name,
    'description', v_c.description,
    'start_date', v_c.start_date,
    'end_date', v_c.end_date,
    'participant_count', public.approved_participant_count(v_c.id),
    'expires_at', v_inv.expires_at
  );
end;
$$;

revoke all on function public.get_invitation_preview(text) from public;
grant execute on function public.get_invitation_preview(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Request membership — requires privacy disclosure ack (PRIV-01)
-- ---------------------------------------------------------------------------
create or replace function public.request_challenge_membership(
  p_token text,
  p_privacy_ack boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_inv public.challenge_invitations%rowtype;
  v_c public.challenges%rowtype;
  v_mem public.challenge_memberships%rowtype;
  v_created boolean := false;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  if coalesce(p_privacy_ack, false) is not true then
    raise exception 'PRIVACY_ACK_REQUIRED';
  end if;
  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'INVITE_INVALID';
  end if;

  v_hash := public.sha256_hex(trim(p_token));
  select * into v_inv from public.challenge_invitations where token_hash = v_hash;
  if not found then
    raise exception 'INVITE_INVALID';
  end if;
  if v_inv.revoked_at is not null then
    raise exception 'INVITE_REVOKED';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'INVITE_EXPIRED';
  end if;

  select * into v_c from public.challenges where id = v_inv.challenge_id;
  if not found then
    raise exception 'INVITE_INVALID';
  end if;
  if v_c.lifecycle_status in ('Cancelled', 'Completed') then
    raise exception 'CHALLENGE_CLOSED';
  end if;

  select * into v_mem
  from public.challenge_memberships
  where challenge_id = v_c.id and user_id = v_uid;

  if found then
    if v_mem.status = 'approved' then
      raise exception 'ALREADY_MEMBER';
    end if;
    if v_mem.status = 'pending' then
      -- Safe retry: refresh ack timestamp, keep single membership row.
      update public.challenge_memberships
        set privacy_disclosure_acked_at = now(),
            invitation_id = v_inv.id,
            requested_at = coalesce(requested_at, now()),
            updated_at = now()
        where id = v_mem.id
        returning * into v_mem;
      return jsonb_build_object(
        'membership', to_jsonb(v_mem),
        'created', false,
        'preview', jsonb_build_object(
          'name', v_c.name,
          'description', v_c.description,
          'start_date', v_c.start_date,
          'end_date', v_c.end_date,
          'participant_count', public.approved_participant_count(v_c.id)
        )
      );
    end if;
    -- declined / left / removed → re-request as pending (still one row).
    update public.challenge_memberships
      set role = 'member',
          status = 'pending',
          savings_participation_active = false,
          share_monetary_info = true,
          privacy_disclosure_acked_at = now(),
          invitation_id = v_inv.id,
          requested_at = now(),
          decided_at = null,
          decided_by = null,
          updated_at = now()
      where id = v_mem.id
      returning * into v_mem;
    v_created := true;
  else
    insert into public.challenge_memberships (
      challenge_id, user_id, role, status,
      savings_participation_active, share_monetary_info,
      privacy_disclosure_acked_at, invitation_id, requested_at,
      created_at, updated_at
    ) values (
      v_c.id, v_uid, 'member', 'pending',
      false, true,
      now(), v_inv.id, now(),
      now(), now()
    )
    returning * into v_mem;
    v_created := true;
  end if;

  insert into public.membership_audit (
    challenge_id, membership_id, actor_user_id, subject_user_id,
    action, from_status, to_status, detail, at
  ) values (
    v_c.id, v_mem.id, v_uid, v_uid,
    'membership_requested', null, 'pending',
    'Privacy disclosure acknowledged; awaiting owner decision',
    now()
  );

  return jsonb_build_object(
    'membership', to_jsonb(v_mem),
    'created', v_created,
    'preview', jsonb_build_object(
      'name', v_c.name,
      'description', v_c.description,
      'start_date', v_c.start_date,
      'end_date', v_c.end_date,
      'participant_count', public.approved_participant_count(v_c.id)
    )
  );
exception
  when unique_violation then
    -- Concurrent safe retry
    select * into v_mem
    from public.challenge_memberships
    where challenge_id = v_c.id and user_id = v_uid;
    return jsonb_build_object(
      'membership', to_jsonb(v_mem),
      'created', false,
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

revoke all on function public.request_challenge_membership(text, boolean) from public;
grant execute on function public.request_challenge_membership(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Owner decide approve / decline
-- ---------------------------------------------------------------------------
create or replace function public.decide_membership_request(
  p_membership_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mem public.challenge_memberships%rowtype;
  v_c public.challenges%rowtype;
  v_from public.membership_status;
  v_to public.membership_status;
  v_notif uuid;
begin
  if p_decision not in ('approve', 'decline') then
    raise exception 'DECISION_INVALID';
  end if;

  select * into v_mem from public.challenge_memberships where id = p_membership_id;
  if not found then
    raise exception 'MEMBERSHIP_NOT_FOUND';
  end if;

  perform public.require_challenge_owner(v_mem.challenge_id);

  if v_mem.status <> 'pending' then
    -- Idempotent if already in desired terminal decision
    if (p_decision = 'approve' and v_mem.status = 'approved')
       or (p_decision = 'decline' and v_mem.status = 'declined') then
      select * into v_c from public.challenges where id = v_mem.challenge_id;
      return jsonb_build_object(
        'membership', to_jsonb(v_mem),
        'already_decided', true,
        'challenge_name', v_c.name
      );
    end if;
    raise exception 'MEMBERSHIP_NOT_PENDING';
  end if;

  select * into v_c from public.challenges where id = v_mem.challenge_id;
  v_from := v_mem.status;
  v_to := case when p_decision = 'approve' then 'approved'::public.membership_status
               else 'declined'::public.membership_status end;

  update public.challenge_memberships
    set status = v_to,
        -- Approval never activates savings (M4).
        savings_participation_active = false,
        decided_at = now(),
        decided_by = auth.uid(),
        updated_at = now()
    where id = v_mem.id
    returning * into v_mem;

  insert into public.membership_audit (
    challenge_id, membership_id, actor_user_id, subject_user_id,
    action, from_status, to_status, detail, at
  ) values (
    v_c.id, v_mem.id, auth.uid(), v_mem.user_id,
    case when p_decision = 'approve' then 'membership_approved' else 'membership_declined' end,
    v_from, v_to,
    case when p_decision = 'approve'
      then 'Owner approved; savings participation remains inactive'
      else 'Owner declined; no challenge access'
    end,
    now()
  );

  v_notif := public.enqueue_membership_notification(
    case when p_decision = 'approve' then 'membership_approved' else 'membership_rejected' end,
    v_c.id,
    v_mem.id,
    v_mem.user_id,
    v_c.name
  );

  return jsonb_build_object(
    'membership', to_jsonb(v_mem),
    'already_decided', false,
    'notification_id', v_notif,
    'challenge_name', v_c.name
  );
end;
$$;

revoke all on function public.decide_membership_request(uuid, text) from public;
grant execute on function public.decide_membership_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Leave (G1.1-13: block owner leave while Scheduled/Active)
-- ---------------------------------------------------------------------------
create or replace function public.leave_challenge(p_challenge_id uuid)
returns jsonb
language plpgsql
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
  if not found or v_mem.status not in ('approved', 'pending') then
    raise exception 'NOT_A_MEMBER';
  end if;

  select * into v_c from public.challenges where id = p_challenge_id;

  if v_mem.role = 'owner' and v_mem.status = 'approved'
     and v_c.lifecycle_status in ('Scheduled', 'Active') then
    -- Ownership transfer / deletion fallback remain OPEN — block only.
    raise exception 'OWNER_LEAVE_REQUIRES_TRANSFER';
  end if;

  update public.challenge_memberships
    set status = 'left',
        savings_participation_active = false,
        updated_at = now()
    where id = v_mem.id
    returning * into v_mem;

  -- If owner of Draft/Completed/Cancelled leaves, clear owner marker is OPEN;
  -- still revoke their membership access immediately.
  insert into public.membership_audit (
    challenge_id, membership_id, actor_user_id, subject_user_id,
    action, from_status, to_status, detail, at
  ) values (
    p_challenge_id, v_mem.id, v_uid, v_uid,
    'membership_left', 'approved', 'left',
    'Member left; access revoked immediately',
    now()
  );

  return jsonb_build_object('membership', to_jsonb(v_mem));
end;
$$;

revoke all on function public.leave_challenge(uuid) from public;
grant execute on function public.leave_challenge(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Owner remove member — immediate access revoke
-- ---------------------------------------------------------------------------
create or replace function public.remove_challenge_member(p_membership_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mem public.challenge_memberships%rowtype;
  v_from public.membership_status;
begin
  select * into v_mem from public.challenge_memberships where id = p_membership_id;
  if not found then
    raise exception 'MEMBERSHIP_NOT_FOUND';
  end if;

  perform public.require_challenge_owner(v_mem.challenge_id);

  if v_mem.user_id = auth.uid() then
    raise exception 'CANNOT_REMOVE_SELF';
  end if;
  if v_mem.role = 'owner' then
    raise exception 'CANNOT_REMOVE_OWNER';
  end if;
  if v_mem.status in ('removed', 'left') then
    return jsonb_build_object('membership', to_jsonb(v_mem), 'already_removed', true);
  end if;

  v_from := v_mem.status;
  update public.challenge_memberships
    set status = 'removed',
        savings_participation_active = false,
        decided_at = coalesce(decided_at, now()),
        decided_by = auth.uid(),
        updated_at = now()
    where id = v_mem.id
    returning * into v_mem;

  insert into public.membership_audit (
    challenge_id, membership_id, actor_user_id, subject_user_id,
    action, from_status, to_status, detail, at
  ) values (
    v_mem.challenge_id, v_mem.id, auth.uid(), v_mem.user_id,
    'membership_removed', v_from, 'removed',
    'Owner removed member; access revoked immediately',
    now()
  );

  return jsonb_build_object('membership', to_jsonb(v_mem), 'already_removed', false);
end;
$$;

revoke all on function public.remove_challenge_member(uuid) from public;
grant execute on function public.remove_challenge_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Owner admin listing (pending + members) — no financial fields
-- ---------------------------------------------------------------------------
create or replace function public.list_challenge_membership_admin(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_challenge_owner(p_challenge_id);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'challenge_id', m.challenge_id,
        'user_id', m.user_id,
        'role', m.role,
        'status', m.status,
        'savings_participation_active', m.savings_participation_active,
        'share_monetary_info', m.share_monetary_info,
        'privacy_disclosure_acked_at', m.privacy_disclosure_acked_at,
        'requested_at', m.requested_at,
        'decided_at', m.decided_at,
        'created_at', m.created_at,
        'updated_at', m.updated_at,
        'display_name', coalesce(
          u.raw_user_meta_data->>'display_name',
          split_part(u.email, '@', 1)
        ),
        'email', u.email
      )
      order by m.created_at asc
    )
    from public.challenge_memberships m
    join auth.users u on u.id = m.user_id
    where m.challenge_id = p_challenge_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_challenge_membership_admin(uuid) from public;
grant execute on function public.list_challenge_membership_admin(uuid) to authenticated;

create or replace function public.list_challenge_invitations(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_challenge_owner(p_challenge_id);
  return coalesce((
    select jsonb_agg(to_jsonb(i) order by i.created_at desc)
    from public.challenge_invitations i
    where i.challenge_id = p_challenge_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_challenge_invitations(uuid) from public;
grant execute on function public.list_challenge_invitations(uuid) to authenticated;

-- Own membership row for any status (pending wait UI without financial challenge read)
create or replace function public.get_own_challenge_membership(p_challenge_id uuid)
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
  where challenge_id = p_challenge_id and user_id = v_uid;
  if not found then
    return null;
  end if;
  return to_jsonb(v_mem);
end;
$$;

revoke all on function public.get_own_challenge_membership(uuid) from public;
grant execute on function public.get_own_challenge_membership(uuid) to authenticated;
