import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { activeSlotKey } from "../src/repositories/appointment.repo.js";

const prisma = new PrismaClient();

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260927);

function pick<T>(items: T[]): T {
  return items[Math.floor(rand() * items.length)] as T;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60).toString().padStart(2, "0");
  const m = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function utcDay(base: Date, offsetDays: number): Date {
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + offsetDays),
  );
  return d;
}

interface DoctorSeed {
  name: string;
  email: string;
  specialty: string;
  bio: string;
  slotMinutes: 15 | 20 | 30;
  blocks: Array<{ weekday: number; startTime: string; endTime: string }>;
}

const SPECIALTIES = ["General Practice", "Pediatrics", "Dermatology", "Cardiology"];

const DOCTORS: DoctorSeed[] = [
  {
    name: "Dr. Sarah Chen",
    email: "sarah.chen@clinic.local",
    specialty: "General Practice",
    bio: "General practitioner with 12 years of experience in family medicine.",
    slotMinutes: 30,
    blocks: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "09:00", endTime: "12:00" }))
      .concat([1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "13:00", endTime: "17:00" }))),
  },
  {
    name: "Dr. James Okafor",
    email: "james.okafor@clinic.local",
    specialty: "General Practice",
    bio: "General practitioner focused on preventive care and chronic disease management.",
    slotMinutes: 20,
    blocks: [1, 2, 4, 5].flatMap((weekday) => [
      { weekday, startTime: "08:30", endTime: "13:00" },
      { weekday, startTime: "14:00", endTime: "16:30" },
    ]),
  },
  {
    name: "Dr. Priya Nair",
    email: "priya.nair@clinic.local",
    specialty: "Pediatrics",
    bio: "Pediatrician specializing in early childhood development and vaccinations.",
    slotMinutes: 20,
    blocks: [1, 2, 3, 4, 5].flatMap((weekday) => [
      { weekday, startTime: "09:00", endTime: "12:30" },
      { weekday, startTime: "13:30", endTime: "17:00" },
    ]),
  },
  {
    name: "Dr. Elena Rossi",
    email: "elena.rossi@clinic.local",
    specialty: "Dermatology",
    bio: "Dermatologist with a focus on skin cancer screening and acne treatment.",
    slotMinutes: 30,
    blocks: [1, 3, 5].flatMap((weekday) => [
      { weekday, startTime: "10:00", endTime: "13:00" },
      { weekday, startTime: "14:00", endTime: "16:00" },
    ]),
  },
  {
    name: "Dr. Marcus Webb",
    email: "marcus.webb@clinic.local",
    specialty: "Dermatology",
    bio: "Dermatologist offering quick-turnaround consultations for common skin conditions.",
    slotMinutes: 15,
    blocks: [2, 4].map((weekday) => ({ weekday, startTime: "09:00", endTime: "17:00" })),
  },
  {
    name: "Dr. Fatima Al-Sayed",
    email: "fatima.alsayed@clinic.local",
    specialty: "Cardiology",
    bio: "Cardiologist specializing in hypertension management and cardiac risk assessment.",
    slotMinutes: 30,
    blocks: [1, 2, 3, 4].map((weekday) => ({ weekday, startTime: "09:00", endTime: "15:00" })),
  },
];

