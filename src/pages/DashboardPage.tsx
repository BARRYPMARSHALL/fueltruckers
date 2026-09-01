// ─── Savings Dashboard + Subscription ─────────────────────────────────────
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, BadgePercent, Copy, Check, Gift, Sparkles, CreditCard, Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMedianPrice } from '@/hooks/useStations';
import { estimateMonthlySavings, estimateMonthlyLitres, centsPerLitreToDollars } from '@/lib/utils';
import { createCheckoutSession, PLAN } from '@/lib/stripe';
import { Leaderboard } from '@/components/Leaderboard';

export function DashboardPage() {
  const { profile, usingSupabase, logout } = useAuth();
  const { data: median } = useMedianPrice();
  const [copied, setCopied] = useState(false);
  const [checkout, setCheckout] = useState<{ loading: boolean; message?: string; url?: string }>({ loading: false });

  const tankLitres = profile?.tank_litres ?? 1000;
  const monthlyKm = profile?.monthly_km ?? 15000;

  // Assume ~10 c/L average saving vs median when using the app to pick stops.
  const assumedSavingsCentsPerLitre = 10;
  const savings = useMemo(
    () => estimateMonthlySavings(monthlyKm, assumedSavingsCentsPerLitre),
    [monthlyKm],
  );
  const litresPerMonth = estimateMonthlyLitres(monthlyKm);
  const netAfterSub = savings.savingAUD - PLAN.priceAUD;

  const copyReferral = async () => {
    if (!profile?.referral_code) return;
    try {
      await navigator.clipboard.writeText(`https://fueltruckers.au/?ref=${profile.referral_code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const startTrial = async () => {
    setCheckout({ loading: true });
    const res = await createCheckoutSession();
    if (res.url) {
      window.location.href = res.url;
      return;
    }
    setCheckout({ loading: false, message: res.message });
  };

  return (
    <div className="min-h-screen bg-navy pb-safe">
      <header className="sticky top-0 z-30 bg-navy/90 backdrop-blur border-b border-white/10 p-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Your Savings</h1>
            <p className="text-xs text-slate-400">G'day {profile?.full_name?.split(' ')[0] ?? 'Truckie'} 👋</p>
          </div>
          <button onClick={logout} className="btn-ghost text-slate-400">Sign out</button>
        </div>
      </header>

      <main className="space-y-4 p-4">
        {/* Hero savings */}
        <section className="card p-5 text-center">
          <p className="text-xs uppercase tracking-wide text-slate-400">Est. monthly diesel saving</p>
          <p className="mt-1 text-5xl font-extrabold text-emerald-400">
            ${Math.round(savings.savingAUD)}
            <span className="text-lg font-semibold text-slate-400">/mo</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            ~{litresPerMonth.toLocaleString()} L/mo · saving {assumedSavingsCentsPerLitre} c/L vs median {median ? centsPerLitreToDollars(median) : '—'}
          </p>
          {median && (
            <p className="mt-2 text-xs text-slate-400">
              The best stops are ~{Math.round(median - (median - 10))} c/L cheaper than the typical price in your area.
            </p>
          )}
        </section>

        {/* Net after subscription */}
        <section className={`card p-5 ${netAfterSub > 0 ? 'border-emerald-500/30' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
              <BadgePercent className="h-4 w-4 text-hi" aria-hidden /> Net after subscription
            </span>
            <span className={`text-2xl font-extrabold ${netAfterSub > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {netAfterSub > 0 ? '+' : ''}${Math.round(netAfterSub)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            ${PLAN.priceAUD}/mo membership, {PLAN.trialDays}-day free trial, {PLAN.revenueShareGiveawayPct}% of revenue to cash giveaways.
          </p>
        </section>

        {/* Fuel credits */}
        <section className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-hi/15">
              <Wallet className="h-5 w-5 text-hi" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Fuel Credits</p>
              <p className="text-xs text-slate-400">{profile?.fuel_credits ?? 0} credits · each = 50¢ off subscription</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Submit verified prices &amp; amenities to earn more — every one is worth 50¢ toward your next payment.</p>
        </section>

        {/* Community leaderboard */}
        <Leaderboard />

        {/* Subscription status + CTA */}
        <section className="card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-hi/15">
              <CreditCard className="h-5 w-5 text-hi" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Membership</p>
              <SubscriptionBadge />
            </div>
          </div>
          <button onClick={startTrial} disabled={checkout.loading} className="btn-primary w-full">
            {checkout.loading
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              : <Sparkles className="h-4 w-4" aria-hidden />}
            Start 7-day free trial · ${PLAN.priceAUD}/mo
          </button>
          {checkout.message && (
            <p className="rounded-lg bg-navy-lighter/50 p-2.5 text-xs text-slate-400">{checkout.message}</p>
          )}
        </section>

        {/* Referral */}
        <section className="card p-4">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-hi" aria-hidden />
            <h2 className="text-sm font-bold text-slate-100">Invite a truckie</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Share your code — both of you earn a bonus when they join.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-navy-lighter/60 px-3 py-2.5 text-sm font-semibold text-hi">
              {profile?.referral_code ?? '———'}
            </code>
            <button onClick={copyReferral} className="btn-outline p-3" aria-label="Copy referral link">
              {copied ? <Check className="h-4 w-4 text-emerald-400" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </section>

        {/* Profile / truck details */}
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-bold text-slate-100">Your rig</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-navy-lighter/40 p-3">
              <p className="text-[11px] text-slate-500">Tank size</p>
              <p className="font-bold text-slate-100">{tankLitres} L</p>
            </div>
            <div className="rounded-xl bg-navy-lighter/40 p-3">
              <p className="text-[11px] text-slate-500">Monthly km</p>
              <p className="font-bold text-slate-100">{monthlyKm.toLocaleString()} km</p>
            </div>
          </div>
          <Link to="/profile" className="btn-outline mt-3 w-full">Edit truck details</Link>
        </section>

        <p className="pb-4 text-center text-[11px] text-slate-600">
          FuelTruckers · Aussie truckies saving real diesel · {usingSupabase ? 'live data' : 'demo data'}
        </p>
      </main>
    </div>
  );
}

function SubscriptionBadge() {
  // MVP — unknown until the subscription is actually created. Show a hint.
  return <span className="badge bg-navy-lighter/70 text-slate-300">Not active yet</span>;
}
