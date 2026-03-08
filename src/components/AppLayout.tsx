import { Outlet, Navigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "@/lib/store";
import AppSidebar from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import PageTransition from "./PageTransition";
import { AnimatePresence } from "framer-motion";

export default function AppLayout() {
  const user = getCurrentUser();
  const isMobile = useIsMobile();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;

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
