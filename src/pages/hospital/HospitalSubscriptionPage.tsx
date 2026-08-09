import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, PLAN_LABELS } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly_cents: number;
  currency: string;
  max_clinicians: number;
  max_scans_per_month: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export function formatPrice(plan: Plan) {
  if (plan.price_monthly_cents === 0) return "Custom pricing";
  const amount = plan.price_monthly_cents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: plan.currency || "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted}/mo`;
}

export default function HospitalSubscriptionPage() {
  const { hospital } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState({ clinicians: 0, scans: 0 });
  const [renewal, setRenewal] = useState<string | null>(null);

  useEffect(() => {
    if (!hospital) return;
    (async () => {
      const [{ data: p }, { count: c }, { count: s }, { data: sub }] = await Promise.all([
        supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id).eq("role", "clinician"),
        supabase.from("scan_events").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("subscriptions").select("renewal_date").eq("hospital_id", hospital.id).maybeSingle(),
      ]);
      setPlans((p ?? []) as Plan[]);
      setUsage({ clinicians: c ?? 0, scans: s ?? 0 });
      setRenewal(sub?.renewal_date ?? null);
    })();
  }, [hospital]);

  if (!hospital) return null;
  const current = plans.find((p) => p.slug === hospital.subscription_plan);

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">Plan, usage and renewal details for {hospital.name}.</p>
      </header>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="font-semibold text-foreground">
            {current?.name ?? PLAN_LABELS[hospital.subscription_plan] ?? hospital.subscription_plan}
          </h2>
          <Badge variant="outline" className="capitalize">{hospital.subscription_status}</Badge>
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
            <p className="text-muted-foreground text-xs">Renewal date</p>
            <p className="font-semibold text-foreground">{renewal ?? "Not scheduled"}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-foreground mb-4">Upgrade options</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.slug === hospital.subscription_plan;
            return (
              <div key={plan.id} className={`bg-card border rounded-xl p-5 flex flex-col ${isCurrent ? "border-primary" : "border-border"}`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-foreground text-sm">{plan.name}</h3>
                  {isCurrent && <Badge variant="secondary">Current</Badge>}
                </div>
                <p className="text-lg font-bold text-foreground">{formatPrice(plan)}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{plan.description}</p>
                <ul className="space-y-1.5 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                  onClick={() => toast.info("Upgrade request noted. The LunaDX team will contact you to complete the change.")}
                >
                  {isCurrent ? "Current plan" : "Request upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}