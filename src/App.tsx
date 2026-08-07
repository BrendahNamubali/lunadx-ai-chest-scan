import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PatientsPage from "./pages/PatientsPage";
import UploadPage from "./pages/UploadPage";
import ResultsPage from "./pages/ResultsPage";
import HistoryPage from "./pages/HistoryPage";
import PatientRecordPage from "./pages/PatientRecordPage";
import DemoCasesPage from "./pages/DemoCasesPage";
import SharedReportPage from "./pages/SharedReportPage";
import MobileUploadPage from "./pages/MobileUploadPage";
import AnalyticsDashboardPage from "./pages/AnalyticsDashboardPage";
import TriageQueuePage from "./pages/TriageQueuePage";
import BillingPage from "./pages/BillingPage";
import OrganizationPage from "./pages/OrganizationPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./lib/auth";
import SaasLayout from "./components/saas/SaasLayout";
import HospitalRegisterPage from "./pages/HospitalRegisterPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import SuperAdminHospitalsPage from "./pages/admin/SuperAdminHospitalsPage";
import SuperAdminPlansPage from "./pages/admin/SuperAdminPlansPage";
import SuperAdminUsersPage from "./pages/admin/SuperAdminUsersPage";
import HospitalDashboardPage from "./pages/hospital/HospitalDashboardPage";
import HospitalUsersPage from "./pages/hospital/HospitalUsersPage";
import HospitalSubscriptionPage from "./pages/hospital/HospitalSubscriptionPage";
import ClinicianDashboardPage from "./pages/clinician/ClinicianDashboardPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<HospitalRegisterPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/report/:scanId" element={<SharedReportPage />} />

          <Route element={<SaasLayout allow={["super_admin"]} />}>
            <Route path="/admin" element={<SuperAdminHospitalsPage />} />
            <Route path="/admin/plans" element={<SuperAdminPlansPage />} />
            <Route path="/admin/users" element={<SuperAdminUsersPage />} />
          </Route>
          <Route element={<SaasLayout allow={["hospital_admin"]} />}>
            <Route path="/hospital/dashboard" element={<HospitalDashboardPage />} />
            <Route path="/hospital/users" element={<HospitalUsersPage />} />
            <Route path="/hospital/subscription" element={<HospitalSubscriptionPage />} />
          </Route>
          <Route element={<SaasLayout allow={["clinician"]} />}>
            <Route path="/clinician/dashboard" element={<ClinicianDashboardPage />} />
          </Route>

          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/:patientId" element={<PatientRecordPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/mobile-upload" element={<MobileUploadPage />} />
            <Route path="/results/:scanId" element={<ResultsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/demo" element={<DemoCasesPage />} />
            <Route path="/analytics" element={<AnalyticsDashboardPage />} />
            <Route path="/triage" element={<TriageQueuePage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/organization" element={<OrganizationPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
