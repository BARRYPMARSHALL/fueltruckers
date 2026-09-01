// ─── Trip Planner: fill your whole route, not just the next stop ─────────
import { useMemo, useState } from 'react';
import { ArrowLeft, Route, MapPin, Fuel, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStations, useMedianPrice } from '@/hooks/useStations';
import { useAuth } from '@/hooks/useAuth';
import { planTrip, RoutePoint } from '@/lib/tripPlanner';
import { centsPerLitreToDollars } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';

// Common Australian long-haul fuel corridor endpoints (truckie landmarks).
const CORRIDORS: Array<{ name: string; origin: RoutePoint; dest: RoutePoint }> = [
  { name: 'Sydney → Brisbane (Pacific Hwy)', origin: { name: 'Sydney', lat: -33.8688, lng: 151.2093 }, dest: { name: 'Brisbane', lat: -27.4698, lng: 153.0251 } },
  { name: 'Sydney → Melbourne (Hume Hwy)', origin: { name: 'Sydney', lat: -33.8688, lng: 151.2093 }, dest: { name: 'Melbourne', lat: -37.8136, lng: 144.9631 } },
  { name: 'Melbourne → Adelaide (Western Hwy)', origin: { name: 'Melbourne', lat: -37.8136, lng: 144.9631 }, dest: { name: 'Adelaide', lat: -34.9285, lng: 138.6007 } },
  { name: 'Brisbane → Cairns (Bruce Hwy)', origin: { name: 'Brisbane', lat: -27.4698, lng: 153.0251 }, dest: { name: 'Cairns', lat: -16.9186, lng: 145.7781 } },
  { name: 'Adelaide → Perth (Eyre Hwy)', origin: { name: 'Adelaide', lat: -34.9285, lng: 138.6007 }, dest: { name: 'Perth', lat: -31.9505, lng: 115.8605 } },
];

export function TripPlannerPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: stations } = useStations();
  const { data: median } = useMedianPrice();
  const [corridorIdx, setCorridorIdx] = useState(0);
  const [tankLitres, setTankLitres] = useState(profile?.tank_litres ?? 1000);
  const [detourBudget, setDetourBudget] = useState(8);

  const corridor = CORRIDORS[corridorIdx];
  const plan = useMemo(() => {
    if (!stations?.length || !corridor) return null;
    return planTrip(
      {
        origin: corridor.origin,
        destination: corridor.dest,
        tankLitres,
        detourBudgetKm: detourBudget,
      },
      stations,
    );
  }, [stations, corridor, tankLitres, detourBudget]);

  return (
    <div className="min-h-screen bg-navy pb-safe">
      <header className="sticky top-0 z-30 bg-navy/90 backdrop-blur border-b border-white/10 p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="btn-ghost -ml-1" aria-label="Back to map">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Trip fuel planner</h1>
            <p className="text-xs text-slate-400">Fill the whole run, not just the next stop</p>
          </div>
        </div>
      </header>

      <main className="space-y-4 p-4">
        {/* corridor picker */}
        <section className="card p-4">
          <p className="mb-2 text-sm font-bold text-slate-200">Route</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CORRIDORS.map((c, i) => (
              <button
                key={c.name}
                onClick={() => setCorridorIdx(i)}
                className={`chip whitespace-nowrap ${i === corridorIdx ? 'chip-active' : 'chip-inactive'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
            <Route className="h-4 w-4 text-hi" aria-hidden />
            {corridor.origin.name} → {corridor.dest.name}
          </div>
        </section>

        {/* inputs */}
        <section className="card p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="tank">Tank (L)</label>
            <input id="tank" type="number" className="input" value={tankLitres} onChange={(e) => setTankLitres(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="detour">Detour budget (km)</label>
            <input id="detour" type="number" className="input" value={detourBudget} onChange={(e) => setDetourBudget(Number(e.target.value))} />
          </div>
        </section>

        {/* result */}
        {plan ? (
          <>
            {/* summary */}
            <section className="card p-4">
              <div className="grid grid-cols-2 gap-3">
                {plan.breakdown.map((b) => (
                  <div key={b.label} className="rounded-xl bg-navy-lighter/40 p-3">
                    <p className="text-[11px] uppercase text-slate-500">{b.label}</p>
                    <p className={`text-lg font-bold ${b.kind === 'save' ? 'text-emerald-400' : b.kind === 'cost' ? 'text-red-400' : 'text-slate-100'}`}>
                      {b.value}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Median diesel {median ? centsPerLitreToDollars(median) : '—'}/L · range {plan.rangeKm.toLocaleString()} km per tank
              </p>
            </section>

            {/* stops */}
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-bold text-slate-200">Recommended fill stops</h2>
              {plan.stops.length === 0 ? (
                <EmptyState message="No worthwhile stops within the detour budget — pushing straight through is cheapest." />
              ) : (
                <ol className="space-y-3">
                  {plan.stops.map((s, i) => (
                    <li key={s.station.id} className="rounded-xl bg-navy-lighter/40 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-100">
                          <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-hi text-xs font-bold text-navy">{i + 1}</span>
                          {s.station.name}
                        </p>
                        <span className="text-sm font-extrabold text-hi">{centsPerLitreToDollars(s.station.price ?? 0)}/L</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1"><Fuel className="h-3 w-3" aria-hidden /> {s.fillLitres} L</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden /> {s.detourKm} km off</span>
                        <span className={s.netSaveAUD > 0 ? 'text-emerald-400' : 'text-slate-400'}>
                          <Save className="inline h-3 w-3" /> {s.netSaveAUD > 0 ? `saves $${s.netSaveAUD.toFixed(2)}` : 'no saving'}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-lighter/60">
                        <div className="h-full rounded-full bg-hi" style={{ width: `${s.fillPct}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        ) : (
          <EmptyState message="Load stations to plan your run." />
        )}
      </main>
    </div>
  );
}
