import type { ClinicHolidayModel, ClinicHoursModel, ClinicSettingsModel, PrismaDb } from "./types.js";

const SETTINGS_ID = 1;

export class ClinicRepository {
  constructor(private readonly db: PrismaDb) {}

  async getSettings(): Promise<ClinicSettingsModel> {
    const settings = await this.db.clinicSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!settings) {
      throw new Error("Clinic settings have not been seeded");
    }
    return settings;
  }

  updateSettings(data: Omit<ClinicSettingsModel, "id">): Promise<ClinicSettingsModel> {
    return this.db.clinicSettings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });
  }

  getHours(): Promise<ClinicHoursModel[]> {
    return this.db.clinicHours.findMany({ orderBy: { weekday: "asc" } });
  }

  replaceHours(hours: Array<Omit<ClinicHoursModel, "id">>): Promise<void> {
    return this.db.$transaction(async (tx) => {
      await tx.clinicHours.deleteMany();
      for (const h of hours) {
        await tx.clinicHours.create({ data: h });
      }
    });
  }

  getHolidays(): Promise<ClinicHolidayModel[]> {
    return this.db.clinicHoliday.findMany({ orderBy: { date: "asc" } });
  }

  addHoliday(data: { date: Date; name: string }): Promise<ClinicHolidayModel> {
    return this.db.clinicHoliday.create({ data });
  }

  removeHoliday(id: string): Promise<void> {
    return this.db.clinicHoliday.delete({ where: { id } }).then(() => undefined);
  }
}
