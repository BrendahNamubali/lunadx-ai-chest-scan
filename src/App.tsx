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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/report/:scanId" element={<SharedReportPage />} />
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
