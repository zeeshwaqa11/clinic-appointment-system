import { Prisma, type PrismaClient } from "@prisma/client";
import type { Clock } from "../core/clock.js";
import { conflictError, forbiddenError, notFoundError } from "../core/errors.js";
import type { Role } from "../core/roles.js";
import { assertValidTransition, type AppointmentStatus } from "../core/stateMachine.js";
import {
  AppointmentRepository,
  type AppointmentListFilter,
  type AppointmentWithParties,
} from "../repositories/appointment.repo.js";
import type { ClinicRepository } from "../repositories/clinic.repo.js";
import type { DoctorService } from "./doctor.service.js";
import type { NotificationService } from "./notification.service.js";

export interface Actor {
  id: string;
  role: Role;
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export class AppointmentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly appointments: AppointmentRepository,
    private readonly clinic: ClinicRepository,
    private readonly doctorService: DoctorService,
    private readonly notifications: NotificationService,
    private readonly clock: Clock,
  ) {}

  private async loadOrThrow(id: string): Promise<AppointmentWithParties> {
    const appt = await this.appointments.findById(id);
    if (!appt) {
      throw notFoundError("Appointment not found");
    }
    return appt;
  }

  private assertViewAccess(appt: AppointmentWithParties, actor: Actor): void {
    if (actor.role === "ADMIN") return;
    if (actor.role === "PATIENT" && appt.patientId === actor.id) return;
    if (actor.role === "DOCTOR" && appt.doctorId === actor.id) return;
    throw forbiddenError();
  }

  private assertTransitionAccess(
    appt: AppointmentWithParties,
    actor: Actor,
    to: AppointmentStatus,
  ): void {
    if (actor.role === "ADMIN") return;
    if (actor.role === "DOCTOR") {
      if (appt.doctorId !== actor.id) throw forbiddenError();
      return;
    }
    if (actor.role === "PATIENT") {
      if (appt.patientId !== actor.id) throw forbiddenError();
      if (to !== "CANCELLED") {
        throw forbiddenError("Patients may only cancel their own appointments");
      }
      return;
    }
  }

  async get(id: string, actor: Actor): Promise<AppointmentWithParties> {
    const appt = await this.loadOrThrow(id);
    this.assertViewAccess(appt, actor);
    return appt;
  }

  async list(actor: Actor, filter: AppointmentListFilter): Promise<AppointmentWithParties[]> {
    const scoped: AppointmentListFilter = { ...filter };
    if (actor.role === "PATIENT") {
      scoped.patientId = actor.id;
      scoped.doctorId = undefined;
    } else if (actor.role === "DOCTOR") {
      scoped.doctorId = actor.id;
      scoped.patientId = undefined;
    }
    return this.appointments.list(scoped);
  }

  async book(
    patientId: string,
    input: { doctorId: string; start: Date; reason: string },
  ): Promise<AppointmentWithParties> {
    const doctor = await this.doctorService.getDoctorOrThrow(input.doctorId);
    const end = new Date(input.start.getTime() + doctor.slotMinutes * 60_000);
    const settings = await this.clinic.getSettings();

    const availableSlots = await this.doctorService.computeSlots(
      input.doctorId,
      input.start,
      input.start,
    );
    const isValid = availableSlots.some((s) => s.start.getTime() === input.start.getTime());
    if (!isValid) {
      throw conflictError("This slot is no longer available");
    }

    const overlapping = await this.appointments.findActiveOverlappingForPatient(
      patientId,
      input.start,
      end,
    );
    if (overlapping.length > 0) {
      throw conflictError("You already have an appointment during this time");
    }

    const upcomingCount = await this.appointments.countActiveUpcomingForPatient(
      patientId,
      this.clock.now(),
    );
    if (upcomingCount >= settings.patientMaxUpcoming) {
      throw conflictError(
        `You already have ${settings.patientMaxUpcoming} upcoming appointments`,
      );
    }

    let created;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const txAppointments = new AppointmentRepository(tx);
        const appt = await txAppointments.create({
          patientId,
          doctorId: input.doctorId,
          startAt: input.start,
          endAt: end,
          reason: input.reason,
        });
        await txAppointments.addEvent({
          appointmentId: appt.id,
          fromStatus: null,
          toStatus: "BOOKED",
          actorId: patientId,
          note: null,
        });
        return appt;
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw conflictError("This slot was just booked by someone else");
      }
      throw err;
    }

    const full = await this.loadOrThrow(created.id);
    await this.notifications.notifyBooked(full);
    return full;
  }

  async reschedule(
    id: string,
    actor: Actor,
    newStart: Date,
  ): Promise<AppointmentWithParties> {
    const appt = await this.loadOrThrow(id);
    if (actor.role !== "ADMIN" && !(actor.role === "PATIENT" && appt.patientId === actor.id)) {
      throw forbiddenError();
    }
    if (appt.status !== "BOOKED" && appt.status !== "CONFIRMED") {
      throw conflictError("Only booked or confirmed appointments can be rescheduled");
    }

    const doctor = await this.doctorService.getDoctorOrThrow(appt.doctorId);
    const newEnd = new Date(newStart.getTime() + doctor.slotMinutes * 60_000);

    const availableSlots = await this.doctorService.computeSlots(
      appt.doctorId,
      newStart,
      newStart,
      appt.id,
    );
    const isValid = availableSlots.some((s) => s.start.getTime() === newStart.getTime());
    if (!isValid) {
      throw conflictError("This slot is no longer available");
    }

    const overlapping = await this.appointments.findActiveOverlappingForPatient(
      appt.patientId,
      newStart,
      newEnd,
      appt.id,
    );
    if (overlapping.length > 0) {
      throw conflictError("You already have an appointment during this time");
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const txAppointments = new AppointmentRepository(tx);
        await txAppointments.reschedule(id, appt.doctorId, newStart, newEnd);
        await txAppointments.addEvent({
          appointmentId: id,
          fromStatus: appt.status,
          toStatus: appt.status,
          actorId: actor.id,
          note: `Rescheduled to ${newStart.toISOString()}`,
        });
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw conflictError("This slot was just booked by someone else");
      }
      throw err;
    }

    const updated = await this.loadOrThrow(id);
    await this.notifications.notifyRescheduled(updated);
    return updated;
  }

  async transition(
    id: string,
    actor: Actor,
    input: { to: AppointmentStatus; note?: string; visitNotes?: string },
  ): Promise<AppointmentWithParties> {
    const appt = await this.loadOrThrow(id);
    this.assertTransitionAccess(appt, actor, input.to);

    const settings = await this.clinic.getSettings();
    assertValidTransition({
      from: appt.status as AppointmentStatus,
      to: input.to,
      actorRole: actor.role,
      startAt: appt.startAt,
      now: this.clock.now(),
      cancelCutoffHours: settings.cancelCutoffHours,
      reason: input.note,
    });

    await this.prisma.$transaction(async (tx) => {
      const txAppointments = new AppointmentRepository(tx);
      await txAppointments.updateStatus(id, {
        status: input.to,
        cancelReason: input.to === "CANCELLED" ? input.note ?? null : appt.cancelReason,
        visitNotes: input.visitNotes ?? appt.visitNotes,
      });
      await txAppointments.addEvent({
        appointmentId: id,
        fromStatus: appt.status,
        toStatus: input.to,
        actorId: actor.id,
        note: input.note ?? null,
      });
    });

    const updated = await this.loadOrThrow(id);
    await this.notifications.notifyStatusChange(updated);
    return updated;
  }

  cancel(id: string, actor: Actor, reason?: string): Promise<AppointmentWithParties> {
    return this.transition(id, actor, { to: "CANCELLED", note: reason });
  }
}
