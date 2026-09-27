export interface TimeRange {
  startTime: string;
  endTime: string;
}

export interface WeeklyBlock extends TimeRange {
  weekday: number;
}

export interface ScheduleExceptionInput {
  date: Date;
  type: "OFF" | "EXTRA";
  startTime?: string | null;
  endTime?: string | null;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface Slot {
  start: Date;
  end: Date;
}

export interface WorkingMinutesInput {
  timezone: string;
  clinicHours: WeeklyBlock[];
  clinicHolidays: Date[];
  doctorBlocks: WeeklyBlock[];
  doctorExceptions: ScheduleExceptionInput[];
  from: Date;
  to: Date;
}

export interface SlotEngineInput {
  timezone: string;
  clinicHours: WeeklyBlock[];
  clinicHolidays: Date[];
  doctorBlocks: WeeklyBlock[];
  doctorExceptions: ScheduleExceptionInput[];
  slotMinutes: number;
  busyIntervals: BusyInterval[];
  from: Date;
  to: Date;
  now: Date;
  minNoticeMinutes: number;
  bookingWindowDays: number;
}
