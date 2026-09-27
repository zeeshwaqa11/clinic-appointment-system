import { PrismaClient } from "@prisma/client";

export const testDb = new PrismaClient();

export async function resetDb(): Promise<void> {
  await testDb.$transaction([
    testDb.notification.deleteMany(),
    testDb.appointmentEvent.deleteMany(),
    testDb.appointment.deleteMany(),
    testDb.scheduleException.deleteMany(),
    testDb.scheduleBlock.deleteMany(),
    testDb.doctorProfile.deleteMany(),
    testDb.clinicHoliday.deleteMany(),
    testDb.clinicHours.deleteMany(),
    testDb.clinicSettings.deleteMany(),
    testDb.user.deleteMany(),
    testDb.specialty.deleteMany(),
  ]);
}
