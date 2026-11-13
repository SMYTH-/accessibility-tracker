-- M5: ensure frozen-clock contribution helpers are service_role only
revoke all on function public.record_contribution_at(uuid, uuid, bigint, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_contribution_at(uuid, uuid, bigint, text, timestamptz)
  to service_role;

-- Harden M4 activate helper the same way (idempotent)
revoke all on function public.activate_savings_setup_at(uuid, uuid, bigint, bigint, timestamptz)
  from public, anon, authenticated;
grant execute on function public.activate_savings_setup_at(uuid, uuid, bigint, bigint, timestamptz)
  to service_role;
