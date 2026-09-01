# FuelTruckers ⛽🚚

**Smart diesel price optimisation for Australian truck drivers.** A progressive web app that shows real truck-friendly diesel prices, recommends the *actual* cheapest stop after detour costs, and answers the question every truckie asks on the road: **"fill now, or push on?"**

> Australian English · AUD · diesel focus · all 8 states · **dark-mode-first** for night driving.

---

## The one-liner

```bash
npm install && npm run dev
```

Runs **immediately in demo mode** with 46 realistic mock Australian truck stops — no accounts, no keys. Connect Supabase + Stripe + a live fuel feed to go fully live.

---

## Feature set

### 1. Live map (default view)
- **Leaflet + OpenStreetMap** (no API key) centred on GPS with a Sydney fallback.
- **Price-coloured markers** — green (cheap) → amber → red (expensive).
- **Filters** — truck-friendly only, has showers, 24/7, max price, max distance.
- **Sort** — cheapest, closest, **best net savings**, best facilities.

### 2. Smart fuel decision engine ("Fuel Advisor")
The "AI" — a **transparent, deterministic model**, not a black box. It answers *fill now or wait*:
- Combines a station's **own price history** with the **diesel weekly cycle** (retail tracks the AIP Terminal Gate Price ≈ 95% of retail, which cycles ~weekly in capital cities).
- Predicts the price **~48h out**, and recommends `fill_now` / `fill_if_cheap` / `wait`.
- Shows a **confidence** bar and the rationale — and is honest that news/market events can move prices.
- See [`src/lib/prediction.ts`](src/lib/prediction.ts) — the model is unit-testable and backtestable.

### 3. Station list & detail
- **Station card** — brand, c/L, distance, last-verified, truck score, key amenities.
- **Detail** — full amenity checklist, price-history sparkline, driver reviews, **Navigate**, **Submit price / update amenities**.
- **Net-savings ranking** — true cost after detour, not just the sticker price.

### 4. Community + Fuel Credits
- Submit a price (with optional pump photo) or an amenity report.
- Each **verified submission earns a 50¢ Fuel Credit** off the $30/month subscription.
- Auto-approved for the MVP; queued offline and **background-synced** when back online.

### 5. Savings dashboard & subscription
- Estimated **monthly diesel saving** + **net-after-subscription** economics.
- **$30/mo membership, 7-day free trial, 25% of revenue to cash giveaways.**
- **Fuel Credits** balance + **referral code** ("invite a truckie").

### 6. PWA (installable, offline-first)
- `vite-plugin-pwa` service worker — **offline map tiles** (bounded cache), **last-known stations**, user profile.
- **Background Sync** for queued price submissions.
- Manifest (dark blue + orange), splash, SVG/PNG icons, installable from the browser or "Add to Home Screen".

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS + custom dark-navy/orange theme |
| PWA | vite-plugin-pwa (Workbox) |
| State & data | TanStack Query + Zustand |
| Backend / auth / DB | Supabase (Auth, Postgres, Storage, Realtime) |
| Maps | Leaflet + React-Leaflet + OSM |
| Payments | Stripe (test/placeholder keys) |
| Icons / forms / dates | Lucide / React Hook Form + Zod / date-fns |
| Routing | React Router DOM v6 |

---

## Live fuel-price data (the "smart prices" source)

The app has **two data layers**. The **prediction model** runs on top of **real historical prices**. And now — with fuel shortages prompting every state/territory to publish its own price data — we can pull **real government data from multiple free state feeds**, no scraping, no faking.

### National multi-source feed (per-state free government data)
| State | Source | Access |
|---|---|---|
| **NSW + ACT + TAS** | FuelCheck API (`api.nsw.gov.au`, v2 serves all three) | Free key |
| **VIC** | Servo Saver / Fair Fuel Open Data API (`data.vic.gov.au`) | Free key |
| **QLD** | fuelpricesqld.com.au / `data.qld.gov.au` (API + CSV) | Free sign-up |
| **WA** | FuelWatch (`fuelwatch.wa.gov.au`, `data.wa.gov.au`) | Free, public |
| **SA / NT** | (no clean statewide API — commercial aggregator covers them, OR community submissions) | — |
| **Anywhere** | CheckPetrol / FuelPrice Australia | Commercial, one key, ~9,700 stations |

