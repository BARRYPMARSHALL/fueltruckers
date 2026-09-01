// ─── Mock data: real Australian truck stops ───────────────────────────────
// This is BOTH the offline fallback (when Supabase isn't configured) AND the
// source for the Supabase seed SQL (see supabase/seed.sql). Prices are
// realistic 2026 Australian diesel figures (160–210 c/L) for illustrative
// purposes only — the app's real value is the community-submitted price feed.

import { Station, AUState, Amenities } from '@/types';

interface MockStation {
  id: string;
  name: string;
  brand: string;
  lat: number;
  lng: number;
  address: string;
  state: AUState;
  truckFriendlyScore: number;
  amenities: Partial<Amenities>;
  priceCentsPerLitre: number;
  // hours "24" when 24-7 food / truck stop open all night
  open24_7: boolean;
  lastVerifiedAgeHours: number;
}

const s = (
  id: string,
  name: string,
  brand: string,
  lat: number,
  lng: number,
  address: string,
  state: AUState,
  truckFriendlyScore: number,
  priceCentsPerLitre: number,
  open24_7: boolean,
  amen: Partial<Amenities>,
  lastVerifiedAgeHours = 6,
): MockStation => ({
  id, name, brand, lat, lng, address, state, truckFriendlyScore,
  priceCentsPerLitre, open24_7, amenities: amen, lastVerifiedAgeHours,
});

