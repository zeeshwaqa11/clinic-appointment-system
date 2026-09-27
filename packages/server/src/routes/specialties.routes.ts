import { Router } from "express";
import { asyncHandler } from "../core/asyncHandler.js";
import { doctorService } from "../container.js";

export const specialtiesRouter = Router();

specialtiesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const specialties = await doctorService.listSpecialties();
    res.status(200).json({ specialties });
  }),
);
