// ─── General utilities ────────────────────────────────────────────────────
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { KM_PER_LITRE } from '@/types';

/** Format cents-per-litre as "$1.87" style for price badges. */
export function centsPerLitreToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format a distance (km) compactly for station cards. */
export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${Math.round(km)} km`;
}

/**
 * Given the driver's tank and monthly km, estimate litres of diesel consumed
 * per month — the basis for the savings dashboard.
 */
export function estimateMonthlyLitres(monthlyKm: number): number {
  return Math.round(monthlyKm / KM_PER_LITRE);
}

/**
 * Estimated monthly savings from the cheapest vs median price in the area.
 * `savingsCentsPerLitre` is the gain over a typical (median) price.
 */
export function estimateMonthlySavings(
  monthlyKm: number,
  savingsCentsPerLitre: number,
): { litres: number; savingAUD: number } {
  const litres = estimateMonthlyLitres(monthlyKm);
  const savingCents = litres * savingsCentsPerLitre;
  return { litres, savingAUD: savingCents / 100 };
}

/** Human "last verified" string, e.g. "3 h ago". */
export function lastVerifiedLabel(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

/** Human date, e.g. "12 Aug". */
export function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM');
  } catch {
    return iso;
  }
}

/** Weighted truck-friendliness: combine score and a couple of hard signals. */
export function isTruckFriendly(station: {
  truckFriendlyScore: number;
  amenities: { truckParking: boolean; highClearance: boolean };
}): boolean {
  return station.truckFriendlyScore >= 60 && station.amenities.truckParking;
}

/**
 * Net saving of a station vs the median price, accounting for the detour cost
 * of getting there. Positive = cheaper than typical even after detour.
 */
export function netSavings(
  stationPriceCents: number,
  medianPriceCents: number,
  distanceKm: number,
): number {
  // Detour cost modelled as extra km × fuel cost, expressed per litre refilled.
  // For a 1000L refill, a 10km detour ≈ 3.5L extra ≈ a small per-litre penalty.
  const detourPenaltyCents = Math.round((distanceKm / KM_PER_LITRE) * 0.6);
  return stationPriceCents - medianPriceCents + detourPenaltyCents;
}

/** Deterministic pseudo-truck-score to seed a station if absent (0-100). */
export function pseudoTruckScore(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return 40 + (Math.abs(h) % 61); // 40-100
}

/** Build an RFC4122-ish id for mock records. */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Simple colour for a price: green (cheap) → amber → red (expensive). */
export function priceColor(cents: number): string {
  if (cents <= 175) return 'text-emerald-400';
  if (cents <= 195) return 'text-amber-400';
  return 'text-red-400';
}

/** Price background badge class for map/list markers. */
export function priceBadgeClass(cents: number): string {
  if (cents <= 175) return 'bg-emerald-500 text-white';
  if (cents <= 195) return 'bg-amber-500 text-navy';
  return 'bg-red-500 text-white';
}
