// ─── Station list (sorted) ────────────────────────────────────────────────
import { useVisibleStations, useStations } from '@/hooks/useStations';
import { StationCard } from './StationCard';
import { SkeletonCard } from './SkeletonCard';
import { EmptyState } from './EmptyState';

export function StationList() {
  const stations = useVisibleStations();
  const { isLoading } = useStations();

  if (isLoading) {
    return (
      <div className="p-3">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!stations.length) {
    return <EmptyState message="No stops match your filters. Try widening the range or clearing filters." />;
  }

  return (
    <div className="p-3">
      <p className="px-1 pb-2 text-xs text-slate-500">{stations.length} stops near you</p>
      {stations.map((s) => <StationCard key={s.id} station={s} />)}
    </div>
  );
}
