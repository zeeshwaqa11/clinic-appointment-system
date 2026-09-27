import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../core/asyncHandler.js";
import { systemClock } from "../core/clock.js";
import { unauthorizedError } from "../core/errors.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { notificationRepo } from "../container.js";

const notificationIdParamsSchema = z.object({ id: z.string().uuid() });

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorizedError();
    const notifications = await notificationRepo.listForUser(req.user.sub);
    res.status(200).json({ notifications });
  }),
);

notificationsRouter.post(
  "/:id/read",
  validate({ params: notificationIdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorizedError();
    await notificationRepo.markRead(req.user.sub, req.params.id as string, systemClock.now());
    res.status(204).send();
  }),
);
