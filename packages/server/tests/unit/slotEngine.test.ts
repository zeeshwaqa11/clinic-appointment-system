import { describe, expect, it } from "vitest";
import { computeAvailableSlots } from "../../src/core/slotEngine.js";
import type { SlotEngineInput } from "../../src/core/slotEngine.types.js";

function utcDate(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

function weekdayOf(date: Date): number {
  return date.getUTCDay();
}

const DAY1 = utcDate(2026, 10, 5); // any date; weekday derived dynamically below
const DAY1_WEEKDAY = weekdayOf(DAY1);
const DAY2 = utcDate(2026, 10, 6);
const DAY2_WEEKDAY = weekdayOf(DAY2);

function baseInput(overrides: Partial<SlotEngineInput> = {}): SlotEngineInput {
  return {
    timezone: "UTC",
    clinicHours: [
      { weekday: DAY1_WEEKDAY, startTime: "09:00", endTime: "17:00" },
      { weekday: DAY2_WEEKDAY, startTime: "09:00", endTime: "17:00" },
    ],
    clinicHolidays: [],
    doctorBlocks: [{ weekday: DAY1_WEEKDAY, startTime: "09:00", endTime: "17:00" }],
    doctorExceptions: [],
    slotMinutes: 30,
    busyIntervals: [],
    from: utcDate(2026, 10, 5, 0, 0),
    to: utcDate(2026, 10, 6, 23, 59),
    now: utcDate(2026, 10, 1, 0, 0),
    minNoticeMinutes: 120,
    bookingWindowDays: 30,
    ...overrides,
  };
}

describe("computeAvailableSlots", () => {
  it("returns back-to-back slots for a normal full-day block", () => {
    const slots = computeAvailableSlots(baseInput());

    expect(slots).toHaveLength(16); // 8 hours / 30 min
    expect(slots[0]?.start).toEqual(utcDate(2026, 10, 5, 9, 0));
    expect(slots[0]?.end).toEqual(utcDate(2026, 10, 5, 9, 30));
    expect(slots.at(-1)?.start).toEqual(utcDate(2026, 10, 5, 16, 30));
    expect(slots.at(-1)?.end).toEqual(utcDate(2026, 10, 5, 17, 0));
  });

  it("excludes slots that overlap a lunch break between two blocks", () => {
    const input = baseInput({
      doctorBlocks: [
        { weekday: DAY1_WEEKDAY, startTime: "09:00", endTime: "12:00" },
        { weekday: DAY1_WEEKDAY, startTime: "13:00", endTime: "17:00" },
      ],
    });

    const slots = computeAvailableSlots(input);

    expect(slots).toHaveLength(6 + 8); // 3h + 4h at 30 min each
    const overlapsBreak = slots.some((s) => s.start >= utcDate(2026, 10, 5, 12, 0) && s.start < utcDate(2026, 10, 5, 13, 0));
    expect(overlapsBreak).toBe(false);
  });

  it("returns no slots for a doctor's full day off", () => {
    const input = baseInput({
      doctorExceptions: [{ date: utcDate(2026, 10, 5), type: "OFF" }],
    });

    const slots = computeAvailableSlots(input);

    expect(slots).toHaveLength(0);
  });

  it("removes slots inside a partial time-off exception", () => {
    const input = baseInput({
      doctorExceptions: [
        { date: utcDate(2026, 10, 5), type: "OFF", startTime: "13:00", endTime: "14:00" },
      ],
    });

    const slots = computeAvailableSlots(input);

    const inBreak = slots.some((s) => s.start >= utcDate(2026, 10, 5, 13, 0) && s.start < utcDate(2026, 10, 5, 14, 0));
    expect(inBreak).toBe(false);
    expect(slots.some((s) => s.start.getTime() === utcDate(2026, 10, 5, 12, 30).getTime())).toBe(true);
    expect(slots.some((s) => s.start.getTime() === utcDate(2026, 10, 5, 14, 0).getTime())).toBe(true);
  });

  it("adds slots for a one-off extra working block", () => {
    const input = baseInput({
      doctorBlocks: [], // doctor does not normally work DAY2
      doctorExceptions: [
        { date: DAY2, type: "EXTRA", startTime: "10:00", endTime: "12:00" },
      ],
      from: utcDate(2026, 10, 6, 0, 0),
      to: utcDate(2026, 10, 6, 23, 59),
    });

    const slots = computeAvailableSlots(input);

    expect(slots).toHaveLength(4);
    expect(slots[0]?.start).toEqual(utcDate(2026, 10, 6, 10, 0));
    expect(slots.at(-1)?.end).toEqual(utcDate(2026, 10, 6, 12, 0));
  });

  it("returns no slots on a clinic-wide holiday", () => {
    const input = baseInput({
      clinicHolidays: [utcDate(2026, 10, 5)],
    });

    const slots = computeAvailableSlots(input);

    expect(slots).toHaveLength(0);
  });

  it("removes slots that overlap an existing active appointment", () => {
    const input = baseInput({
      busyIntervals: [{ start: utcDate(2026, 10, 5, 10, 0), end: utcDate(2026, 10, 5, 10, 30) }],
    });

    const slots = computeAvailableSlots(input);

    expect(slots.some((s) => s.start.getTime() === utcDate(2026, 10, 5, 10, 0).getTime())).toBe(false);
    expect(slots).toHaveLength(15);
  });

  it("excludes slots that start less than the minimum notice from now", () => {
    const input = baseInput({
      now: utcDate(2026, 10, 5, 8, 0),
      minNoticeMinutes: 120,
    });

    const slots = computeAvailableSlots(input);

    expect(slots.some((s) => s.start.getTime() === utcDate(2026, 10, 5, 9, 0).getTime())).toBe(false);
    expect(slots.some((s) => s.start.getTime() === utcDate(2026, 10, 5, 9, 30).getTime())).toBe(false);
    expect(slots.some((s) => s.start.getTime() === utcDate(2026, 10, 5, 10, 0).getTime())).toBe(true);
  });

  it("excludes slots beyond the booking window", () => {
    const input = baseInput({
      now: utcDate(2026, 10, 5, 0, 0),
      bookingWindowDays: 1,
      to: utcDate(2026, 10, 6, 23, 59),
    });

    const slots = computeAvailableSlots(input);

    expect(slots.every((s) => s.start <= utcDate(2026, 10, 6, 0, 0))).toBe(true);
  });

  it("excludes a final slot that does not fully fit before the block ends", () => {
    const input = baseInput({
      doctorBlocks: [{ weekday: DAY1_WEEKDAY, startTime: "09:00", endTime: "10:15" }],
      clinicHours: [{ weekday: DAY1_WEEKDAY, startTime: "09:00", endTime: "17:00" }],
      to: utcDate(2026, 10, 5, 23, 59),
    });

    const slots = computeAvailableSlots(input);

    expect(slots).toHaveLength(2);
    expect(slots.at(-1)?.end).toEqual(utcDate(2026, 10, 5, 10, 0));
  });
});
