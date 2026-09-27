import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDoctors, listSpecialties } from "../../api/doctors.api.js";
import { ApiError } from "../../api/client.js";
import type { DoctorSummary, Specialty } from "../../types/index.js";
import { LoadingState } from "../../components/LoadingState.js";
import { ErrorState } from "../../components/ErrorState.js";
import { EmptyState } from "../../components/EmptyState.js";
import { formatDateTime } from "../../utils/format.js";

export function BrowseDoctorsPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtyId, setSpecialtyId] = useState<string>("");
  const [doctors, setDoctors] = useState<DoctorSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listSpecialties().then(setSpecialties).catch(() => undefined);
  }, []);

  async function load() {
    setError(null);
    setDoctors(null);
    try {
      const result = await listDoctors(specialtyId || undefined);
      setDoctors(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load doctors");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialtyId]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Find a doctor</h1>
        <select
          value={specialtyId}
          onChange={(e) => setSpecialtyId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All specialties</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {doctors === null && !error && <LoadingState label="Loading doctors…" />}
      {error && <ErrorState message={error} onRetry={load} />}
      {doctors && doctors.length === 0 && (
        <EmptyState title="No doctors found" hint="Try a different specialty." />
      )}

      {doctors && doctors.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <Link
              key={doctor.id}
              to={`/doctors/${doctor.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {doctor.specialty}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-800">{doctor.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{doctor.bio}</p>
              <p className="mt-3 text-sm">
                {doctor.nextAvailableSlot ? (
                  <span className="text-emerald-700">
                    Next available: {formatDateTime(doctor.nextAvailableSlot.start)}
                  </span>
                ) : (
                  <span className="text-slate-400">No upcoming availability</span>
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
