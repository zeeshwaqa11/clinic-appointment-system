import { z } from "zod";
import { isoDateSchema, timeStringSchema, uuidSchema } from "./common.schema.js";

export const createDoctorSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  specialtyId: uuidSchema,
  bio: z.string().trim().min(1).max(1000),
  slotMinutes: z.union([z.literal(15), z.literal(20), z.literal(30)]),
});
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const doctorListQuerySchema = z.object({
  specialtyId: uuidSchema.optional(),
});

export const doctorIdParamsSchema = z.object({
  id: uuidSchema,
});

export const slotsQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((v) => v.from <= v.to, { message: "from must not be after to" });

const scheduleBlockSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

export const replaceScheduleSchema = z.object({
  blocks: z.array(scheduleBlockSchema).max(50),
});
export type ReplaceScheduleInput = z.infer<typeof replaceScheduleSchema>;

export const createExceptionSchema = z
  .object({
    date: isoDateSchema,
    type: z.enum(["OFF", "EXTRA"]),
    startTime: timeStringSchema.optional(),
    endTime: timeStringSchema.optional(),
  })
  .refine((v) => (v.startTime == null) === (v.endTime == null), {
    message: "startTime and endTime must both be set or both be omitted",
    path: ["endTime"],
  })
  .refine((v) => v.type !== "EXTRA" || (v.startTime != null && v.endTime != null), {
    message: "EXTRA exceptions require startTime and endTime",
    path: ["startTime"],
  })
  .refine((v) => v.startTime == null || v.startTime < v.endTime!, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });
export type CreateExceptionInput = z.infer<typeof createExceptionSchema>;

export const exceptionIdParamsSchema = z.object({
  id: uuidSchema,
  exceptionId: uuidSchema,
});
