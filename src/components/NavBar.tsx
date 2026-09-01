// ─── Bottom navigation bar ────────────────────────────────────────────────
import { NavLink } from 'react-router-dom';
import { Map, Wallet, User } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Map', icon: Map, end: true },
  { to: '/dashboard', label: 'Savings', icon: Wallet, end: false },
  { to: '/profile', label: 'Rig', icon: User, end: false },
];

export function NavBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-navy/95 backdrop-blur pb-safe">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-hi' : 'text-slate-500'}`
            }
          >
            <t.icon className="h-5 w-5" aria-hidden />
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
