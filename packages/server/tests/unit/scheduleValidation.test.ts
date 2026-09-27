import { describe, expect, it } from "vitest";
import { isWithinClinicHours } from "../../src/core/scheduleValidation.js";

const clinicHours = [{ weekday: 1, startTime: "09:00", endTime: "17:00" }];

describe("isWithinClinicHours", () => {
  it("accepts a block fully inside clinic hours", () => {
    expect(
      isWithinClinicHours({ weekday: 1, startTime: "09:00", endTime: "12:00" }, clinicHours),
    ).toBe(true);
  });

  it("rejects a block that starts before the clinic opens", () => {
    expect(
      isWithinClinicHours({ weekday: 1, startTime: "08:00", endTime: "12:00" }, clinicHours),
    ).toBe(false);
  });

  it("rejects a block that ends after the clinic closes", () => {
    expect(
      isWithinClinicHours({ weekday: 1, startTime: "16:00", endTime: "18:00" }, clinicHours),
    ).toBe(false);
  });

  it("rejects a block on a weekday the clinic has no hours for", () => {
    expect(
      isWithinClinicHours({ weekday: 6, startTime: "09:00", endTime: "12:00" }, clinicHours),
    ).toBe(false);
  });
});
