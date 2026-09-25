revoke execute on function public.activate_subscription(uuid) from anon, authenticated;
grant execute on function public.activate_subscription(uuid) to service_role;