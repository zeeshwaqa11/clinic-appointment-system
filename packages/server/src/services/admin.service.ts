import type { Clock } from "../core/clock.js";
import { addDaysToKey, dateKeyInTz, localDateTimeToUtc, weekdayOfDateKey } from "../core/clinicTime.js";
import { computeAvailableMinutes } from "../core/slotEngine.js";
import type { AppointmentRepository } from "../repositories/appointment.repo.js";
import type { ClinicRepository } from "../repositories/clinic.repo.js";
import type { DoctorRepository } from "../repositories/doctor.repo.js";
import type { CreateHolidayInput, UpdateSettingsInput } from "../schemas/admin.schema.js";
import type { CreateDoctorInput } from "../schemas/doctor.schema.js";
import type { DoctorService } from "./doctor.service.js";

export interface DoctorStats {
  doctorId: string;
  doctorName: string;
  appointmentCount: number;
  utilization: number;
  noShowRate: number;
}

function thisWeekRange(now: Date, timezone: string): { fromKey: string; toKey: string } {
  const todayKey = dateKeyInTz(now, timezone);
  const weekday = weekdayOfDateKey(todayKey);
  const daysSinceMonday = (weekday + 6) % 7;
  const mondayKey = addDaysToKey(todayKey, -daysSinceMonday);
  const sundayKey = addDaysToKey(mondayKey, 6);
  return { fromKey: mondayKey, toKey: sundayKey };
}

export class AdminService {
  constructor(
    private readonly clinic: ClinicRepository,
    private readonly doctors: DoctorRepository,
    private readonly appointments: AppointmentRepository,
    private readonly doctorService: DoctorService,
    private readonly clock: Clock,
  ) {}

  getSettings() {
    return this.clinic.getSettings();
  }

  updateSettings(input: UpdateSettingsInput) {
    return this.clinic.updateSettings(input);
  }

  getHours() {
    return this.clinic.getHours();
  }

  async replaceHours(hours: Array<{ weekday: number; openTime: string; closeTime: string }>) {
    await this.clinic.replaceHours(hours);
    return this.clinic.getHours();
  }

  getHolidays() {
    return this.clinic.getHolidays();
  }

  createHoliday(input: CreateHolidayInput) {
    return this.clinic.addHoliday({
      date: new Date(`${input.date}T00:00:00.000Z`),
      name: input.name,
    });
  }

  removeHoliday(id: string) {
    return this.clinic.removeHoliday(id);
  }

  createDoctor(input: CreateDoctorInput) {
    return this.doctorService.createDoctor(input);
  }

  async getStats(fromKey?: string, toKey?: string): Promise<DoctorStats[]> {
    const settings = await this.clinic.getSettings();
    const range = fromKey && toKey ? { fromKey, toKey } : thisWeekRange(this.clock.now(), settings.timezone);
    const from = localDateTimeToUtc(range.fromKey, "00:00", settings.timezone);
    const to = localDateTimeToUtc(range.toKey, "23:59", settings.timezone);

    const clinicHoursRows = await this.clinic.getHours();
    const holidayRows = await this.clinic.getHolidays();
    const clinicHours = clinicHoursRows.map((h) => ({
      weekday: h.weekday,
      startTime: h.openTime,
      endTime: h.closeTime,
    }));
    const clinicHolidays = holidayRows.map((h) => h.date);

    const doctors = await this.doctors.listDoctors();

    return Promise.all(
      doctors.map(async (doctor) => {
        const blocks = await this.doctors.getScheduleBlocks(doctor.userId);
        const exceptions = await this.doctors.getExceptions(doctor.userId);

        const availableMinutes = computeAvailableMinutes({
          timezone: settings.timezone,
          clinicHours,
          clinicHolidays,
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
          from,
          to,
        });

        const appointmentsInRange = await this.appointments.list({
          doctorId: doctor.userId,
          from,
          to,
        });

        const bookedMinutes = appointmentsInRange
          .filter((a) => a.status !== "CANCELLED")
          .reduce((sum, a) => sum + (a.endAt.getTime() - a.startAt.getTime()) / 60_000, 0);

        const settled = appointmentsInRange.filter(
          (a) => a.status === "COMPLETED" || a.status === "NO_SHOW",
        );
        const noShows = settled.filter((a) => a.status === "NO_SHOW").length;

        return {
          doctorId: doctor.userId,
          doctorName: doctor.user.name,
          appointmentCount: appointmentsInRange.length,
          utilization: availableMinutes > 0 ? bookedMinutes / availableMinutes : 0,
          noShowRate: settled.length > 0 ? noShows / settled.length : 0,
        };
      }),
    );
  }
}
