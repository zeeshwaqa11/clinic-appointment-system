import { prisma } from "./config/prisma.js";
import { systemClock } from "./core/clock.js";
import { AppointmentRepository } from "./repositories/appointment.repo.js";
import { ClinicRepository } from "./repositories/clinic.repo.js";
import { DoctorRepository } from "./repositories/doctor.repo.js";
import { NotificationRepository } from "./repositories/notification.repo.js";
import { UserRepository } from "./repositories/user.repo.js";
import { AdminService } from "./services/admin.service.js";
import { AppointmentService } from "./services/appointment.service.js";
import { AuthService } from "./services/auth.service.js";
import { DoctorService } from "./services/doctor.service.js";
import { NotificationService } from "./services/notification.service.js";

const userRepo = new UserRepository(prisma);
const doctorRepo = new DoctorRepository(prisma);
const clinicRepo = new ClinicRepository(prisma);
const appointmentRepo = new AppointmentRepository(prisma);
const notificationRepo = new NotificationRepository(prisma);

export const authService = new AuthService(userRepo);
export const doctorService = new DoctorService(
  doctorRepo,
  clinicRepo,
  appointmentRepo,
  systemClock,
);
export const notificationService = new NotificationService(notificationRepo, clinicRepo);
export const appointmentService = new AppointmentService(
  prisma,
  appointmentRepo,
  clinicRepo,
  doctorService,
  notificationService,
  systemClock,
);

export const adminService = new AdminService(
  clinicRepo,
  doctorRepo,
  appointmentRepo,
  doctorService,
  systemClock,
);

export { clinicRepo, doctorRepo, appointmentRepo, notificationRepo };
