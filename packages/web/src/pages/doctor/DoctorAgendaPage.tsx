import { useEffect, useState } from "react";
import { listAppointments, transitionAppointment } from "../../api/appointments.api.js";
import { ApiError } from "../../api/client.js";
import type { Appointment } from "../../types/index.js";
import { LoadingState } from "../../components/LoadingState.js";
import { ErrorState } from "../../components/ErrorState.js";
import { EmptyState } from "../../components/EmptyState.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { addDaysToDateKey, dateKeyInClinicTz, formatDate, formatTime } from "../../utils/format.js";

export function DoctorAgendaPage() {
  const [dateKey, setDateKey] = useState(() => dateKeyInClinicTz(new Date()));
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [completingId, setCompletingId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const result = await listAppointments({ from: dateKey, to: dateKey });
      result.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      setAppointments(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your agenda");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  async function doTransition(id: string, to: "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED", extra?: { note?: string; visitNotes?: string }) {
    setBusyId(id);
    setError(null);
    try {
      await transitionAppointment(id, { to, ...extra });
      setCompletingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update this appointment");
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
          <button
            type="button"
            onClick={() => setDateKey((k) => addDaysToDateKey(k, -1))}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ← Prev
          </button>
          <span className="text-sm font-medium text-slate-700">
            {formatDate(`${dateKey}T00:00:00.000Z`)}
          </span>
          <button
            type="button"
            onClick={() => setDateKey((k) => addDaysToDateKey(k, 1))}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            Next →
          </button>
        </div>
      </div>

      {appointments === null && <LoadingState label="Loading your agenda…" />}
      {appointments && appointments.length === 0 && (
        <EmptyState title="No appointments on this day" />
      )}

      {appointments && appointments.length > 0 && (
        <div className="space-y-3">
          {appointments.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">{formatTime(a.startAt)}</p>
                  <p className="font-semibold text-slate-800">{a.patient.name}</p>
                  <p className="text-sm text-slate-600">{a.reason}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>

              {(a.status === "BOOKED" || a.status === "CONFIRMED") && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.status === "BOOKED" && (
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => doTransition(a.id, "CONFIRMED")}
                      className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCompletingId(completingId === a.id ? null : a.id)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Complete
                  </button>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => doTransition(a.id, "NO_SHOW")}
                    className="rounded-md border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                  >
                    No-show
                  </button>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => {
                      const note = window.prompt("Reason for cancelling this appointment:");
                      if (note && note.trim().length > 0) void doTransition(a.id, "CANCELLED", { note });
                    }}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {completingId === a.id && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Private visit notes (not visible to the patient)
                  </label>
                  <textarea
                    rows={2}
                    value={notesDraft[a.id] ?? ""}
                    onChange={(e) => setNotesDraft((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => doTransition(a.id, "COMPLETED", { visitNotes: notesDraft[a.id] })}
                    className="mt-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Mark completed
                  </button>
                </div>
              )}

              {a.status === "COMPLETED" && a.visitNotes && (
                <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-500">
                  Notes: {a.visitNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
