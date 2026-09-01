// ─── Home / Map view (default screen) ─────────────────────────────────────
import { useEffect, useState } from 'react';
import { MapView } from '@/components/MapView';
import { StationList } from '@/components/StationList';
import { FilterBar } from '@/components/FilterBar';
import { BottomSheet } from '@/components/BottomSheet';
import { PriceSnap } from '@/components/PriceSnap';
import { requestGeolocation } from '@/stores/locationStore';
import { useStations } from '@/hooks/useStations';
import { useNearbyStation } from '@/hooks/useNearbyStation';
import { registerBackgroundSync } from '@/lib/backgroundSync';

export function HomePage() {
  const { refetch } = useStations();
  const nearby = useNearbyStation();
  const [snapOpen, setSnapOpen] = useState(false);

  // Request location right away (with Sydney fallback in the store).
  useEffect(() => {
    requestGeolocation();
    // best-effort PWA background-sync registration
    void registerBackgroundSync().catch(() => {});
  }, []);

  // Re-fetch stations once the location "loaded" (moved from fallback to live).
  useEffect(() => {
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

      {/* Geofence price-snap prompt — appears when the driver is at a station */}
      {nearby && !snapOpen && (
        <div className="absolute inset-x-3 top-16 z-30 mx-auto max-w-md">
          <button
            onClick={() => setSnapOpen(true)}
            className="card w-full p-3 text-left shadow-xl ring-1 ring-hi/40"
          >
            <p className="text-sm font-bold text-hi">📸 You're at {nearby.name}</p>
            <p className="text-xs text-slate-300">Snap the price board — earn a 50¢ credit in 3 seconds</p>
          </button>
        </div>
      )}

      {/* Snap modal sheet */}
      {nearby && snapOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-3 pb-safe">
          <div className="mx-auto w-full max-w-md rounded-2xl bg-navy-light p-3">
            <PriceSnap station={nearby} onClose={() => setSnapOpen(false)} />
          </div>
        </div>
      )}

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
