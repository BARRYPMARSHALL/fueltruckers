// ─── Trip fuel planner (route-based optimization) ─────────────────────────
// Given a route (origin → destination) and a fleet vehicle (tank size + fuel
// economy), find the optimal set of diesel stops: fill where it's cheapest
// *within a detour budget*, and never run dry. This is the "plan your whole
// route's fuel, not just the next stop" feature.
import { Station } from '@/types';
import { KM_PER_LITRE } from '@/types';

export interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
}

export interface TripInput {
  origin: RoutePoint;
  destination: RoutePoint;
  // route is a polyline (optional) — if absent, we interpolate a straight line
  route?: RoutePoint[];
  tankLitres: number;
  // reserve: never let fuel drop below this fraction of the tank
  reserveFraction?: number;
  detourBudgetKm?: number;      // how far off-route we'll go for cheap diesel
  pricePenaltyPerKm?: number;   // detour cost in c/L as we go off the highway
}

export interface TripStop {
  station: Station;
  fillLitres: number;           // how much diesel to buy here
  costAUD: number;              // total diesel spend at this stop
  detourKm: number;             // how far off the ideal route
  detourCostAUD: number;        // fuel cost of the detour
  netSaveAUD: number;           // saving vs buying at the naive (first) stop
  fillPct: number;              // % of tank filled
}

export interface TripPlan {
  totalKm: number;
  totalLitres: number;
  totalFuelCostAUD: number;
  detourCostAUD: number;
  stops: TripStop[];
  rangeKm: number;
  breakdown: Array<{ label: string; value: string; kind: 'save' | 'cost' | 'info' }>;
}

// Straight-line distance between two coords (km, geodesic approx).
function dist(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Project a station onto the route and return km-along-route + off-route distance.
function projectOntoRoute(
  station: Station,
  origin: RoutePoint,
  dest: RoutePoint,
): { kmAlong: number; offRouteKm: number } {
  // Straight-line route: parameterise t in [0,1] along origin→dest.
  const vx = dest.lng - origin.lng;
  const vy = dest.lat - origin.lat;
  const vLen2 = vx * vx + vy * vy;
  let t = 0;
  if (vLen2 > 0) {
    t = ((station.lng - origin.lng) * vx + (station.lat - origin.lat) * vy) / vLen2;
    t = Math.max(0, Math.min(1, t));
  }
  const projLng = origin.lng + t * vx;
  const projLat = origin.lat + t * vy;
  const offRoute = dist({ lat: station.lat, lng: station.lng }, { lat: projLat, lng: projLng });
  const kmAlong = dist(origin, { lat: projLat, lng: projLng });
  return { kmAlong, offRouteKm: offRoute };
}

/**
 * Build an optimised fuel-stop plan for a route.
 * Greedy but sensible: sort candidate stations by net-per-litre saving, walk
 * the route, and schedule fills at each within-detour-budget stop that's
 * actually cheaper than filling at the next one. Respects the reserve tank.
 */
export function planTrip(input: TripInput, stations: Station[]): TripPlan {
  const { origin, destination, tankLitres } = input;
  const reserve = input.reserveFraction ?? 0.15;
  const detourBudget = input.detourBudgetKm ?? 8;
  const kmPerLitre = KM_PER_LITRE;

  const totalKm = dist(origin, destination);
  const rangeKm = tankLitres * kmPerLitre;

  // Candidate stops within the detour budget, projected onto the route.
  const candidates = stations
    .map((s) => {
      const { kmAlong, offRouteKm } = projectOntoRoute(s, origin, destination);
      return { station: s, kmAlong, offRouteKm };
    })
    .filter((c) => c.offRouteKm <= detourBudget)
    .filter((c) => c.station.price != null)
    .sort((a, b) => a.kmAlong - b.kmAlong);

  // The "naive" baseline price = the median (what you'd pay filling anywhere).
  const median = (() => {
    const ps = stations.map((s) => s.price).filter((p): p is number => p != null);
    if (!ps.length) return 200;
    ps.sort((a, b) => a - b);
    return ps[Math.floor(ps.length / 2)];
  })();

  // Walk the route. Track current fuel in L. Schedule a fill at a candidate
  // when (a) we'd hit reserve before the next candidate, and (b) it's cheaper
  // than the median price.
  const stops: TripStop[] = [];
  let fuel = tankLitres * (1 - reserve); // start with a full tank minus reserve

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    // Remaining km after this candidate — will we hit reserve before the next stop?
    const nextKmAlong = i + 1 < candidates.length ? candidates[i + 1].kmAlong : totalKm;
    const kmToNext = Math.max(0, nextKmAlong - c.kmAlong);
    const litresToNext = kmToNext / kmPerLitre;

    const cheaperThanMedian = (c.station.price ?? 999) < median - 2;
    const wouldRunLow = fuel - litresToNext < tankLitres * reserve;

    if (cheaperThanMedian && (wouldRunLow || c.station.price! <= (candidates[0]?.station.price ?? 999))) {
      const fillLitres = Math.min(tankLitres - fuel, tankLitres * (1 - reserve));
      if (fillLitres > 0) {
        const costAUD = Math.round((fillLitres * (c.station.price! / 100)) * 100) / 100;
        const detourCostAUD = Math.round((c.offRouteKm * 2 / kmPerLitre) * (c.station.price! / 100) * 100) / 100;
        // saving vs buying this fill at the median price
        const medianCost = (fillLitres * (median / 100));
        const netSaveAUD = Math.round((medianCost - costAUD - detourCostAUD) * 100) / 100;
        stops.push({
          station: c.station,
          fillLitres,
          costAUD,
          detourKm: Math.round(c.offRouteKm * 2 * 10) / 10,
          detourCostAUD,
          netSaveAUD,
          fillPct: Math.round((fillLitres / tankLitres) * 100),
        });
        fuel += fillLitres;
      }
    }
    fuel -= litresToNext;
  }

  const totalLitres = Math.round(totalKm / kmPerLitre);
  const totalFuelCostAUD = Math.round((totalLitres * (median / 100)) * 100) / 100;
  const detourCostAUD = Math.round(stops.reduce((a, s) => a + s.detourCostAUD, 0) * 100) / 100;
  const savedAUD = Math.round(stops.reduce((a, s) => a + s.netSaveAUD, 0) * 100) / 100;

  return {
    totalKm: Math.round(totalKm),
    totalLitres,
    totalFuelCostAUD,
    detourCostAUD,
    stops,
    rangeKm: Math.round(rangeKm),
    breakdown: [
      { label: 'Route distance', value: `${Math.round(totalKm)} km`, kind: 'info' },
      { label: 'Diesel used', value: `${totalLitres} L`, kind: 'info' },
      { label: 'Detour cost', value: `$${detourCostAUD.toFixed(2)}`, kind: 'cost' },
      { label: 'Estimated saving', value: `$${savedAUD.toFixed(2)}`, kind: 'save' },
    ],
  };
}
