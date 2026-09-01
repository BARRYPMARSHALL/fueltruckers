// FuelTruckers — multi-state live fuel-price feed (Supabase Edge Function)
//
// Every state/territory now publishes official retail fuel prices, but each is
// a SEPARATE government source with its OWN free registration. This function
// is a pluggable multi-source feeder: each state has an adapter that activates
// when its credentials are set. No scraping — real government data.
//
//   NSW (+ ACT + TAS)  FuelCheck API      free key @ api.nsw.gov.au
//   VIC                Servo Saver / Fair Fuel Open Data API   free key @ data.vic.gov.au
//   QLD                fuelpricesqld API / data.qld.gov.au CSV  free sign-up
//   WA                 FuelWatch (historic data.wa.gov.au)      free, public
//
// Deploy:
//   supabase functions deploy sync-prices
//   supabase secrets set \
//     NSW_FUELCHECK_KEY=... NSW_FUELCHECK_SECRET=... \
//     VIC_FAIRFUEL_KEY=... \
//     QLD_KEY=... \
//     SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
//
// Run on a cron every 30–60 min. Optional single-key national connector:
//   CHECKPETROL_KEY=...   (CheckPetrol / fuelprice.io — one key, ~9,700 stations)

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// A normalised feed row that all adapters emit.
interface FeedRow {
  stationId: string;          // stable external id
  name: string;
  brand: string | null;
  lat: number;
  lng: number;
  address: string;
  state: string;              // 'NSW' | 'ACT' | 'TAS' | 'VIC' | 'QLD' | 'WA'
  dieselCentsPerLitre: number | null;   // null if diesel not reported this cycle
  updatedAt: string;
}

type Adapter = (env: Record<string, string | undefined>) => Promise<FeedRow[]>;

