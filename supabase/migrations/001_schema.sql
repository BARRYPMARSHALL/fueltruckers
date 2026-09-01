-- FuelTruckers — Supabase schema
-- Run this in the Supabase SQL Editor, or via `supabase db push`.
-- Order: tables → RLS → functions → triggers.

-- ── profiles ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  tank_litres numeric default 1000,
  monthly_km numeric default 15000,
  preferred_amenities jsonb default '{}'::jsonb,
  fuel_credits integer default 0,
  referral_code text unique,
  created_at timestamptz default now()
);

-- ── stations ────────────────────────────────────────────────────────────
create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  lat double precision not null,
  lng double precision not null,
  address text,
  state text,
  truck_friendly_score integer default 50,
  amenities jsonb default '{}'::jsonb,
  last_verified timestamptz default now(),
  created_at timestamptz default now()
);

-- ── prices ──────────────────────────────────────────────────────────────
create table if not exists public.prices (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  diesel_cents_per_litre integer not null,
  reported_by uuid references public.profiles(id) on delete set null,
  photo_url text,
  is_verified boolean default false,
  created_at timestamptz default now()
);
create index if not exists prices_station_idx on public.prices(station_id, created_at desc);

-- ── submissions (amenity updates / price reports) ────────────────────────
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('price', 'amenity')),
  diesel_cents_per_litre integer,
  amenities jsonb,
  note text,
  photo_url text,
  is_approved boolean default false,
  created_at timestamptz default now()
);
create index if not exists submissions_station_idx on public.submissions(station_id);

-- ── reviews ─────────────────────────────────────────────────────────────
create table if not exists public.station_reviews (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  rating integer check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);
create index if not exists reviews_station_idx on public.station_reviews(station_id);

-- ── subscriptions ────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'trialing' check (status in ('trialing','active','canceled','past_due')),
  stripe_customer_id text,
  trial_ends_at timestamptz default now() + interval '7 days',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.stations enable row level security;
alter table public.prices enable row level security;
alter table public.submissions enable row level security;
alter table public.station_reviews enable row level security;
alter table public.subscriptions enable row level security;

-- Public read: anyone can browse stations + prices (drivers don't need accounts to see the map).
create policy "stations public read" on public.stations for select using (true);
create policy "prices public read" on public.prices for select using (true);
create policy "reviews public read" on public.station_reviews for select using (true);

-- Owners manage their own profile / subscription.
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "subscriptions select own" on public.subscriptions for select using (auth.uid() = user_id);

-- Insert: any authenticated user can submit a price or amenity (auto-approved for MVP).
create policy "prices insert auth" on public.prices for insert to authenticated with check (true);
create policy "reviews insert auth" on public.station_reviews for insert to authenticated with check (true);
create policy "submissions insert auth" on public.submissions for insert to authenticated with check (true);

-- ── award_fuel_credit helper ─────────────────────────────────────────────
-- Adds `amount` fuel credits (50¢ each) to a user. Call after a verified submission.
create or replace function public.award_fuel_credit(user_id uuid, amount integer)
returns void language plpgsql security definer as $$
begin
  update public.profiles set fuel_credits = coalesce(fuel_credits, 0) + amount
  where id = user_id;
end;
$$;

-- ── trigger: auto-create a profile row on new auth signup ────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    upper(substr(replace(new.id::text, '-', ''), 1, 8))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
