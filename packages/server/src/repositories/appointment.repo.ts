import type { Prisma } from "@prisma/client";
import type { AppointmentStatus } from "../core/stateMachine.js";
import type { AppointmentEventModel, AppointmentModel, PrismaDb } from "./types.js";

const ACTIVE_STATUSES: AppointmentStatus[] = ["BOOKED", "CONFIRMED"];

export function activeSlotKey(doctorId: string, startAt: Date): string {
  return `${doctorId}|${startAt.toISOString()}`;
}

export interface AppointmentWithParties extends AppointmentModel {
  patient: { id: string; name: string; email: string };
  doctor: { id: string; name: string; email: string };
}

export interface AppointmentListFilter {
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  from?: Date;
  to?: Date;
}

export class AppointmentRepository {
  constructor(private readonly db: PrismaDb) {}

  findById(id: string): Promise<AppointmentWithParties | null> {
    return this.db.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findActiveInRange(
    doctorId: string,
    from: Date,
    to: Date,
    excludeId?: string,
  ): Promise<AppointmentModel[]> {
    return this.db.appointment.findMany({
      where: {
        doctorId,
        status: { in: ACTIVE_STATUSES },
        startAt: { lt: to },
        endAt: { gt: from },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  findActiveOverlappingForPatient(
    patientId: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<AppointmentModel[]> {
    return this.db.appointment.findMany({
      where: {
        patientId,
        status: { in: ACTIVE_STATUSES },
        startAt: { lt: end },
        endAt: { gt: start },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  countActiveUpcomingForPatient(patientId: string, now: Date, excludeId?: string): Promise<number> {
    return this.db.appointment.count({
      where: {
        patientId,
        status: { in: ACTIVE_STATUSES },
        startAt: { gt: now },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  create(data: {
    patientId: string;
    doctorId: string;
    startAt: Date;
    endAt: Date;
    reason: string;
  }): Promise<AppointmentModel> {
    return this.db.appointment.create({
      data: {
        ...data,
        status: "BOOKED",
        activeSlotKey: activeSlotKey(data.doctorId, data.startAt),
      },
    });
  }

  updateStatus(
    id: string,
    data: { status: AppointmentStatus; cancelReason?: string | null; visitNotes?: string | null },
  ): Promise<AppointmentModel> {
    const isActive = data.status === "BOOKED" || data.status === "CONFIRMED";
    return this.db.appointment.update({
      where: { id },
      data: {
        status: data.status,
        cancelReason: data.cancelReason,
        visitNotes: data.visitNotes,
        activeSlotKey: isActive ? undefined : null,
      },
    });
  }

  reschedule(id: string, doctorId: string, startAt: Date, endAt: Date): Promise<AppointmentModel> {
    return this.db.appointment.update({
      where: { id },
      data: { startAt, endAt, activeSlotKey: activeSlotKey(doctorId, startAt) },
    });
  }

  addEvent(data: {
    appointmentId: string;
    fromStatus: string | null;
    toStatus: string;
    actorId: string;
    note?: string | null;
  }): Promise<AppointmentEventModel> {
    return this.db.appointmentEvent.create({ data });
  }

  list(filter: AppointmentListFilter): Promise<AppointmentWithParties[]> {
    const where: Prisma.AppointmentWhereInput = {
      patientId: filter.patientId,
      doctorId: filter.doctorId,
      status: filter.status,
    };
    if (filter.from || filter.to) {
      where.startAt = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }

    return this.db.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startAt: "asc" },
    });
  }
}
