# FuelTruckers ⛽🚚

**Diesel price optimisation for Australian truck drivers.** A progressive web app that shows real (or near-real) truck-friendly diesel prices, ranks stops by true net savings (price + detour cost), and lets a community of truckies submit prices and amenities for Fuel Credits.

> MVP: Australian English, AUD, diesel focus, all states (NSW, VIC, QLD, WA, SA, TAS, NT, ACT). Dark-mode-first for night driving.

---

## The one-liner

```bash
npm install && npm run dev
```

It runs **immediately in demo mode** with realistic mock data — no accounts, no keys required. Connect Supabase + Stripe (below) to go live.

---

## What it does

- **Live map** (Leaflet + OpenStreetMap, no API key) centred on your GPS with a Sydney fallback. Markers are coloured by diesel price (green = cheap, red = expensive).
- **Filters** — truck-friendly only, has showers, 24/7, max price, max distance — plus sort by *cheapest*, *closest*, *best net savings*, *best facilities*.
- **Station cards** — brand, c/L, distance, last-verified, truck score, key amenities.
- **Station detail** — full amenities checklist, price-history sparkline, driver reviews, **Navigate**, **Submit price / update amenities**.
- **Fuel Credits** — each verified submission earns 50¢ off the $30/month subscription.
- **Savings dashboard** — estimated monthly diesel saving, net-after-subscription economics, Fuel Credit balance, referral code + "invite a truckie".
- **PWA** — installable, offline map-tile + station cache, background sync for price submissions, splash + icons.
- **Subscription** — $30/mo, 7-day free trial, 25% of revenue to cash giveaways (Stripe Checkout + Customer Portal).

---

## Tech stack (exactly this)

| Layer | Choice |
|---|---|
| Frontend | **Vite + React 18 + TypeScript** |
| Styling | **Tailwind CSS + custom components** |
| PWA | **vite-plugin-pwa** (Workbox service worker, offline caching, installable) |
| State & data | **TanStack Query (React Query) + Zustand** |
| Backend / auth / DB | **Supabase** (Auth, Postgres, Storage for receipt photos) |
| Maps | **Leaflet + React-Leaflet + OSM tiles** (no key) |
| Payments | **Stripe** (placeholder keys in test mode) |
| Icons | **Lucide React** |
| Forms | **React Hook Form + Zod** |
| Dates | **date-fns** |
| Routing | **React Router DOM v6** |

---

## Setup steps

### 1. Install + run (demo mode)

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. You're in — the app falls back to 46 realistic mock Australian truck stops when Supabase isn't configured.

### 2. Wire up Supabase (optional → live data)

