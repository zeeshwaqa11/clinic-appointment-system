import type {
  Appointment,
  AppointmentEvent,
  ClinicHoliday,
  ClinicHours,
  ClinicSettings,
  DoctorProfile,
  Notification,
  Prisma,
  PrismaClient,
  ScheduleBlock,
  ScheduleException,
  Specialty,
  User,
} from "@prisma/client";

export type PrismaDb = PrismaClient | Prisma.TransactionClient;

export type ClinicSettingsModel = ClinicSettings;
export type ClinicHoursModel = ClinicHours;
export type ClinicHolidayModel = ClinicHoliday;
export type ScheduleBlockModel = ScheduleBlock;
export type ScheduleExceptionModel = ScheduleException;
export type DoctorProfileModel = DoctorProfile;
export type SpecialtyModel = Specialty;
export type UserModel = User;
export type AppointmentModel = Appointment;
export type AppointmentEventModel = AppointmentEvent;
export type NotificationModel = Notification;
