import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { resetDb, testDb } from "../helpers/testDb.js";
import { createDoctor, createUser, nextWeekdayAt, setupClinic, tokenFor } from "../helpers/fixtures.js";

const app = createApp();

describe("authorization", () => {
  beforeEach(async () => {
    await resetDb();
    await setupClinic();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("prevents a patient from viewing another patient's appointment", async () => {
    const doctor = await createDoctor();
    const patientA = await createUser("PATIENT");
    const patientB = await createUser("PATIENT");
    const start = nextWeekdayAt(1, 10, 0);

    const booked = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${tokenFor(patientA)}`)
      .send({ doctorId: doctor.id, start: start.toISOString(), reason: "Check-up" });

    const res = await request(app)
      .get(`/api/appointments/${booked.body.appointment.id}`)
      .set("Authorization", `Bearer ${tokenFor(patientB)}`);

    expect(res.status).toBe(403);
  });

  it("prevents a patient from cancelling another patient's appointment", async () => {
    const doctor = await createDoctor();
    const patientA = await createUser("PATIENT");
    const patientB = await createUser("PATIENT");
    const start = nextWeekdayAt(1, 10, 0);

    const booked = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${tokenFor(patientA)}`)
      .send({ doctorId: doctor.id, start: start.toISOString(), reason: "Check-up" });

    const res = await request(app)
      .post(`/api/appointments/${booked.body.appointment.id}/cancel`)
      .set("Authorization", `Bearer ${tokenFor(patientB)}`)
      .send({});

    expect(res.status).toBe(403);
  });

  it("prevents a doctor from changing another doctor's schedule", async () => {
    const doctorA = await createDoctor();
    const doctorB = await createDoctor();

    const res = await request(app)
      .put(`/api/doctors/${doctorA.id}/schedule`)
      .set("Authorization", `Bearer ${tokenFor(doctorB)}`)
      .send({ blocks: [{ weekday: 1, startTime: "09:00", endTime: "12:00" }] });

    expect(res.status).toBe(403);
  });

  it("prevents a doctor from transitioning another doctor's appointment", async () => {
    const doctorA = await createDoctor();
    const doctorB = await createDoctor();
    const patient = await createUser("PATIENT");
    const start = nextWeekdayAt(1, 10, 0);

    const booked = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${tokenFor(patient)}`)
      .send({ doctorId: doctorA.id, start: start.toISOString(), reason: "Check-up" });

    const res = await request(app)
      .post(`/api/appointments/${booked.body.appointment.id}/transition`)
      .set("Authorization", `Bearer ${tokenFor(doctorB)}`)
      .send({ to: "CONFIRMED" });

    expect(res.status).toBe(403);
  });

  it("returns 403 for a patient on admin-only routes", async () => {
    const patient = await createUser("PATIENT");
    const res = await request(app)
      .get("/api/admin/settings")
      .set("Authorization", `Bearer ${tokenFor(patient)}`);
    expect(res.status).toBe(403);
  });

  it("returns 403 for a doctor on admin-only routes", async () => {
    const doctor = await createDoctor();
    const res = await request(app)
      .get("/api/admin/settings")
      .set("Authorization", `Bearer ${tokenFor(doctor)}`);
    expect(res.status).toBe(403);
  });

  it("allows an admin to view any appointment", async () => {
    const doctor = await createDoctor();
    const patient = await createUser("PATIENT");
    const admin = await createUser("ADMIN");
    const start = nextWeekdayAt(1, 10, 0);

    const booked = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${tokenFor(patient)}`)
      .send({ doctorId: doctor.id, start: start.toISOString(), reason: "Check-up" });

    const res = await request(app)
      .get(`/api/appointments/${booked.body.appointment.id}`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(200);
  });
});
