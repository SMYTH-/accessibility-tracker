-- Fix M10 db_pre_request execute grants (authenticator must run enforce_account_access).

grant execute on function public.account_access_is_denied(uuid)
  to postgres, anon, authenticated, service_role;
grant execute on function public.assert_account_access_allowed()
  to postgres, anon, authenticated, service_role;
grant execute on function public.enforce_account_access()
  to postgres, anon, authenticated, service_role;
grant execute on function public.account_access_denied_for_me()
  to postgres, anon, authenticated, service_role;

do $$
begin
  execute 'grant execute on function public.account_access_is_denied(uuid) to authenticator';
  execute 'grant execute on function public.assert_account_access_allowed() to authenticator';
  execute 'grant execute on function public.enforce_account_access() to authenticator';
  execute 'grant execute on function public.account_access_denied_for_me() to authenticator';
exception
  when undefined_object then
    raise notice 'authenticator role missing — grants skipped';
  when others then
    raise notice 'authenticator grant notice: %', sqlerrm;
end;
$$;

-- Ensure pre-request remains configured now that grants exist.
do $$
begin
  execute $q$alter role authenticator set pgrst.db_pre_request = 'public.enforce_account_access'$q$;
exception
  when others then
    raise notice 'db_pre_request reconfigure: %', sqlerrm;
end;
$$;

notify pgrst, 'reload schema';
notify pgrst, 'reload config';
