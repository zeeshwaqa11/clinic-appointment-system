import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

function keyToUtcMs(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function localDateTimeToUtc(dateStr: string, time: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T${time}:00`, timezone);
}

export function weekdayInTz(date: Date, timezone: string): number {
  const zoned = toZonedTime(date, timezone);
  return zoned.getDay();
}

export function weekdayOfDateKey(dateStr: string): number {
  return new Date(keyToUtcMs(dateStr)).getUTCDay();
}

export function dateKeyInTz(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function dateStringsInRange(fromKey: string, toKey: string): string[] {
  const start = keyToUtcMs(fromKey);
  const end = keyToUtcMs(toKey);
  const days: string[] = [];
  for (let t = start; t <= end; t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

export function addDaysToKey(key: string, days: number): string {
  return new Date(keyToUtcMs(key) + days * 86_400_000).toISOString().slice(0, 10);
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
