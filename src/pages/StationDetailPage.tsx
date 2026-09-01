// ─── Station detail page ──────────────────────────────────────────────────
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft, Navigation, Download, Star, Check,
} from 'lucide-react';
import { useStations, usePriceHistory, useReviews, useMedianPrice } from '@/hooks/useStations';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';
import { PriceForm, AmenityForm } from '@/components/SubmissionForm';
import { centsPerLitreToDollars, formatKm, lastVerifiedLabel, priceColor } from '@/lib/utils';
import { AMENITY_LABELS, Amenities } from '@/types';

type Tab = 'overview' | 'submit';

export function StationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const { data: stations } = useStations();
  const { data: prices } = usePriceHistory(id ?? null);
  const { data: reviews } = useReviews(id ?? null);
  const { data: median } = useMedianPrice();
  const [downloading, setDownloading] = useState(false);

  const station = stations?.find((s) => s.id === id);
  if (!station) {
    return (
      <div className="min-h-screen bg-navy p-4">
        <p className="text-slate-400">Loading station…</p>
        <Link to="/" className="text-hi">Back to map</Link>
      </div>
    );
  }

  const price = station.price ?? 0;
  const savingsVsMedian = median ? Math.round((median - price) * 10) / 10 : null;

  const openDirections = () => {
    const url = `https://www.openstreetmap.org/directions?to=${station.lat}%2C${station.lng}&route=car`;
    window.open(url, '_blank', 'noopener');
  };

  const downloadInfo = () => {
    setDownloading(true);
    const blob = new Blob([buildStationText(station, prices ?? [], reviews ?? [])], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${station.name.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    setDownloading(false);
  };

  return (
    <div className="min-h-screen bg-navy pb-safe">
      {/* header */}
      <header className="sticky top-0 z-30 bg-navy/90 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-2 p-3">
          <button onClick={() => navigate('/')} className="btn-ghost -ml-1" aria-label="Back">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-white">{station.name}</h1>
            <p className="text-xs text-slate-400">{station.brand}</p>
          </div>
          <span className={`text-xl font-extrabold ${priceColor(price)}`}>{centsPerLitreToDollars(price)}/L</span>
        </div>
        {/* tabs */}
        <div className="flex gap-1 px-3 pb-2">
          <TabToggle active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabToggle>
          <TabToggle active={tab === 'submit'} onClick={() => setTab('submit')}>Submit update</TabToggle>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {tab === 'overview' ? (
          <>
            {/* key metrics */}
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Distance" value={formatKm(station.distanceKm ?? 0)} />
              <Metric label="Truck score" value={`${station.truckFriendlyScore}/100`} />
              <Metric label="Last verified" value={lastVerifiedLabel(station.lastVerified)} />
              <Metric
                label="vs median"
                value={savingsVsMedian === null ? '—' : `${savingsVsMedian > 0 ? '+' : ''}${savingsVsMedian} c/L`}
                tone={savingsVsMedian !== null && savingsVsMedian > 0 ? 'save' : 'cost'}
              />
            </div>

            {/* price history */}
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-bold text-slate-200">Price history</h2>
              <PriceHistoryChart prices={prices ?? []} />
            </section>

            {/* amenities checklist */}
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-bold text-slate-200">Amenities</h2>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(AMENITY_LABELS) as Array<keyof Amenities>).map((key) => {
                  const has = station.amenities[key];
                  return (
                    <div key={key} className={`flex items-center justify-between rounded-xl p-2.5 text-sm ${has ? 'bg-emerald-500/10 text-slate-100' : 'bg-navy-lighter/40 text-slate-500'}`}>
                      <span>{AMENITY_LABELS[key]}</span>
                      {has ? <Check className="h-4 w-4 text-emerald-400" aria-hidden /> : <span className="text-xs">—</span>}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* reviews */}
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-bold text-slate-200">Driver reviews</h2>
              {reviews?.length ? (
                reviews.map((r) => (
                  <div key={r.id} className="mb-3 border-b border-white/5 pb-3 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">Driver</span>
                      <span className="inline-flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'text-hi' : 'text-slate-600'}`} fill="currentColor" aria-hidden />
                        ))}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{r.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No reviews yet — be the first to report.</p>
              )}
            </section>

            {/* actions */}
            <button onClick={openDirections} className="btn-primary w-full">
              <Navigation className="h-4 w-4" aria-hidden /> Navigate
            </button>
            <button onClick={downloadInfo} disabled={downloading} className="btn-outline w-full">
              <Download className="h-4 w-4" aria-hidden /> Download station info
            </button>
          </>
        ) : (
          <>
            <section className="card p-4">
              <h2 className="mb-1 text-sm font-bold text-slate-200">Report a price read</h2>
              <p className="mb-3 text-xs text-slate-400">Earn 50¢ Fuel Credit per verified submission.</p>
              <PriceForm stationId={station.id} currentPrice={price} />
            </section>
            <section className="card p-4">
              <h2 className="mb-1 text-sm font-bold text-slate-200">Update amenities</h2>
              <p className="mb-3 text-xs text-slate-400">Toggle what's here — helps other truckies.</p>
              <AmenityForm stationId={station.id} amenities={station.amenities} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function TabToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${active ? 'bg-hi text-navy' : 'text-slate-400 hover:text-slate-200'}`}
    >
      {children}
    </button>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'save' | 'cost' }) {
  const color = tone === 'save' ? 'text-emerald-400' : tone === 'cost' ? 'text-red-400' : 'text-slate-100';
  return (
    <div className="card p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function buildStationText(station: any, prices: any[], reviews: any[]): string {
  const lines = [
    `FuelTruckers — ${station.name}`,
    `${station.brand} · ${station.address}, ${station.state}`,
    `Diesel: ${centsPerLitreToDollars(station.price ?? 0)}/L (${station.price ?? 0} c/L)`,
    `Truck score: ${station.truckFriendlyScore}/100`,
    `Last verified: ${lastVerifiedLabel(station.lastVerified)}`,
    '',
    'Amenities:',
    ...(Object.keys(AMENITY_LABELS) as Array<keyof Amenities>)
      .filter((k) => station.amenities[k])
      .map((k) => `  • ${AMENITY_LABELS[k]}`),
    '',
    'Price history (c/L):',
    ...prices.map((p) => `  ${p.diesel_cents_per_litre} c/L (${lastVerifiedLabel(p.created_at)})`),
    '',
    'Reviews:',
    ...reviews.map((r) => `  ${r.rating}★ ${r.comment}`),
  ];
  return lines.join('\n');
}
