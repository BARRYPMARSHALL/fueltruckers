// FuelTruckers — Stripe Checkout Edge Function
// Deploy to Supabase:
//   supabase functions deploy checkout --no-verify-jwt   (verify JWT is fine too)
// Env secrets (Supabase → Functions → Secrets):
//   STRIPE_SECRET_KEY=sk_test_...   (or sk_live_...)
//   STRIPE_WEBHOOK_SECRET=whsec_...
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)
//
// Creates a Stripe Checkout Session for the $30/7-day-trial subscription and
// returns its redirect URL. Webhook: /functions/v1/checkout/webhook handles
// the `checkout.session.completed` + `customer.subscription.updated` events.

import Stripe from 'npm:stripe@16.8.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});

// The $30/mo price id — set to match the price you created in your Stripe
// dashboard (recurring, monthly, AUD, $30 => unit_amount 3000).
const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID') ?? 'price_placeholder_sub_30aud';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = new URL(req.url);

  // ── Webhook route ──
  if (url.pathname.endsWith('/webhook')) {
    return handleWebhook(req);
  }

  // ── Create checkout session ──
  const { user } = await req.json().catch(() => ({}));

  // Get the Supabase user (for the customer + trial record) — requires JWT.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, supabaseService, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  const { data: { user: sbUser } } = await sb.auth.getUser();
  if (!sbUser) {
    return new Response(JSON.stringify({ error: 'authenticated user required' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Create (or reuse) a Stripe customer for this user.
  const { data: profile } = await sb.from('profiles')
    .select('id,email,full_name').eq('id', sbUser.id).single().maybe();

  let customers;
  try {
    customers = await stripe.customers.list({ email: sbUser.email, limit: 1 });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const customer = customers.data[0] ?? await stripe.customers.create({
    email: sbUser.email,
    name: profile?.full_name ?? undefined,
    metadata: { supabase_user_id: sbUser.id },
  });

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    // 7-day trial is configured on the Price in the dashboard, OR set here:
    subscription_data: {
      trial_period_days: 7,
      metadata: { supabase_user_id: sbUser.id },
    },
    success_url: `${SITE_URL}/dashboard?checkout=success`,
    cancel_url: `${SITE_URL}/dashboard?checkout=cancel`,
    client_reference_id: sbUser.id,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
  });
});

// ── Webhook: keep the subscriptions table in sync ──
async function handleWebhook(req: Request) {
  const signature = req.headers.get('stripe-signature')!;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: `webhook invalid: ${(e as Error).message}` }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const sb = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const mapStatus = (s: string): string =>
    s === 'active' || s === 'trialing' ? s : s === 'canceled' ? 'canceled' : 'past_due';

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.supabase_user_id ?? session.customer?.toString();
        if (userId) {
          await sb.from('subscriptions').upsert({
            user_id: userId,
            status: 'trialing',
            stripe_customer_id: session.customer?.toString() ?? null,
            trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          }, { onConflict: 'user_id' });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id ?? sub.customer?.toString();
        if (userId) {
          await sb.from('subscriptions').upsert({
            user_id: userId,
            status: mapStatus(sub.status),
            stripe_customer_id: sub.customer?.toString() ?? null,
          }, { onConflict: 'user_id' });
        }
        break;
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
