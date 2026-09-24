-- Plans carry a display price in both currencies. ioTec collects mobile money
-- in UGX only, so price_ugx is the amount actually charged; the USD price
-- (price_monthly_cents) is for display. A price of 0 means "custom pricing".
ALTER TABLE public.subscription_plans
  ADD COLUMN price_ugx integer NOT NULL DEFAULT 0 CHECK (price_ugx >= 0);

UPDATE public.subscription_plans SET price_ugx = 750000  WHERE slug = 'basic';
UPDATE public.subscription_plans SET price_ugx = 1850000 WHERE slug = 'professional';
UPDATE public.subscription_plans SET price_ugx = 0       WHERE slug = 'enterprise';

ALTER TABLE public.hospitals ADD COLUMN subscription_expires_at timestamptz;

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

-- ── Payments ───────────────────────────────────────────────────────────────
CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed');

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  plan_slug text NOT NULL REFERENCES public.subscription_plans(slug),
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'UGX',
  period_months integer NOT NULL DEFAULT 1 CHECK (period_months > 0),
  phone text NOT NULL,
  provider text NOT NULL DEFAULT 'iotec',
  provider_reference text,
  status public.payment_status NOT NULL DEFAULT 'pending',
  status_message text,
  raw_response jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  activated_at timestamptz
);

CREATE INDEX payments_hospital_created_idx ON public.payments (hospital_id, created_at DESC);
CREATE INDEX payments_pending_idx ON public.payments (created_at) WHERE status = 'pending';

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin reads payments" ON public.payments FOR SELECT TO authenticated
USING (public.is_super_admin());
CREATE POLICY "hospital admin reads own payments" ON public.payments FOR SELECT TO authenticated
USING (hospital_id = public.current_hospital_id() AND public.has_role(auth.uid(), 'hospital_admin'));

-- Applies a successful payment exactly once. Paid time stacks on top of any
-- remaining trial or paid period.
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

REVOKE ALL ON FUNCTION public.activate_subscription(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_subscriptions() TO service_role;

-- Existing trial hospitals get the 14-day window starting now.
UPDATE public.hospitals SET subscription_expires_at = now() + interval '14 days'
WHERE subscription_status = 'trial' AND subscription_expires_at IS NULL;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('lunadx-expire-subscriptions', '15 0 * * *', $$SELECT public.expire_subscriptions()$$);
