// ─── Geofence: detect when the driver is near a known station ──────────────
import { useLocation } from '@/stores/locationStore';
import { useStations } from '@/hooks/useStations';
import { haversineKm } from '@/lib/api';
import { Station } from '@/types';
import { useMemo } from 'react';

export const SNAP_RADIUS_KM = 0.4; // ~400m → "you're at the pump"

/**
 * Returns the station the driver is currently at (within SNAP_RADIUS_KM) or
 * null. Drives the "snap the price board" prompt on the map.
 */
export function useNearbyStation(): Station | null {
  const lat = useLocation((s) => s.lat);
  const lng = useLocation((s) => s.lng);
  const { data: stations } = useStations();

  return useMemo(() => {
    if (!stations?.length) return null;
    let best: Station | null = null;
    let bestKm = Infinity;
    for (const s of stations) {
      const d = haversineKm(lat, lng, s.lat, s.lng);
      if (d <= SNAP_RADIUS_KM && d < bestKm) {
        best = s;
        bestKm = d;
      }
    }
    return best;
  }, [lat, lng, stations]);
}
