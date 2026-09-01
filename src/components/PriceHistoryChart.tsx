// ─── Simple SVG sparkline for price history ───────────────────────────────
import { PriceRecord } from '@/types';
import { shortDate } from '@/lib/utils';

export function PriceHistoryChart({ prices }: { prices: PriceRecord[] }) {
  if (!prices.length) return null;

  // newest-first; reverse to oldest-first for the line
  const pts = [...prices].reverse();
  const values = pts.map((p) => p.diesel_cents_per_litre);
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const W = 320;
  const H = 90;
  const pad = 6;

  const x = (i: number) =>
    pad + (i / Math.max(pts.length - 1, 1)) * (W - pad * 2);
  const y = (v: number) =>
    H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.diesel_cents_per_litre).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;

  const cheapest = pts.reduce((a, b) => (a.diesel_cents_per_litre <= b.diesel_cents_per_litre ? a : b));
  const cheapestIdx = pts.indexOf(cheapest);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Diesel price trend">
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#priceFill)" />
        <path d={line} fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* cheapest point */}
        <circle cx={x(cheapestIdx)} cy={y(cheapest.diesel_cents_per_litre)} r="4" fill="#10B981" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500">
        <span>{shortDate(pts[0].created_at)}</span>
        <span className="font-semibold text-emerald-400">
          Low {cheapest.diesel_cents_per_litre} c/L
        </span>
        <span>{shortDate(pts[pts.length - 1].created_at)}</span>
      </div>
    </div>
  );
}
