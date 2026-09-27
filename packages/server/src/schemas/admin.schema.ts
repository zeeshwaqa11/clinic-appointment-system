import { z } from "zod";
import { isoDateSchema, uuidSchema } from "./common.schema.js";

export const updateSettingsSchema = z.object({
  timezone: z.string().min(1).max(100),
  minNoticeMinutes: z.number().int().min(0).max(10_080),
  bookingWindowDays: z.number().int().min(1).max(365),
  patientMaxUpcoming: z.number().int().min(1).max(20),
  cancelCutoffHours: z.number().int().min(0).max(720),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const createHolidaySchema = z.object({
  date: isoDateSchema,
  name: z.string().trim().min(1).max(200),
});
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

export const holidayIdParamsSchema = z.object({
  id: uuidSchema,
});

export const statsQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