const PATIENT_NAMES = [
  "Alice Morgan", "Ben Carter", "Chloe Dubois", "David Kim", "Emma Wilson",
  "Farhan Iqbal", "Grace Liu", "Hassan Ali", "Isabella Santos", "Jack Thompson",
  "Karim Osei", "Lena Novak", "Mohammed Rahman", "Nadia Petrov", "Omar Farouk",
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("password123", 10);
  const today = utcDay(new Date(), 0);

  await prisma.user.upsert({
    where: { email: "admin@clinic.local" },
    update: {},
    create: { name: "Alex Admin", email: "admin@clinic.local", passwordHash, role: "ADMIN" },
  });

  const specialtyByName = new Map<string, string>();
  for (const name of SPECIALTIES) {
    const specialty = await prisma.specialty.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    specialtyByName.set(name, specialty.id);
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

  const weekdayHours = [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    openTime: "08:00",
    closeTime: "18:00",
  }));
  for (const hours of weekdayHours) {
    await prisma.clinicHours.upsert({
      where: { weekday: hours.weekday },
      update: hours,
      create: hours,
    });
  }

  const holidayDate = (() => {
    let d = utcDay(today, 10);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d = utcDay(d, 1);
    return d;
  })();
  await prisma.clinicHoliday.deleteMany();
  await prisma.clinicHoliday.create({ data: { date: holidayDate, name: "Clinic Training Day" } });

  const doctorIds: Array<{ id: string; slotMinutes: number; blocks: DoctorSeed["blocks"] }> = [];
  for (const doc of DOCTORS) {
    const specialtyId = specialtyByName.get(doc.specialty);
    if (!specialtyId) throw new Error(`Unknown specialty ${doc.specialty}`);

    const user = await prisma.user.upsert({
      where: { email: doc.email },
      update: {},
      create: { name: doc.name, email: doc.email, passwordHash, role: "DOCTOR" },
    });

    await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: { specialtyId, bio: doc.bio, slotMinutes: doc.slotMinutes },
      create: { userId: user.id, specialtyId, bio: doc.bio, slotMinutes: doc.slotMinutes },
    });

    await prisma.scheduleBlock.deleteMany({ where: { doctorId: user.id } });
    for (const block of doc.blocks) {
      await prisma.scheduleBlock.create({ data: { doctorId: user.id, ...block } });
    }

    doctorIds.push({ id: user.id, slotMinutes: doc.slotMinutes, blocks: doc.blocks });
  }

  // A couple of hand-picked exceptions so the schedule views have something to show.
  const firstDoctor = doctorIds[0];
  const secondDoctor = doctorIds[1];
  const fourthDoctor = doctorIds[3];
  if (firstDoctor) {
    await prisma.scheduleException.deleteMany({ where: { doctorId: firstDoctor.id } });
    await prisma.scheduleException.create({
      data: { doctorId: firstDoctor.id, date: utcDay(today, 6), type: "OFF" },
    });
  }
  if (secondDoctor) {
    await prisma.scheduleException.deleteMany({ where: { doctorId: secondDoctor.id } });
    await prisma.scheduleException.create({
      data: {
        doctorId: secondDoctor.id,
        date: utcDay(today, 3),
        type: "OFF",
        startTime: "14:00",
        endTime: "16:30",
      },
    });
  }
  if (fourthDoctor) {
    await prisma.scheduleException.deleteMany({ where: { doctorId: fourthDoctor.id } });
    await prisma.scheduleException.create({
      data: {
        doctorId: fourthDoctor.id,
        date: utcDay(today, 8),
        type: "EXTRA",
        startTime: "09:00",
        endTime: "11:00",
      },
    });
  }

  const patientIds: string[] = [];
  for (let i = 0; i < PATIENT_NAMES.length; i += 1) {
    const name = PATIENT_NAMES[i] as string;
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, passwordHash, role: "PATIENT" },
    });
    patientIds.push(user.id);
  }

  await prisma.notification.deleteMany();
  await prisma.appointmentEvent.deleteMany();
  await prisma.appointment.deleteMany();

  const usedDoctorSlots = new Set<string>();
  const patientSlotCount = new Map<string, number>();

  function candidateSlots(doctor: (typeof doctorIds)[number], dayOffset: number): Date[] {
    const day = utcDay(today, dayOffset);
    const weekday = day.getUTCDay();
    const blocksForDay = doctor.blocks.filter((b) => b.weekday === weekday);
    const slots: Date[] = [];
    for (const block of blocksForDay) {
      const start = timeToMinutes(block.startTime);
      const end = timeToMinutes(block.endTime);
      for (let m = start; m + doctor.slotMinutes <= end; m += doctor.slotMinutes) {
        const parts = minutesToTime(m).split(":").map(Number);
        const h = parts[0] ?? 0;
        const min = parts[1] ?? 0;
        slots.push(
          new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, min)),
        );
      }
    }
    return slots;
  }

  const TARGET_APPOINTMENTS = 80;
  let created = 0;
  let attempts = 0;

  while (created < TARGET_APPOINTMENTS && attempts < TARGET_APPOINTMENTS * 20) {
    attempts += 1;
    const doctor = pick(doctorIds);
    const dayOffset = Math.floor(rand() * 43) - 28; // -28 .. +14

    const slots = candidateSlots(doctor, dayOffset);
    if (slots.length === 0) continue;
    const start = pick(slots);
    const doctorKey = `${doctor.id}|${start.toISOString()}`;
    if (usedDoctorSlots.has(doctorKey)) continue;

    const patientId = pick(patientIds);
    if ((patientSlotCount.get(patientId) ?? 0) >= 6) continue;

    const end = new Date(start.getTime() + doctor.slotMinutes * 60_000);
    const isPast = start.getTime() < today.getTime();

    let status: "BOOKED" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
    if (isPast) {
      const roll = rand();
      status = roll < 0.65 ? "COMPLETED" : roll < 0.8 ? "NO_SHOW" : "CANCELLED";
    } else {
      status = rand() < 0.5 ? "BOOKED" : "CONFIRMED";
    }

    const reason = pick([
      "Routine check-up",
      "Follow-up consultation",
      "New symptoms",
      "Prescription renewal",
      "Annual physical",
      "Skin concern",
      "Vaccination",
      "Blood pressure review",
    ]);

    const isActive = status === "BOOKED" || status === "CONFIRMED";

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId: doctor.id,
        startAt: start,
        endAt: end,
        status,
        reason,
        cancelReason: status === "CANCELLED" ? pick(["Patient request", "Doctor unavailable", "Feeling better"]) : null,
        visitNotes: status === "COMPLETED" && rand() < 0.6 ? "Reviewed history, no acute concerns. Advised follow-up if symptoms persist." : null,
        activeSlotKey: isActive ? activeSlotKey(doctor.id, start) : null,
      },
    });

    await prisma.appointmentEvent.create({
      data: {
        appointmentId: appointment.id,
        fromStatus: null,
        toStatus: "BOOKED",
        actorId: patientId,
        note: null,
        createdAt: new Date(start.getTime() - 3 * 86_400_000),
      },
    });

    if (status !== "BOOKED") {
      await prisma.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: status === "CANCELLED" ? "BOOKED" : "CONFIRMED",
          toStatus: status,
          actorId: status === "CANCELLED" ? patientId : doctor.id,
          note: status === "CANCELLED" ? appointment.cancelReason : null,
          createdAt: isPast ? end : new Date(start.getTime() - 86_400_000),
        },
      });
    }

    usedDoctorSlots.add(doctorKey);
    patientSlotCount.set(patientId, (patientSlotCount.get(patientId) ?? 0) + 1);
    created += 1;

    if (status === "CONFIRMED" || status === "BOOKED") {
      await prisma.notification.create({
        data: {
          userId: patientId,
          message: `Your appointment on ${start.toISOString().slice(0, 16).replace("T", " ")} was ${status === "BOOKED" ? "booked" : "confirmed"}.`,
        },
      });
    }
  }

  console.log(
    `Seed complete: 1 admin, ${DOCTORS.length} doctors, ${PATIENT_NAMES.length} patients, ${created} appointments.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
