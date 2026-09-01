// FuelTruckers — server-side price-board OCR (Supabase Edge Function)
// Deploy:
//   supabase functions deploy ocr-price
//
// The driver snaps a photo of the diesel price board on their phone, uploads
// it here, and we run Tesseract OCR server-side (so the client doesn't ship a
// heavy WASM + model to a work phone). Returns the best diesel price candidate
// + a sanity check against the plausible Australian range.
//
// Client sends:  { image: <dataURL or base64>, stationId?: string }
// Returns:       { ok, priceCentsPerLitre?, confidence?, needsConfirm?, rawText?, error? }
//
// Note: server-side OCR needs a Tesseract WASM bundle in the Edge Function's
// import map. Use the Supabase OCR template or bundle tesseract.js. If you
// can't load it (Free tier cold starts), the client can fall back to the
// in-app tesseract.js — see src/lib/snap.ts. This function is the preferred
// path for real phones.

import { createWorker } from 'npm:tesseract.js@6';

const DIESEL_CENT_MIN = 120;
const DIESEL_CENT_MAX = 260;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid JSON body' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const image = body.image;
  if (!image) {
    return new Response(JSON.stringify({ ok: false, error: 'no image provided' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const worker = await createWorker('eng', 1, { logger: () => {} });
    const { data } = await worker.recognize(image);
    await worker.terminate();

    const raw = data.text ?? '';
    const matches = raw.match(/\d{1,3}(?:[.,]\d{1,2})?/g) ?? [];
    const candidates = matches
      .map((m) => parseFloat(m.replace(',', '.')))
      .filter((n) => n >= DIESEL_CENT_MIN && n <= DIESEL_CENT_MAX);
    const plausible = candidates.filter((n) => n >= 160 && n <= 220);
    let best = plausible[0] ?? candidates[0] ?? null;

    if (best === null) {
      return new Response(JSON.stringify({ ok: false, error: "Couldn't read the price", rawText: raw.slice(0, 200) }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const priceCents = best < DIESEL_CENT_MIN ? Math.round(best * 100) : Math.round(best);
    const needsConfirm = !(priceCents >= 160 && priceCents <= 220);

    return new Response(JSON.stringify({
      ok: true,
      priceCentsPerLitre: priceCents,
      confidence: needsConfirm ? 0.5 : 0.85,
      needsConfirm,
      rawText: raw.trim().slice(0, 400),
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: `OCR failed: ${(e as Error).message}` }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
