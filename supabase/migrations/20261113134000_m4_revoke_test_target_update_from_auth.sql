-- Tighten grants: signed-in roles must not call the service-role target-update helper.
revoke all on function public.update_savings_target_for_tests(uuid, uuid, bigint, timestamptz) from public;
revoke all on function public.update_savings_target_for_tests(uuid, uuid, bigint, timestamptz) from anon, authenticated;
grant execute on function public.update_savings_target_for_tests(uuid, uuid, bigint, timestamptz) to service_role;
