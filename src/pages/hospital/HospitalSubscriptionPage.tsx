import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, PLAN_LABELS } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyToggle, PricingFootnote, PricingPlans } from "@/components/pricing/PricingPlans";
import { MobileMoneyCheckout } from "@/components/pricing/MobileMoneyCheckout";
import { formatUGX, isCustomPriced, useDisplayCurrency, usePlans, type Plan } from "@/lib/pricing";

interface PaymentRecord {
  id: string;
  plan_slug: string;
  amount: number;
  phone: string;
  status: "pending" | "success" | "failed";
  status_message: string | null;
  created_at: string;
}

const STATUS_VARIANT: Record<PaymentRecord["status"], "default" | "secondary" | "destructive"> = {
  success: "default",
  pending: "secondary",
  failed: "destructive",
};

export default function HospitalSubscriptionPage() {
  const { hospital, refresh } = useAuth();
  const { plans } = usePlans();
  const [currency, setCurrency] = useDisplayCurrency();
  const [usage, setUsage] = useState({ clinicians: 0, scans: 0 });
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  const load = useCallback(async () => {
    if (!hospital) return;
    const [{ count: c }, { count: s }, { data: pays }] = await Promise.all([
      supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id).eq("role", "clinician"),
      supabase.from("scan_events").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
      supabase
        .from("payments")
        .select("id, plan_slug, amount, phone, status, status_message, created_at")
        .eq("hospital_id", hospital.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setUsage({ clinicians: c ?? 0, scans: s ?? 0 });
    setPayments((pays ?? []) as PaymentRecord[]);
  }, [hospital]);

  useEffect(() => { load(); }, [load]);

  const onPaid = useCallback(() => {
    refresh();
    load();
  }, [refresh, load]);

  if (!hospital) return null;
  const current = plans.find((p) => p.slug === hospital.subscription_plan);
  const expiresAt = hospital.subscription_expires_at ? new Date(hospital.subscription_expires_at) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000) : null;
  const lapsed = !["trial", "active"].includes(hospital.subscription_status);

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">Plan, usage and payments for {hospital.name}.</p>
      </header>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="font-semibold text-foreground">
            {current?.name ?? PLAN_LABELS[hospital.subscription_plan] ?? hospital.subscription_plan}
          </h2>
          <Badge variant={lapsed ? "destructive" : "outline"} className="capitalize">
            {hospital.subscription_status === "suspended" ? "expired" : hospital.subscription_status}
          </Badge>
          {current && !isCustomPriced(current) && (
            <Button size="sm" className="ml-auto" onClick={() => setCheckoutPlan(current)}>
              {hospital.subscription_status === "active" ? "Pay next month" : "Pay now"}
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Clinician accounts used</p>
            <p className="font-semibold text-foreground">{usage.clinicians} / {hospital.max_clinicians}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Screenings performed</p>
            <p className="font-semibold text-foreground">
              {usage.scans}{current ? ` / ${current.max_scans_per_month} per month` : ""}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              {hospital.subscription_status === "trial" ? "Trial ends" : lapsed ? "Expired on" : "Paid until"}
            </p>
            <p className="font-semibold text-foreground">
              {expiresAt ? format(expiresAt, "d MMM yyyy") : "Not scheduled"}
              {daysLeft !== null && daysLeft >= 0 && !lapsed && (
                <span className="text-muted-foreground font-normal"> · {daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-foreground">Plans</h2>
          <CurrencyToggle value={currency} onChange={setCurrency} />
        </div>
        <PricingPlans
          plans={plans}
          currency={currency}
          currentSlug={hospital.subscription_plan}
          renderAction={(plan) =>
            isCustomPriced(plan) ? (
              <a href="mailto:sales@lunadx.com?subject=LunaDX%20Enterprise%20plan">
                <Button variant="outline" className="w-full">Contact sales</Button>
              </a>
            ) : (
              <Button
                className="w-full"
                variant={plan.slug === hospital.subscription_plan ? "outline" : "default"}
                onClick={() => setCheckoutPlan(plan)}
              >
                {plan.slug === hospital.subscription_plan ? "Renew" : "Switch & pay"} · {formatUGX(plan.price_ugx)}
              </Button>
            )
          }
        />
        <PricingFootnote currency={currency} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Payment history</h2>
        </div>
        {payments.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground text-center">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left px-6 py-2 font-medium">Date</th>
                <th className="text-left px-6 py-2 font-medium">Plan</th>
                <th className="text-left px-6 py-2 font-medium">Amount</th>
                <th className="text-left px-6 py-2 font-medium">Phone</th>
                <th className="text-left px-6 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-6 py-3 text-muted-foreground">{format(new Date(p.created_at), "d MMM yyyy, HH:mm")}</td>
                  <td className="px-6 py-3">{plans.find((pl) => pl.slug === p.plan_slug)?.name ?? p.plan_slug}</td>
                  <td className="px-6 py-3">{formatUGX(p.amount)}</td>
                  <td className="px-6 py-3 text-muted-foreground">+{p.phone}</td>
                  <td className="px-6 py-3">
                    <Badge variant={STATUS_VARIANT[p.status]} className="capitalize" title={p.status_message ?? undefined}>
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <MobileMoneyCheckout
        plan={checkoutPlan}
        defaultPhone={hospital.phone}
        onClose={() => {
          setCheckoutPlan(null);
          load();
        }}
        onPaid={onPaid}
      />
    </div>
  );
}
