import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.js";
import {
  createException,
  deleteException,
  getExceptions,
  getSchedule,
  replaceSchedule,
} from "../../api/doctors.api.js";
import { ApiError } from "../../api/client.js";
import type { ScheduleException } from "../../types/index.js";
import { LoadingState } from "../../components/LoadingState.js";
import { ErrorState } from "../../components/ErrorState.js";
import { EmptyState } from "../../components/EmptyState.js";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DoctorSchedulePage() {
  const { user } = useAuth();
  const doctorId = user!.id;

  const [blocks, setBlocks] = useState<Array<{ weekday: number; startTime: string; endTime: string }> | null>(null);
  const [exceptions, setExceptions] = useState<ScheduleException[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const [newBlock, setNewBlock] = useState({ weekday: 1, startTime: "09:00", endTime: "17:00" });
  const [newException, setNewException] = useState<{
    date: string;
    type: "OFF" | "EXTRA";
    startTime: string;
    endTime: string;
    fullDay: boolean;
  }>({ date: "", type: "OFF", startTime: "09:00", endTime: "12:00", fullDay: true });

  async function load() {
    setError(null);
    try {
      const [b, e] = await Promise.all([getSchedule(doctorId), getExceptions(doctorId)]);
      setBlocks(b.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })));
      setExceptions(e);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your schedule");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addBlock() {
    if (!blocks) return;
    if (newBlock.startTime >= newBlock.endTime) {
      setError("Start time must be before end time.");
      return;
    }
    setBlocks([...blocks, newBlock]);
  }

  function removeBlock(index: number) {
    if (!blocks) return;
    setBlocks(blocks.filter((_, i) => i !== index));
  }

  async function saveSchedule() {
    if (!blocks) return;
    setSaveState("saving");
    setError(null);
    try {
      await replaceSchedule(doctorId, blocks);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save schedule");
      setSaveState("idle");
    }
  }

  async function addException() {
    if (!newException.date) {
      setError("Pick a date for the exception.");
      return;
    }
    setError(null);
    try {
      const exception = await createException(doctorId, {
        date: newException.date,
        type: newException.type,
        ...(newException.fullDay
          ? {}
          : { startTime: newException.startTime, endTime: newException.endTime }),
      });
      setExceptions((prev) => (prev ? [...prev, exception] : [exception]));
      setNewException({ date: "", type: "OFF", startTime: "09:00", endTime: "12:00", fullDay: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add exception");
    }
  }

  async function removeException(id: string) {
    try {
      await deleteException(doctorId, id);
      setExceptions((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove exception");
    }
  }

  if (error && !blocks) return <ErrorState message={error} onRetry={load} />;
  if (!blocks || !exceptions) return <LoadingState label="Loading your schedule…" />;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">My schedule</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Weekly working hours</h2>

        {blocks.length === 0 ? (
          <EmptyState title="No working hours set" hint="Add a block below." />
        ) : (
          <ul className="mb-4 space-y-2">
            {blocks.map((b, i) => (
              <li
                key={`${b.weekday}-${b.startTime}-${i}`}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span>
                  <strong>{WEEKDAY_LABELS[b.weekday]}</strong> {b.startTime}–{b.endTime}
                </span>
                <button
                  type="button"
                  onClick={() => removeBlock(i)}
                  className="text-red-500 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Day</label>
            <select
              value={newBlock.weekday}
              onChange={(e) => setNewBlock({ ...newBlock, weekday: Number(e.target.value) })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              {WEEKDAY_LABELS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Start</label>
            <input
              type="time"
              value={newBlock.startTime}
              onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">End</label>
            <input
              type="time"
              value={newBlock.endTime}
              onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={addBlock}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Add block
          </button>
          <button
            type="button"
            onClick={saveSchedule}
            disabled={saveState === "saving"}
            className="ml-auto rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save schedule"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Time off & extra hours</h2>

        {exceptions.length === 0 ? (
          <EmptyState title="No exceptions" hint="Add a day off or an extra working block below." />
        ) : (
          <ul className="mb-4 space-y-2">
            {exceptions.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span>
                  <strong>{e.type === "OFF" ? "Off" : "Extra"}</strong> — {e.date.slice(0, 10)}
                  {e.startTime && e.endTime ? ` ${e.startTime}–${e.endTime}` : " (full day)"}
                </span>
                <button
                  type="button"
                  onClick={() => removeException(e.id)}
                  className="text-red-500 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
            <input
              type="date"
              value={newException.date}
              onChange={(e) => setNewException({ ...newException, date: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Type</label>
            <select
              value={newException.type}
              onChange={(e) =>
                setNewException({ ...newException, type: e.target.value as "OFF" | "EXTRA" })
              }
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="OFF">Time off</option>
              <option value="EXTRA">Extra hours</option>
            </select>
          </div>
          {newException.type === "OFF" && (
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={newException.fullDay}
                onChange={(e) => setNewException({ ...newException, fullDay: e.target.checked })}
              />
              Full day
            </label>
          )}
          {(newException.type === "EXTRA" || !newException.fullDay) && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Start</label>
                <input
                  type="time"
                  value={newException.startTime}
                  onChange={(e) => setNewException({ ...newException, startTime: e.target.value })}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">End</label>
                <input
                  type="time"
                  value={newException.endTime}
                  onChange={(e) => setNewException({ ...newException, endTime: e.target.value })}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </>
          )}
          <button
            type="button"
            onClick={addException}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Add exception
          </button>
        </div>
      </section>
    </div>
  );
}
