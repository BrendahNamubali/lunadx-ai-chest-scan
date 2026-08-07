import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "hospital_admin" | "clinician";

export interface Hospital {
  id: string;
  hospital_number: string | null;
  name: string;
  facility_type: string | null;
  location: string | null;
  address: string | null;
  contact_person: string | null;
  email: string;
  phone: string | null;
  expected_clinicians: number | null;
  license_info: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  subscription_plan: string;
  subscription_status: "pending" | "trial" | "active" | "suspended" | "cancelled";
  max_clinicians: number;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  hospital: Hospital | null;
  fullName: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadContext = async (uid: string | undefined) => {
    if (!uid) {
      setRole(null);
      setHospital(null);
      setFullName(null);
      return;
    }
    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("full_name, hospital_id").eq("id", uid).maybeSingle(),
    ]);
    const roles = (roleRows ?? []).map((r) => r.role as AppRole);
    const resolved: AppRole | null = roles.includes("super_admin")
      ? "super_admin"
      : roles.includes("hospital_admin")
        ? "hospital_admin"
        : roles.includes("clinician")
          ? "clinician"
          : null;
    setRole(resolved);
    setFullName(profile?.full_name ?? null);
    if (profile?.hospital_id) {
      const { data: h } = await supabase
        .from("hospitals")
        .select("*")
        .eq("id", profile.hospital_id)
        .maybeSingle();
      setHospital((h as Hospital) ?? null);
    } else {
      setHospital(null);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setTimeout(() => {
        loadContext(newSession?.user?.id).finally(() => setLoading(false));
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadContext(data.session?.user?.id).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    role,
    hospital,
    fullName,
    loading,
    refresh: async () => {
      const { data } = await supabase.auth.getUser();
      await loadContext(data.user?.id);
    },
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) return { error: error.message };
      return {};
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setRole(null);
      setHospital(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function dashboardPathFor(role: AppRole | null) {
  if (role === "super_admin") return "/admin";
  if (role === "hospital_admin") return "/hospital/dashboard";
  if (role === "clinician") return "/clinician/dashboard";
  return "/login";
}

export const PLAN_LABELS: Record<string, string> = {
  basic: "Basic Hospital Plan",
  professional: "Professional Plan",
  enterprise: "Enterprise Plan",
};