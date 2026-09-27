import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SPECIALTIES = ["General Practice", "Pediatrics", "Dermatology", "Cardiology"];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@clinic.local" },
    update: {},
    create: {
      name: "Alex Admin",
      email: "admin@clinic.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  for (const name of SPECIALTIES) {
    await prisma.specialty.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  await prisma.clinicSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      timezone: "Europe/London",
      minNoticeMinutes: 120,
      bookingWindowDays: 30,
      patientMaxUpcoming: 3,
      cancelCutoffHours: 24,
    },
  });

  const weekdayHours = [
    { weekday: 1, openTime: "09:00", closeTime: "17:00" },
    { weekday: 2, openTime: "09:00", closeTime: "17:00" },
    { weekday: 3, openTime: "09:00", closeTime: "17:00" },
    { weekday: 4, openTime: "09:00", closeTime: "17:00" },
    { weekday: 5, openTime: "09:00", closeTime: "17:00" },
  ];

  for (const hours of weekdayHours) {
    await prisma.clinicHours.upsert({
      where: { weekday: hours.weekday },
      update: hours,
      create: hours,
    });
  }

  console.log("Seed complete: admin user, specialties, and clinic settings created.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
