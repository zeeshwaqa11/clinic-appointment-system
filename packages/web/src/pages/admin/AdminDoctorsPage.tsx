import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { listDoctors, listSpecialties } from "../../api/doctors.api.js";
import { createDoctor } from "../../api/admin.api.js";
import { ApiError } from "../../api/client.js";
import type { DoctorSummary, Specialty } from "../../types/index.js";
import { LoadingState } from "../../components/LoadingState.js";
import { ErrorState } from "../../components/ErrorState.js";
import { EmptyState } from "../../components/EmptyState.js";

const SLOT_OPTIONS = [15, 20, 30] as const;

export function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorSummary[] | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    specialtyId: "",
    bio: "",
    slotMinutes: 30 as 15 | 20 | 30,
  });

  async function load() {
    setError(null);
    try {
      const [d, s] = await Promise.all([listDoctors(), listSpecialties()]);
      setDoctors(d);
      setSpecialties(s);
      setForm((f) => ({ ...f, specialtyId: f.specialtyId || s[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load doctors");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (form.name.trim().length === 0 || form.bio.trim().length === 0) {
      setFormError("Name and bio are required.");
      return;
    }
    if (form.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createDoctor(form);
      setForm({ name: "", email: "", password: "", specialtyId: form.specialtyId, bio: "", slotMinutes: 30 });
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create doctor");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Doctors</h1>

      {doctors === null && <LoadingState />}
      {doctors && doctors.length === 0 && <EmptyState title="No doctors yet" />}
      {doctors && doctors.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {d.specialty}
              </p>
              <p className="font-semibold text-slate-800">{d.name}</p>
              <p className="mt-1 text-sm text-slate-500">{d.slotMinutes} min appointments</p>
            </div>
          ))}
        </div>
      )}

      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Add a doctor</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Temporary password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Specialty</label>
              <select
                value={form.specialtyId}
                onChange={(e) => setForm({ ...form, specialtyId: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Appointment length</label>
              <select
                value={form.slotMinutes}
                onChange={(e) =>
                  setForm({ ...form, slotMinutes: Number(e.target.value) as 15 | 20 | 30 })
                }
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {SLOT_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Bio</label>
            <textarea
              rows={2}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isSubmitting ? "Creating…" : "Create doctor"}
          </button>
        </form>
      </section>
    </div>
  );
}
