// ─── Fuel Advisor: fill-now-or-wait panel ─────────────────────────────────
import { Clock3, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { PriceSignal } from '@/lib/prediction';

export function FuelAdvisor({ signal }: { signal: PriceSignal }) {
  if (signal.recommendation === 'no_data') {
    return (
      <div className="card p-4">
        <p className="text-sm font-bold text-slate-200">Fuel Advisor</p>
        <p className="mt-1 text-xs text-slate-400">{signal.rationale}</p>
      </div>
    );
  }

  const icon =
    signal.recommendation === 'wait' ? <TrendingDown className="h-4 w-4" aria-hidden />
    : signal.recommendation === 'fill_now' ? <TrendingUp className="h-4 w-4" aria-hidden />
    : <Minus className="h-4 w-4" aria-hidden />;

  const tone =
    signal.recommendation === 'wait' ? 'text-emerald-400'
    : signal.recommendation === 'fill_now' ? 'text-hi'
    : 'text-slate-200';

  const confidencePct = Math.round(signal.forecastConfidence * 100);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-lg bg-navy-lighter/60 px-2 py-1 ${tone}`}>
          {icon}
        </span>
        <p className="text-sm font-bold text-slate-100">{signal.recommendationLabel}</p>
      </div>
      <p className="mt-2 text-sm text-slate-300">{signal.rationale}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Now" value={`${signal.currentPerLitre} c/L`} />
        <Stat label="48h forecast" value={`${signal.predictedNext48h} c/L`} />
        <Stat label="Median" value={`${signal.medianPerLitre} c/L`} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-lighter/60">
          <div className="h-full rounded-full bg-hi" style={{ width: `${confidencePct}%` }} />
        </div>
        <span className="text-[11px] text-slate-400">conf {confidencePct}%</span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
        <Clock3 className="h-3 w-3" aria-hidden />
        Based on this station's price history + the diesel weekly cycle. A guide, not a guarantee — prices can move on market news.
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-navy-lighter/40 p-2.5">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-100">{value}</p>
    </div>
  );
}
