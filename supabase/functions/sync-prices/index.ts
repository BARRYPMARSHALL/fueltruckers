// FuelTruckers — live fuel-price feed ingestion Edge Function
// Deploy:
//   supabase functions deploy sync-prices
// Secrets (Supabase → Functions → Secrets):
//   NSW_FUELCHECK_KEY + NSW_FUELCHECK_SECRET   (free, register at api.nsw.gov.au)
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY   (auto-injected)
//
// Pulls live retail diesel prices from the NSW FuelCheck API (free, after
// registering an API key at https://api.nsw.gov.au/Product/Index/22) and
// upserts them into `stations` + `prices`. Run on a cron (e.g. every 30-60 min).
//
// Honest note: NSW FuelCheck covers ~2,500 NSW stations. For national coverage
// add WA FuelWatch (fuelwatch.wa.gov.au) and, for a single paid key, CheckPetrol.
// AIP Terminal Gate Price is a free wholesale baseline for the prediction layer.

import { createClient } from 'npm:@supabase/supabase-js@2';

const WEBHOOK_AUTH_HEADERS = {
  'Authorization': `Basic ${btoa(`${Deno.env.get('NSW_FUELCHECK_KEY')}:${Deno.env.get('NSW_FUELCHECK_SECRET')}`)}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Map the NSW reference data fuel name to our diesel row.
function isDiesel(record: any): boolean {
  const brand = String(record?.fuel_type ?? record?.fuelId ?? '').toLowerCase();
  return brand === 'diesel' || brand.includes('diesel');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // ── 1. Fetch reference data (NSW base URL from the API doc) ──
  // The live endpoint bases are:
  //   reference: https://api.onegov.nsw.gov.au/FuelCheck/1.0.0/ReferenceData
  //   stations:  https://api.onegov.nsw.gov.au/FuelCheck/1.0.0/Stations
  const NSW_BASE = Deno.env.get('NSW_FUELCHECK_BASE') ?? 'https://api.onegov.nsw.gov.au/FuelCheck/1.0.0';

  let refData: any[] = [];
  try {
    const res = await fetch(`${NSW_BASE}/ReferenceData`, { headers: WEBHOOK_AUTH_HEADERS });
    if (!res.ok) throw new Error(`ReferenceData HTTP ${res.status}: ${await res.text()}`);
    refData = (await res.json()).data ?? [];
  } catch (e) {
    return new Response(JSON.stringify({ error: `reference failed: ${(e as Error).message}` }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Build a lookup: station id -> { lat, lng, name, address, state }
  const stationMap = new Map<string, any>();
  for (const s of refData) {
    // ReferenceData carries station coordinates/identity; fooEntries carry prices.
    if (s.stationId && (s.lat || s.latitude)) {
      stationMap.set(s.stationId, {
        name: s.siteName ?? s.stationName ?? 'NSW Station',
        lat: +(s.lat ?? s.latitude),
        lng: +(s.lng ?? s.longitude),
        address: s.address ?? '',
        state: 'NSW',
      });
    }
  }

  // ── 2. Fetch prices ──
  let priceRecords: any[] = [];
  try {
    const res = await fetch(`${NSW_BASE}/Stations`, { headers: WEBHOOK_AUTH_HEADERS });
    if (!res.ok) throw new Error(`Stations HTTP ${res.status}: ${await res.text()}`);
    priceRecords = (await res.json()).data ?? [];
  } catch (e) {
    return new Response(JSON.stringify({ error: `prices failed: ${(e as Error).message}` }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // ── 3. Filter to diesel and upsert ──
  let stationsUpserted = 0;
  let pricesUpserted = 0;
  const now = new Date().toISOString();

  for (const rec of priceRecords) {
    if (!isDiesel(rec)) continue;
    const price = rec.price ?? rec.diesel_price ?? rec.pricePerLitre;
    if (!price || typeof price !== 'number') continue;

    const stationId = rec.stationId ?? rec.siteId;
    const meta = stationMap.get(stationId) ?? {};

    // deterministic station id — hash the NSW station id (or a slug from coords)
    const id = crypto.subtle ? await deterministicId(String(stationId ?? `${meta.lat},${meta.lng}`)) : String(stationId);

    const { error: stationErr } = await sb.from('stations').upsert(
      {
        id,
        name: rec.siteName ?? meta.name ?? 'NSW Fuel Station',
        brand: rec.brand ?? null,
        lat: meta.lat ?? rec.lat,
        lng: meta.lng ?? rec.lng,
        address: meta.address ?? rec.address ?? '',
        state: 'NSW',
        amenities: { fuelPayAtPump: true, wc: true },
        last_verified: now,
      },
      { onConflict: 'id' },
    );
    if (!stationErr) stationsUpserted++;

    const { error: priceErr } = await sb.from('prices').insert({
      station_id: id,
      diesel_cents_per_litre: Math.round(price * 100), // dollars -> cents/L
      is_verified: true,
      created_at: now,
    });
    if (!priceErr) pricesUpserted++;
  }

  return new Response(JSON.stringify({ ok: true, stationsUpserted, pricesUpserted, at: now }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
  });
});

// Deterministic v5-style id from a string (so upserts are stable).
async function deterministicId(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`fueltruckers/${input}`));
  const bytes = new Uint8Array(digest);
  // RFC4122 v4-ish from the hash, but stable per input
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = [...bytes.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
