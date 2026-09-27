import { useAuth } from "../context/AuthContext.js";
import { BrowseDoctorsPage } from "./patient/BrowseDoctorsPage.js";
import { DoctorAgendaPage } from "./doctor/DoctorAgendaPage.js";
import { AdminDoctorsPage } from "./admin/AdminDoctorsPage.js";

export function HomePage() {
  const { user } = useAuth();

  if (user?.role === "DOCTOR") return <DoctorAgendaPage />;
  if (user?.role === "ADMIN") return <AdminDoctorsPage />;
  return <BrowseDoctorsPage />;
}
