// ─── Shared domains/types for FuelTruckers ────────────────────────────────
// Australian states (Australian English, AUD, diesel focus)
export type AUState =
  | 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'NT' | 'ACT';

export const AU_STATES: AUState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

// Amenities a truck driver cares about at a stop.
export interface Amenities {
  truckParking: boolean;      // dedicated HGV/rig parking
  highClearance: boolean;     // drive-through / overhead clearance for long rigs
  showers: boolean;
  food24_7: boolean;          // 24/7 food
  mechanic: boolean;          // on-site or nearby mechanic
  weighbridge: boolean;
  defOrAdBlue: boolean;       // AdBlue / DEF available
  fuelPayAtPump: boolean;
  wc: boolean;                // toilets
  wifi: boolean;
  laundry: boolean;
}

export const DEFAULT_AMENITIES: Amenities = {
  truckParking: false,
  highClearance: false,
  showers: false,
  food24_7: false,
  mechanic: false,
  weighbridge: false,
  defOrAdBlue: false,
  fuelPayAtPump: false,
  wc: false,
  wifi: false,
  laundry: false,
};

// Human-readable amenities (used for filter chips + detail checklist).
export const AMENITY_LABELS: Record<keyof Amenities, string> = {
  truckParking: 'Truck parking',
  highClearance: 'High clearance',
  showers: 'Showers',
  food24_7: '24/7 food',
  mechanic: 'Mechanic',
  weighbridge: 'Weighbridge',
  defOrAdBlue: 'AdBlue / DEF',
  fuelPayAtPump: 'Pay at pump',
  wc: 'Toilets',
  wifi: 'Wi-Fi',
  laundry: 'Laundry',
};

// A fuel station. Mirror of the Supabase `stations` table but with the
// `price` and `truck_score` fields resolved at query time (see lib/api).
export interface Station {
  id: string;
  name: string;
  brand: string;
  lat: number;
  lng: number;
  address: string;
  state: AUState;
  truckFriendlyScore: number;   // 0-100
  amenities: Amenities;
  lastVerified: string;         // ISO
  price?: number;               // diesel cents/L (latest, hydrated)
  distanceKm?: number;          // from current location (hydrated)
  detourCostCents?: number;     // cost of detour refill (hydrated, cents/L)
  netSavingsCents?: number;     // price-saving net of detour (cents/L)
}

// A price observation. Mirror of Supabase `prices` table.
export interface PriceRecord {
  id: string;
  station_id: string;
  diesel_cents_per_litre: number;
  reported_by: string | null;
  photo_url: string | null;
  created_at: string;
  is_verified: boolean;
}

// A station amenity/price submission. Mirror of `submissions`.
export type SubmissionType = 'price' | 'amenity';
export interface Submission {
  id: string;
  station_id: string;
  user_id: string | null;
  type: SubmissionType;
  diesel_cents_per_litre?: number;
  amenities?: Partial<Amenities>;
  note?: string;
  photo_url?: string;
  is_approved: boolean;
  created_at: string;
}

// A user review left at a station (MVP: kept lightweight).
export interface Review {
  id: string;
  station_id: string;
  user_id: string;
  rating: number;          // 1-5
  comment: string;
  created_at: string;
}

// User profile. Mirror of Supabase `profiles` table.
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tank_litres: number;
  monthly_km: number;
  preferred_amenities: Partial<Amenities>;
  fuel_credits: number;         // 50¢ off subscription per verified submission
  referral_code: string;
  created_at: string;
}

// Subscription record. Mirror of `subscriptions`.
export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'past_due';
export interface Subscription {
  user_id: string;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  trial_ends_at: string | null;
}

// Sort options for the station list.
export type StationSortKey =
  | 'cheapest'
  | 'closest'
  | 'netSavings'
  | 'truckScore';

// Filter chips on the map view.
export interface StationFilters {
  truckFriendlyOnly: boolean;
  hasShowers: boolean;
  open24_7: boolean;
  maxPriceCentsPerLitre: number | null;  // "Max price" slider
  maxDistanceKm: number | null;           // "Max distance"
}

export const DEFAULT_FILTERS: StationFilters = {
  truckFriendlyOnly: false,
  hasShowers: false,
  open24_7: false,
  maxPriceCentsPerLitre: null,
  maxDistanceKm: null,
};

// Membership plan constants (AUD).
export const PLAN = {
  priceAUD: 30,
  priceCents: 3000,
  trialDays: 7,
  fuelCreditValueCents: 50, // 50¢ off subscription per verified submission
  revenueShareGiveawayPct: 25, // 25% of revenue to cash giveaways
} as const;

// Mock price range used by the savings estimator when real prices absent.
export const DEFAULT_TANK_LITRES = 1000;
export const DEFAULT_MONTHLY_KM = 15000;

// Cost model for "net savings" ranking. Diesel ≈ $/L conversion used in UI.
export const KM_PER_LITRE = 2.8;   // rough long-haul fuel economy
