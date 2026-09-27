import { apiRequest } from "./client.js";
import type { ClinicHoliday, ClinicHours, ClinicSettings, DoctorStats } from "../types/index.js";

export async function getSettings(): Promise<ClinicSettings> {
  const res = await apiRequest<{ settings: ClinicSettings }>("/admin/settings");
  return res.settings;
}

export async function updateSettings(input: Omit<ClinicSettings, "id">): Promise<ClinicSettings> {
  const res = await apiRequest<{ settings: ClinicSettings }>("/admin/settings", {
    method: "PUT",
    body: input,
  });
  return res.settings;
}

export async function getHours(): Promise<ClinicHours[]> {
  const res = await apiRequest<{ hours: ClinicHours[] }>("/admin/hours");
  return res.hours;
}

export async function replaceHours(
  hours: Array<{ weekday: number; openTime: string; closeTime: string }>,
): Promise<ClinicHours[]> {
  const res = await apiRequest<{ hours: ClinicHours[] }>("/admin/hours", {
    method: "PUT",
    body: { hours },
  });
  return res.hours;
}

export async function getHolidays(): Promise<ClinicHoliday[]> {
  const res = await apiRequest<{ holidays: ClinicHoliday[] }>("/admin/holidays");
  return res.holidays;
}

export async function createHoliday(date: string, name: string): Promise<ClinicHoliday> {
  const res = await apiRequest<{ holiday: ClinicHoliday }>("/admin/holidays", {
    method: "POST",
    body: { date, name },
  });
  return res.holiday;
}

export function deleteHoliday(id: string): Promise<void> {
  return apiRequest(`/admin/holidays/${id}`, { method: "DELETE" });
}

export async function createDoctor(input: {
  name: string;
  email: string;
  password: string;
  specialtyId: string;
  bio: string;
  slotMinutes: 15 | 20 | 30;
}): Promise<{ id: string; name: string; email: string; specialty: string }> {
  const res = await apiRequest<{
    doctor: { id: string; name: string; email: string; specialty: string };
  }>("/admin/doctors", { method: "POST", body: input });
  return res.doctor;
}

export async function getStats(from?: string, to?: string): Promise<DoctorStats[]> {
  const res = await apiRequest<{ stats: DoctorStats[] }>("/admin/stats", { query: { from, to } });
  return res.stats;
}
