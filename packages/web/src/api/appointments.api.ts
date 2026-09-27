import { apiRequest } from "./client.js";
import type { Appointment, AppointmentStatus } from "../types/index.js";

export async function bookAppointment(input: {
  doctorId: string;
  start: string;
  reason: string;
}): Promise<Appointment> {
  const res = await apiRequest<{ appointment: Appointment }>("/appointments", {
    method: "POST",
    body: input,
  });
  return res.appointment;
}

export async function listAppointments(filter: {
  doctorId?: string;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
} = {}): Promise<Appointment[]> {
  const res = await apiRequest<{ appointments: Appointment[] }>("/appointments", {
    query: filter,
  });
  return res.appointments;
}

export async function getAppointment(id: string): Promise<Appointment> {
  const res = await apiRequest<{ appointment: Appointment }>(`/appointments/${id}`);
  return res.appointment;
}

export async function transitionAppointment(
  id: string,
  input: { to: AppointmentStatus; note?: string; visitNotes?: string },
): Promise<Appointment> {
  const res = await apiRequest<{ appointment: Appointment }>(`/appointments/${id}/transition`, {
    method: "POST",
    body: input,
  });
  return res.appointment;
}

export async function rescheduleAppointment(id: string, start: string): Promise<Appointment> {
  const res = await apiRequest<{ appointment: Appointment }>(`/appointments/${id}/reschedule`, {
    method: "POST",
    body: { start },
  });
  return res.appointment;
}

export async function cancelAppointment(id: string, reason?: string): Promise<Appointment> {
  const res = await apiRequest<{ appointment: Appointment }>(`/appointments/${id}/cancel`, {
    method: "POST",
    body: { reason },
  });
  return res.appointment;
}
