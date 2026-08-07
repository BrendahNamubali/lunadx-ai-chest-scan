import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Row {
  id: string;
  email: string;
  full_name: string | null;
  hospital: string;
  role: string;
}

export default function SuperAdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: roles }, { data: hospitals }] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, hospital_id"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("hospitals").select("id, name"),
      ]);
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      const hospitalMap = new Map((hospitals ?? []).map((h) => [h.id, h.name]));
      setRows(
        (profiles ?? []).map((p) => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          hospital: p.hospital_id ? (hospitalMap.get(p.hospital_id) ?? "—") : "LunaDX",
          role: roleMap.get(p.id) ?? "—",
        })),
      );
    })();
  }, []);

  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">LunaDX internal admin</p>
        <h1 className="text-2xl font-bold text-foreground">Platform users</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} accounts across all hospitals.</p>
      </header>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Hospital</th>
              <th className="text-left px-5 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-5 py-3 font-medium text-foreground">{r.full_name ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.email}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.hospital}</td>
                <td className="px-5 py-3"><Badge variant="secondary" className="capitalize">{r.role.replace("_", " ")}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}