The ingestion lives in [`supabase/functions/sync-prices/index.ts`](supabase/functions/sync-prices/index.ts) — a **pluggable multi-source feeder** with a per-state **adapter**. Each adapter activates when its key is set; adapters that have no key gracefully return `[]`. Run it on a cron every 30–60 min:

```bash
supabase functions deploy sync-prices
supabase secrets set \
  NSW_FUELCHECK_KEY=... NSW_FUELCHECK_SECRET=... \
  VIC_FAIRFUEL_KEY=... \
  QLD_KEY=... \
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
# optional single-key national connector:
#   CHECKPETROL_KEY=...
```

> ⚠️ **Honest note:** there is **no single free national feed** — each state is its own registration. The trade-off is: free-per-state (a few sign-ups) vs. one commercial key (CheckPetrol/FuelPrice Australia) for instant national coverage. Both paths are wired; pick whichever fits. Until any key is set, the app uses its realistic mock data.

### Prediction model (the actual "AI")
- `forecastPrice()` — linear trend + a sinusoidal weekly-cycle term, scaled to the station's observed amplitude.
- `buildSignal()` — returns `fill_now` / `fill_if_cheap` / `wait` + confidence + rationale.
- **Backtestable and transparent** — it's a named-parameter model you can validate against history, not a prompt-driven gamble. (Worth building a `predictions` backtest, like a trading backtest, before trusting it at scale.)

---

## Setup

### 1. Run (demo mode)
```bash
npm install
npm run dev      # http://localhost:5173
```

