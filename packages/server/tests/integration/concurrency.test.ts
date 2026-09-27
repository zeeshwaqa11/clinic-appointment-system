import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { resetDb, testDb } from "../helpers/testDb.js";
import { createDoctor, createUser, nextWeekdayAt, setupClinic, tokenFor } from "../helpers/fixtures.js";

const app = createApp();

describe("booking concurrency", () => {
  beforeEach(async () => {
    await resetDb();
    await setupClinic();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("allows exactly one of two simultaneous bookings for the same doctor and slot to succeed", async () => {
    const doctor = await createDoctor();
    const patientA = await createUser("PATIENT");
    const patientB = await createUser("PATIENT");
    const start = nextWeekdayAt(1, 10, 0);

    const [resA, resB] = await Promise.all([
      request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${tokenFor(patientA)}`)
        .send({ doctorId: doctor.id, start: start.toISOString(), reason: "Check-up A" }),
      request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${tokenFor(patientB)}`)
        .send({ doctorId: doctor.id, start: start.toISOString(), reason: "Check-up B" }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const activeCount = await testDb.appointment.count({
      where: { doctorId: doctor.id, startAt: start, status: { in: ["BOOKED", "CONFIRMED"] } },
    });
    expect(activeCount).toBe(1);
  });
});