// ── NSW FuelCheck API (also serves ACT + TAS via API v2) ────────────────
const nswAdapter: Adapter = async (env) => {
  const key = env.NSW_FUELCHECK_KEY;
  const secret = env.NSW_FUELCHECK_SECRET;
  if (!key || !secret) return [];
  const base = env.NSW_FUELCHECK_BASE ?? 'https://api.onegov.nsw.gov.au/FuelCheck/1.0.0';
  const headers = {
    'Authorization': `Basic ${btoa(`${key}:${secret}`)}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  const refRes = await fetch(`${base}/ReferenceData`, { headers });
  if (!refRes.ok) throw new Error(`NSW ReferenceData ${refRes.status}`);
  const stationMap = new Map<string, any>();
  for (const s of (await refRes.json()).data ?? []) {
    if (s.stationId && (s.lat || s.latitude)) {
      stationMap.set(s.stationId, {
        name: s.siteName ?? s.stationName ?? 'NSW Station',
        lat: +(s.lat ?? s.latitude),
        lng: +(s.lng ?? s.longitude),
        address: s.address ?? '',
      });
    }
  }
  const pricesRes = await fetch(`${base}/Stations`, { headers });
  if (!pricesRes.ok) throw new Error(`NSW Stations ${pricesRes.status}`);
  const rows: FeedRow[] = [];
  for (const rec of (await pricesRes.json()).data ?? []) {
    const fuel = String(rec.fuel_type ?? rec.fuelId ?? '').toLowerCase();
    if (fuel !== 'diesel' && !fuel.includes('diesel')) continue;
    const price = rec.price ?? rec.diesel_price;
    if (!price || typeof price !== 'number') continue;
    const meta = stationMap.get(rec.stationId ?? rec.siteId) ?? {};
    rows.push({
      stationId: String(rec.stationId ?? rec.siteId ?? `${meta.lat},${meta.lng}`),
      name: rec.siteName ?? meta.name ?? 'NSW Fuel Station',
      brand: rec.brand ?? null,
      lat: meta.lat ?? rec.lat, lng: meta.lng ?? rec.lng,
      address: meta.address ?? rec.address ?? '',
      state: meta.state ?? 'NSW',
      dieselCentsPerLitre: Math.round(price * 100),
      updatedAt: new Date().toISOString(),
    });
  }
  return rows;
};

// ── VIC Servo Saver / Fair Fuel Open Data API ───────────────────────────
// Endpoint + key format per Service Victoria docs (data.vic.gov.au).
const vicAdapter: Adapter = async (env) => {
  const key = env.VIC_FAIRFUEL_KEY;
  if (!key) return [];
  const base = env.VIC_FAIRFUEL_BASE ?? 'https://api.vic.gov.au/fairfuel/v1';
  const res = await fetch(`${base}/stations`, {
    headers: { 'X-Api-Key': key, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`VIC FairFuel ${res.status}`);
  const data = (await res.json()).stations ?? (await res.json());
  const rows: FeedRow[] = [];
  for (const s of data ?? []) {
    const fuel = s.fuelType ?? s.fuel_type ?? '';
    if (String(fuel).toLowerCase() !== 'diesel' && !String(fuel).toLowerCase().includes('diesel')) continue;
    rows.push({
      stationId: String(s.stationId ?? s.id),
      name: s.siteName ?? s.name ?? 'VIC Station',
      brand: s.brand ?? null,
      lat: +(s.lat ?? s.latitude), lng: +(s.lng ?? s.longitude),
      address: s.address ?? '',
      state: 'VIC',
      dieselCentsPerLitre: s.price ? Math.round(Number(s.price) * 100) : null,
      updatedAt: new Date().toISOString(),
    });
  }
  return rows;
};

// ── QLD fuelprice API (fuelpricesqld.com.au) ────────────────────────────
// Free after signing up (data.qld.gov.au). JSON via the publisher API.
const qldAdapter: Adapter = async (env) => {
  const key = env.QLD_KEY;
  if (!key) return [];
  // QLD publisher API returns JSON. Base host per their SwaggerUI.
  const base = env.QLD_BASE ?? 'https://api-prodau-app.azurewebsites.net';
  const res = await fetch(`${base}/fuelprices`, {
    headers: { 'X-Api-Key': key, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`QLD fuelprice ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.data ?? data.fuelPrices ?? [];
  const rows: FeedRow[] = [];
  for (const r of list ?? []) {
    const fuel = String(r.fuelType ?? r.fuel_type ?? r.fuel ?? '').toLowerCase();
    if (fuel !== 'diesel' && !fuel.includes('diesel')) continue;
    rows.push({
      stationId: String(r.stationId ?? r.id ?? r.siteId),
      name: r.siteName ?? r.name ?? r.site ?? 'QLD Station',
      brand: r.brand ?? r.siteBrand ?? null,
      lat: +(r.lat ?? r.latitude ?? r.SiteLatitude), lng: +(r.lng ?? r.longitude ?? r.SiteLongitude),
      address: r.address ?? r.siteAddress ?? '',
      state: 'QLD',
      dieselCentsPerLitre: r.price ? Math.round(Number(r.price) * 100) : null,
      updatedAt: new Date().toISOString(),
    });
  }
  return rows;
};

// ── WA FuelWatch (historic daily data, data.wa.gov.au) ───────────────────
// Public, no key. Reads the latest daily dataset CSV and filters diesel.
const waAdapter: Adapter = async (_env) => {
  const res = await fetch('https://catalogue.data.wa.gov.au/api/3/action/package_show?id=fuelwatch-historic-fuel-prices', {
    headers: { 'User-Agent': 'FuelTruckers/1.0' },
  });
  if (!res.ok) throw new Error(`WA dataset ${res.status}`);
  const pkg = (await res.json()).result;
  const latest = pkg.resources?.find((r: any) => r.format === 'CSV') ?? pkg.resources?.[0];
  if (!latest?.url) return [];
  const csvRes = await fetch(latest.url, { headers: { 'User-Agent': 'FuelTruckers/1.0' } });
  const text = await csvRes.text();
  // CSV is weekly-per-day; parse rows to diesel + station coords.
  const rows: FeedRow[] = [];
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
  const iStation = header.indexOf('station');
  const iFuel = header.indexOf('fuel');
  const iPrice = header.indexOf('price');
  const iLat = header.indexOf('latitude') >= 0 ? header.indexOf('latitude') : header.indexOf('lat');
  const iLng = header.indexOf('longitude') >= 0 ? header.indexOf('longitude') : header.indexOf('long');
  const iName = header.indexOf('tradingname') >= 0 ? header.indexOf('tradingname') : iStation;
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const fuel = (cols[iFuel] ?? '').toLowerCase();
    if (fuel !== 'diesel' && !fuel.includes('diesel')) continue;
    const price = cols[iPrice] ? Number(cols[iPrice]) : NaN;
    if (isNaN(price)) continue;
    rows.push({
      stationId: cols[iStation] ?? `${cols[iLat]},${cols[iLng]}`,
      name: cols[iName] ?? 'WA Station',
      brand: cols[header.indexOf('brand')] ?? null,
      lat: Number(cols[iLat]) || 0, lng: Number(cols[iLng]) || 0,
      address: cols[header.indexOf('address')] ?? '',
      state: 'WA',
      dieselCentsPerLitre: Math.round(price * 100) || Math.round(price),
      updatedAt: (cols[header.indexOf('date')] ?? new Date().toISOString()),
    });
  }
  return rows;
};

