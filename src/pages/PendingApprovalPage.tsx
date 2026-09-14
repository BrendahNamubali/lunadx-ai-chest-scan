import { useNavigate } from "react-router-dom";
import { Clock, ShieldAlert, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { useEffect } from "react";
import LunaLogo from "@/components/LunaLogo";

export default function PendingApprovalPage() {
  const { hospital, role, session, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && hospital?.status === "approved" && role) navigate(dashboardPathFor(role), { replace: true });
    if (!loading && !session) navigate("/login", { replace: true });
  }, [loading, hospital, role, session, navigate]);

  const status = hospital?.status ?? "pending";
  const config = {
    pending: {
      icon: Clock,
      title: "Registration under review",
      body: "Your hospital registration has been submitted. LunaDX will review your application and notify you once approved.",
    },
    rejected: {
      icon: Ban,
      title: "Application not approved",
      body: hospital?.rejection_reason ?? "Your hospital application was not approved. Please contact the LunaDX team for details.",
    },
    suspended: {
      icon: ShieldAlert,
      title: "Account suspended",
      body: "This hospital account is currently suspended. Please contact the LunaDX team to restore access.",
    },
    approved: { icon: Clock, title: "Redirecting…", body: "" },
  }[status];

  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
        <LunaLogo className="w-12 h-12 mx-auto mb-6" />
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">{config.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">{config.body}</p>
        {hospital && (
          <p className="text-xs text-muted-foreground mb-6">
            {hospital.name}
            {hospital.location ? ` · ${hospital.location}` : ""}
          </p>
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
    </div>
  );
}