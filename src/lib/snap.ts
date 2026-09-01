// ─── Price-snap: camera + OCR + verification ──────────────────────────────
// The core "contribute with one tap" flow. A trucker snaps the price board,
// we OCR the digits, cross-check against the known price range / state feed,
// and return a confident price (or ask for a confirm). Reward = instant credit.
//
// OCR strategy: prefer the SERVER-side Edge Function (supabase/functions/
// ocr-price) so the driver's phone doesn't ship the heavy Tesseract WASM.
// Falls back to in-app tesseract.js when the Function is unreachable.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

export interface SnapResult {
  ok: boolean;
  priceCentsPerLitre?: number;   // OCR-extracted
  confidence?: number;           // 0-1
  message: string;
  needsConfirm?: boolean;        // low confidence / out of range → ask human
  rawText?: string;
}

// Typical Australian diesel range (c/L) as a sanity bound. Reported prices
// outside this are almost certainly misreads.
const DIESEL_CENT_MIN = 120;
const DIESEL_CENT_MAX = 260;

/** Server-side OCR via the Supabase Edge Function (preferred). */
async function ocrServer(dataUrl: string): Promise<SnapResult> {
  const fnBase = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1` : '';
  if (!fnBase) return { ok: false, message: 'no supabase url' };
  const res = await fetch(`${fnBase}/ocr-price`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
    },
    body: JSON.stringify({ image: dataUrl }),
  });
  if (!res.ok) throw new Error(`ocr-price HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) return { ok: false, message: data.error ?? 'OCR failed', rawText: data.rawText };
  return {
    ok: true,
    priceCentsPerLitre: data.priceCentsPerLitre,
    confidence: data.confidence,
    needsConfirm: data.needsConfirm,
    message: data.needsConfirm
      ? `Read ${data.priceCentsPerLitre} c/L — confirm it looks right?`
      : `Read ${data.priceCentsPerLitre} c/L`,
    rawText: data.rawText,
  };
}

/**
 * Run OCR on a screenshot/camera image of a fuel price board and return the
 * best candidate diesel price. Tries the server function first, then the
 * in-app WASM OCR.
 */
export async function snapPriceFromImage(dataUrl: string): Promise<SnapResult> {
  // 1) Server-side (preferred — fast, no WASM on the client).
  try {
    const server = await ocrServer(dataUrl);
    if (server.ok) return server;
  } catch {
    // fall through to in-app OCR
  }

  // 2) In-app fallback.
  let raw = '';
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, { logger: () => {} });
    const { data } = await worker.recognize(dataUrl);
    raw = data.text ?? '';
    await worker.terminate();
  } catch (e) {
    return { ok: false, message: `OCR failed: ${(e as Error).message}` };
  }

  // Pull all decimal numbers out of the OCR text.
  const matches = raw.match(/\d{1,3}(?:[.,]\d{1,2})?/g) ?? [];
  const candidates = matches
    .map((m) => parseFloat(m.replace(',', '.')))
    .filter((n) => n >= DIESEL_CENT_MIN && n <= DIESEL_CENT_MAX);

  const plausible = candidates.filter((n) => n >= 160 && n <= 220);
  const best = plausible[0] ?? candidates[0] ?? null;

  if (best === null) {
    return { ok: false, message: "Couldn't read the price. Try a clearer photo.", rawText: raw };
  }

  const priceCents = best < DIESEL_CENT_MIN ? Math.round(best * 100) : Math.round(best);
  const needsConfirm = !(priceCents >= 160 && priceCents <= 220);

  return {
    ok: true,
    priceCentsPerLitre: priceCents,
    confidence: needsConfirm ? 0.5 : 0.85,
    needsConfirm,
    message: needsConfirm
      ? `Read ${priceCents} c/L — confirm it looks right?`
      : `Read ${priceCents} c/L`,
    rawText: raw.trim(),
  };
}

/**
 * Verify a reported price against the state feed / known range.
 * If the report deviates wildly from the local median, flag it as low-trust
 * (don't auto-credit it as "verified").
 */
export async function verifyAgainstFeed(reportedCents: number, feedMedianCents: number | null): Promise<{
  trusted: boolean;
  reason: string;
}> {
  if (feedMedianCents === null) {
    // No feed baseline yet — accept on the plausible range alone.
    return reportedCents >= DIESEL_CENT_MIN && reportedCents <= DIESEL_CENT_MAX
      ? { trusted: true, reason: 'within plausible range' }
      : { trusted: false, reason: 'outside plausible range' };
  }
  const deviation = reportedCents - feedMedianCents;
  // Truckier prices bounce a few c/L around the median. >10 c/L off is suspicious.
  if (Math.abs(deviation) > 10) {
    return { trusted: false, reason: `${Math.round(deviation)} c/L off the local average (${feedMedianCents} c/L)` };
  }
  return { trusted: true, reason: `${Math.round(deviation)} c/L vs the local average` };
}
