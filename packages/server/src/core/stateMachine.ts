import { conflictError, forbiddenError, validationError } from "./errors.js";

export type AppointmentStatus = "BOOKED" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";

export type ActorRole = "PATIENT" | "DOCTOR" | "ADMIN";

export interface TransitionRequest {
  from: AppointmentStatus;
  to: AppointmentStatus;
  actorRole: ActorRole;
  startAt: Date;
  now: Date;
  cancelCutoffHours: number;
  reason?: string | null;
}

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  BOOKED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: [],
};

export function assertValidTransition(req: TransitionRequest): void {
  const allowed = ALLOWED_TRANSITIONS[req.from];
  if (!allowed.includes(req.to)) {
    throw conflictError(`Cannot transition an appointment from ${req.from} to ${req.to}`);
  }

  if (req.to === "COMPLETED" || req.to === "NO_SHOW") {
    if (req.actorRole === "PATIENT") {
      throw forbiddenError(
        "Only a doctor or admin can mark an appointment as completed or no-show",
      );
    }
    if (req.now < req.startAt) {
      throw conflictError(
        "An appointment can only be marked completed or no-show after its start time",
      );
    }
  }

  if (req.to === "CANCELLED") {
    if (req.actorRole === "PATIENT") {
      const cutoff = new Date(req.startAt.getTime() - req.cancelCutoffHours * 60 * 60 * 1000);
      if (req.now > cutoff) {
        throw conflictError(
          `Appointments can only be cancelled at least ${req.cancelCutoffHours} hours before the start time`,
        );
      }
    } else if (!req.reason?.trim()) {
      throw validationError("A reason is required to cancel this appointment");
    }
  }
}
