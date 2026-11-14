-- M11 security hardening (independent review F-02, F-03, F-04).
-- No product-rule changes — grant/authz tightening only.

-- F-04: deletion-status oracle — do not expose arbitrary-uuid probe to anon/authenticated.
-- Callers use account_access_denied_for_me(); authenticator pre-request keeps execute.
revoke all on function public.account_access_is_denied(uuid)
  from public, anon, authenticated;
grant execute on function public.account_access_is_denied(uuid)
  to postgres, service_role;
do $$
begin
  execute 'grant execute on function public.account_access_is_denied(uuid) to authenticator';
exception
  when undefined_object then
    raise notice 'authenticator role missing — grant skipped';
  when others then
    raise notice 'authenticator grant notice: %', sqlerrm;
end;
$$;

-- F-03: eligible replacements — internal helper only (SECURITY DEFINER callers retain access).
revoke all on function public.eligible_ownership_replacements(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.eligible_ownership_replacements(uuid, uuid)
  to postgres, service_role;

-- F-02: authenticated callers may only consume buckets for their own uid/email;
-- service_role (cron / pre-auth admin client) retains unrestricted subjects.
create or replace function public.consume_rate_limit(
  p_action text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_now timestamptz := now();
  v_row public.action_rate_buckets%rowtype;
  v_limit integer := greatest(coalesce(p_limit, 1), 1);
  v_window integer := greatest(coalesce(p_window_seconds, 60), 1);
  v_uid uuid := auth.uid();
  v_role text := coalesce(auth.role(), '');
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_subject text := lower(trim(coalesce(p_subject, '')));
begin
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'RATE_ACTION_REQUIRED';
  end if;
  if length(v_subject) = 0 then
    raise exception 'RATE_SUBJECT_REQUIRED';
  end if;

  if v_role is distinct from 'service_role' then
    if v_uid is null then
      raise exception 'RATE_AUTH_REQUIRED';
    end if;
    if v_subject is distinct from lower(v_uid::text)
       and (v_email = '' or v_subject is distinct from v_email) then
      raise exception 'RATE_SUBJECT_FORBIDDEN';
    end if;
  end if;

  v_key := lower(trim(p_action)) || ':' || v_subject;

  select * into v_row
  from public.action_rate_buckets
  where bucket_key = v_key
  for update;

  if not found then
    insert into public.action_rate_buckets (bucket_key, window_started_at, hit_count)
    values (v_key, v_now, 1)
    returning * into v_row;
    return jsonb_build_object(
      'allowed', true,
      'action', lower(trim(p_action)),
      'limit', v_limit,
      'remaining', v_limit - 1,
      'window_seconds', v_window,
      'reset_at', v_row.window_started_at + make_interval(secs => v_window)
    );
  end if;

  if v_row.window_started_at + make_interval(secs => v_window) <= v_now then
    update public.action_rate_buckets
    set window_started_at = v_now,
        hit_count = 1
    where bucket_key = v_key
    returning * into v_row;
    return jsonb_build_object(
      'allowed', true,
      'action', lower(trim(p_action)),
      'limit', v_limit,
      'remaining', v_limit - 1,
      'window_seconds', v_window,
      'reset_at', v_row.window_started_at + make_interval(secs => v_window)
    );
  end if;

  if v_row.hit_count >= v_limit then
    return jsonb_build_object(
      'allowed', false,
      'action', lower(trim(p_action)),
      'limit', v_limit,
      'remaining', 0,
      'window_seconds', v_window,
      'reset_at', v_row.window_started_at + make_interval(secs => v_window),
      'error', 'RATE_LIMITED'
    );
  end if;

  update public.action_rate_buckets
  set hit_count = hit_count + 1
  where bucket_key = v_key
  returning * into v_row;

  return jsonb_build_object(
    'allowed', true,
    'action', lower(trim(p_action)),
    'limit', v_limit,
    'remaining', greatest(v_limit - v_row.hit_count, 0),
    'window_seconds', v_window,
    'reset_at', v_row.window_started_at + make_interval(secs => v_window)
  );
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to authenticated, service_role;

comment on function public.consume_rate_limit(text, text, integer, integer) is
  'M11: authenticated subjects bound to caller uid/email; service_role unrestricted for pre-auth / cron.';

notify pgrst, 'reload schema';
