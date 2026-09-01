// ─── TanStack Query hooks ─────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStations, fetchPriceHistory, fetchReviews, submitPrice, submitAmenity, getMedianPrice,
} from '@/lib/api';
import { useLocation } from '@/stores/locationStore';
import { useUi } from '@/stores/uiStore';
import { useSettings } from '@/stores/settingsStore';
import { applyFilters, sortStations } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Station } from '@/types';

/** Stations near the current location, hydrated with price/distance/savings. */
export function useStations() {
  const lat = useLocation((s) => s.lat);
  const lng = useLocation((s) => s.lng);
  return useQuery({
    queryKey: ['stations', lat, lng],
    queryFn: () => fetchStations({ lat, lng }),
    staleTime: 5 * 60 * 1000, // 5 min — prices move slowly
  });
}

/** Stations after applying the current filters + sort key. */
export function useVisibleStations(): Station[] {
  const { data: stations } = useStations();
  const filters = useUi((s) => s.filters);
  const sortKey = useUi((s) => s.sortKey);
  if (!stations) return [];
  const filtered = applyFilters(stations, filters);
  return sortStations(filtered, sortKey);
}

/** Price history for a station (for the detail price chart). */
export function usePriceHistory(stationId: string | null) {
  return useQuery({
    queryKey: ['prices', stationId],
    queryFn: () => fetchPriceHistory(stationId!),
    enabled: !!stationId,
    staleTime: 60 * 1000,
  });
}

/** Reviews for a station. */
export function useReviews(stationId: string | null) {
  return useQuery({
    queryKey: ['reviews', stationId],
    queryFn: () => fetchReviews(stationId!),
    enabled: !!stationId,
    staleTime: 60 * 1000,
  });
}

/** The median diesel price across known stations (savings baseline). */
export function useMedianPrice() {
  return useQuery({
    queryKey: ['median-price'],
    queryFn: () => getMedianPrice(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Submit a price read (earns Fuel Credits + invalidates station/prices cache). */
export function useSubmitPrice() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: (input: { stationId: string; centsPerLitre: number; photoUrl?: string }) =>
      submitPrice({ ...input, userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stations'] });
      qc.invalidateQueries({ queryKey: ['prices'] });
    },
  });
}

/** Submit an amenity update. */
export function useSubmitAmenity() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: (input: { stationId: string; amenities: Partial<import('@/types').Amenities>; }) =>
      submitAmenity({ ...input, userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stations'] }),
  });
}

/** The persistent sort key (from settings), for the list ordering control. */
export function useSortKey() {
  return useSettings((s) => s.sortKey);
}
