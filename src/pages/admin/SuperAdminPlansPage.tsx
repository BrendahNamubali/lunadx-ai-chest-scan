import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { Plan } from "@/pages/hospital/HospitalSubscriptionPage";

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("subscription_plans").select("*").order("sort_order");
    setPlans((data ?? []) as Plan[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = (id: string, changes: Partial<Plan>) =>
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));

  const save = async (plan: Plan) => {
    setSaving(plan.id);
    const { error } = await supabase
      .from("subscription_plans")
      .update({
        name: plan.name,
        description: plan.description,
        price_monthly_cents: plan.price_monthly_cents,
        max_clinicians: plan.max_clinicians,
        max_scans_per_month: plan.max_scans_per_month,
        is_active: plan.is_active,
      })
      .eq("id", plan.id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${plan.name} updated`);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">LunaDX internal admin</p>
        <h1 className="text-2xl font-bold text-foreground">Plans & pricing</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure the subscription plans offered to hospitals.</p>
      </header>

      <div className="space-y-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold text-foreground">{plan.name}</h2>
              <div className="flex items-center gap-2">
                <Label htmlFor={`active-${plan.id}`} className="text-xs text-muted-foreground">Active</Label>
                <Switch id={`active-${plan.id}`} checked={plan.is_active} onCheckedChange={(v) => patch(plan.id, { is_active: v })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Display name</Label>
                <Input className="mt-1.5" value={plan.name} onChange={(e) => patch(plan.id, { name: e.target.value })} />
              </div>
              <div>
                <Label>Monthly price (cents, 0 = custom)</Label>
                <Input className="mt-1.5" type="number" value={plan.price_monthly_cents}
                  onChange={(e) => patch(plan.id, { price_monthly_cents: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Max clinicians</Label>
                <Input className="mt-1.5" type="number" value={plan.max_clinicians}
                  onChange={(e) => patch(plan.id, { max_clinicians: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Max scans / month</Label>
                <Input className="mt-1.5" type="number" value={plan.max_scans_per_month}
                  onChange={(e) => patch(plan.id, { max_scans_per_month: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <Label>Description</Label>
                <Input className="mt-1.5" value={plan.description ?? ""} onChange={(e) => patch(plan.id, { description: e.target.value })} />
              </div>
            </div>
            <Button size="sm" onClick={() => save(plan)} disabled={saving === plan.id}>
              <Save className="w-4 h-4 mr-1.5" /> Save changes
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}