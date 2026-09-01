// ─── Data access layer ────────────────────────────────────────────────────
// All reads/writes go through here. If Supabase is configured we hit the live
// backend; otherwise we fall back to the realistic mock store so the PWA is
// fully runnable with zero setup. Every function returns stable, typed data.

import { getSupabase, hasSupabase } from './supabase';
import {
  Station, PriceRecord, Review, Profile, Subscription,
  StationFilters, StationSortKey, Amenities, DEFAULT_AMENITIES,
  AUState,
} from '@/types';
import {
  MOCK_STATIONS_AS_STATION, mockMedianPrice,
} from './mockData';
import { netSavings, pseudoTruckScore, uid } from './utils';

// ── Geolocation helpers ───────────────────────────────────────────────────
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ── Local cache for offline fallback ─────────────────────────────────────
const stationCache: Station[] = [...MOCK_STATIONS_AS_STATION];

// re-export the mock median so UI can use it
export const getMedianPrice = (): number => mockMedianPrice();

// ── Station fetching ──────────────────────────────────────────────────────
/**
 * Fetch stations near a point, hydrated with price + derived metrics.
 * When Supabase is present, reads `stations` + latest `prices`. Otherwise
 * returns the mock set, hydrated.
 */
export async function fetchStations(centre = { lat: -33.8688, lng: 151.2093 }): Promise<Station[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('stations')
        .select('*, prices( diesel_cents_per_litre, created_at )')
        .order('truck_friendly_score', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const withPrices = await hydrateFromSupabase(rows, centre, sb);
      return stationCache.length ? withPrices : withPrices;
    } catch (e) {
      // fall through to mock on any backend error (offline/not seeded)
      console.warn('[fuel] supabase station fetch failed, using mock', e);
    }
  }
  return stationCache.map((st) => hydrate(st, centre));
}

// Attach the latest price + derived metrics (from Supabase-returned rows).
async function hydrateFromSupabase(rows: any[], centre: { lat: number; lng: number }, _sb: any): Promise<Station[]> {
  const median = mockMedianPrice();
  const stations = rows.map((r) => {
    // prices relation is an array of price rows (latest first depends on order)
    const latestPrice =
      Array.isArray(r.prices) && r.prices.length
        ? r.prices[0].diesel_cents_per_litre
        : undefined;
    const st: Station = {
      id: r.id,
      name: r.name,
      brand: r.brand,
      lat: r.lat,
      lng: r.lng,
      address: r.address ?? '',
      state: (r.state as AUState) || 'NSW',
      truckFriendlyScore: r.truck_friendly_score ?? pseudoTruckScore(r.id),
      amenities: (r.amenities as Amenities) ?? DEFAULT_AMENITIES,
      lastVerified: r.last_verified ?? new Date().toISOString(),
      price: latestPrice,
    };
    return st;
  });
  // hydrate distance + net savings
  return stations.map((st) => {
    const distanceKm = haversineKm(centre.lat, centre.lng, st.lat, st.lng);
    const price = st.price ?? median + 2;
    const detourCostCents = Math.round(distanceKm * 0.4);
    const netSav = netSavings(price, median, distanceKm);
    return { ...st, distanceKm, detourCostCents, netSavingsCents: netSav };
  });
}

// Hydrate a station with distance + savings derived metrics.
function hydrate(st: Station, centre: { lat: number; lng: number }): Station {
  const median = mockMedianPrice();
  const distanceKm = haversineKm(centre.lat, centre.lng, st.lat, st.lng);
  const price = st.price ?? median + 2;
  const detourCostCents = Math.round(distanceKm * 0.4);
  const netSav = netSavings(price, median, distanceKm);
  return { ...st, distanceKm, detourCostCents, netSavingsCents: netSav };
}

// ── Price history for a station ───────────────────────────────────────────
export async function fetchPriceHistory(stationId: string): Promise<PriceRecord[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('prices')
        .select('*')
        .eq('station_id', stationId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as PriceRecord[];
    } catch (e) {
      console.warn('[fuel] price history fetch failed', e);
    }
  }
  // mock: generate a plausible downward-trending history
  const base = stationCache.find((s) => s.id === stationId)?.price ?? 180;
  const now = Date.now();
  return Array.from({ length: 6 }, (_, i) => ({
    id: uid(),
    station_id: stationId,
    diesel_cents_per_litre: Math.max(base - i * 2 + (i === 0 ? 0 : -1), 150),
    reported_by: i === 0 ? 'you' : `truckie-${i}`,
    photo_url: null,
    created_at: new Date(now - i * 86400_000).toISOString(),
    is_verified: i === 0,
  }));
}

// ── Reviews for a station (mock for MVP) ─────────────────────────────────
export async function fetchReviews(stationId: string): Promise<Review[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('station_reviews')
        .select('*')
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as Review[];
    } catch (e) {
      console.warn('[fuel] reviews fetch failed', e);
    }
  }
  // Mock reviews
  const samples: Array<[number, string, string]> = [
    [5, 'Mick', 'Best showers on the highway. Plenty of backing space for a B-double.'],
    [4, 'Sandy', 'Good fuel price, tap-to-pay works. Food got busy around 7pm.'],
    [4, 'Robbo', 'AdBlue here when you need it. Slight wait for the weighbridge.'],
  ];
  return samples.map(([rating, _name, comment], i) => ({
    id: uid(),
    station_id: stationId,
    user_id: `mock-${i}`,
    rating,
    comment,
    created_at: new Date(Date.now() - i * 3600_000 * 10).toISOString(),
  }));
}

