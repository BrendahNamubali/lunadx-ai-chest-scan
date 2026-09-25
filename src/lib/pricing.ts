import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export { normalizeUgandaPhone, type MobileNetwork } from "../../supabase/functions/_shared/payments-core";

export type DisplayCurrency = "UGX" | "USD";

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly_cents: number;
  price_ugx: number;
  currency: string;
  max_clinicians: number;
  max_scans_per_month: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export const TRIAL_DAYS = 14;

/** Shown if the plans table can't be reached (e.g. landing page offline). Keep in sync with subscription_plans. */
export const FALLBACK_PLANS: Plan[] = [
  {
    id: "basic", slug: "basic", name: "Basic Hospital Plan",
    description: "For single facilities getting started with AI-assisted screening.",
    price_monthly_cents: 19900, price_ugx: 150000, currency: "USD",
    max_clinicians: 3, max_scans_per_month: 500,
    features: ["1 Hospital Admin", "3 Clinician accounts", "Chest X-ray analysis access", "Standard support"],
    is_active: true, sort_order: 1,
  },
  {
    id: "professional", slug: "professional", name: "Professional Plan",
    description: "For busy facilities with larger clinical teams.",
    price_monthly_cents: 49900, price_ugx: 244000, currency: "USD",
    max_clinicians: 10, max_scans_per_month: 2500,
    features: ["1 Hospital Admin", "10 Clinician accounts", "Higher scan limits", "Priority support", "Advanced analytics"],
    is_active: true, sort_order: 2,
  },
  {
    id: "enterprise", slug: "enterprise", name: "Enterprise Plan",
    description: "Custom limits for hospital groups and multi-facility networks.",
    price_monthly_cents: 0, price_ugx: 0, currency: "USD",
    max_clinicians: 100, max_scans_per_month: 100000,
    features: ["Custom user limits", "Multiple facilities", "Custom scan limits", "Dedicated success manager", "SLA & onboarding"],
    is_active: true, sort_order: 3,
  },
];

export function isCustomPriced(plan: Plan) {
  return plan.price_ugx === 0 && plan.price_monthly_cents === 0;
}

export function formatUGX(amount: number) {
  return `UGX ${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function formatPlanPrice(plan: Plan, currency: DisplayCurrency): string {
  if (isCustomPriced(plan)) return "Custom";
  if (currency === "UGX") return plan.price_ugx > 0 ? formatUGX(plan.price_ugx) : "Custom";
  if (plan.price_monthly_cents <= 0) return "Custom";
  const amount = plan.price_monthly_cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const CURRENCY_KEY = "lunadx_display_currency";

export function useDisplayCurrency(): [DisplayCurrency, (c: DisplayCurrency) => void] {
  const [currency, setCurrency] = useState<DisplayCurrency>(() =>
    localStorage.getItem(CURRENCY_KEY) === "USD" ? "USD" : "UGX",
  );
  const update = useCallback((c: DisplayCurrency) => {
    localStorage.setItem(CURRENCY_KEY, c);
    setCurrency(c);
  }, []);
  return [currency, update];
}

export function usePlans({ includeInactive = false } = {}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    let query = supabase.from("subscription_plans").select("*").order("sort_order");
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    setPlans(error || !data?.length ? (includeInactive ? [] : FALLBACK_PLANS) : (data as Plan[]));
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => { reload(); }, [reload]);
  return { plans, setPlans, loading, reload };
}
