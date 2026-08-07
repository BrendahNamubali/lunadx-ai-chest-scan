import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export default function HospitalUsersPage() {
  const { hospital } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!hospital) return;
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name").eq("hospital_id", hospital.id),
      supabase.from("user_roles").select("user_id, role").eq("hospital_id", hospital.id),
    ]);
    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    setMembers(
      (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "clinician" })),
    );
  }, [hospital]);

  useEffect(() => { load(); }, [load]);

  const clinicians = members.filter((m) => m.role === "clinician");
  const atLimit = !!hospital && clinicians.length >= hospital.max_clinicians;

  const createClinician = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (atLimit) {
      setError(`Your hospital account has reached the maximum of ${hospital!.max_clinicians} clinician accounts. Please upgrade your subscription plan to add more users.`);
      return;
    }
    setSaving(true);
    const { data, error: fnError } = await supabase.functions.invoke("manage-clinicians", {
      body: { action: "create", fullName, email, password },
    });
    setSaving(false);
    const message = (data as { error?: string } | null)?.error;
    if (fnError || message) {
      setError(message ?? "Could not create the clinician account. Please try again.");
      return;
    }
    toast.success("Clinician account created");
    setFullName(""); setEmail(""); setPassword("");
    load();
  };

  const removeClinician = async (userId: string) => {
    const { data, error: fnError } = await supabase.functions.invoke("manage-clinicians", {
      body: { action: "delete", userId },
    });
    const message = (data as { error?: string } | null)?.error;
    if (fnError || message) {
      toast.error(message ?? "Could not remove the clinician.");
      return;
    }
    toast.success("Clinician removed");
    load();
  };

  if (!hospital) return null;

  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Clinical team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {clinicians.length} of {hospital.max_clinicians} clinician accounts used. Hospital admin accounts cannot be created here.
        </p>
      </header>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add a clinician
        </h2>
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 text-destructive text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}
        <form onSubmit={createClinician} className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="c-name">Full name</Label>
            <Input id="c-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" required disabled={atLimit || saving} />
          </div>
          <div>
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" required disabled={atLimit || saving} />
          </div>
          <div>
            <Label htmlFor="c-pass">Temporary password</Label>
            <Input id="c-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="mt-1.5" required disabled={atLimit || saving} />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={atLimit || saving} className="cta-gradient text-cta-foreground border-0 hover:opacity-90">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create clinician account
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-5 py-3 font-medium text-foreground">{m.full_name ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-5 py-3">
                  <Badge variant={m.role === "hospital_admin" ? "default" : "secondary"} className="capitalize">
                    {m.role.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  {m.role === "clinician" && (
                    <Button size="sm" variant="ghost" onClick={() => removeClinician(m.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}