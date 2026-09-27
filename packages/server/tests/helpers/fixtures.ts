import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../src/config/env.js";
import type { Role } from "../../src/core/roles.js";
import { testDb } from "./testDb.js";

export const DEFAULT_PASSWORD = "password123";

export async function createUser(role: Role, overrides: { name?: string; email?: string } = {}) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 4);
  return testDb.user.create({
    data: {
      name: overrides.name ?? `${role} User`,
      email: overrides.email ?? `${role.toLowerCase()}-${Date.now()}-${Math.random()}@example.com`,
      passwordHash,
      role,
    },
  });
}

export function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export async function setupClinic(
  overrides: Partial<{
    timezone: string;
    minNoticeMinutes: number;
    bookingWindowDays: number;
    patientMaxUpcoming: number;
    cancelCutoffHours: number;
  }> = {},
) {
  await testDb.clinicSettings.create({
    data: {
      id: 1,
      timezone: "UTC",
      minNoticeMinutes: 60,
      bookingWindowDays: 30,
      patientMaxUpcoming: 3,
      cancelCutoffHours: 24,
      ...overrides,
    },
  });

  for (let weekday = 1; weekday <= 5; weekday += 1) {
    await testDb.clinicHours.create({
      data: { weekday, openTime: "09:00", closeTime: "17:00" },
    });
  }
}

export async function createDoctor(options: {
  slotMinutes?: number;
  blocks?: Array<{ weekday: number; startTime: string; endTime: string }>;
} = {}) {
  const specialty = await testDb.specialty.create({
    data: { name: `Specialty-${Date.now()}-${Math.random()}` },
  });

  const doctorUser = await createUser("DOCTOR");
  await testDb.doctorProfile.create({
    data: {
      userId: doctorUser.id,
      specialtyId: specialty.id,
      bio: "Experienced clinician",
      slotMinutes: options.slotMinutes ?? 30,
    },
  });

  const blocks = options.blocks ?? [
    { weekday: 1, startTime: "09:00", endTime: "17:00" },
    { weekday: 2, startTime: "09:00", endTime: "17:00" },
    { weekday: 3, startTime: "09:00", endTime: "17:00" },
    { weekday: 4, startTime: "09:00", endTime: "17:00" },
    { weekday: 5, startTime: "09:00", endTime: "17:00" },
  ];
  for (const block of blocks) {
    await testDb.scheduleBlock.create({ data: { doctorId: doctorUser.id, ...block } });
  }

  return doctorUser;
}

export function nextWeekdayAt(weekday: number, hour: number, minute = 0): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  while (date.getUTCDay() !== weekday) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  date.setUTCDate(date.getUTCDate() + 7); // push a full week out to clear min-notice/booking-window edges
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}
