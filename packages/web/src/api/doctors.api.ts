import { apiRequest } from "./client.js";
import type {
  DoctorDetail,
  DoctorSummary,
  ScheduleBlock,
  ScheduleException,
  Slot,
  Specialty,
} from "../types/index.js";

export async function listSpecialties(): Promise<Specialty[]> {
  const res = await apiRequest<{ specialties: Specialty[] }>("/specialties");
  return res.specialties;
}

export async function listDoctors(specialtyId?: string): Promise<DoctorSummary[]> {
  const res = await apiRequest<{ doctors: DoctorSummary[] }>("/doctors", {
    query: { specialtyId },
  });
  return res.doctors;
}

export async function getDoctor(id: string): Promise<DoctorDetail> {
  const res = await apiRequest<{ doctor: DoctorDetail }>(`/doctors/${id}`);
  return res.doctor;
}

export async function getDoctorSlots(id: string, from: string, to: string): Promise<Slot[]> {
  const res = await apiRequest<{ slots: Slot[] }>(`/doctors/${id}/slots`, {
    query: { from, to },
  });
  return res.slots;
}

export async function getSchedule(doctorId: string): Promise<ScheduleBlock[]> {
  const res = await apiRequest<{ blocks: ScheduleBlock[] }>(`/doctors/${doctorId}/schedule`);
  return res.blocks;
}

export async function replaceSchedule(
  doctorId: string,
  blocks: Array<{ weekday: number; startTime: string; endTime: string }>,
): Promise<ScheduleBlock[]> {
  const res = await apiRequest<{ blocks: ScheduleBlock[] }>(`/doctors/${doctorId}/schedule`, {
    method: "PUT",
    body: { blocks },
  });
  return res.blocks;
}

export async function getExceptions(doctorId: string): Promise<ScheduleException[]> {
  const res = await apiRequest<{ exceptions: ScheduleException[] }>(
    `/doctors/${doctorId}/exceptions`,
  );
  return res.exceptions;
}

export async function createException(
  doctorId: string,
  input: { date: string; type: "OFF" | "EXTRA"; startTime?: string; endTime?: string },
): Promise<ScheduleException> {
  const res = await apiRequest<{ exception: ScheduleException }>(
    `/doctors/${doctorId}/exceptions`,
    { method: "POST", body: input },
  );
  return res.exception;
}

export function deleteException(doctorId: string, exceptionId: string): Promise<void> {
  return apiRequest(`/doctors/${doctorId}/exceptions/${exceptionId}`, { method: "DELETE" });
}
