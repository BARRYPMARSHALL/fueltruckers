// ─── Loading skeleton card ────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="card p-3 mb-2">
      <div className="flex justify-between">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-6 w-16" />
      </div>
      <div className="mt-2 skeleton h-3 w-32" />
      <div className="mt-3 flex gap-2">
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-6 w-20" />
      </div>
    </div>
  );
}
