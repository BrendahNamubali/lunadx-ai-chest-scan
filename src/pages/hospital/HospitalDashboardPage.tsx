import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Activity, CalendarClock, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, PLAN_LABELS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HospitalDashboardPage() {
  const { hospital } = useAuth();
  const [clinicians, setClinicians] = useState(0);
  const [scans, setScans] = useState(0);
  const [renewal, setRenewal] = useState<string | null>(null);

  useEffect(() => {
    if (!hospital) return;
    (async () => {
      const [{ count: c }, { count: s }, { data: sub }] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true })
          .eq("hospital_id", hospital.id).eq("role", "clinician"),
        supabase.from("scan_events").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("subscriptions").select("renewal_date").eq("hospital_id", hospital.id).maybeSingle(),
      ]);
      setClinicians(c ?? 0);
      setScans(s ?? 0);
      setRenewal(sub?.renewal_date ?? null);
    })();
  }, [hospital]);

  if (!hospital) return null;

  const stats = [
    { label: "Clinician accounts", value: `${clinicians} / ${hospital.max_clinicians}`, icon: Users },
    { label: "Screenings performed", value: scans, icon: Activity },
    { label: "Renewal date", value: renewal ?? "—", icon: CalendarClock },
    { label: "Current plan", value: PLAN_LABELS[hospital.subscription_plan] ?? hospital.subscription_plan, icon: CreditCard },
  ];

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">Hospital administration</p>
        <h1 className="text-2xl font-bold text-foreground">{hospital.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary">{hospital.hospital_number ?? "Pending number"}</Badge>
          <Badge variant="outline" className="capitalize">{hospital.subscription_status}</Badge>
          {hospital.location && <span className="text-sm text-muted-foreground">{hospital.location}</span>}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5">
            <s.icon className="w-4 h-4 text-muted-foreground mb-3" />
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-1">Clinical team</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create and remove clinician accounts for your facility. Your plan allows {hospital.max_clinicians} clinicians.
          </p>
          <Button asChild variant="outline"><Link to="/hospital/users">Manage clinicians</Link></Button>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-1">Subscription</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Review your plan, usage and renewal date, or explore upgrade options.
          </p>
          <Button asChild variant="outline"><Link to="/hospital/subscription">View subscription</Link></Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        LunaDX is an AI-assisted screening and triage tool. All findings are clinical decision support only and must be
        reviewed alongside clinical judgement by a qualified professional.
      </p>
    </div>
  );
}