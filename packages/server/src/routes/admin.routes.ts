import { Router } from "express";
import { asyncHandler } from "../core/asyncHandler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createHolidaySchema,
  holidayIdParamsSchema,
  replaceHoursSchema,
  statsQuerySchema,
  updateSettingsSchema,
} from "../schemas/admin.schema.js";
import { createDoctorSchema } from "../schemas/doctor.schema.js";
import { adminService } from "../container.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole("ADMIN"));

adminRouter.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    const settings = await adminService.getSettings();
    res.status(200).json({ settings });
  }),
);

adminRouter.put(
  "/settings",
  validate({ body: updateSettingsSchema }),
  asyncHandler(async (req, res) => {
    const settings = await adminService.updateSettings(req.body);
    res.status(200).json({ settings });
  }),
);

adminRouter.get(
  "/hours",
  asyncHandler(async (_req, res) => {
    const hours = await adminService.getHours();
    res.status(200).json({ hours });
  }),
);

adminRouter.put(
  "/hours",
  validate({ body: replaceHoursSchema }),
  asyncHandler(async (req, res) => {
    const hours = await adminService.replaceHours(req.body.hours);
    res.status(200).json({ hours });
  }),
);

adminRouter.get(
  "/holidays",
  asyncHandler(async (_req, res) => {
    const holidays = await adminService.getHolidays();
    res.status(200).json({ holidays });
  }),
);

adminRouter.post(
  "/holidays",
  validate({ body: createHolidaySchema }),
  asyncHandler(async (req, res) => {
    const holiday = await adminService.createHoliday(req.body);
    res.status(201).json({ holiday });
  }),
);

adminRouter.delete(
  "/holidays/:id",
  validate({ params: holidayIdParamsSchema }),
  asyncHandler(async (req, res) => {
    await adminService.removeHoliday(req.params.id as string);
    res.status(204).send();
  }),
);

adminRouter.post(
  "/doctors",
  validate({ body: createDoctorSchema }),
  asyncHandler(async (req, res) => {
    const doctor = await adminService.createDoctor(req.body);
    res.status(201).json({
      doctor: {
        id: doctor.userId,
        name: doctor.user.name,
        email: doctor.user.email,
        specialty: doctor.specialty.name,
        bio: doctor.bio,
        slotMinutes: doctor.slotMinutes,
      },
    });
  }),
);

adminRouter.get(
  "/stats",
  validate({ query: statsQuerySchema }),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as { from?: string; to?: string };
    const stats = await adminService.getStats(from, to);
    res.status(200).json({ stats });
  }),
);
