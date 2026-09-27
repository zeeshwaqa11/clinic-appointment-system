let clinicTimezone = "UTC";

export function setClinicTimezone(tz: string): void {
  clinicTimezone = tz;
}

export function getClinicTimezone(): string {
  return clinicTimezone;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: clinicTimezone,
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: clinicTimezone,
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: clinicTimezone,
  }).format(new Date(iso));
}

export function dateKeyInClinicTz(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: clinicTimezone }).format(date);
}

export function addDaysToDateKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  return next.toISOString().slice(0, 10);
}
