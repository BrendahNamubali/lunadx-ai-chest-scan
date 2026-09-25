-- Server-side paywall for AI screening. The analysis backend calls this with
-- the user's own JWT before running a model (p_record = false) and again
-- after a successful analysis to log it (p_record = true). Because the check
-- runs in the database as the caller, nothing in the browser can bypass it.
--
-- Raises one of: NOT_AUTHENTICATED, NO_HOSPITAL, HOSPITAL_NOT_APPROVED,
-- PROFILE_INACTIVE, SUBSCRIPTION_INACTIVE, SCAN_LIMIT_REACHED.
CREATE OR REPLACE FUNCTION public.scan_access(p_record boolean DEFAULT false, p_analysis_type text DEFAULT 'pneumonia')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_hospital public.hospitals%ROWTYPE;
  v_limit integer;
  v_used integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF public.is_super_admin() THEN
    RETURN jsonb_build_object('used', 0, 'limit', NULL, 'plan', 'internal');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND OR v_profile.hospital_id IS NULL THEN
    RAISE EXCEPTION 'NO_HOSPITAL';
  END IF;

  SELECT * INTO v_hospital FROM public.hospitals WHERE id = v_profile.hospital_id;
  IF NOT FOUND OR v_hospital.status <> 'approved' THEN
    RAISE EXCEPTION 'HOSPITAL_NOT_APPROVED';
  END IF;

  IF NOT v_profile.is_active THEN
    RAISE EXCEPTION 'PROFILE_INACTIVE';
  END IF;

  -- Checked against the expiry date directly so access ends on time even if
  -- the daily expire_subscriptions job hasn't run yet. Paid plans keep the
  -- same 3-day grace period as that job.
  IF v_hospital.subscription_status NOT IN ('trial', 'active')
     OR (v_hospital.subscription_status = 'trial' AND v_hospital.subscription_expires_at < now())
     OR (v_hospital.subscription_status = 'active' AND v_hospital.subscription_expires_at < now() - interval '3 days')
  THEN
    RAISE EXCEPTION 'SUBSCRIPTION_INACTIVE';
  END IF;

  SELECT max_scans_per_month INTO v_limit
  FROM public.subscription_plans WHERE slug = v_hospital.subscription_plan;

  SELECT count(*) INTO v_used FROM public.scan_events
  WHERE hospital_id = v_hospital.id AND created_at >= date_trunc('month', now());

  IF v_limit IS NOT NULL AND v_used >= v_limit THEN
    RAISE EXCEPTION 'SCAN_LIMIT_REACHED';
  END IF;

  IF p_record THEN
    INSERT INTO public.scan_events (hospital_id, user_id, analysis_type)
    VALUES (v_hospital.id, v_uid, coalesce(nullif(p_analysis_type, ''), 'pneumonia'));
    v_used := v_used + 1;
  END IF;

  RETURN jsonb_build_object('used', v_used, 'limit', v_limit, 'plan', v_hospital.subscription_plan);
END;
$$;

REVOKE ALL ON FUNCTION public.scan_access(boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scan_access(boolean, text) TO authenticated, service_role;
