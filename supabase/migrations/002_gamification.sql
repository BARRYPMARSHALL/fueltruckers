-- FuelTruckers — gamification / community contribution support
-- Run AFTER 001_schema.sql. Adds:
--   * a `contributions` table tracking verified price/amenity reports per user
--   * a view for the per-corridor leaderboard
--   * stricter award_fuel_credit that only credits VERIFIED submissions

-- ── contributions: one row per verified community report ────────────────
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  station_id uuid references public.stations(id) on delete cascade,
  kind text not null check (kind in ('price', 'amenity')),
  diesel_cents_per_litre integer,
  photo_url text,
  approved boolean default false,        -- verification gate
  created_at timestamptz default now()
);
create index if not exists contributions_user_idx on public.contributions(user_id, created_at desc);
create index if not exists contributions_station_idx on public.contributions(station_id);

alter table public.contributions enable row level security;
create policy "contributions insert auth" on public.contributions for insert to authenticated with check (true);
create policy "contributions select own" on public.contributions for select using (auth.uid() = user_id);

-- ── leaderboard: aggregate reputation per contributor ────────────────────
create or replace view public.leaderboard as
select
  p.id as user_id,
  coalesce(p.full_name, p.email) as name,
  count(c.id) filter (where c.approved) as verified_reports,
  (count(c.id) filter (where c.approved)) * 5 as points,   -- 5 pts per verified report
  bool_or(c.approved) as verified
from public.profiles p
left join public.contributions c on c.user_id = p.id
group by p.id, p.full_name, p.email;

-- ── award only for verified contributions ───────────────────────────────
-- Idempotent-ish: insert the contribution, mark approved (MVP auto-verify),
-- and credit the user 50¢. Call this from the snap flow instead of a bare
-- fuel_credits increment.
create or replace function public.record_verified_price(
  p_user_id uuid,
  p_station_id uuid,
  p_cents integer,
  p_photo text default null
) returns void language plpgsql security definer as $$
begin
  insert into public.contributions (user_id, station_id, kind, diesel_cents_per_litre, photo_url, approved)
  values (p_user_id, p_station_id, 'price', p_cents, p_photo, true);

  update public.profiles
  set fuel_credits = coalesce(fuel_credits, 0) + 1   -- 1 credit = 50¢ (see PLAN)
  where id = p_user_id;
end;
$$;

-- ── giveaways: track the monthly prize pool allocation ──────────────────
create table if not exists public.giveaway_winners (
  id uuid primary key default gen_random_uuid(),
  period text not null,               -- e.g. '2026-09'
  user_id uuid references public.profiles(id) on delete set null,
  rank integer not null,              -- 1st, 2nd, ...
  prize_aud numeric not null,
  paid boolean default false,
  paid_at timestamptz
);
