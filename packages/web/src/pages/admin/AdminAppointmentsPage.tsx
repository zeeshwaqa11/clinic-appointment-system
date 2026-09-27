import { useEffect, useState } from "react";
import { listAppointments } from "../../api/appointments.api.js";
import { listDoctors } from "../../api/doctors.api.js";
import { ApiError } from "../../api/client.js";
import type { Appointment, AppointmentStatus, DoctorSummary } from "../../types/index.js";
import { LoadingState } from "../../components/LoadingState.js";
import { ErrorState } from "../../components/ErrorState.js";
import { EmptyState } from "../../components/EmptyState.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatDateTime } from "../../utils/format.js";

const STATUSES: AppointmentStatus[] = ["BOOKED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"];

export function AdminAppointmentsPage() {
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [doctorId, setDoctorId] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    void listDoctors().then(setDoctors).catch(() => undefined);
  }, []);

  async function load() {
    setError(null);
    setAppointments(null);
    try {
      const result = await listAppointments({
        doctorId: doctorId || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      result.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
      setAppointments(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load appointments");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, status, from, to]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-800">All appointments</h1>

      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AppointmentStatus | "")}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {appointments === null && !error && <LoadingState />}
      {appointments && appointments.length === 0 && <EmptyState title="No matching appointments" />}

      {appointments && appointments.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Doctor</th>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{formatDateTime(a.startAt)}</td>
                  <td className="px-4 py-2">{a.doctor.name}</td>
                  <td className="px-4 py-2">{a.patient.name}</td>
                  <td className="px-4 py-2 text-slate-500">{a.reason}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
