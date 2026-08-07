import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Check, X, PauseCircle, PlayCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Hospital } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Counts = Record<string, { users: number; scans: number }>;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
  suspended: "outline",
};

export default function SuperAdminHospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Hospital | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("hospitals").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as Hospital[];
    setHospitals(list);

    const [{ data: roles }, { data: scans }] = await Promise.all([
      supabase.from("user_roles").select("hospital_id"),
      supabase.from("scan_events").select("hospital_id"),
    ]);
    const next: Counts = {};
    for (const h of list) next[h.id] = { users: 0, scans: 0 };
    for (const r of roles ?? []) if (r.hospital_id && next[r.hospital_id]) next[r.hospital_id].users += 1;
    for (const s of scans ?? []) if (s.hospital_id && next[s.hospital_id]) next[s.hospital_id].scans += 1;
    setCounts(next);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (hospital: Hospital, status: Hospital["status"]) => {
    const patch: Record<string, unknown> = { status };
    if (status === "approved") {
      patch.subscription_status = "trial";
    }
    if (status === "rejected") {
      patch.rejection_reason = "Application did not meet LunaDX onboarding requirements.";
    }
    const { error } = await supabase.from("hospitals").update(patch).eq("id", hospital.id);
    if (error) { toast.error(error.message); return; }

    if (status === "approved") {
      const start = new Date();
      const renewal = new Date(start); renewal.setDate(renewal.getDate() + 30);
      await supabase.from("subscriptions").update({
        status: "trial",
        start_date: start.toISOString().slice(0, 10),
        renewal_date: renewal.toISOString().slice(0, 10),
      }).eq("hospital_id", hospital.id);
      await supabase.from("profiles").update({ is_active: true }).eq("hospital_id", hospital.id);
    }
    toast.success(`Hospital ${status}`);
    setSelected(null);
    load();
  };

  const filtered = useMemo(() => {
    return hospitals.filter((h) => {
      const matchesTab = tab === "all" || h.status === tab;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q ||
        h.name.toLowerCase().includes(q) ||
        (h.hospital_number ?? "").toLowerCase().includes(q) ||
        (h.location ?? "").toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [hospitals, tab, query]);

  const pending = hospitals.filter((h) => h.status === "pending").length;

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">LunaDX internal admin</p>
        <h1 className="text-2xl font-bold text-foreground">Hospital management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {hospitals.length} registered facilities · {pending} awaiting review
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Active</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search hospitals" className="pl-9" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3">Hospital</th>
              <th className="text-left px-5 py-3">Number</th>
              <th className="text-left px-5 py-3">Location</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Subscription</th>
              <th className="text-left px-5 py-3">Users</th>
              <th className="text-left px-5 py-3">Scans</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr key={h.id} className="border-t border-border">
                <td className="px-5 py-3 font-medium text-foreground">{h.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{h.hospital_number ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{h.location ?? "—"}</td>
                <td className="px-5 py-3">
                  <Badge variant={STATUS_VARIANT[h.status]} className="capitalize">{h.status}</Badge>
                </td>
                <td className="px-5 py-3 text-muted-foreground capitalize">{h.subscription_plan} · {h.subscription_status}</td>
                <td className="px-5 py-3 text-muted-foreground">{counts[h.id]?.users ?? 0}</td>
                <td className="px-5 py-3 text-muted-foreground">{counts[h.id]?.scans ?? 0}</td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(h)}>View</Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">No hospitals match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4" /> {selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Hospital number", selected.hospital_number ?? "Not issued"],
                  ["Facility type", selected.facility_type ?? "—"],
                  ["Location", selected.location ?? "—"],
                  ["Address", selected.address ?? "—"],
                  ["Contact person", selected.contact_person ?? "—"],
                  ["Contact email", selected.email],
                  ["Phone", selected.phone ?? "—"],
                  ["Expected clinicians", selected.expected_clinicians ?? "—"],
                  ["License / registration", selected.license_info ?? "—"],
                  ["Registered", new Date(selected.created_at).toLocaleDateString()],
                  ["Active users", counts[selected.id]?.users ?? 0],
                  ["Scans performed", counts[selected.id]?.scans ?? 0],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-foreground">{String(value)}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                {selected.status !== "approved" && (
                  <Button size="sm" onClick={() => setStatus(selected, "approved")}>
                    <Check className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                )}
                {selected.status === "pending" && (
                  <Button size="sm" variant="destructive" onClick={() => setStatus(selected, "rejected")}>
                    <X className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                )}
                {selected.status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(selected, "suspended")}>
                    <PauseCircle className="w-4 h-4 mr-1.5" /> Suspend
                  </Button>
                )}
                {selected.status === "suspended" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(selected, "approved")}>
                    <PlayCircle className="w-4 h-4 mr-1.5" /> Reactivate
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}