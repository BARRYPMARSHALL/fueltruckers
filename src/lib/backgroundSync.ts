// ─── PWA background sync ──────────────────────────────────────────────────
// Registers a Background Sync so queued price/amenity submissions are retried
// when the device comes back online. Registration is best-effort: if the
// browser doesn't support Background Sync (e.g. desktop), it silently no-ops.
import { getSupabase } from './supabase';

export async function registerBackgroundSync() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // 'sync' is not supported in all browsers; guard before using.
    if ('sync' in reg) {
      await (reg as any).sync.register('submit-fuel-data');
      console.log('[fuel] background sync registered');
    }
  } catch (e) {
    console.warn('[fuel] background sync unavailable', e);
  }
}

/**
 * Flush the offline queue of price submissions into Supabase once online.
 * Called by the service-worker sync event handler (see sw.ts) and, as a
 * fallback, when the app regains focus.
 */
export async function flushOfflineQueue() {
  const sb = getSupabase();
  if (!sb) return;
  const key = 'fueltruckers.offlineQueue';
  let queue: any[] = [];
  try {
    queue = JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return;
  }
  if (!queue.length) return;

  const remaining: any[] = [];
  for (const item of queue) {
    try {
      const p = item.payload as { stationId: string; centsPerLitre: number; userId?: string | null };
      await sb.from('prices').insert({
        station_id: p.stationId,
        diesel_cents_per_litre: p.centsPerLitre,
        reported_by: p.userId ?? null,
        is_verified: true,
        photo_url: null,
      });
      // keep re-inserting records, clear all on success
    } catch (e) {
      console.warn('[fuel] background submit failed, keeping queued', e);
      remaining.push(item);
    }
  }
  localStorage.setItem(key, JSON.stringify(remaining));
}
