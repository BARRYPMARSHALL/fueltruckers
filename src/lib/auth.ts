// ─── Auth helpers (Supabase) ──────────────────────────────────────────────
// Thin wrappers around Supabase Auth so the UI components stay clean and can
// fall back to a "demo mode" when Supabase isn't configured.
import { getSupabase } from './supabase';

export interface AuthResult {
  ok: boolean;
  error?: string;
  demo?: boolean; // true when running without Supabase
}

/** Sign up with email + password. */
export async function signUp(email: string, password: string, fullName: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { ok: true, demo: true, error: 'Demo mode — no Supabase. Use a magic link or the demo account.' };
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Sign in with email + password. */
export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { ok: true, demo: true };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Send a magic-link email for passwordless sign-in. */
export async function signInWithMagicLink(email: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { ok: true, demo: true, error: 'Demo mode — no Supabase. This would email a magic link.' };
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Sign out and clear the session. */
export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
}

/** Get the current signed-in Supabase user id, or null (async). */
export async function currentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Supabase Auth Session via callback subscription. Returns a subscription
 * the caller should clean up. In demo mode the session is simulated as signed
 * out, which is fine — the app's protected routes still render the product
 * behind an onboarding gate.
 */
export function onAuthStateChange(cb: (userId: string | null) => void) {
  const sb = getSupabase();
  if (!sb) {
    cb(null);
    return () => {};
  }
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    cb(session?.user?.id ?? null);
  });
  // fire once with the current session
  sb.auth.getUser().then((r) => cb(r.data.user?.id ?? null));
  return () => data.subscription.unsubscribe();
}