### 2. Wire Supabase
1. Create a project at supabase.com → copy **Project URL** + **anon key** (*Settings → API*).
2. **SQL Editor** → run [`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql) (tables, RLS, triggers, `award_fuel_credit`).
3. Run [`supabase/seed.sql`](supabase/seed.sql) (46 AU truck stops + prices).
4. `.env`:
   ```env
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
5. Enable the **Email** provider in Auth; set your site URL in *URL Configuration* (for magic links).

### 3. Wire Stripe (subscriptions)
1. Create a **monthly AUD $30** price (unit_amount **3000**) in the dashboard. Copy the Price ID.
2. `.env`: `VITE_STRIPE_PUBLISHABLE_KEY` + `VITE_STRIPE_PRICE_ID`.
3. Deploy the checkout Edge Function + set the webhook:
   ```bash
   supabase functions deploy checkout
   supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_...
   ```
   Stripe webhook → `https://<project>.supabase.co/functions/v1/checkout/webhook` with `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

### 4. Wire the live fuel feed
1. Register for the **NSW FuelCheck** API key (free, `api.nsw.gov.au`).
2. Deploy `sync-prices` and set `NSW_FUELCHECK_KEY`/`NSW_FUELCHECK_SECRET` secrets.
3. Schedule it (Supabase cron or an external scheduler) every 30–60 min.

---

## Deploy

### Railway (recommended — static + PWA)
The repo ships a [`railway.json`](railway.json) (Nixpacks: `npm install && npm run build`, serve `dist/`, healthcheck) and a `Procfile`.
1. **New Project → Deploy from GitHub** → `BARRYPMARSHALL/fueltruckers`.
2. Add env vars (service → *Variables*) **before** deploying (they bake in at build):
   ```env
   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=...
   VITE_STRIPE_PUBLISHABLE_KEY=... VITE_STRIPE_PRICE_ID=...
   ```
3. Railway gives a `*.up.railway.app` URL; PWA is installable + offline with no extra config.

### Vercel
Import the repo → preset **Vite** → build `npm run build`, output `dist`. Add the same `VITE_*` env vars, deploy. Rebuild after changing them.

### Edge Functions
Deploy `checkout` + `sync-prices` to Supabase (see above) — they run server-side with secrets.

---

## Project structure

```
fueltruckers/
├── public/                  # favicon, PWA icons
├── src/
│   ├── components/          # MapView, FuelAdvisor, StationCard, FilterBar,
│   │                        # BottomSheet, PriceHistoryChart, SubmissionForm,
│   │                        # ProtectedRoute, ErrorBoundary, ...
│   ├── pages/               # HomePage, StationDetailPage, DashboardPage,
│   │                        # ProfilePage, AuthPage
│   ├── hooks/               # useAuth, useStations (React Query)
│   ├── lib/                 # supabase, stripe, api (data+fallback), auth,
│   │   │                    # prediction (fuel advisor model), mockData,
│   │   │                    # backgroundSync, utils, env
│   │   └── prediction.ts    # ← the smart fill-now-or-wait model
│   ├── stores/              # location, settings (dark mode), ui (Zustand)
│   ├── types/               # domain types
│   └── App.tsx, main.tsx, index.css, vite-env.d.ts
├── supabase/
│   ├── migrations/001_schema.sql
│   ├── seed.sql
│   └── functions/
│       ├── checkout/index.ts      # Stripe Checkout + webhook
│       └── sync-prices/index.ts   # NSW FuelCheck live feed ingestion
├── railway.json, Procfile
├── .env.example
├── vite.config.ts (PWA + alias) · tailwind.config.js · tsconfig.json
└── README.md
```

---

## Data model (Supabase tables)

- **profiles** — id, email, full_name, tank_litres, monthly_km, preferred_amenities, fuel_credits, referral_code
- **stations** — id, name, brand, lat, lng, address, state, truck_friendly_score, amenities jsonb, last_verified
- **prices** — id, station_id, diesel_cents_per_litre, reported_by, photo_url, is_verified, created_at
- **submissions** — amenity/price reports
- **station_reviews** — rating + comment
- **subscriptions** — user_id, status, stripe_customer_id, trial_ends_at

---

## MVP readiness checklist

**Core (done):**
- ✅ Auth (email/password + magic link), protected routes, profile
- ✅ Map + price markers + filters + sorts
- ✅ Station detail + price history + reviews + submit price/amenity + Fuel Credits
- ✅ Savings dashboard + subscription CTA + referral
- ✅ PWA (installable, offline map+stations, background sync)
- ✅ Net-savings (detour-adjusted) ranking
- ✅ Supabase schema + RLS + seed + Stripe + feed Edge Functions
- ✅ Demo-mode fallback (runs with zero config)
- ✅ Fuel Advisor (fill-now-or-wait) prediction model

**To make it production-ready:**
- [ ] **Register the NSW FuelCheck key** and run `sync-prices` on a cron → live nationwide NSW data
- [ ] **National coverage**: add WA FuelWatch + approve the CheckPetrol key (or per-state gov feeds)
- [ ] **Backtest the prediction model** against historical data (like a trading backtest) before trusting it at scale
- [ ] **Real map tiles offline pack** for the most-travelled corridors (currently a bounded tile cache)
- [ ] **Auth hardening**: tighten per-user RLS for submission attribution in production
- [ ] **Analytics / crash reporting** (Sentry) + a proper error/telemetry path
- [ ] **Moderation** for community submissions (currently auto-approve for MVP)
- [ ] **Legal**: privacy policy, terms, AU-specific consumer notices around fuel-price data + auto-renewing subscriptions

---

## Future improvements

- **Route-based fuel planning** — given a trip (origin → destination + detour budget), optimise the fill-stop strategy across the whole route, not just "near me".
- **CheckPetrol / FuelPrice Australia** integration for live national prices.
- **AI price prediction v2** — gradient-boosted or ARIMA model on longer history (30-day+, per station), validated with a backtest harness.
- **Fleet tier** — multiple trucks, driver accounts, combined savings reporting.
- **Giveaway engine** — deterministic, provable allocation of the 25% revenue-share (e.g. seeded, publicly-verifiable).

---

## Licence & honest notes

- Prices in the mock/seed data are **illustrative only** (representative Australian 2026 diesel, 160–210 c/L). The real value is the community + live-sourced feed.
- The **Fuel Advisor is a guide, not a guarantee** — the UI says so. Prices move on market news; the model is transparent and backtestable, not "AI magic."
- Use **Stripe test keys** for development; never commit secrets. `.env` is gitignored.
