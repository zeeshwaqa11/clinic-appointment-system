import type { AppointmentStatus } from "../types/index.js";

const STYLES: Record<AppointmentStatus, string> = {
  BOOKED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-slate-200 text-slate-700",
  NO_SHOW: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-red-100 text-red-700",
};

const LABELS: Record<AppointmentStatus, string> = {
  BOOKED: "Booked",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
