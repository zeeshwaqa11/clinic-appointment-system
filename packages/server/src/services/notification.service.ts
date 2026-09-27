import { formatInTimeZone } from "date-fns-tz";
import type { AppointmentWithParties } from "../repositories/appointment.repo.js";
import type { ClinicRepository } from "../repositories/clinic.repo.js";
import type { NotificationRepository } from "../repositories/notification.repo.js";

const STATUS_LABEL: Record<string, string> = {
  BOOKED: "booked",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  NO_SHOW: "marked as no-show",
  CANCELLED: "cancelled",
};

export class NotificationService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly clinic: ClinicRepository,
  ) {}

  private async formatWhen(date: Date): Promise<string> {
    const settings = await this.clinic.getSettings();
    return formatInTimeZone(date, settings.timezone, "EEE d MMM 'at' HH:mm");
  }

  async notifyBooked(appt: AppointmentWithParties): Promise<void> {
    const when = await this.formatWhen(appt.startAt);
    await this.notifications.create(appt.patientId, `Your appointment on ${when} was booked.`);
    await this.notifications.create(appt.doctorId, `New appointment booked for ${when}.`);
  }

  async notifyRescheduled(appt: AppointmentWithParties): Promise<void> {
    const when = await this.formatWhen(appt.startAt);
    await this.notifications.create(
      appt.patientId,
      `Your appointment was rescheduled to ${when}.`,
    );
    await this.notifications.create(appt.doctorId, `An appointment was rescheduled to ${when}.`);
  }

  async notifyStatusChange(appt: AppointmentWithParties): Promise<void> {
    const when = await this.formatWhen(appt.startAt);
    const label = STATUS_LABEL[appt.status] ?? appt.status.toLowerCase();
    await this.notifications.create(appt.patientId, `Your appointment on ${when} was ${label}.`);
    if (appt.status !== "CANCELLED") {
      await this.notifications.create(appt.doctorId, `Appointment on ${when} was ${label}.`);
    }
  }
}
