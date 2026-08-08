import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ShieldPlus, UserCheck, UserX, KeyRound, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface SuperAdmin {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

export default function SuperAdminAccountsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  const call = useCallback(async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-super-admins", { body: payload });
    if (error) {
      const message = (data as { error?: string } | null)?.error ?? error.message;
      throw new Error(message);
    }
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as Record<string, unknown>;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call({ action: "list" });
      setRows(((data.superAdmins as SuperAdmin[]) ?? []).map((r) => ({ ...r, is_active: r.is_active !== false })));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = rows.filter((r) => r.is_active).length;

  const run = async (key: string, payload: Record<string, unknown>, success: string) => {
    setBusy(key);
    try {
      await call(payload);
      toast.success(success);
      await load();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run("create", { action: "create", ...form }, "Super admin account created.");
    if (ok) setForm({ fullName: "", email: "", password: "" });
  };

  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">LunaDX internal admin</p>
        <h1 className="text-2xl font-bold text-foreground">Super admin accounts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeCount} active {activeCount === 1 ? "account" : "accounts"}. The last active super admin can never be
          deactivated or removed.
        </p>
      </header>

      <form onSubmit={createAdmin} className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldPlus className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Add a super admin</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="sa-name">Full name</Label>
            <Input id="sa-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-email">Email</Label>
            <Input id="sa-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-password">Temporary password</Label>
            <Input id="sa-password" type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
        </div>
        <Button type="submit" disabled={busy === "create"}>
          {busy === "create" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create super admin
        </Button>
      </form>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isLastActive = r.is_active && activeCount <= 1;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium text-foreground">
                      {r.full_name ?? "—"} {r.id === user?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-5 py-3">
                      <Badge variant={r.is_active ? "secondary" : "outline"}>{r.is_active ? "Active" : "Deactivated"}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === r.id}
                          onClick={() => {
                            const password = window.prompt("New password (min 8 characters)");
                            if (password) run(r.id, { action: "update", userId: r.id, password }, "Password updated.");
                          }}
                        >
                          <KeyRound className="w-3.5 h-3.5 mr-1" /> Reset password
                        </Button>
                        {r.is_active ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === r.id || isLastActive}
                            title={isLastActive ? "The last active super admin cannot be deactivated." : undefined}
                            onClick={() => run(r.id, { action: "deactivate", userId: r.id }, "Account deactivated.")}
                          >
                            <UserX className="w-3.5 h-3.5 mr-1" /> Deactivate
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => run(r.id, { action: "activate", userId: r.id }, "Account reactivated.")}>
                            <UserCheck className="w-3.5 h-3.5 mr-1" /> Activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={busy === r.id || isLastActive}
                          title={isLastActive ? "The last active super admin cannot be removed." : undefined}
                          onClick={() => {
                            if (window.confirm(`Remove super admin ${r.email}?`)) run(r.id, { action: "delete", userId: r.id }, "Super admin removed.");
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
