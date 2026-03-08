import { Outlet, Navigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/store";
import AppSidebar from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AppLayout() {
  const user = getCurrentUser();
  const isMobile = useIsMobile();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className={isMobile ? "p-4 pt-16" : "ml-64 p-8"}>
        <Outlet />
      </main>
    </div>
  );
}
