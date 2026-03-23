import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "sonner";

import LandingPage from "@/pages/LandingPage";
import PetClinicLandingPage from "@/pages/PetClinicLandingPage";
import HumanClinicLandingPage from "@/pages/HumanClinicLandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import OverviewPage from "@/pages/dashboard/OverviewPage";
import CalendarPage from "@/pages/dashboard/CalendarPage";
import PatientsPage from "@/pages/dashboard/PatientsPage";
import StaffPage from "@/pages/dashboard/StaffPage";
import ServicesPage from "@/pages/dashboard/ServicesPage";
import AnalyticsPage from "@/pages/dashboard/AnalyticsPage";
import NotificationsPage from "@/pages/dashboard/NotificationsPage";
import AppointmentsPage from "@/pages/dashboard/AppointmentsPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import PatientDetailPage from "@/pages/dashboard/PatientDetailPage";
import AcceptInvitationPage from "@/pages/AcceptInvitationPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import MemberDetailPage from "@/pages/dashboard/MemberDetailPage";
import PetDetailPage from "@/pages/dashboard/PetDetailPage";
import ConsultationPage from "@/pages/dashboard/ConsultationPage";
import ProfilePage from "@/pages/dashboard/ProfilePage";

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/register" state={{ step: 2 }} replace />;
  // Check if user must change their temporary password
  if (user?.user_metadata?.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (profile) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pet-clinic" element={<PetClinicLandingPage />} />
          <Route path="/human-clinic" element={<HumanClinicLandingPage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite/:token" element={<AcceptInvitationPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<OverviewPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/:patientId" element={<PatientDetailPage />} />
            <Route path="pets/:petId" element={<PetDetailPage />} />
            <Route path="appointments/:appointmentId/consult" element={<ConsultationPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="staff/doctor/:memberId" element={<MemberDetailPage />} />
            <Route path="staff/member/:memberId" element={<MemberDetailPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
