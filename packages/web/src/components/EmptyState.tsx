export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center text-slate-500">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="text-sm">{hint}</p>}
    </div>
  );
}
