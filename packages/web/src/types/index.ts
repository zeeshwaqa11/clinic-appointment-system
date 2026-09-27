export type Role = "PATIENT" | "DOCTOR" | "ADMIN";

export type AppointmentStatus = "BOOKED" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Specialty {
  id: string;
  name: string;
}

export interface Slot {
  start: string;
  end: string;
}

export interface DoctorSummary {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  slotMinutes: number;
  nextAvailableSlot: Slot | null;
}

export interface DoctorDetail {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  slotMinutes: number;
}

export interface ScheduleBlock {
  id: string;
  doctorId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleException {
  id: string;
  doctorId: string;
  date: string;
  type: "OFF" | "EXTRA";
  startTime: string | null;
  endTime: string | null;
}

export interface AppointmentParty {
  id: string;
  name: string;
  email: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  reason: string;
  cancelReason: string | null;
  visitNotes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: AppointmentParty;
  doctor: AppointmentParty;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface ClinicSettings {
  id: number;
  timezone: string;
  minNoticeMinutes: number;
  bookingWindowDays: number;
  patientMaxUpcoming: number;
  cancelCutoffHours: number;
}

export interface ClinicHours {
  id: string;
  weekday: number;
  openTime: string;
  closeTime: string;
}

export interface ClinicHoliday {
  id: string;
  date: string;
  name: string;
}

export interface DoctorStats {
  doctorId: string;
  doctorName: string;
  appointmentCount: number;
  utilization: number;
  noShowRate: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
