
REVOKE EXECUTE ON FUNCTION public.assign_hospital_number() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enforce_clinician_limit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_hospital_id() FROM anon, public;
