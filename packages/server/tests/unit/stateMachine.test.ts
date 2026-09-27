import { describe, expect, it } from "vitest";
import { assertValidTransition, type AppointmentStatus } from "../../src/core/stateMachine.js";
import { AppError } from "../../src/core/errors.js";

function utcDate(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

const START = utcDate(2026, 10, 10, 10, 0);
const BEFORE_START = utcDate(2026, 10, 10, 9, 0);
const AFTER_START = utcDate(2026, 10, 10, 10, 1);

describe("assertValidTransition", () => {
  const validTransitions: Array<[AppointmentStatus, AppointmentStatus]> = [
    ["BOOKED", "CONFIRMED"],
    ["BOOKED", "CANCELLED"],
    ["CONFIRMED", "COMPLETED"],
    ["CONFIRMED", "NO_SHOW"],
    ["CONFIRMED", "CANCELLED"],
  ];

  it.each(validTransitions)("allows %s -> %s", (from, to) => {
    expect(() =>
      assertValidTransition({
        from,
        to,
        actorRole: "ADMIN",
        startAt: START,
        now: AFTER_START,
        cancelCutoffHours: 24,
        reason: to === "CANCELLED" ? "clinic closed" : undefined,
      }),
    ).not.toThrow();
  });

  const invalidTransitions: Array<[AppointmentStatus, AppointmentStatus]> = [
    ["BOOKED", "COMPLETED"],
    ["BOOKED", "NO_SHOW"],
    ["CONFIRMED", "BOOKED"],
    ["COMPLETED", "CANCELLED"],
    ["COMPLETED", "CONFIRMED"],
    ["NO_SHOW", "CANCELLED"],
    ["CANCELLED", "BOOKED"],
    ["CANCELLED", "CONFIRMED"],
  ];

  it.each(invalidTransitions)("rejects %s -> %s with 409", (from, to) => {
    try {
      assertValidTransition({
        from,
        to,
        actorRole: "ADMIN",
        startAt: START,
        now: AFTER_START,
        cancelCutoffHours: 24,
        reason: "reason",
      });
      expect.unreachable("expected assertValidTransition to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(409);
    }
  });

  it("rejects a patient marking an appointment completed", () => {
    expect(() =>
      assertValidTransition({
        from: "CONFIRMED",
        to: "COMPLETED",
        actorRole: "PATIENT",
        startAt: START,
        now: AFTER_START,
        cancelCutoffHours: 24,
      }),
    ).toThrowError(/only a doctor or admin/i);
  });

  it("rejects a patient marking an appointment no-show", () => {
    expect(() =>
      assertValidTransition({
        from: "CONFIRMED",
        to: "NO_SHOW",
        actorRole: "PATIENT",
        startAt: START,
        now: AFTER_START,
        cancelCutoffHours: 24,
      }),
    ).toThrowError(/only a doctor or admin/i);
  });

  it("rejects completing an appointment before its start time", () => {
    expect(() =>
      assertValidTransition({
        from: "CONFIRMED",
        to: "COMPLETED",
        actorRole: "DOCTOR",
        startAt: START,
        now: BEFORE_START,
        cancelCutoffHours: 24,
      }),
    ).toThrowError(/after its start time/i);
  });

  it("rejects marking no-show before its start time", () => {
    expect(() =>
      assertValidTransition({
        from: "CONFIRMED",
        to: "NO_SHOW",
        actorRole: "DOCTOR",
        startAt: START,
        now: BEFORE_START,
        cancelCutoffHours: 24,
      }),
    ).toThrowError(/after its start time/i);
  });

  it("allows completing exactly at the start time", () => {
    expect(() =>
      assertValidTransition({
        from: "CONFIRMED",
        to: "COMPLETED",
        actorRole: "DOCTOR",
        startAt: START,
        now: START,
        cancelCutoffHours: 24,
      }),
    ).not.toThrow();
  });

  it("allows a patient to cancel more than the cutoff before the start time", () => {
    const now = utcDate(2026, 10, 9, 9, 0); // 25 hours before START
    expect(() =>
      assertValidTransition({
        from: "BOOKED",
        to: "CANCELLED",
        actorRole: "PATIENT",
        startAt: START,
        now,
        cancelCutoffHours: 24,
      }),
    ).not.toThrow();
  });

  it("rejects a patient cancelling within the cutoff window", () => {
    const now = utcDate(2026, 10, 9, 11, 0); // 23 hours before START
    expect(() =>
      assertValidTransition({
        from: "BOOKED",
        to: "CANCELLED",
        actorRole: "PATIENT",
        startAt: START,
        now,
        cancelCutoffHours: 24,
      }),
    ).toThrowError(/at least 24 hours/i);
  });

  it("allows a doctor to cancel anytime given a reason", () => {
    expect(() =>
      assertValidTransition({
        from: "BOOKED",
        to: "CANCELLED",
        actorRole: "DOCTOR",
        startAt: START,
        now: AFTER_START,
        cancelCutoffHours: 24,
        reason: "doctor unavailable",
      }),
    ).not.toThrow();
  });

  it("rejects a doctor cancelling without a reason", () => {
    expect(() =>
      assertValidTransition({
        from: "BOOKED",
        to: "CANCELLED",
        actorRole: "DOCTOR",
        startAt: START,
        now: AFTER_START,
        cancelCutoffHours: 24,
      }),
    ).toThrowError(/reason is required/i);
  });
});
