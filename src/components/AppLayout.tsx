import { Outlet, Navigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/store";
import AppSidebar from "./AppSidebar";

export default function AppLayout() {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}
