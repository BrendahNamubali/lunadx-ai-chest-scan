import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { DEMO_MODE, getCurrentUser, setSessionUser, type UserRole } from "@/lib/store";
import { useAuth, accessBlock, type AppRole } from "@/lib/auth";
import AppSidebar from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import PageTransition from "./PageTransition";
import { AnimatePresence } from "framer-motion";

const WORKSPACE_ROLE: Record<AppRole, UserRole> = {
  super_admin: "Admin",
  hospital_admin: "Admin",
  clinician: "Clinician",
};

export default function AppLayout() {
  const { session, role, hospital, isActive, fullName, loading } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session) {
    if (!role || accessBlock(role, hospital, isActive)) return <Navigate to="/pending-approval" replace />;
    setSessionUser({
      id: session.user.id,
      email: session.user.email ?? "",
      name: fullName ?? session.user.email ?? "User",
      role: WORKSPACE_ROLE[role],
      orgId: hospital?.id ?? "lunadx-internal",
      orgName: hospital?.name ?? "LunaDX",
    });
  } else if (!DEMO_MODE || !getCurrentUser()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className={isMobile ? "p-4 pt-16" : "ml-64 p-8"}>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
    </div>
  );
}
