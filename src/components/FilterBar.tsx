// ─── Filter bar (chips on the map view) ───────────────────────────────────
import { SlidersHorizontal, Truck, ShowerHead, Clock3, X } from 'lucide-react';
import { useUi } from '@/stores/uiStore';
import { StationSortKey } from '@/types';

const SORT_OPTIONS: Array<{ key: StationSortKey; label: string }> = [
  { key: 'netSavings', label: 'Best value' },
  { key: 'cheapest', label: 'Cheapest' },
  { key: 'closest', label: 'Closest' },
  { key: 'truckScore', label: 'Best facilities' },
];

export function FilterBar() {
  const filters = useUi((s) => s.filters);
  const setFilter = useUi((s) => s.setFilter);
  const reset = useUi((s) => s.resetFilters);
  const sortKey = useUi((s) => s.sortKey);
  const setSortKey = useUi((s) => s.setSortKey);

  const hasActive =
    filters.truckFriendlyOnly || filters.hasShowers || filters.open24_7 ||
    filters.maxPriceCentsPerLitre != null || filters.maxDistanceKm != null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Filters
        </span>
        {hasActive && (
          <button onClick={reset} className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-200">
            <X className="h-3 w-3" aria-hidden /> Reset
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <Chip active={filters.truckFriendlyOnly} onClick={() => setFilter('truckFriendlyOnly', !filters.truckFriendlyOnly)}>
          <Truck className="h-3.5 w-3.5" aria-hidden /> Truck friendly
        </Chip>
        <Chip active={filters.hasShowers} onClick={() => setFilter('hasShowers', !filters.hasShowers)}>
          <ShowerHead className="h-3.5 w-3.5" aria-hidden /> Showers
        </Chip>
        <Chip active={filters.open24_7} onClick={() => setFilter('open24_7', !filters.open24_7)}>
          <Clock3 className="h-3.5 w-3.5" aria-hidden /> 24/7
        </Chip>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {SORT_OPTIONS.map((o) => (
          <Chip key={o.key} active={sortKey === o.key} onClick={() => setSortKey(o.key)}>
            {o.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`chip whitespace-nowrap ${active ? 'chip-active' : 'chip-inactive'}`}>
      {children}
    </button>
  );
}
