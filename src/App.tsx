import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import AboutPage from "./pages/About";
import RegisterPage from "./pages/Register";
import PayPage from "./pages/Pay";
import TicketPage from "./pages/Ticket";
import ReceiptPage from "./pages/Receipt";
import ContactPage from "./pages/Contact";
import ScanPage from "./pages/Scan";
import TermsPage from "./pages/Terms";
import RefundPolicyPage from "./pages/RefundPolicy";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRegistrations from "./pages/admin/AdminRegistrations";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminSchools from "./pages/admin/AdminSchools";
import AdminCodes from "./pages/admin/AdminCodes";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAgents from "./pages/admin/AdminAgents";
import AdminContact from "./pages/admin/AdminContact";
import AdminDoor from "./pages/admin/AdminDoor";
import AdminScanEntry from "./pages/admin/AdminScanEntry";
import AdminScanExit from "./pages/admin/AdminScanExit";
import AdminDoorStats from "./pages/admin/AdminDoorStats";
import AdminRefunds from "./pages/admin/AdminRefunds";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminActivityLogs from "./pages/admin/AdminActivityLogs";
import AdminReports from "./pages/admin/AdminReports";
import AdminLookup from "./pages/admin/AdminLookup";
import { ConfirmDialogHost } from "@/lib/confirmDialog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <ConfirmDialogHost />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pay" element={<PayPage />} />
          <Route path="/ticket" element={<TicketPage />} />
          <Route path="/receipt" element={<ReceiptPage />} />
          <Route path="/balance" element={<TicketPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          <Route path="/sg26-staff/login" element={<AdminLogin />} />
          {/* Old/obscured paths redirect to the canonical staff login */}
          <Route path="/sg-staff-26/login" element={<Navigate to="/sg26-staff/login" replace />} />
          <Route path="/admin/login" element={<Navigate to="/sg26-staff/login" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/registrations" element={<AdminRegistrations />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/schools" element={<AdminSchools />} />
          <Route path="/admin/codes" element={<AdminCodes />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/agents" element={<AdminAgents />} />
          <Route path="/admin/contact" element={<AdminContact />} />
          <Route path="/admin/door" element={<AdminDoor />} />
          <Route path="/admin/scan/entry" element={<AdminScanEntry />} />
          <Route path="/admin/scan/exit" element={<AdminScanExit />} />
          <Route path="/admin/door-stats" element={<AdminDoorStats />} />
          <Route path="/admin/refunds" element={<AdminRefunds />} />
          <Route path="/admin/attendance" element={<AdminAttendance />} />
          <Route path="/admin/activity" element={<AdminActivityLogs />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/lookup" element={<AdminLookup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
