-- Builds on 20260925094819 (price_ugx, subscription_expires_at, payments,
-- activate_subscription). Written to be re-runnable.

-- ── Column guards ──────────────────────────────────────────────────────────
-- RLS policies decide which rows a user may update, not which columns.
-- These stop hospital admins from approving their own hospital or granting
-- themselves a paid plan, and stop users from moving their profile into
-- another hospital. Super admins and service-role calls (auth.uid() is null,
-- e.g. edge functions) are unrestricted.
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
    OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
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

DROP TRIGGER IF EXISTS trg_guard_hospital_update ON public.hospitals;
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

DROP TRIGGER IF EXISTS trg_guard_profile_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

-- ── Trial: 14 days from the moment a hospital enters the trial state ──────
CREATE OR REPLACE FUNCTION public.assign_hospital_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.hospital_number IS NULL THEN
    NEW.hospital_number := 'LDX-UG-' || lpad(nextval('public.hospital_number_seq')::text, 5, '0');
    NEW.approved_at := now();
    IF NEW.subscription_status = 'pending' THEN
      NEW.subscription_status := 'trial';
    END IF;
  END IF;
  IF NEW.subscription_status = 'trial' AND NEW.subscription_expires_at IS NULL THEN
    NEW.subscription_expires_at := now() + interval '14 days';
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.hospitals SET subscription_expires_at = now() + interval '14 days'
WHERE subscription_status = 'trial' AND subscription_expires_at IS NULL;

-- ── Payments table constraints ─────────────────────────────────────────────
ALTER TABLE public.payments ALTER COLUMN updated_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check') THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_status_check CHECK (status IN ('pending', 'success', 'failed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_amount_check') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check CHECK (amount > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_plan_slug_fkey') THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_plan_slug_fkey FOREIGN KEY (plan_slug)
      REFERENCES public.subscription_plans(slug) NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS payments_hospital_created_idx ON public.payments (hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_pending_idx ON public.payments (created_at) WHERE status = 'pending';

-- ── Activation ─────────────────────────────────────────────────────────────
-- Applies a successful payment exactly once (row lock + activated_at check),
-- switches the hospital to the paid plan and its clinician limit, and stacks
-- the paid month on top of any remaining trial or paid period.
CREATE OR REPLACE FUNCTION public.activate_subscription(p_payment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND';
  END IF;
  IF v_payment.activated_at IS NOT NULL THEN
    RETURN;
  END IF;
  IF v_payment.status <> 'success' THEN
    RAISE EXCEPTION 'PAYMENT_NOT_SUCCESSFUL';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE slug = v_payment.plan_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND';
  END IF;

  SELECT greatest(coalesce(subscription_expires_at, now()), now()) INTO v_start
  FROM public.hospitals WHERE id = v_payment.hospital_id FOR UPDATE;
  v_end := v_start + make_interval(months => v_payment.period_months);

  UPDATE public.hospitals SET
    subscription_plan = v_plan.slug,
    max_clinicians = v_plan.max_clinicians,
    subscription_status = 'active',
    subscription_expires_at = v_end
  WHERE id = v_payment.hospital_id;

  UPDATE public.subscriptions SET
    plan_name = v_plan.slug,
    status = 'active',
    start_date = v_start::date,
    renewal_date = v_end::date
  WHERE hospital_id = v_payment.hospital_id;

  UPDATE public.payments SET activated_at = now(), updated_at = now() WHERE id = p_payment_id;
END;
$$;

-- ── Expiry ─────────────────────────────────────────────────────────────────
-- Trials end exactly at expiry; paid plans get a 3-day grace period.
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.hospitals SET subscription_status = 'suspended'
    WHERE (subscription_status = 'trial' AND subscription_expires_at < now())
       OR (subscription_status = 'active' AND subscription_expires_at < now() - interval '3 days')
    RETURNING id
  )
  UPDATE public.subscriptions s SET status = 'suspended'
  FROM expired WHERE s.hospital_id = expired.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_hospital_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_subscription(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_subscriptions() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('lunadx-expire-subscriptions', '15 0 * * *', $$SELECT public.expire_subscriptions()$$);
