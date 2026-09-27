import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { resetDb, testDb } from "../helpers/testDb.js";
import { createDoctor, createUser, nextWeekdayAt, setupClinic, tokenFor } from "../helpers/fixtures.js";

const app = createApp();

describe("booking rules", () => {
  beforeEach(async () => {
    await resetDb();
    await setupClinic();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("books a valid slot", async () => {
    const doctor = await createDoctor();
    const patient = await createUser("PATIENT");
    const start = nextWeekdayAt(1, 10, 0);

    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${tokenFor(patient)}`)
      .send({ doctorId: doctor.id, start: start.toISOString(), reason: "Check-up" });

    expect(res.status).toBe(201);
    expect(res.body.appointment.status).toBe("BOOKED");
  });

  it("returns 409 when the slot is no longer free", async () => {
    const doctor = await createDoctor();
    const patientA = await createUser("PATIENT");
    const patientB = await createUser("PATIENT");
    const start = nextWeekdayAt(1, 10, 0);

    const first = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${tokenFor(patientA)}`)
      .send({ doctorId: doctor.id, start: start.toISOString(), reason: "Check-up" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${tokenFor(patientB)}`)
      .send({ doctorId: doctor.id, start: start.toISOString(), reason: "Check-up" });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("CONFLICT");
  });

  it("rejects a patient double-booking an overlapping slot with a different doctor", async () => {
    const doctorA = await createDoctor();
    const doctorB = await createDoctor();
    const patient = await createUser("PATIENT");
    const start = nextWeekdayAt(1, 10, 0);

    const first = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${tokenFor(patient)}`)
      .send({ doctorId: doctorA.id, start: start.toISOString(), reason: "Check-up" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${tokenFor(patient)}`)
      .send({ doctorId: doctorB.id, start: start.toISOString(), reason: "Check-up" });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("CONFLICT");
  });

  it("rejects booking beyond the patient's max upcoming appointments", async () => {
    const doctor = await createDoctor();
    const patient = await createUser("PATIENT");

    for (let i = 0; i < 3; i += 1) {
      const start = nextWeekdayAt(1, 9 + i, 0);
      const res = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${tokenFor(patient)}`)
        .send({ doctorId: doctor.id, start: start.toISOString(), reason: "Check-up" });
      expect(res.status).toBe(201);
    }

    const fourthStart = nextWeekdayAt(1, 13, 0);
    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${tokenFor(patient)}`)
      .send({ doctorId: doctor.id, start: fourthStart.toISOString(), reason: "Check-up" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects booking a slot outside the doctor's working hours", async () => {
    const doctor = await createDoctor();
    const patient = await createUser("PATIENT");
    const start = nextWeekdayAt(1, 20, 0); // 8pm, outside 09:00-17:00

    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${tokenFor(patient)}`)
      .send({ doctorId: doctor.id, start: start.toISOString(), reason: "Check-up" });

    expect(res.status).toBe(409);
  });
});
