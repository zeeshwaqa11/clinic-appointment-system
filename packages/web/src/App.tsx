import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.js";
import { Layout } from "./components/Layout.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { LoginPage } from "./pages/auth/LoginPage.js";
import { RegisterPage } from "./pages/auth/RegisterPage.js";
import { HomePage } from "./pages/HomePage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";
import { DoctorBookingPage } from "./pages/patient/DoctorBookingPage.js";
import { MyAppointmentsPage } from "./pages/patient/MyAppointmentsPage.js";
import { DoctorSchedulePage } from "./pages/doctor/DoctorSchedulePage.js";
import { AdminAppointmentsPage } from "./pages/admin/AdminAppointmentsPage.js";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage.js";
import { AdminStatsPage } from "./pages/admin/AdminStatsPage.js";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctors/:id"
            element={
              <ProtectedRoute roles={["PATIENT"]}>
                <DoctorBookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute roles={["PATIENT"]}>
                <MyAppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute roles={["DOCTOR"]}>
                <DoctorSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/appointments"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminAppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stats"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminStatsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </AuthProvider>
  );
}
