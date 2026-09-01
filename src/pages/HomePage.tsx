// ─── Home / Map view (default screen) ─────────────────────────────────────
import { useEffect } from 'react';
import { MapView } from '@/components/MapView';
import { StationList } from '@/components/StationList';
import { FilterBar } from '@/components/FilterBar';
import { BottomSheet } from '@/components/BottomSheet';
import { requestGeolocation } from '@/stores/locationStore';
import { useStations } from '@/hooks/useStations';
import { registerBackgroundSync } from '@/lib/backgroundSync';

export function HomePage() {
  const { refetch } = useStations();

  // Request location right away (with Sydney fallback in the store).
  useEffect(() => {
    requestGeolocation();
    // best-effort PWA background-sync registration
    void registerBackgroundSync().catch(() => {});
  }, []);

  // Re-fetch stations once the location "loaded" (moved from fallback to live).
  useEffect(() => {
    // small delay so the store's position is committed before refetch
    const t = setTimeout(() => refetch(), 400);
    return () => clearTimeout(t);
  }, [refetch]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapView />
      </div>

      {/* Top bar: app title + location status */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 pt-safe">
        <div className="mx-auto max-w-md">
          <h1 className="text-xl font-extrabold tracking-tight text-white drop-shadow">FuelTruckers</h1>
          <p className="text-xs text-slate-300 drop-shadow">Diesel savings for the long haul</p>
        </div>
      </div>

      {/* Bottom sheet with filters + sorted list */}
      <BottomSheet>
        <div className="p-3">
          <FilterBar />
        </div>
        <StationList />
      </BottomSheet>
    </div>
  );
}
