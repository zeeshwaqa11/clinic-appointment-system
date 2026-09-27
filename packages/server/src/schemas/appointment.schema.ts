import { z } from "zod";
import { isoDateSchema, isoDateTimeSchema, uuidSchema } from "./common.schema.js";

export const createAppointmentSchema = z.object({
  doctorId: uuidSchema,
  start: isoDateTimeSchema,
  reason: z.string().trim().min(1).max(500),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  start: isoDateTimeSchema,
});
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const transitionAppointmentSchema = z.object({
  to: z.enum(["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
  note: z.string().trim().min(1).max(500).optional(),
  visitNotes: z.string().trim().max(2000).optional(),
});
export type TransitionAppointmentInput = z.infer<typeof transitionAppointmentSchema>;

export const appointmentIdParamsSchema = z.object({
  id: uuidSchema,
});

export const appointmentListQuerySchema = z.object({
  doctorId: uuidSchema.optional(),
  status: z.enum(["BOOKED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
export type AppointmentListQuery = z.infer<typeof appointmentListQuerySchema>;