// ── Submit a price / amenity (earns fuel credits) ─────────────────────────
/**
 * Record a price submission. Auto-approves for the MVP (is_verified=true so
 * the price shows immediately) and credits the reporter 50¢ if they exist.
 * When offline (no Supabase), it's queued in localStorage for background sync.
 */
export async function submitPrice(input: {
  stationId: string;
  centsPerLitre: number;
  photoUrl?: string;
  userId?: string | null;
}): Promise<{ ok: boolean; credited: boolean; message: string }> {
  const sb = getSupabase();
  if (sb && input.userId) {
    try {
      const { error } = await sb.from('prices').insert({
        station_id: input.stationId,
        diesel_cents_per_litre: input.centsPerLitre,
        reported_by: input.userId,
        photo_url: input.photoUrl ?? null,
        is_verified: true, // MVP auto-approve
      });
      if (error) throw error;
      // award fuel credit (50¢) — idempotently via RPC in prod; here direct
      await sb.rpc('award_fuel_credit', { user_id: input.userId, amount: 50 });
      return { ok: true, credited: true, message: 'Price submitted — 50¢ fuel credit added.' };
    } catch (e) {
      console.warn('[fuel] price submit failed, queueing', e);
      queueOffline('price', input);
      return { ok: true, credited: false, message: 'Offline — queued to submit when back online.' };
    }
  }
  queueOffline('price', input);
  return { ok: true, credited: false, message: 'Offline — queued to submit when back online.' };
}

/** Submit an amenity update. */
export async function submitAmenity(input: {
  stationId: string;
  amenities: Partial<Amenities>;
  userId?: string | null;
}): Promise<{ ok: boolean; credited: boolean; message: string }> {
  const sb = getSupabase();
  if (sb && input.userId) {
    try {
      await sb.from('submissions').insert({
        station_id: input.stationId,
        user_id: input.userId,
        type: 'amenity',
        amenities: input.amenities,
        is_approved: true,
      });
      await sb.rpc('award_fuel_credit', { user_id: input.userId, amount: 50 });
      return { ok: true, credited: true, message: 'Amenities updated — 50¢ fuel credit added.' };
    } catch (e) {
      console.warn('[fuel] amenity submit failed', e);
    }
  }
  // local reflect + no network: still let the user see it reflected in mock
  const target = stationCache.find((s) => s.id === input.stationId);
  if (target) target.amenities = { ...target.amenities, ...input.amenities };
  return { ok: true, credited: false, message: 'Amenity update saved.' };
}

// Offline queue for background sync (PWA).
interface QueuedSubmit {
  kind: 'price' | 'amenity';
  payload: unknown;
  queuedAt: number;
}
function queueOffline(kind: 'price' | 'amenity', payload: unknown) {
  try {
    const key = 'fueltruckers.offlineQueue';
    const existing: QueuedSubmit[] = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({ kind, payload, queuedAt: Date.now() });
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    /* ignore quota errors */
  }
}

// ── Station sort + filter (pure, used by the UI list) ─────────────────────
export function applyFilters(stations: Station[], filters: StationFilters): Station[] {
  return stations.filter((s) => {
    if (filters.truckFriendlyOnly && s.truckFriendlyScore < 60) return false;
    if (filters.hasShowers && !s.amenities.showers) return false;
    if (filters.open24_7 && !s.amenities.food24_7) return false;
    if (filters.maxPriceCentsPerLitre && (s.price ?? 999) > filters.maxPriceCentsPerLitre) return false;
    if (filters.maxDistanceKm && (s.distanceKm ?? 999) > filters.maxDistanceKm) return false;
    return true;
  });
}

export function sortStations(stations: Station[], sortKey: StationSortKey): Station[] {
  const copy = [...stations];
  switch (sortKey) {
    case 'cheapest':
      return copy.sort((a, b) => (a.price ?? 999) - (b.price ?? 999));
    case 'closest':
      return copy.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    case 'netSavings':
      // higher (more negative) net savings = better
      return copy.sort((a, b) => (a.netSavingsCents ?? 0) - (b.netSavingsCents ?? 0));
    case 'truckScore':
      return copy.sort((a, b) => b.truckFriendlyScore - a.truckFriendlyScore);
    default:
      return copy;
  }
}

// ── Profile / subscription (auth-lite for the MVP) ────────────────────────
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) return data as Profile;
    } catch (e) {
      console.warn('[fuel] profile fetch failed', e);
    }
  }
  return null;
}

export async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
      if (!error && data) return data as Subscription;
    } catch (e) {
      console.warn('[fuel] subscription fetch failed', e);
    }
  }
  return null;
}

export { hasSupabase };
