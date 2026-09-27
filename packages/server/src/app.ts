import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.middleware.js";
import { adminRouter } from "./routes/admin.routes.js";
import { appointmentsRouter } from "./routes/appointments.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { clinicInfoRouter } from "./routes/clinicInfo.routes.js";
import { doctorsRouter } from "./routes/doctors.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { specialtiesRouter } from "./routes/specialties.routes.js";

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/specialties", specialtiesRouter);
  app.use("/api/doctors", doctorsRouter);
  app.use("/api/appointments", appointmentsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/clinic-info", clinicInfoRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
