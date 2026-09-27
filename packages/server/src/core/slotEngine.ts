import { addDays } from "date-fns";
import {
  dateKey,
  dateKeyInTz,
  dateStringsInRange,
  localDateTimeToUtc,
  minutesToTime,
  timeToMinutes,
  weekdayOfDateKey,
} from "./clinicTime.js";
import { intersectRange, subtractRange, type MinuteRange } from "./intervals.js";
import type {
  ScheduleExceptionInput,
  Slot,
  SlotEngineInput,
  WeeklyBlock,
  WorkingMinutesInput,
} from "./slotEngine.types.js";

interface DayBlocksInput {
  doctorBlocks: WeeklyBlock[];
  doctorExceptions: ScheduleExceptionInput[];
}

function dayBlocksAfterExceptions(
  input: DayBlocksInput,
  dateStr: string,
  weekday: number,
): MinuteRange[] {
  let blocks: MinuteRange[] = input.doctorBlocks
    .filter((b) => b.weekday === weekday)
    .map((b) => ({ start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) }));

  const exceptionsForDay = input.doctorExceptions.filter((ex) => dateKey(ex.date) === dateStr);

  const fullDayOff = exceptionsForDay.find(
    (ex) => ex.type === "OFF" && !ex.startTime && !ex.endTime,
  );
  if (fullDayOff) {
    blocks = [];
  }

  for (const ex of exceptionsForDay) {
    if (ex.type === "OFF" && ex.startTime && ex.endTime) {
      blocks = subtractRange(blocks, {
        start: timeToMinutes(ex.startTime),
        end: timeToMinutes(ex.endTime),
      });
    }
  }

  for (const ex of exceptionsForDay) {
    if (ex.type === "EXTRA" && ex.startTime && ex.endTime) {
      blocks.push({ start: timeToMinutes(ex.startTime), end: timeToMinutes(ex.endTime) });
    }
  }

  return blocks;
}

function clipToClinicHours(blocks: MinuteRange[], clinicRange: MinuteRange | null): MinuteRange[] {
  if (!clinicRange) return [];
  return blocks
    .map((b) => intersectRange(b, clinicRange))
    .filter((b): b is MinuteRange => b !== null);
}

export function computeAvailableSlots(input: SlotEngineInput): Slot[] {
  const fromKey = dateKeyInTz(input.from, input.timezone);
  const toKey = dateKeyInTz(input.to, input.timezone);
  const holidayKeys = new Set(input.clinicHolidays.map((h) => dateKey(h)));

  const earliestStart = new Date(input.now.getTime() + input.minNoticeMinutes * 60_000);
  const latestStart = addDays(input.now, input.bookingWindowDays);

  const slots: Slot[] = [];

  for (const dateStr of dateStringsInRange(fromKey, toKey)) {
    if (holidayKeys.has(dateStr)) continue;

    const weekday = weekdayOfDateKey(dateStr);
    const clinicHoursForDay = input.clinicHours.find((h) => h.weekday === weekday);
    if (!clinicHoursForDay) continue;

    const clinicRange: MinuteRange = {
      start: timeToMinutes(clinicHoursForDay.startTime),
      end: timeToMinutes(clinicHoursForDay.endTime),
    };

    const rawBlocks = dayBlocksAfterExceptions(input, dateStr, weekday);
    const blocks = clipToClinicHours(rawBlocks, clinicRange);

    for (const block of blocks) {
      for (
        let minute = block.start;
        minute + input.slotMinutes <= block.end;
        minute += input.slotMinutes
      ) {
        const startUtc = localDateTimeToUtc(dateStr, minutesToTime(minute), input.timezone);
        const endUtc = localDateTimeToUtc(
          dateStr,
          minutesToTime(minute + input.slotMinutes),
          input.timezone,
        );

        if (startUtc < earliestStart || startUtc > latestStart) continue;
        if (startUtc < input.from || startUtc > input.to) continue;

        const overlapsBusy = input.busyIntervals.some(
          (busy) => busy.start < endUtc && busy.end > startUtc,
        );
        if (overlapsBusy) continue;

        slots.push({ start: startUtc, end: endUtc });
      }
    }
  }

  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  return slots;
}

export function computeAvailableMinutes(input: WorkingMinutesInput): number {
  const fromKey = dateKeyInTz(input.from, input.timezone);
  const toKey = dateKeyInTz(input.to, input.timezone);
  const holidayKeys = new Set(input.clinicHolidays.map((h) => dateKey(h)));

  let total = 0;

  for (const dateStr of dateStringsInRange(fromKey, toKey)) {
    if (holidayKeys.has(dateStr)) continue;

    const weekday = weekdayOfDateKey(dateStr);
    const clinicHoursForDay = input.clinicHours.find((h) => h.weekday === weekday);
    if (!clinicHoursForDay) continue;

    const clinicRange: MinuteRange = {
      start: timeToMinutes(clinicHoursForDay.startTime),
      end: timeToMinutes(clinicHoursForDay.endTime),
    };

    const rawBlocks = dayBlocksAfterExceptions(input, dateStr, weekday);
    const blocks = clipToClinicHours(rawBlocks, clinicRange);

    for (const block of blocks) {
      total += block.end - block.start;
    }
  }

  return total;
}
