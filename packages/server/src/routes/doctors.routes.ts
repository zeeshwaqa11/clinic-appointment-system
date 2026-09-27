import { Router } from "express";
import { asyncHandler } from "../core/asyncHandler.js";
import { forbiddenError } from "../core/errors.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createExceptionSchema,
  doctorIdParamsSchema,
  doctorListQuerySchema,
  exceptionIdParamsSchema,
  replaceScheduleSchema,
  slotsQuerySchema,
} from "../schemas/doctor.schema.js";
import { doctorService } from "../container.js";
import type { Request } from "express";

function assertSelfOrAdmin(req: Request, doctorId: string): void {
  if (req.user?.role === "ADMIN") return;
  if (req.user?.role === "DOCTOR" && req.user.sub === doctorId) return;
  throw forbiddenError();
}

export const doctorsRouter = Router();

doctorsRouter.get(
  "/",
  validate({ query: doctorListQuerySchema }),
  asyncHandler(async (req, res) => {
    const { specialtyId } = req.query as unknown as { specialtyId?: string };
    const doctors = await doctorService.listDoctors(specialtyId);
    res.status(200).json({ doctors });
  }),
);

doctorsRouter.get(
  "/:id",
  validate({ params: doctorIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const doctor = await doctorService.getDoctorOrThrow(req.params.id as string);
    res.status(200).json({
      doctor: {
        id: doctor.userId,
        name: doctor.user.name,
        specialty: doctor.specialty.name,
        bio: doctor.bio,
        slotMinutes: doctor.slotMinutes,
      },
    });
  }),
);

doctorsRouter.get(
  "/:id/slots",
  validate({ params: doctorIdParamsSchema, query: slotsQuerySchema }),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as { from: string; to: string };
    const slots = await doctorService.getSlotsForDateRange(req.params.id as string, from, to);
    res.status(200).json({ slots });
  }),
);

doctorsRouter.get(
  "/:id/schedule",
  authenticate,
  validate({ params: doctorIdParamsSchema }),
  asyncHandler(async (req, res) => {
    assertSelfOrAdmin(req, req.params.id as string);
    const blocks = await doctorService.getSchedule(req.params.id as string);
    res.status(200).json({ blocks });
  }),
);

doctorsRouter.put(
  "/:id/schedule",
  authenticate,
  validate({ params: doctorIdParamsSchema, body: replaceScheduleSchema }),
  asyncHandler(async (req, res) => {
    assertSelfOrAdmin(req, req.params.id as string);
    const blocks = await doctorService.replaceSchedule(req.params.id as string, req.body.blocks);
    res.status(200).json({ blocks });
  }),
);

doctorsRouter.get(
  "/:id/exceptions",
  authenticate,
  validate({ params: doctorIdParamsSchema }),
  asyncHandler(async (req, res) => {
    assertSelfOrAdmin(req, req.params.id as string);
    const exceptions = await doctorService.getExceptions(req.params.id as string);
    res.status(200).json({ exceptions });
  }),
);

doctorsRouter.post(
  "/:id/exceptions",
  authenticate,
  validate({ params: doctorIdParamsSchema, body: createExceptionSchema }),
  asyncHandler(async (req, res) => {
    assertSelfOrAdmin(req, req.params.id as string);
    const exception = await doctorService.createException(req.params.id as string, req.body);
    res.status(201).json({ exception });
  }),
);

doctorsRouter.delete(
  "/:id/exceptions/:exceptionId",
  authenticate,
  validate({ params: exceptionIdParamsSchema }),
  asyncHandler(async (req, res) => {
    assertSelfOrAdmin(req, req.params.id as string);
    await doctorService.deleteException(req.params.id as string, req.params.exceptionId as string);
    res.status(204).send();
  }),
);