// ── Options: single-key national connector via CheckPetrol/FuelPrice ─────
const checkPetrolAdapter: Adapter = async (env) => {
  const key = env.CHECKPETROL_KEY;
  if (!key) return [];
  const base = env.CHECKPETROL_BASE ?? 'https://api.checkpetrol.com.au/v1';
  const res = await fetch(`${base}/stations`, {
    headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`CheckPetrol ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.stations ?? data.data ?? [];
  const rows: FeedRow[] = [];
  for (const r of list ?? []) {
    const fuel = String(r.fuel_type ?? r.fuelType ?? '').toLowerCase();
    if (fuel !== 'diesel' && !fuel.includes('diesel')) continue;
    rows.push({
      stationId: String(r.id ?? r.station_id),
      name: r.name ?? r.siteName ?? 'Station',
      brand: r.brand ?? null,
      lat: +(r.lat ?? r.latitude), lng: +(r.lng ?? r.longitude),
      address: r.address ?? '',
      state: (r.state ?? 'NSW').toString(),
      dieselCentsPerLitre: r.price ? Math.round(Number(r.price) * 100) : null,
      updatedAt: new Date().toISOString(),
    });
  }
  return rows;
};

const ADAPTERS: Array<{ name: string; adapter: Adapter }> = [
  { name: 'checkpetrol', adapter: checkPetrolAdapter },
  { name: 'nsw-act-tas', adapter: nswAdapter },
  { name: 'vic', adapter: vicAdapter },
  { name: 'qld', adapter: qldAdapter },
  { name: 'wa', adapter: waAdapter },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const results: Record<string, { stations: number; prices: number; error?: string }> = {};
  const now = new Date().toISOString();

  for (const { name, adapter } of ADAPTERS) {
    try {
      const rows = (await adapter(Deno.env as any)).filter((r) => r.dieselCentsPerLitre != null);
      let stations = 0;
      let prices = 0;
      for (const r of rows) {
        const id = await deterministicId(r.stationId);
        const { error: stationErr } = await sb.from('stations').upsert(
          {
            id,
            name: r.name,
            brand: r.brand ?? null,
            lat: r.lat ?? 0,
            lng: r.lng ?? 0,
            address: r.address ?? '',
            state: r.state,
            amenities: { fuelPayAtPump: true, wc: true },
            last_verified: now,
          },
          { onConflict: 'id' },
        );
        if (!stationErr) stations++;
        const { error: priceErr } = await sb.from('prices').insert({
          station_id: id,
          diesel_cents_per_litre: r.dieselCentsPerLitre,
          is_verified: true,
          created_at: now,
        });
        if (!priceErr) prices++;
      }
      results[name] = { stations, prices };
    } catch (e) {
      results[name] = { stations: 0, prices: 0, error: (e as Error).message };
    }
  }

  return new Response(JSON.stringify({ ok: true, at: now, results }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
  });
});

// Deterministic v5-style id from a string (stable upserts across runs).
async function deterministicId(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`fueltruckers/${input}`));
  const bytes = new Uint8Array(digest);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
