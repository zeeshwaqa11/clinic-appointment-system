import { timeToMinutes } from "./clinicTime.js";
import type { TimeRange, WeeklyBlock } from "./slotEngine.types.js";

export function isWithinClinicHours(block: WeeklyBlock, clinicHours: WeeklyBlock[]): boolean {
  const hours = clinicHours.find((h) => h.weekday === block.weekday);
  if (!hours) return false;
  return timeToMinutes(block.startTime) >= timeToMinutes(hours.startTime) &&
    timeToMinutes(block.endTime) <= timeToMinutes(hours.endTime);
}

export function isRangeWithinClinicHours(
  weekday: number,
  range: TimeRange,
  clinicHours: WeeklyBlock[],
): boolean {
  return isWithinClinicHours({ weekday, ...range }, clinicHours);
}
