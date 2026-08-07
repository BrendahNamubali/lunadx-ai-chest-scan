
CREATE TYPE public.app_role AS ENUM ('super_admin','hospital_admin','clinician');
CREATE TYPE public.hospital_status AS ENUM ('pending','approved','rejected','suspended');
CREATE TYPE public.subscription_status AS ENUM ('pending','trial','active','suspended','cancelled');

CREATE SEQUENCE public.hospital_number_seq START 1;

CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  max_clinicians integer NOT NULL DEFAULT 3,
  max_scans_per_month integer NOT NULL DEFAULT 500,
  features text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_number text UNIQUE,
  name text NOT NULL,
  facility_type text,
  location text,
  address text,
  contact_person text,
  email text NOT NULL,
  phone text,
  expected_clinicians integer,
  license_info text,
  status public.hospital_status NOT NULL DEFAULT 'pending',
  subscription_plan text NOT NULL DEFAULT 'basic',
  subscription_status public.subscription_status NOT NULL DEFAULT 'pending',
  max_clinicians integer NOT NULL DEFAULT 3,
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'basic',
  status public.subscription_status NOT NULL DEFAULT 'pending',
  start_date date,
  renewal_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  analysis_type text NOT NULL DEFAULT 'pneumonia',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.current_hospital_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT hospital_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Hospital number generation on approval
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_hospital_number
BEFORE INSERT OR UPDATE ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.assign_hospital_number();

-- Enforce clinician limit at the database level
CREATE OR REPLACE FUNCTION public.enforce_clinician_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  IF NEW.role <> 'clinician' OR NEW.hospital_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT max_clinicians INTO v_limit FROM public.hospitals WHERE id = NEW.hospital_id;
  SELECT count(*) INTO v_count FROM public.user_roles WHERE hospital_id = NEW.hospital_id AND role = 'clinician';
  IF v_count >= COALESCE(v_limit, 3) THEN
    RAISE EXCEPTION 'CLINICIAN_LIMIT_REACHED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_clinician_limit
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_clinician_limit();

-- Only one hospital admin per hospital
CREATE UNIQUE INDEX one_hospital_admin_per_hospital
ON public.user_roles (hospital_id) WHERE role = 'hospital_admin';

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.subscription_plans TO anon;
GRANT ALL ON public.subscription_plans TO service_role;
GRANT SELECT, INSERT ON public.scan_events TO authenticated;
GRANT ALL ON public.scan_events TO service_role;

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

-- hospitals
CREATE POLICY "super admin manages hospitals" ON public.hospitals FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "members read own hospital" ON public.hospitals FOR SELECT TO authenticated
USING (id = public.current_hospital_id());
CREATE POLICY "hospital admin updates own hospital" ON public.hospitals FOR UPDATE TO authenticated
USING (id = public.current_hospital_id() AND public.has_role(auth.uid(),'hospital_admin'))
WITH CHECK (id = public.current_hospital_id() AND public.has_role(auth.uid(),'hospital_admin'));

-- profiles
CREATE POLICY "super admin manages profiles" ON public.profiles FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());
CREATE POLICY "read hospital profiles" ON public.profiles FOR SELECT TO authenticated
USING (hospital_id IS NOT NULL AND hospital_id = public.current_hospital_id());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- user_roles (read-only from client; writes go through server functions)
CREATE POLICY "super admin manages roles" ON public.user_roles FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "read hospital roles" ON public.user_roles FOR SELECT TO authenticated
USING (hospital_id IS NOT NULL AND hospital_id = public.current_hospital_id());

-- subscriptions
CREATE POLICY "super admin manages subscriptions" ON public.subscriptions FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "hospital reads own subscription" ON public.subscriptions FOR SELECT TO authenticated
USING (hospital_id = public.current_hospital_id());

-- plans
CREATE POLICY "anyone reads active plans" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "super admin manages plans" ON public.subscription_plans FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- scan events
CREATE POLICY "super admin reads scan events" ON public.scan_events FOR SELECT TO authenticated
USING (public.is_super_admin());
CREATE POLICY "hospital reads own scan events" ON public.scan_events FOR SELECT TO authenticated
USING (hospital_id = public.current_hospital_id());
CREATE POLICY "members log own scan events" ON public.scan_events FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND hospital_id = public.current_hospital_id());

INSERT INTO public.subscription_plans (slug,name,description,price_monthly_cents,max_clinicians,max_scans_per_month,features,sort_order) VALUES
('basic','Basic Hospital Plan','For single facilities getting started with AI-assisted screening.',19900,3,500,ARRAY['1 Hospital Admin','3 Clinician accounts','Chest X-ray analysis access','Standard support'],1),
('professional','Professional Plan','For busy facilities with larger clinical teams.',49900,10,2500,ARRAY['1 Hospital Admin','10 Clinician accounts','Higher scan limits','Priority support','Advanced analytics'],2),
('enterprise','Enterprise Plan','Custom limits for hospital groups and multi-facility networks.',0,100,100000,ARRAY['Custom user limits','Multiple facilities','Custom scan limits','Dedicated success manager','SLA & onboarding'],3);
