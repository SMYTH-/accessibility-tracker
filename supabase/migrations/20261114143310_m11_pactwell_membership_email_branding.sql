-- Brand membership approve/reject outbox copy as Pactwell (naming pass only).
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
    v_subject := format('Pactwell — Membership approved — %s', p_challenge_name);
    v_body := format(
      'Your request to join "%s" on Pactwell was approved. You are an approved member; savings setup is still required before recording contributions.',
      p_challenge_name
    );
  elsif p_kind = 'membership_rejected' then
    v_subject := format('Pactwell — Membership declined — %s', p_challenge_name);
    v_body := format(
      'Your request to join "%s" on Pactwell was declined. You do not have access to this private challenge.',
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
