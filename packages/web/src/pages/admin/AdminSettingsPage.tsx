import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  createHoliday,
  deleteHoliday,
  getHolidays,
  getHours,
  getSettings,
  replaceHours,
  updateSettings,
} from "../../api/admin.api.js";
import { ApiError } from "../../api/client.js";
import type { ClinicHoliday, ClinicSettings } from "../../types/index.js";
import { LoadingState } from "../../components/LoadingState.js";
import { ErrorState } from "../../components/ErrorState.js";
import { EmptyState } from "../../components/EmptyState.js";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [hours, setHours] = useState<Array<{ weekday: number; openTime: string; closeTime: string }> | null>(null);
  const [holidays, setHolidays] = useState<ClinicHoliday[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsSaveState, setSettingsSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [hoursSaveState, setHoursSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });

  async function load() {
    setError(null);
    try {
      const [s, h, hol] = await Promise.all([getSettings(), getHours(), getHolidays()]);
      setSettings(s);
      setHours(h.map(({ weekday, openTime, closeTime }) => ({ weekday, openTime, closeTime })));
      setHolidays(hol);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load clinic settings");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSettingsSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSettingsSaveState("saving");
    try {
      const { id, ...rest } = settings;
      void id;
      const updated = await updateSettings(rest);
      setSettings(updated);
      setSettingsSaveState("saved");
      setTimeout(() => setSettingsSaveState("idle"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings");
      setSettingsSaveState("idle");
    }
  }

  function updateHourRow(weekday: number, field: "openTime" | "closeTime", value: string) {
    if (!hours) return;
    const exists = hours.some((h) => h.weekday === weekday);
    if (exists) {
      setHours(hours.map((h) => (h.weekday === weekday ? { ...h, [field]: value } : h)));
    } else {
      setHours([...hours, { weekday, openTime: "09:00", closeTime: "17:00", [field]: value }]);
    }
  }

  function toggleDay(weekday: number, open: boolean) {
    if (!hours) return;
    if (open) {
      setHours([...hours, { weekday, openTime: "09:00", closeTime: "17:00" }]);
    } else {
      setHours(hours.filter((h) => h.weekday !== weekday));
    }
  }

  async function saveHours() {
    if (!hours) return;
    setHoursSaveState("saving");
    try {
      const updated = await replaceHours(hours);
      setHours(updated.map(({ weekday, openTime, closeTime }) => ({ weekday, openTime, closeTime })));
      setHoursSaveState("saved");
      setTimeout(() => setHoursSaveState("idle"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save clinic hours");
      setHoursSaveState("idle");
    }
  }

  async function handleAddHoliday(e: FormEvent) {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.name) return;
    try {
      const holiday = await createHoliday(newHoliday.date, newHoliday.name);
      setHolidays((prev) => (prev ? [...prev, holiday] : [holiday]));
      setNewHoliday({ date: "", name: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add holiday");
    }
  }

  async function handleRemoveHoliday(id: string) {
    try {
      await deleteHoliday(id);
      setHolidays((prev) => (prev ? prev.filter((h) => h.id !== id) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove holiday");
    }
  }

  if (error && !settings) return <ErrorState message={error} onRetry={load} />;
  if (!settings || !hours || !holidays) return <LoadingState label="Loading clinic settings…" />;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Clinic settings</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Booking rules</h2>
        <form onSubmit={handleSettingsSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Timezone (IANA)</label>
            <input
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Minimum notice (minutes)</label>
              <input
                type="number"
                value={settings.minNoticeMinutes}
                onChange={(e) => setSettings({ ...settings, minNoticeMinutes: Number(e.target.value) })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Booking window (days)</label>
              <input
                type="number"
                value={settings.bookingWindowDays}
                onChange={(e) => setSettings({ ...settings, bookingWindowDays: Number(e.target.value) })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Max upcoming per patient</label>
              <input
                type="number"
                value={settings.patientMaxUpcoming}
                onChange={(e) => setSettings({ ...settings, patientMaxUpcoming: Number(e.target.value) })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Cancel cutoff (hours)</label>
              <input
                type="number"
                value={settings.cancelCutoffHours}
                onChange={(e) => setSettings({ ...settings, cancelCutoffHours: Number(e.target.value) })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={settingsSaveState === "saving"}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {settingsSaveState === "saving" ? "Saving…" : settingsSaveState === "saved" ? "Saved ✓" : "Save settings"}
          </button>
        </form>
      </section>

      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Opening hours</h2>
        <div className="space-y-2">
          {WEEKDAY_LABELS.map((label, weekday) => {
            const row = hours.find((h) => h.weekday === weekday);
            return (
              <div key={label} className="flex items-center gap-3">
                <label className="flex w-24 items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={!!row}
                    onChange={(e) => toggleDay(weekday, e.target.checked)}
                  />
                  {label}
                </label>
                {row && (
                  <>
                    <input
                      type="time"
                      value={row.openTime}
                      onChange={(e) => updateHourRow(weekday, "openTime", e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={row.closeTime}
                      onChange={(e) => updateHourRow(weekday, "closeTime", e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={saveHours}
          disabled={hoursSaveState === "saving"}
          className="mt-4 rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {hoursSaveState === "saving" ? "Saving…" : hoursSaveState === "saved" ? "Saved ✓" : "Save hours"}
        </button>
      </section>

      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Holidays</h2>
        {holidays.length === 0 ? (
          <EmptyState title="No holidays scheduled" />
        ) : (
          <ul className="mb-4 space-y-2">
            {holidays.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span>
                  {h.date.slice(0, 10)} — {h.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveHoliday(h.id)}
                  className="text-red-500 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddHoliday} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
            <input
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
            <input
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Add holiday
          </button>
        </form>
      </section>
    </div>
  );
}
