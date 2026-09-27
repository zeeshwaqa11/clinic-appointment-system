import bcrypt from "bcrypt";
import type { Clock } from "../core/clock.js";
import { localDateTimeToUtc } from "../core/clinicTime.js";
import { computeAvailableSlots } from "../core/slotEngine.js";
import type { Slot } from "../core/slotEngine.types.js";
import { isWithinClinicHours } from "../core/scheduleValidation.js";
import { conflictError, notFoundError, unprocessableError } from "../core/errors.js";
import type { ClinicRepository } from "../repositories/clinic.repo.js";
import type { DoctorRepository, DoctorWithUser } from "../repositories/doctor.repo.js";
import type { AppointmentRepository } from "../repositories/appointment.repo.js";
import type { CreateExceptionInput } from "../schemas/doctor.schema.js";

const SALT_ROUNDS = 10;

export interface DoctorSummary {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  slotMinutes: number;
  nextAvailableSlot: Slot | null;
}

export class DoctorService {
  constructor(
    private readonly doctors: DoctorRepository,
    private readonly clinic: ClinicRepository,
    private readonly appointments: AppointmentRepository,
    private readonly clock: Clock,
  ) {}

  listSpecialties() {
    return this.doctors.listSpecialties();
  }

  async listDoctors(specialtyId?: string): Promise<DoctorSummary[]> {
    const doctors = await this.doctors.listDoctors(specialtyId);
    const settings = await this.clinic.getSettings();

    return Promise.all(
      doctors.map(async (doctor) => {
        const nextSlot = await this.nextAvailableSlot(doctor, settings);
        return {
          id: doctor.userId,
          name: doctor.user.name,
          specialty: doctor.specialty.name,
          bio: doctor.bio,
          slotMinutes: doctor.slotMinutes,
          nextAvailableSlot: nextSlot,
        };
      }),
    );
  }

  private async nextAvailableSlot(
    doctor: DoctorWithUser,
    settings: Awaited<ReturnType<ClinicRepository["getSettings"]>>,
  ): Promise<Slot | null> {
    const now = this.clock.now();
    const to = new Date(now.getTime() + settings.bookingWindowDays * 86_400_000);
    const slots = await this.computeSlots(doctor.userId, now, to);
    return slots[0] ?? null;
  }

  async getDoctorOrThrow(doctorId: string): Promise<DoctorWithUser> {
    const doctor = await this.doctors.findDoctor(doctorId);
    if (!doctor) {
      throw notFoundError("Doctor not found");
    }
    return doctor;
  }

  async computeSlots(
    doctorId: string,
    from: Date,
    to: Date,
    excludeAppointmentId?: string,
  ): Promise<Slot[]> {
    const doctor = await this.getDoctorOrThrow(doctorId);
    const settings = await this.clinic.getSettings();
    const clinicHours = await this.clinic.getHours();
    const holidays = await this.clinic.getHolidays();
    const blocks = await this.doctors.getScheduleBlocks(doctorId);
    const exceptions = await this.doctors.getExceptions(doctorId);
    const busy = await this.appointments.findActiveInRange(
      doctorId,
      from,
      to,
      excludeAppointmentId,
    );

    return computeAvailableSlots({
      timezone: settings.timezone,
      clinicHours: clinicHours.map((h) => ({
        weekday: h.weekday,
        startTime: h.openTime,
        endTime: h.closeTime,
      })),
      clinicHolidays: holidays.map((h) => h.date),
      doctorBlocks: blocks.map((b) => ({
        weekday: b.weekday,
        startTime: b.startTime,
        endTime: b.endTime,
      })),
      doctorExceptions: exceptions.map((e) => ({
        date: e.date,
        type: e.type as "OFF" | "EXTRA",
        startTime: e.startTime,
        endTime: e.endTime,
      })),
      slotMinutes: doctor.slotMinutes,
      busyIntervals: busy.map((a) => ({ start: a.startAt, end: a.endAt })),
      from,
      to,
      now: this.clock.now(),
      minNoticeMinutes: settings.minNoticeMinutes,
      bookingWindowDays: settings.bookingWindowDays,
    });
  }

  async getSlotsForDateRange(doctorId: string, fromDateKey: string, toDateKey: string) {
    await this.getDoctorOrThrow(doctorId);
    const settings = await this.clinic.getSettings();
    const from = localDateTimeToUtc(fromDateKey, "00:00", settings.timezone);
    const to = localDateTimeToUtc(toDateKey, "23:59", settings.timezone);
    return this.computeSlots(doctorId, from, to);
  }

  async createDoctor(input: {
    name: string;
    email: string;
    password: string;
    specialtyId: string;
    bio: string;
    slotMinutes: number;
  }): Promise<DoctorWithUser> {
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    try {
      return await this.doctors.createDoctor({ ...input, passwordHash });
    } catch {
      throw conflictError("An account with this email already exists");
    }
  }

  async getSchedule(doctorId: string) {
    await this.getDoctorOrThrow(doctorId);
    return this.doctors.getScheduleBlocks(doctorId);
  }

  async replaceSchedule(
    doctorId: string,
    blocks: Array<{ weekday: number; startTime: string; endTime: string }>,
  ) {
    await this.getDoctorOrThrow(doctorId);
    const clinicHours = await this.clinic.getHours();
    const weeklyClinicHours = clinicHours.map((h) => ({
      weekday: h.weekday,
      startTime: h.openTime,
      endTime: h.closeTime,
    }));

    for (const block of blocks) {
      if (!isWithinClinicHours(block, weeklyClinicHours)) {
        throw unprocessableError(
          `Schedule block on weekday ${block.weekday} (${block.startTime}-${block.endTime}) falls outside clinic opening hours`,
        );
      }
    }

    await this.doctors.replaceScheduleBlocks(doctorId, blocks);
    return this.doctors.getScheduleBlocks(doctorId);
  }

  async getExceptions(doctorId: string) {
    await this.getDoctorOrThrow(doctorId);
    return this.doctors.getExceptions(doctorId);
  }

  async createException(doctorId: string, input: CreateExceptionInput) {
    await this.getDoctorOrThrow(doctorId);

    if (input.type === "EXTRA" && input.startTime && input.endTime) {
      const clinicHours = await this.clinic.getHours();
      const weeklyClinicHours = clinicHours.map((h) => ({
        weekday: h.weekday,
        startTime: h.openTime,
        endTime: h.closeTime,
      }));
      const weekday = new Date(`${input.date}T00:00:00.000Z`).getUTCDay();
      if (
        !isWithinClinicHours(
          { weekday, startTime: input.startTime, endTime: input.endTime },
          weeklyClinicHours,
        )
      ) {
        throw unprocessableError("Extra working block falls outside clinic opening hours");
      }
    }

    return this.doctors.createException(doctorId, {
      date: new Date(`${input.date}T00:00:00.000Z`),
      type: input.type,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
    });
  }

  async deleteException(doctorId: string, exceptionId: string) {
    await this.getDoctorOrThrow(doctorId);
    await this.doctors.deleteException(doctorId, exceptionId);
  }
}
