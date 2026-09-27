import { z } from "zod";

export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected time in HH:mm format");

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date in YYYY-MM-DD format");

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const uuidSchema = z.string().uuid();
