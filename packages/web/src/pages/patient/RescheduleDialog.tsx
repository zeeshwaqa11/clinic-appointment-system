import { useEffect, useState } from "react";
import { getDoctorSlots } from "../../api/doctors.api.js";
import { rescheduleAppointment } from "../../api/appointments.api.js";
import { ApiError } from "../../api/client.js";
import type { Appointment, Slot } from "../../types/index.js";
import { LoadingState } from "../../components/LoadingState.js";
import { EmptyState } from "../../components/EmptyState.js";
import { addDaysToDateKey, dateKeyInClinicTz, formatDate, formatTime } from "../../utils/format.js";

export function RescheduleDialog({
  appointment,
  onClose,
  onRescheduled,
}: {
  appointment: Appointment;
  onClose: () => void;
  onRescheduled: () => void;
}) {
  const [dateKey, setDateKey] = useState(() => dateKeyInClinicTz(new Date()));
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadSlots() {
    setSlots(null);
    setError(null);
    try {
      const result = await getDoctorSlots(appointment.doctorId, dateKey, dateKey);
      setSlots(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load availability");
    }
  }

  useEffect(() => {
    void loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  async function handlePick(slot: Slot) {
    setIsSubmitting(true);
    setError(null);
    try {
      await rescheduleAppointment(appointment.id, slot.start);
      onRescheduled();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reschedule to this slot");
      void loadSlots();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDateKey((k) => addDaysToDateKey(k, -1))}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-200"
          >
            ←
          </button>
          <span className="text-sm font-medium text-slate-700">
            {formatDate(`${dateKey}T00:00:00.000Z`)}
          </span>
          <button
            type="button"
            onClick={() => setDateKey((k) => addDaysToDateKey(k, 1))}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-200"
          >
            →
          </button>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
          Close
        </button>
      </div>

      {slots === null && !error && <LoadingState label="Loading slots…" />}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {slots && slots.length === 0 && <EmptyState title="No available slots on this day" />}
      {slots && slots.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {slots.map((slot) => (
            <button
              key={slot.start}
              type="button"
              disabled={isSubmitting}
              onClick={() => handlePick(slot)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-400 disabled:opacity-50"
            >
              {formatTime(slot.start)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
