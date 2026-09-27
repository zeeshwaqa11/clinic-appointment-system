import type { PrismaClient } from "@prisma/client";
import type { Role } from "../core/roles.js";
import type {
  DoctorProfileModel,
  ScheduleBlockModel,
  ScheduleExceptionModel,
  SpecialtyModel,
  UserModel,
} from "./types.js";

export interface DoctorWithUser extends DoctorProfileModel {
  user: UserModel;
  specialty: SpecialtyModel;
}

export class DoctorRepository {
  constructor(private readonly db: PrismaClient) {}

  listSpecialties(): Promise<SpecialtyModel[]> {
    return this.db.specialty.findMany({ orderBy: { name: "asc" } });
  }

  listDoctors(specialtyId?: string): Promise<DoctorWithUser[]> {
    return this.db.doctorProfile.findMany({
      where: specialtyId ? { specialtyId } : undefined,
      include: { user: true, specialty: true },
      orderBy: { user: { name: "asc" } },
    });
  }

  findDoctor(userId: string): Promise<DoctorWithUser | null> {
    return this.db.doctorProfile.findUnique({
      where: { userId },
      include: { user: true, specialty: true },
    });
  }

  async createDoctor(data: {
    name: string;
    email: string;
    passwordHash: string;
    specialtyId: string;
    bio: string;
    slotMinutes: number;
  }): Promise<DoctorWithUser> {
    const role: Role = "DOCTOR";
    const user = await this.db.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role,
        doctorProfile: {
          create: {
            specialtyId: data.specialtyId,
            bio: data.bio,
            slotMinutes: data.slotMinutes,
          },
        },
      },
      include: { doctorProfile: { include: { specialty: true } } },
    });

    return { ...user.doctorProfile!, user, specialty: user.doctorProfile!.specialty };
  }

  getScheduleBlocks(doctorId: string): Promise<ScheduleBlockModel[]> {
    return this.db.scheduleBlock.findMany({
      where: { doctorId },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });
  }

  replaceScheduleBlocks(
    doctorId: string,
    blocks: Array<{ weekday: number; startTime: string; endTime: string }>,
  ): Promise<void> {
    return this.db.$transaction(async (tx) => {
      await tx.scheduleBlock.deleteMany({ where: { doctorId } });
      for (const block of blocks) {
        await tx.scheduleBlock.create({ data: { doctorId, ...block } });
      }
    });
  }

  getExceptions(doctorId: string): Promise<ScheduleExceptionModel[]> {
    return this.db.scheduleException.findMany({
      where: { doctorId },
      orderBy: { date: "asc" },
    });
  }

  createException(
    doctorId: string,
    data: { date: Date; type: "OFF" | "EXTRA"; startTime?: string | null; endTime?: string | null },
  ): Promise<ScheduleExceptionModel> {
    return this.db.scheduleException.create({ data: { doctorId, ...data } });
  }

  async deleteException(doctorId: string, exceptionId: string): Promise<void> {
    await this.db.scheduleException.deleteMany({ where: { id: exceptionId, doctorId } });
  }
}
