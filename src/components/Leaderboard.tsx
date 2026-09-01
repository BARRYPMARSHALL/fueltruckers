// ─── Trucker Leaderboard (per-highway reputation) ─────────────────────────
import { Trophy, Crown, Medal } from 'lucide-react';

export interface Leader {
  name: string;
  points: number;       // fuel-credit-equivalent reputation points
  reports: number;      // verified price reports
  verified: boolean;
}

// Mock leaderboard for now — wired to real profiles when Supabase is live.
const MOCK_LEADERS: Leader[] = [
  { name: 'Mick "B-Double"', points: 240, reports: 48, verified: true },
  { name: 'Sandy from Gympie', points: 195, reports: 39, verified: true },
  { name: 'Robbo', points: 160, reports: 32, verified: true },
  { name: 'Bluey', points: 120, reports: 24, verified: false },
  { name: 'Tassie Tom', points: 85, reports: 17, verified: false },
];

export function Leaderboard({ leaders = MOCK_LEADERS }: { leaders?: Leader[] }) {
  const sorted = [...leaders].sort((a, b) => b.points - a.points);
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-hi" aria-hidden />
        <h2 className="text-sm font-bold text-slate-100">Top fuel reporters</h2>
      </div>
      <p className="mb-3 text-xs text-slate-400">Verified price snaps = reputation + a share of the monthly prize pool.</p>
      <ul className="space-y-2">
        {sorted.map((l, i) => (
          <li key={l.name} className="flex items-center gap-3 rounded-xl bg-navy-lighter/40 p-2.5">
            <span className="flex w-6 items-center justify-center">
              {i === 0 ? <Crown className="h-4 w-4 text-hi" aria-hidden /> :
               i === 1 ? <Medal className="h-4 w-4 text-slate-300" aria-hidden /> :
               i === 2 ? <Medal className="h-4 w-4 text-amber-500" aria-hidden /> :
               <span className="text-xs font-bold text-slate-500">{i + 1}</span>}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">{l.name}</p>
              <p className="text-[11px] text-slate-500">
                {l.reports} verified {l.reports === 1 ? 'report' : 'reports'}
                {l.verified && <span className="ml-1 text-emerald-400">· verified</span>}
              </p>
            </div>
            <span className="text-sm font-bold text-hi">{l.points} pts</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
