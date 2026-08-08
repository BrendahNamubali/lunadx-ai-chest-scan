import { NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import { Shield, LogOut, Building2, LayoutDashboard, Users, CreditCard, Upload, BadgeCheck, Loader2, ShieldCheck } from "lucide-react";
import { useAuth, dashboardPathFor, type AppRole } from "@/lib/auth";

const NAV: Record<AppRole, { to: string; label: string; icon: typeof Shield }[]> = {
  super_admin: [
    { to: "/admin", label: "Hospitals", icon: Building2 },
    { to: "/admin/plans", label: "Plans & Pricing", icon: CreditCard },
    { to: "/admin/users", label: "Platform Users", icon: Users },
    { to: "/admin/super-admins", label: "Super Admins", icon: ShieldCheck },
  ],
  hospital_admin: [
    { to: "/hospital/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/hospital/users", label: "Clinicians", icon: Users },
    { to: "/hospital/subscription", label: "Subscription", icon: CreditCard },
  ],
  clinician: [
    { to: "/clinician/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/upload", label: "New Screening", icon: Upload },
  ],
};

export function SaasLayout({ allow }: { allow: AppRole[] }) {
  const { session, role, loading, fullName, hospital, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/pending-approval" replace />;
  if (!allow.includes(role)) return <Navigate to={dashboardPathFor(role)} replace />;
  if (role !== "super_admin" && hospital && hospital.status !== "approved") {
    return <Navigate to="/pending-approval" replace />;
  }

  const items = NAV[role];

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col z-30">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-sidebar-primary-foreground tracking-tight">LunaDX</h1>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-[0.15em]">
                {role === "super_admin" ? "Platform Admin" : role === "hospital_admin" ? "Hospital Admin" : "Clinician"}
              </p>
            </div>
          </div>
        </div>

        {hospital && (
          <div className="px-5 py-3 border-b border-sidebar-border">
            <p className="text-xs font-medium text-sidebar-primary-foreground truncate">{hospital.name}</p>
            {hospital.hospital_number && (
              <p className="text-[10px] text-sidebar-foreground/50 flex items-center gap-1 mt-0.5">
                <BadgeCheck className="w-3 h-3" /> {hospital.hospital_number}
              </p>
            )}
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-primary-foreground">
              {fullName?.charAt(0) ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-primary-foreground truncate">{fullName ?? "User"}</p>
              <p className="text-[11px] text-sidebar-foreground/50">{role.replace("_", " ")}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
            className="flex items-center gap-2 text-[13px] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent/40"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default SaasLayout;