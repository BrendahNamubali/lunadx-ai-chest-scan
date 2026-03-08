import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Upload, History, LogOut, Shield, Menu, BarChart3, ClipboardList, FlaskConical, FileText, CreditCard, Building2 } from "lucide-react";
import { getCurrentUser, logout } from "@/lib/store";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/triage", icon: ClipboardList, label: "AI Triage Queue" },
  { to: "/upload", icon: Upload, label: "Screenings" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/demo", icon: FlaskConical, label: "Demo Cases" },
  { to: "/history", icon: FileText, label: "Audit Logs" },
  { to: "/organization", icon: Building2, label: "Organization" },
  { to: "/billing", icon: CreditCard, label: "Billing" },
];

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const user = getCurrentUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-sidebar-primary-foreground tracking-tight">LunaDX</h1>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-[0.15em]">AI Screening</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavClick}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive ? "text-sidebar-primary" : ""}`} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-primary-foreground">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-primary-foreground truncate">{user?.name}</p>
            <p className="text-[11px] text-sidebar-foreground/50">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-[13px] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent/40"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export default function AppSidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-40 w-10 h-10 rounded-lg bg-sidebar flex items-center justify-center shadow-lg"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-sidebar-primary-foreground" />
        </button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border [&>button]:hidden">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <div className="h-full flex flex-col">
              <SidebarContent onNavClick={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col z-30">
      <SidebarContent />
    </aside>
  );
}