1. Create a project at [supabase.com](https://supabase.com). Copy **Project URL** + **anon public key** from *Settings → API*.
2. **Apply the schema** — open the *SQL Editor* and run [`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql). (Creates `profiles`, `stations`, `prices`, `submissions`, `station_reviews`, `subscriptions`, RLS policies, the `award_fuel_credit` function, and a signup trigger that auto-creates a profile.)
3. **Seed the data** — run [`supabase/seed.sql`](supabase/seed.sql) in the SQL Editor. Inserts 46 realistic AU truck stops (Hume, Pacific, Bruce, Stuart, Eyre, etc.) with prices 160–210 c/L + amenities.
4. Create a `.env` from `.env.example`:
   ```env
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
5. Configure **Auth** in the dashboard: enable **Email** provider. For magic-link, confirm the site URL is allowed in *Auth → URL Configuration*. For the app URL, set `VITE_SUPABASE_URL`'s site to your dev/build origin.

### 3. Wire up Stripe (optional → real subscriptions)

1. **Price**: Stripe Dashboard → Products → create a recurring **monthly** price, **AUD**, **$30** (`unit_amount` **3000**). Copy the Price ID (`price_...`).
2. **Keys**: create a restricted/test key (secret + publishable). From *Settings → API keys*.
3. **Env**: add `VITE_STRIPE_PUBLISHABLE_KEY` and `VITE_STRIPE_PRICE_ID` to `.env`.
4. **Webhook** (server-side, keeps `subscriptions` in sync): deploy the Edge Function and set the webhook endpoint in Stripe:
   ```bash
   supabase functions deploy checkout
   supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_...
   ```
   Then in Stripe → Webhooks, point `https://<project>.supabase.co/functions/v1/checkout/webhook` at the `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` events.

> 🔒 **Never commit real keys.** `.env` is gitignored. Use Stripe **test** keys for development.

---

## How to run locally

```bash
npm install
npm run dev        # Vite dev server, HMR, PWA on
npm run build      # type-check + production build (dist/)
npm run preview    # serve the production build
npm run typecheck  # tsc -b (no emit)
```

---

## How to build & deploy (Vercel recommended)

1. Push the repo to GitHub.
2. Import into **Vercel** (or `vercel`).
3. Framework preset: **Vite**. Build command `npm run build`, output dir `dist`.
4. Add env vars in Vercel → Settings → Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_STRIPE_PRICE_ID`).
5. Deploy. **The PWA is generated on build** (service worker + manifest) so it's installable + offline out of the gate.

> ⚠️ `VITE_*` vars are baked into the client bundle at build time — set them before running `npm run build`, and rebuild after changing a value.

---

## Project structure

```
fueltruckers/
├── public/
│   ├── favicon.svg, robots.txt
│   └── icons/ (icon-192.png, icon-512.png)
├── src/
│   ├── components/        # MapView, StationCard, FilterBar, BottomSheet,
│   │                      # PriceHistoryChart, SubmissionForm, ProtectedRoute, ...
│   ├── pages/             # HomePage, StationDetailPage, DashboardPage,
│   │                      # ProfilePage, AuthPage
│   ├── hooks/             # useAuth, useStations (React Query)
│   ├── lib/               # supabase, stripe, api (data+fallback), auth,
│   │                      # utils, env, mockData, backgroundSync
│   ├── stores/            # locationStore, settingsStore, uiStore (Zustand)
│   ├── types/             # domain types (Station, Profile, Amenities, ...)
│   ├── App.tsx, main.tsx, index.css, vite-env.d.ts
├── supabase/
│   ├── migrations/001_schema.sql   # DB schema + RLS + triggers
│   ├── seed.sql                    # 46 stations + prices (generated)
│   └── functions/checkout/index.ts # Stripe Checkout + webhook Edge Function
├── .env.example
├── package.json
├── vite.config.ts                  # PWA config + alias
├── tailwind.config.js
├── tsconfig.json / tsconfig.node.json
└── README.md
```

---

## Data model (Supabase tables)

- **profiles** — id, email, full_name, tank_litres, monthly_km, preferred_amenities, fuel_credits, referral_code, created_at
- **stations** — id, name, brand, lat, lng, address, state, truck_friendly_score, amenities jsonb, last_verified
- **prices** — id, station_id, diesel_cents_per_litre, reported_by, photo_url, is_verified, created_at
- **submissions** — amenity/price reports (type, fields, is_approved)
- **station_reviews** — rating + comment
- **subscriptions** — user_id, status, stripe_customer_id, trial_ends_at

---

## Future improvements

- **Real price feed**: integrate the public [FuelPrice Australia](https://www.fuelprice.io/) or NSW/QLD fuel-price data rather than community-only. (A key would let you pull live price boards nationwide.)
- **CheckPetrol / state API** integration for near-real-time prices on major routes.
- **AI price prediction**: forecast whether a stop's price will drop before you arrive, based on history + region seasonality + the diesel price cycle.
- **Route-based recommendations**: given a trip (origin → destination + detour budget), optimise fuel stops along the route instead of just "near me".
- **Auth hardening**: enforce RLS per-user for submission attribution (done in schema; may need per-user policies for full isolation in prod).
- **Maps offline**: bundle a small offline tile region for the most-travelled corridors.
- **Giveaway engine**: deterministic allocation of the 25% revenue-share cash giveaways (random-seeded, provable via a hash on-chain or published ledger).

---

## Licence & notes

Prices in the mock/seed data are **illustrative only** — they're representative of Australian 2026 diesel levels (160–210 c/L) for development. The real product's value is the community-submitted + live-sourced price feed. Use Stripe **test** keys for development; never commit secrets.
