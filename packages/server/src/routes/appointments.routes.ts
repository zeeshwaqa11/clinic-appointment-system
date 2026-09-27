import { Router } from "express";
import { asyncHandler } from "../core/asyncHandler.js";
import { localDateTimeToUtc } from "../core/clinicTime.js";
import { unauthorizedError } from "../core/errors.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  appointmentIdParamsSchema,
  appointmentListQuerySchema,
  cancelAppointmentSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  transitionAppointmentSchema,
} from "../schemas/appointment.schema.js";
import { appointmentService, clinicRepo } from "../container.js";
import type { Actor } from "../services/appointment.service.js";
import type { Request } from "express";

function actorFrom(req: Request): Actor {
  if (!req.user) throw unauthorizedError();
  return { id: req.user.sub, role: req.user.role };
}

export const appointmentsRouter = Router();

appointmentsRouter.use(authenticate);

appointmentsRouter.post(
  "/",
  requireRole("PATIENT"),
  validate({ body: createAppointmentSchema }),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(req);
    const appointment = await appointmentService.book(actor.id, {
      doctorId: req.body.doctorId,
      start: new Date(req.body.start),
      reason: req.body.reason,
    });
    res.status(201).json({ appointment });
  }),
);

appointmentsRouter.get(
  "/",
  validate({ query: appointmentListQuerySchema }),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(req);
    const { doctorId, status, from, to } = req.query as unknown as {
      doctorId?: string;
      status?: "BOOKED" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
      from?: string;
      to?: string;
    };
    const settings = from || to ? await clinicRepo.getSettings() : null;
    const appointments = await appointmentService.list(actor, {
      doctorId,
      status,
      from: from && settings ? localDateTimeToUtc(from, "00:00", settings.timezone) : undefined,
      to: to && settings ? localDateTimeToUtc(to, "23:59", settings.timezone) : undefined,
    });
    res.status(200).json({ appointments });
  }),
);

appointmentsRouter.get(
  "/:id",
  validate({ params: appointmentIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(req);
    const appointment = await appointmentService.get(req.params.id as string, actor);
    res.status(200).json({ appointment });
  }),
);

appointmentsRouter.post(
  "/:id/transition",
  validate({ params: appointmentIdParamsSchema, body: transitionAppointmentSchema }),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(req);
    const appointment = await appointmentService.transition(req.params.id as string, actor, req.body);
    res.status(200).json({ appointment });
  }),
);

appointmentsRouter.post(
  "/:id/reschedule",
  validate({ params: appointmentIdParamsSchema, body: rescheduleAppointmentSchema }),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(req);
    const appointment = await appointmentService.reschedule(
      req.params.id as string,
      actor,
      new Date(req.body.start),
    );
    res.status(200).json({ appointment });
  }),
);

appointmentsRouter.post(
  "/:id/cancel",
  validate({ params: appointmentIdParamsSchema, body: cancelAppointmentSchema }),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(req);
    const appointment = await appointmentService.cancel(
      req.params.id as string,
      actor,
      req.body.reason,
    );
    res.status(200).json({ appointment });
  }),
);
