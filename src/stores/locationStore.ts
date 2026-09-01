// ─── Location store (current driver position) ─────────────────────────────
import { create } from 'zustand';
import { DEFAULT_CENTRE } from '@/lib/env';

interface LocationState {
  lat: number;
  lng: number;
  loaded: boolean;          // geolocation answered (granted or denied)
  granted: boolean;         // explicit permission granted
  setPosition: (lat: number, lng: number, granted?: boolean) => void;
  setDenied: () => void;
}

export const useLocation = create<LocationState>((set) => ({
  lat: DEFAULT_CENTRE.lat,
  lng: DEFAULT_CENTRE.lng,
  loaded: false,
  granted: false,
  setPosition: (lat, lng, granted = true) => set({ lat, lng, loaded: true, granted }),
  setDenied: () => set({ loaded: true, granted: false }),
}));

/**
 * Request browser geolocation. On success updates the store and re-fetches
 * stations around the new position. On denial falls back to the default centre.
 */
export function requestGeolocation() {
  if (!('geolocation' in navigator)) {
    useLocation.getState().setDenied();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => useLocation.getState().setPosition(pos.coords.latitude, pos.coords.longitude),
    () => useLocation.getState().setDenied(),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
  );
}
