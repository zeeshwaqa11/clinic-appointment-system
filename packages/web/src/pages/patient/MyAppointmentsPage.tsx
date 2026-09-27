import { useEffect, useState } from "react";
import { cancelAppointment, listAppointments } from "../../api/appointments.api.js";
import { ApiError } from "../../api/client.js";
import type { Appointment } from "../../types/index.js";
import { LoadingState } from "../../components/LoadingState.js";
import { ErrorState } from "../../components/ErrorState.js";
import { EmptyState } from "../../components/EmptyState.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatDateTime } from "../../utils/format.js";
import { RescheduleDialog } from "./RescheduleDialog.js";

type Tab = "upcoming" | "past";

function isUpcoming(a: Appointment): boolean {
  return (
    (a.status === "BOOKED" || a.status === "CONFIRMED") && new Date(a.startAt).getTime() > Date.now()
  );
}

export function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const result = await listAppointments();
      result.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
      setAppointments(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load appointments");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      await cancelAppointment(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to cancel appointment");
    } finally {
      setCancellingId(null);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (appointments === null) return <LoadingState label="Loading your appointments…" />;

  const list = appointments.filter((a) => (tab === "upcoming" ? isUpcoming(a) : !isUpcoming(a)));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-800">My appointments</h1>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {(["upcoming", "past"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={tab === "upcoming" ? "No upcoming appointments" : "No past appointments"}
          hint={tab === "upcoming" ? "Book one from the Find a doctor page." : undefined}
        />
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800">{a.doctor.name}</p>
                  <p className="text-sm text-slate-500">{formatDateTime(a.startAt)}</p>
                  <p className="mt-1 text-sm text-slate-600">{a.reason}</p>
                  {a.status === "CANCELLED" && a.cancelReason && (
                    <p className="mt-1 text-sm text-red-500">Reason: {a.cancelReason}</p>
                  )}
                </div>
                <StatusBadge status={a.status} />
              </div>

              {tab === "upcoming" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReschedulingId(a.id)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancel(a.id)}
                    disabled={cancellingId === a.id}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancellingId === a.id ? "Cancelling…" : "Cancel"}
                  </button>
                </div>
              )}

              {reschedulingId === a.id && (
                <RescheduleDialog
                  appointment={a}
                  onClose={() => setReschedulingId(null)}
                  onRescheduled={() => {
                    setReschedulingId(null);
                    void load();
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
