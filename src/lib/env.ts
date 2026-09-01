// ─── Environment configuration ────────────────────────────────────────────
// All secrets live in env vars (never committed). See .env.example.

// Supabase — if missing, the app falls back to realistic mock data so the
// PWA still runs and demos (see src/lib/api.ts handleSupabaseUnreachable).
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Stripe — PLACEHOLDER keys only. In test mode these drive a mock checkout.
// Replace with live keys + the real price ID before production.
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
// The Stripe Price ID for the $30/mo subscription (created in the Stripe
// dashboard or via the Stripe CLI). Placeholder shown for testing.
export const STRIPE_PRICE_ID = (import.meta.env.VITE_STRIPE_PRICE_ID as string) || 'price_placeholder_sub_30aud';

// Stripe is effectively "configured" for demo purposes when we have a value
// (even the placeholder). The real checkout requires the publishable key.
export const STRIPE_CONFIGURED = Boolean(STRIPE_PUBLISHABLE_KEY);

// Default centre when user geolocation is denied → Sydney.
export const DEFAULT_CENTRE: { lat: number; lng: number } = { lat: -33.8688, lng: 151.2093 };

// Whether to show the subscribe/upsell UI (always on for the MVP).
export const FEATURE_SUBSCRIPTION_ENABLED = true;

// Currency display preference (whole AUD).
export const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});
