import { Router } from "express";
import { asyncHandler } from "../core/asyncHandler.js";
import { clinicRepo } from "../container.js";

export const clinicInfoRouter = Router();

clinicInfoRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await clinicRepo.getSettings();
    res.status(200).json({ timezone: settings.timezone });
  }),
);
