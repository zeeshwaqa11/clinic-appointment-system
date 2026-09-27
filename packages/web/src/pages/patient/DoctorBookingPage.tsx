import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDoctor, getDoctorSlots } from "../../api/doctors.api.js";
import { bookAppointment } from "../../api/appointments.api.js";
import { ApiError } from "../../api/client.js";
import type { DoctorDetail, Slot } from "../../types/index.js";
import { LoadingState } from "../../components/LoadingState.js";
import { ErrorState } from "../../components/ErrorState.js";
import { EmptyState } from "../../components/EmptyState.js";
import { addDaysToDateKey, dateKeyInClinicTz, formatDate, formatTime } from "../../utils/format.js";

export function DoctorBookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [doctorError, setDoctorError] = useState<string | null>(null);

  const [dateKey, setDateKey] = useState(() => dateKeyInClinicTz(new Date()));
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reason, setReason] = useState("");
  const [bookError, setBookError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoctor(id)
      .then(setDoctor)
      .catch((err) => setDoctorError(err instanceof ApiError ? err.message : "Doctor not found"));
  }, [id]);

  async function loadSlots() {
    if (!id) return;
    setSlots(null);
    setSlotsError(null);
    setSelectedSlot(null);
    try {
      const result = await getDoctorSlots(id, dateKey, dateKey);
      setSlots(result);
    } catch (err) {
      setSlotsError(err instanceof ApiError ? err.message : "Failed to load availability");
    }
  }

  useEffect(() => {
    void loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dateKey]);

  async function handleBook() {
    if (!id || !selectedSlot) return;
    setBookError(null);
    if (reason.trim().length === 0) {
      setBookError("Please describe the reason for your visit.");
      return;
    }
    setIsBooking(true);
    try {
      await bookAppointment({ doctorId: id, start: selectedSlot.start, reason });
      navigate("/appointments");
    } catch (err) {
      setBookError(err instanceof ApiError ? err.message : "Unable to book this slot");
      void loadSlots();
    } finally {
      setIsBooking(false);
    }
  }

  if (doctorError) return <ErrorState message={doctorError} />;
  if (!doctor) return <LoadingState label="Loading doctor…" />;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          {doctor.specialty}
        </p>
        <h1 className="text-2xl font-bold text-slate-800">{doctor.name}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{doctor.bio}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2">
            <button
              type="button"
              onClick={() => setDateKey((k) => addDaysToDateKey(k, -1))}
              className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
            >
              ← Prev
            </button>
            <span className="font-medium text-slate-700">{formatDate(`${dateKey}T00:00:00.000Z`)}</span>
            <button
              type="button"
              onClick={() => setDateKey((k) => addDaysToDateKey(k, 1))}
              className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
            >
              Next →
            </button>
          </div>

          {slots === null && !slotsError && <LoadingState label="Loading slots…" />}
          {slotsError && <ErrorState message={slotsError} onRetry={loadSlots} />}
          {slots && slots.length === 0 && (
            <EmptyState title="No available slots on this day" hint="Try another date." />
          )}
          {slots && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-md border px-2 py-2 text-sm font-medium ${
                    selectedSlot?.start === slot.start
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-300 text-slate-700 hover:border-brand-400"
                  }`}
                >
                  {formatTime(slot.start)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">Confirm appointment</h2>
          {!selectedSlot ? (
            <p className="text-sm text-slate-400">Pick a time slot to continue.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                {formatDate(selectedSlot.start)} at {formatTime(selectedSlot.start)}
              </p>
              <div>
                <label htmlFor="reason" className="mb-1 block text-sm font-medium text-slate-700">
                  Reason for visit
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              {bookError && <p className="text-sm text-red-600">{bookError}</p>}
              <button
                type="button"
                onClick={handleBook}
                disabled={isBooking}
                className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {isBooking ? "Booking…" : "Book appointment"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