export const MOCK_STATIONS: MockStation[] = [
  // ── NSW — Hume Highway ──
  s('nsw-1', 'Twin Creeks Service Centre', 'Caltex', -34.478, 150.139, 'Hume Hwy, Mittagong', 'NSW', 88, 176, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: true, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: false }, 2),
  s('nsw-2', 'Marulan Truck Stop', 'BP', -34.71, 150.02, 'Hume Hwy, Marulan', 'NSW', 82, 172, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: false, weighbridge: true, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: true }, 4),
  s('nsw-3', 'Goulburn Big Merino Truck Stop', 'Ampol', -34.76, 149.71, 'Hume Hwy, Goulburn', 'NSW', 90, 168, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: true, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 1),
  s('nsw-4', 'Yass Roadhouse & Truck Stop', 'Shell', -34.83, 148.91, 'Hume Hwy, Yass', 'NSW', 74, 174, true, { truckParking: true, highClearance: false, showers: true, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 8),
  s('nsw-5', 'Holbrook Roadhouse', 'United', -35.72, 147.31, 'Hume Hwy, Holbrook', 'NSW', 68, 170, false, { truckParking: true, highClearance: true, showers: false, food24_7: false, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 12),
  s('nsw-6', 'Albury Gateway Servo', 'Shell', -36.08, 146.92, 'Hume Hwy, Albury', 'NSW', 79, 173, true, { truckParking: true, highClearance: false, showers: true, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: false }, 5),

  // ── NSW — Pacific Highway ──
  s('nsw-7', 'Hexham Fuel Stop', 'BP', -32.83, 151.69, 'Pacific Hwy, Hexham', 'NSW', 80, 171, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 3),
  s('nsw-8', 'Kempsey Truck Stop', 'Ampol', -31.08, 152.84, 'Pacific Hwy, Kempsey', 'NSW', 72, 169, true, { truckParking: true, highClearance: true, showers: true, food24_7: false, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 7),
  s('nsw-9', 'Port Macquarie Roadhouse', 'Caltex', -31.43, 152.9, 'Pacific Hwy, Port Macquarie', 'NSW', 77, 175, true, { truckParking: true, highClearance: false, showers: true, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 6),

  // ── VIC — Hume Highway / Western ──
  s('vic-1', 'Euroa Truck Stop', 'Shell', -36.75, 145.57, 'Hume Hwy, Euroa', 'VIC', 85, 169, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: true, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 2),
  s('vic-2', 'Wodonga Pump', 'BP', -36.12, 146.89, 'Hume Hwy, Wodonga', 'VIC', 78, 172, true, { truckParking: true, highClearance: false, showers: true, food24_7: false, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 4),
  s('vic-3', 'Seymour Truck Centre', 'Ampol', -37.02, 145.13, 'Hume Hwy, Seymour', 'VIC', 83, 166, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: true, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 1),
  s('vic-4', 'Ballarat Truck Stop', 'Caltex', -37.56, 143.86, 'Western Hwy, Ballarat', 'VIC', 76, 174, true, { truckParking: true, highClearance: false, showers: true, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 9),

  // ── QLD — Bruce Highway ──
  s('qld-1', 'Cooroy Roadhouse', 'BP', -26.42, 152.86, 'Bruce Hwy, Cooroy', 'QLD', 81, 170, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: false }, 3),
  s('qld-2', 'Gympie Fuel Stop', 'Caltex', -26.19, 152.68, 'Bruce Hwy, Gympie', 'QLD', 84, 167, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: true, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 2),
  s('qld-3', 'Maryborough Truck Stop', 'Ampol', -25.54, 152.7, 'Bruce Hwy, Maryborough', 'QLD', 79, 173, true, { truckParking: true, highClearance: false, showers: true, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: true }, 6),
  s('qld-4', 'Rockhampton Tannum Truck Stop', 'Shell', -23.05, 150.43, 'Bruce Hwy, Rockhampton', 'QLD', 87, 165, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: true, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 2),
  s('qld-5', 'Bowen Roadhouse', 'United', -20.01, 148.21, 'Bruce Hwy, Bowen', 'QLD', 70, 168, true, { truckParking: true, highClearance: true, showers: false, food24_7: false, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 10),
  s('qld-6', 'Proserpine Truck Amenity', 'BP', -20.4, 148.58, 'Bruce Hwy, Proserpine', 'QLD', 73, 171, true, { truckParking: true, highClearance: false, showers: true, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 8),

  // ── WA — Great Eastern / Great Northern ──
  s('wa-1', 'Northam Truck Stop', 'Caltex', -31.65, 116.67, 'Great Eastern Hwy, Northam', 'WA', 82, 178, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 4),
  s('wa-2', 'Meckering Roadhouse', 'BP', -31.63, 117.04, 'Great Eastern Hwy, Meckering', 'WA', 71, 182, true, { truckParking: true, highClearance: false, showers: true, food24_7: false, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 7),
  s('wa-3', 'Geraldton Truck Stop', 'Ampol', -28.78, 114.61, 'N W Coastal Hwy, Geraldton', 'WA', 78, 176, true, { truckParking: true, highClearance: false, showers: true, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: false }, 5),

  // ── SA — Sturt / Eyre / Barrier Highways ──
  s('sa-1', 'Port Augusta Fuel', 'Shell', -32.49, 137.77, 'Eyre Hwy, Port Augusta', 'SA', 85, 175, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: true, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 3),
  s('sa-2', 'Kimba Truck Stop', 'BP', -33.14, 136.42, 'Eyre Hwy, Kimba', 'SA', 73, 179, true, { truckParking: true, highClearance: false, showers: true, food24_7: false, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 9),
  s('sa-3', 'Burra Roadhouse', 'Caltex', -33.67, 138.93, 'Barrier Hwy, Burra', 'SA', 69, 181, false, { truckParking: true, highClearance: true, showers: false, food24_7: false, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 11),

  // ── TAS — Midland / Bass Highways ──
  s('tas-1', 'Campbell Town Truck St', 'Caltex', -41.93, 147.49, 'Midland Hwy, Campbell Town', 'TAS', 80, 177, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 4),
  s('tas-2', 'Perth (Tas) Fuel Stop', 'Shell', -41.57, 147.17, 'Midland Hwy, Perth', 'TAS', 72, 180, true, { truckParking: true, highClearance: false, showers: true, food24_7: false, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 8),
  s('tas-3', 'George Town Roadhouse', 'Ampol', -41.11, 146.83, 'Bass Hwy, George Town', 'TAS', 71, 179, true, { truckParking: true, highClearance: false, showers: true, food24_7: false, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 10),

  // ── NT — Stuart Highway ──
  s('nt-1', 'Katherine Truck Stop', 'Shell', -14.46, 132.26, 'Stuart Hwy, Katherine', 'NT', 83, 188, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 3),
  s('nt-2', 'Tennant Creek Fuel', 'BP', -19.65, 134.19, 'Stuart Hwy, Tennant Creek', 'NT', 75, 201, true, { truckParking: true, highClearance: false, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 12),
  s('nt-3', 'Coober Pedy Oodnadatta Truck St', 'Ampol', -29.01, 134.75, 'Stuart Hwy, Coober Pedy', 'NT', 66, 196, true, { truckParking: true, highClearance: false, showers: false, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 14),

  // ── ACT / NSW border ──
  s('act-1', 'Hume (ACT) Truck Stop', 'Caltex', -35.09, 149.12, 'Federal Hwy, Hume', 'NSW', 81, 171, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 5),

  // ── QLD — New England / Toowoomba ──
  s('qld-7', 'Toowoomba Truck Stop', 'BP', -27.56, 151.95, 'Warrego Hwy, Charlton', 'QLD', 86, 164, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 2),

  // ── VIC — Calder / Northern ──
  s('vic-5', 'Bendigo Fuel Stop', 'Shell', -36.76, 144.28, 'Calder Hwy, Bendigo', 'VIC', 77, 173, true, { truckParking: true, highClearance: false, showers: true, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: false }, 6),

  // ── WA — Albany / South West ──
  s('wa-4', 'Kojonup Truck Stop', 'Caltex', -33.84, 117.16, 'Albany Hwy, Kojonup', 'WA', 70, 180, true, { truckParking: true, highClearance: false, showers: true, food24_7: false, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 9),

  // ── NSW — New England Highway ──
  s('nsw-10', 'Tamworth Fuel Stop', 'BP', -31.09, 150.93, 'New England Hwy, Tamworth', 'NSW', 78, 170, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: false }, 6),
  s('nsw-11', 'Armidale Roadhouse', 'Ampol', -30.51, 151.67, 'New England Hwy, Armidale', 'NSW', 74, 174, false, { truckParking: true, highClearance: true, showers: false, food24_7: false, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 10),

  // ── SA — Dukes / Mallee ──
  s('sa-4', 'Tailem Bend Truck Stop', 'Shell', -35.25, 139.45, 'Dukes Hwy, Tailem Bend', 'SA', 79, 176, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: false }, 7),

  // ── NSW — Sturt / Kidman Way ──
  s('nsw-12', 'Wagga Wagga Truck Stop', 'Caltex', -35.12, 147.37, 'Sturt Hwy, Wagga Wagga', 'NSW', 82, 172, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 4),

  // ── QLD — Warrego / Landsborough ──
  s('qld-8', 'Charleville Truck Stop', 'BP', -26.4, 146.24, 'Warrego Hwy, Charleville', 'QLD', 72, 190, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: true }, 13),

  // ── VIC — Western / Grampians ──
  s('vic-6', 'Horsham Fuel Stop', 'United', -36.72, 142.2, 'Western Hwy, Horsham', 'VIC', 71, 178, true, { truckParking: true, highClearance: false, showers: false, food24_7: false, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 11),

  // ── WA — Great Northern / Midwest ──
  s('wa-5', 'Mount Magnet Roadhouse', 'BP', -28.06, 118.68, 'Great Northern Hwy, Mount Magnet', 'WA', 64, 206, true, { truckParking: true, highClearance: false, showers: false, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 15),

  // ── NT / SA — Stuart Highway south ──
  s('nt-4', 'Alice Springs Truck Stop', 'Shell', -23.7, 133.88, 'Stuart Hwy, Alice Springs', 'NT', 80, 194, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 5),
  s('sa-5', 'Woomera Truck Stop', 'Caltex', -31.2, 136.83, 'Stuart Hwy, Woomera', 'SA', 63, 199, true, { truckParking: true, highClearance: false, showers: false, food24_7: true, mechanic: false, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: false }, 16),

  // ── QLD — Capricorn / Dawson ──
  s('qld-9', 'Emerald Truck Stop', 'Ampol', -23.53, 148.16, 'Gregory Hwy, Emerald', 'QLD', 72, 189, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: false, laundry: true }, 12),

  // ── VIC — Hume / Albury Wodonga ──
  s('vic-7', 'Albury Truck Port', 'BP', -36.07, 146.88, 'Hume Fwy, Albury', 'VIC', 84, 170, true, { truckParking: true, highClearance: true, showers: true, food24_7: true, mechanic: true, weighbridge: false, defOrAdBlue: true, fuelPayAtPump: true, wc: true, wifi: true, laundry: true }, 3),
];

/** Convert a stored mock station to the app's Station type. */
export function toStation(m: MockStation): Station {
  return {
    id: m.id,
    name: m.name,
    brand: m.brand,
    lat: m.lat,
    lng: m.lng,
    address: m.address,
    state: m.state,
    truckFriendlyScore: m.truckFriendlyScore,
    amenities: { ...m.amenities } as Amenities,
    lastVerified: new Date(Date.now() - m.lastVerifiedAgeHours * 3600_000).toISOString(),
    price: m.priceCentsPerLitre,
  };
}

export const MOCK_STATIONS_AS_STATION: Station[] = MOCK_STATIONS.map(toStation);

/** Median diesel price across mock stations (for the savings baseline). */
export function mockMedianPrice(): number {
  const prices = MOCK_STATIONS.map((m) => m.priceCentsPerLitre).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);
}
