// ─── Stripe integration (PLACEHOLDER / test mode) ─────────────────────────
// This module is deliberately thin. In the MVP we do NOT process payments on
// the client — the real flow is a server-side Stripe Checkout Session created
// by a Supabase Edge Function (see supabase/functions/checkout).
//
// Here we expose:
//   - a display of the plan (so UI copy matches)
//   - whether Stripe is configured in the browser
//   - a stub `createCheckoutSession` that in test mode would be replaced by a
//     call to the Edge Function. In the demo the UI falls back to a "request
//     access / start trial" simulation when STRIPE_CONFIGURED is false.
import { STRIPE_PUBLISHABLE_KEY, STRIPE_PRICE_ID, STRIPE_CONFIGURED, FEATURE_SUBSCRIPTION_ENABLED } from './env';
import { PLAN } from '@/types';

export const stripeConfigured = STRIPE_CONFIGURED;
export const subscriptionEnabled = FEATURE_SUBSCRIPTION_ENABLED;

export interface CheckoutIntent {
  url: string | null;      // redirect URL (real checkout) or null in demo
  demo: boolean;           // true when no real Stripe is configured
  message: string;
}

/**
 * Kick off a subscription checkout. In production this calls the Supabase
 * Edge Function `checkout` which creates a Stripe Checkout Session and
 * returns its `url`. In the demo (no Stripe key) it returns a demo intent so
 * the UI can show the 7-day free trial flow without a real payment.
 */
export async function createCheckoutSession(): Promise<CheckoutIntent> {
  if (!STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_KEY.includes('placeholder')) {
    // Test mode: simulate the trial start so the app is fully exercisable.
    return {
      url: null,
      demo: true,
      message: `Demo mode: a real Stripe Checkout Session would open here. Plan: ${AUDPrice()} /mo, ${PLAN.trialDays}-day free trial, ${PLAN.revenueShareGiveawayPct}% of revenue to cash giveaways.`,
    };
  }

  // Real path — call the Edge Function. Build the base URL from Supabase.
  const { SUPABASE_URL } = await import('./env');
  const fnBase = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1` : '';
  if (!fnBase) {
    return {
      url: null,
      demo: true,
      message: 'Supabase not configured, unable to reach the checkout function.',
    };
  }

  try {
    const res = await fetch(`${fnBase}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price_id: STRIPE_PRICE_ID }),
    });
    const data = await res.json();
    return { url: data?.url ?? null, demo: false, message: '' };
  } catch (e) {
    return {
      url: null,
      demo: true,
      message: `Checkout function unreachable: ${(e as Error).message}`,
    };
  }
}

/** The $30/mo price label. */
export function AUDPrice(): string {
  return `$${PLAN.priceAUD}`;
}

export { PLAN };
