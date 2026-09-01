// ─── Supabase client ──────────────────────────────────────────────────────
// A singleton Supabase client. When Supabase isn't configured (no env vars),
// `createClient` is skipped and callers fall back to the mock store. We keep
// this lazy so importing the module never throws at build time.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_CONFIGURED } from './env';

let client: SupabaseClient | null = null;

/**
 * Returns the configured Supabase client, or null if Supabase isn't wired up.
 * Callers use `getSupabase()` and branch on null to load mock data instead.
 */
export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_CONFIGURED) return null;
  if (client) return client;
  client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

/** Convenience: true when a live Supabase backend is available. */
export const hasSupabase = (): boolean => getSupabase() !== null;
