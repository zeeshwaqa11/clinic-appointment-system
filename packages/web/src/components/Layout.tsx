import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { NotificationBell } from "./NotificationBell.js";

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? "bg-brand-100 text-brand-800" : "text-slate-600 hover:bg-slate-100"
  }`;
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" className="text-lg font-bold text-brand-700">
            Sehat Clinic
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1">
            {user?.role === "PATIENT" && (
              <>
                <NavLink to="/" end className={navLinkClass}>
                  Find a doctor
                </NavLink>
                <NavLink to="/appointments" className={navLinkClass}>
                  My appointments
                </NavLink>
              </>
            )}
            {user?.role === "DOCTOR" && (
              <>
                <NavLink to="/" end className={navLinkClass}>
                  Agenda
                </NavLink>
                <NavLink to="/schedule" className={navLinkClass}>
                  Schedule
                </NavLink>
              </>
            )}
            {user?.role === "ADMIN" && (
              <>
                <NavLink to="/" end className={navLinkClass}>
                  Doctors
                </NavLink>
                <NavLink to="/admin/appointments" className={navLinkClass}>
                  Appointments
                </NavLink>
                <NavLink to="/admin/settings" className={navLinkClass}>
                  Clinic settings
                </NavLink>
                <NavLink to="/admin/stats" className={navLinkClass}>
                  Stats
                </NavLink>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3">
            {user && <NotificationBell />}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-slate-500 sm:inline">{user.name}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Log out
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Log in
              </NavLink>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
