-- RLS policies decide which rows a user may update, not which columns.
-- These triggers stop hospital admins from approving their own hospital or
-- granting themselves a paid plan, and stop users from moving their profile
-- into another hospital. Super admins and service-role calls (auth.uid() is
-- null, e.g. edge functions) are unrestricted.

CREATE OR REPLACE FUNCTION public.guard_hospital_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.hospital_number IS DISTINCT FROM OLD.hospital_number
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.max_clinicians IS DISTINCT FROM OLD.max_clinicians
    OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'PROTECTED_HOSPITAL_FIELDS' USING
      HINT = 'Approval and subscription fields can only be changed by LunaDX.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_hospital_update
BEFORE UPDATE ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.guard_hospital_update();

CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.hospital_id IS DISTINCT FROM OLD.hospital_id
    OR NEW.is_active IS DISTINCT FROM OLD.is_active
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'PROTECTED_PROFILE_FIELDS' USING
      HINT = 'Only your display name can be changed.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_profile_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

REVOKE ALL ON FUNCTION public.guard_hospital_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_update() FROM PUBLIC, anon, authenticated;
