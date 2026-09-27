import { useEffect, useState } from "react";
import { getStats } from "../../api/admin.api.js";
import { ApiError } from "../../api/client.js";
import type { DoctorStats } from "../../types/index.js";
import { LoadingState } from "../../components/LoadingState.js";
import { ErrorState } from "../../components/ErrorState.js";
import { EmptyState } from "../../components/EmptyState.js";

export function AdminStatsPage() {
  const [stats, setStats] = useState<DoctorStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setStats(null);
    try {
      const result = await getStats();
      setStats(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load statistics");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (stats === null) return <LoadingState label="Loading statistics…" />;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Statistics</h1>
      <p className="mb-4 text-sm text-slate-500">This week, per doctor.</p>

      {stats.length === 0 ? (
        <EmptyState title="No doctors yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Doctor</th>
                <th className="px-4 py-2">Appointments</th>
                <th className="px-4 py-2">Utilization</th>
                <th className="px-4 py-2">No-show rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.doctorId} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-700">{s.doctorName}</td>
                  <td className="px-4 py-2">{s.appointmentCount}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.min(100, Math.round(s.utilization * 100))}%` }}
                        />
                      </div>
                      <span className="text-slate-500">{Math.round(s.utilization * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{Math.round(s.noShowRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
