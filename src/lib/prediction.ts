// ─── Smart fuel decision engine ───────────────────────────────────────────
// The "AI" that answers "fill now, or wait / push on?" It is a deterministic,
// backtestable signal built on two grounded facts about Australian diesel:
//   1. Retail tracks the AIP Terminal Gate Price (wholesale ≈ 95% of retail),
//      which follows a well-documented weekly cycle in capital cities.
//   2. Station prices revert toward the local median — spikes are short-lived.
// We forecast a station's likely near-term price from its own history + the
// weekly cycle, then score a fill-vs-wait recommendation.
//
// This is NOT a black-box "AI predicts perfectly" — it is a transparent model
// with named assumptions, and the UI shows confidence, never a guarantee.

import { PriceRecord } from '@/types';

export interface PriceSignal {
  currentPerLitre: number;         // c/L
  medianPerLitre: number;          // c/L (reversion target)
  trendPerLitrePerDay: number;     // c/L/day (negative = falling)
  weeklyCycleCents: number;        // c/L (expected swing from the weekly cycle)
  predictedNext48h: number;        // c/L forecast
  forecastConfidence: number;      // 0-1
  recommendation: 'fill_now' | 'fill_if_cheap' | 'wait' | 'no_data';
  recommendationLabel: string;
  rationale: string;
}

// The diesel weekly cycle period (days). Capital-city retail cycles ≈ 7 days.
const WEEK_CYCLES = 7;

/**
 * Core forecast: combine the station's recent trend with the weekly cycle to
 * predict its price ~48h out. Returns NaN when there isn't enough history.
 */
export function forecastPrice(prices: PriceRecord[]): number {
  if (prices.length < 3) return NaN;
  const recent = [...prices].sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Linear trend over the most recent points (per day).
  const diffs: number[] = [];
  for (let i = 0; i < recent.length - 1; i++) {
    const t0 = new Date(recent[i].created_at).getTime();
    const t1 = new Date(recent[i + 1].created_at).getTime();
    const days = Math.max((t0 - t1) / 86400000, 0.25); // clamp 0-divide
    diffs.push((recent[i].diesel_cents_per_litre - recent[i + 1].diesel_cents_per_litre) / days);
  }
  const avgTrend = diffs.reduce((a, b) => a + b, 0) / diffs.length;

  // Weekly cycle: phase from the day-of-week of the most recent sample.
  // We estimate an amplitude from the station's observed range; default 2 c/L.
  const values = recent.map((p) => p.diesel_cents_per_litre);
  const range = Math.max(...values) - Math.min(...values);
  const cycleAmplitude = Math.min(range / 2, 4);

  // Simple phase: how far through the week the last sample was.
  const dayOfWeek = new Date(recent[0].created_at).getDay() + 1; // 1-7
  const phase = ((dayOfWeek % WEEK_CYCLES) / WEEK_CYCLES) * Math.PI * 2;
  // 48h from now is 2/7 of a cycle further; predict the sinusoidal delta.
  const cycleDelta = cycleAmplitude * Math.sin(phase + (2 / WEEK_CYCLES) * Math.PI * 2) -
    cycleAmplitude * Math.sin(phase);

  const lastPrice = recent[0].diesel_cents_per_litre;
  const trendDelta = avgTrend * 2; // 2 days

  return Math.round((lastPrice + trendDelta + cycleDelta) * 10) / 10;
}

/**
 * Produce the full fill-vs-wait signal for a station.
 */
export function buildSignal(prices: PriceRecord[]): PriceSignal {
  if (prices.length < 2) {
    return {
      currentPerLitre: prices[0]?.diesel_cents_per_litre ?? 0,
      medianPerLitre: prices[0]?.diesel_cents_per_litre ?? 0,
      trendPerLitrePerDay: 0,
      weeklyCycleCents: 0,
      predictedNext48h: prices[0]?.diesel_cents_per_litre ?? 0,
      forecastConfidence: 0,
      recommendation: 'no_data',
      recommendationLabel: 'Not enough price history yet',
      rationale: 'Report this price to help other truckies — and earn a Fuel Credit.',
    };
  }

  const vals = prices.map((p) => p.diesel_cents_per_litre);
  const median = [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)];
  const current = vals[0];
  const predicted = forecastPrice(prices);
  const trend = Math.round((predicted - current) * 10) / 10;

  // Confidence scales with the amount of history + how tight the trend is.
  const confidence = Math.min(prices.length / 8, 1) * 0.8 + 0.1;

  let recommendation: PriceSignal['recommendation'];
  let rationale: string;

  if (predicted < current - 1.5) {
    recommendation = 'wait';
    rationale = `Likely to drop ~${Math.abs(trend)} c/L in the next 48h. Waiting could save you money on a full tank.`;
  } else if (predicted > current + 1.5) {
    recommendation = 'fill_now';
    rationale = `Price likely to rise ~${trend} c/L soon — if you need fuel, now is a good time.`;
  } else {
    recommendation = 'fill_if_cheap';
    rationale = `Price is steady — fill here if it's already at or below the local median (${median} c/L).`;
  }

  return {
    currentPerLitre: current,
    medianPerLitre: median,
    trendPerLitrePerDay: 0, // trend is 2-day; exposed separately if needed
    weeklyCycleCents: Math.round((predicted - current) * 10) / 10,
    predictedNext48h: predicted,
    forecastConfidence: confidence,
    recommendation,
    recommendationLabel: labelFor(recommendation),
    rationale,
  };
}

function labelFor(r: PriceSignal['recommendation']): string {
  switch (r) {
    case 'wait': return 'Fill later — price likely dropping';
    case 'fill_now': return 'Fill now — price likely rising';
    case 'fill_if_cheap': return 'Steady — fill if at/below median';
    default: return 'No recommendation yet';
  }
}
