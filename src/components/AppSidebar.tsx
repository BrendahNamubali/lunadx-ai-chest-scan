import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Upload, History, LogOut, Shield, Menu, X, Smartphone, BarChart3, ClipboardList } from "lucide-react";
import { getCurrentUser, logout } from "@/lib/store";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/upload", icon: Upload, label: "New Scan" },
  { to: "/mobile-upload", icon: Smartphone, label: "Mobile Upload" },
  { to: "/history", icon: History, label: "Scan History" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
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
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg medical-gradient flex items-center justify-center">
            <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-primary-foreground tracking-tight">LunaDX</h1>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">AI Screening</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full medical-gradient flex items-center justify-center text-xs font-semibold text-sidebar-primary-foreground">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-primary-foreground truncate">{user?.name}</p>
            <p className="text-[11px] text-sidebar-foreground/60">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent/50"
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

  // Close sheet on route change
  useEffect(() => {
    setOpen(false);
  }, []);

  if (isMobile) {
    return (
      <>
        {/* Mobile hamburger button */}
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
