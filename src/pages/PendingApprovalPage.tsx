import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ShieldAlert, Ban, UserX, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, accessBlock, dashboardPathFor, type AccessBlock } from "@/lib/auth";
import LunaLogo from "@/components/LunaLogo";

const RECHECK_INTERVAL_MS = 30_000;

const CONFIG: Record<AccessBlock, { icon: typeof Clock; title: string; body: string; recheck: boolean }> = {
  pending: {
    icon: Clock,
    title: "Registration under review",
    body: "Your hospital registration has been submitted. LunaDX will review your application and notify you once approved. Your 14-day free trial starts on approval.",
    recheck: true,
  },
  no_hospital: {
    icon: Clock,
    title: "Setting up your account",
    body: "We couldn't load your hospital details yet. This page will keep checking; contact LunaDX if it doesn't resolve.",
    recheck: true,
  },
  inactive: {
    icon: UserX,
    title: "Account not active",
    body: "Your user account is not active yet. Your hospital admin or the LunaDX team can activate it.",
    recheck: true,
  },
  expired: {
    icon: ShieldAlert,
    title: "Subscription expired",
    body: "Your hospital's LunaDX subscription has expired. Ask your hospital admin to renew it to continue screening.",
    recheck: true,
  },
  rejected: {
    icon: Ban,
    title: "Application not approved",
    body: "Your hospital application was not approved. Please contact the LunaDX team for details.",
    recheck: false,
  },
  suspended: {
    icon: ShieldAlert,
    title: "Account suspended",
    body: "This hospital account is currently suspended. Please contact the LunaDX team to restore access.",
    recheck: false,
  },
  no_role: {
    icon: UserX,
    title: "Account not set up",
    body: "Your login works, but no LunaDX role is assigned to it. Please contact the LunaDX team.",
    recheck: false,
  },
};

export default function PendingApprovalPage() {
  const { hospital, role, isActive, session, loading, signOut, refresh } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const block = accessBlock(role, hospital, isActive);

  useEffect(() => {
    if (loading) return;
    if (!session) navigate("/login", { replace: true });
    else if (role && !block) navigate(dashboardPathFor(role), { replace: true });
  }, [loading, session, role, block, navigate]);

  const checkNow = useCallback(async () => {
    setChecking(true);
    await refresh();
    setChecking(false);
  }, [refresh]);

  const config = block ? CONFIG[block] : null;

  useEffect(() => {
    if (!config?.recheck) return;
    const timer = setInterval(() => { refresh(); }, RECHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [config?.recheck, refresh]);

  if (loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const Icon = config.icon;
  const body = block === "rejected" && hospital?.rejection_reason ? hospital.rejection_reason : config.body;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
        <LunaLogo className="w-12 h-12 mx-auto mb-6" />
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">{config.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">{body}</p>
        {hospital && (
          <p className="text-xs text-muted-foreground mb-6">
            {hospital.name}
            {hospital.location ? ` · ${hospital.location}` : ""}
          </p>
        )}
        <div className="space-y-2">
          {config.recheck && (
            <Button className="w-full" onClick={checkNow} disabled={checking}>
              {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Check status
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
          >
            Sign out
          </Button>
        </div>
        {config.recheck && (
          <p className="text-[11px] text-muted-foreground mt-4">This page checks for updates automatically.</p>
        )}
      </div>
    </div>
  );
}
