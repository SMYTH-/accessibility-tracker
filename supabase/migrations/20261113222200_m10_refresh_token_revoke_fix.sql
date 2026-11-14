-- Fix refresh-token revocation: auth.refresh_tokens.user_id is text in GoTrue.

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
    -- GoTrue stores user_id as varchar/text on refresh_tokens.
    delete from auth.refresh_tokens where user_id = p_user_id::text;
    get diagnostics v_refresh = row_count;
  exception
    when undefined_table then
      v_err := 'AUTH_REFRESH_TABLE_MISSING';
    when undefined_column then
      -- Newer shapes may only key by session_id; clear via sessions already deleted.
      begin
        delete from auth.refresh_tokens rt
        where rt.session_id is not null
          and not exists (
            select 1 from auth.sessions s where s.id = rt.session_id
          );
        get diagnostics v_refresh = row_count;
      exception
        when others then
          v_err := 'AUTH_REFRESH_DELETE_FAILED:' || sqlerrm;
      end;
    when others then
      -- Retry with session orphan cleanup if direct user_id delete fails.
      begin
        delete from auth.refresh_tokens rt
        where coalesce(rt.user_id, '') = p_user_id::text
           or (
             rt.session_id is not null
             and not exists (select 1 from auth.sessions s where s.id = rt.session_id)
           );
        get diagnostics v_refresh = row_count;
      exception
        when others then
          v_err := 'AUTH_REFRESH_DELETE_FAILED:' || sqlerrm;
      end;
  end;

  if v_err is not null then
    return jsonb_build_object(
      'ok', false,
      'error', v_err,
      'sessions_deleted', v_sessions,
      'refresh_deleted', v_refresh
    );
  end if;

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
