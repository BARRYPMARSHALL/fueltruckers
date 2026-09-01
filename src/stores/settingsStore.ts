// ─── Settings / theme store (dark default for night driving) ─────────────
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';

interface SettingsState {
  theme: Theme;
  sortKey: 'cheapest' | 'closest' | 'netSavings' | 'truckScore';
  setTheme: (t: Theme) => void;
  setSortKey: (k: SettingsState['sortKey']) => void;
}

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark', // default: dark for night driving
      sortKey: 'netSavings',
      setTheme: (t) => set({ theme: t }),
      setSortKey: (sortKey) => set({ sortKey }),
    }),
    { name: 'fueltruckers.settings' },
  ),
);

/** Apply the effective theme to <html data-theme>. Call on mount + on change. */
export function applyTheme() {
  const { theme } = useSettings.getState();
  const eff = resolveTheme(theme);
  const root = document.documentElement;
  root.setAttribute('data-theme', eff);
  // Toggle Tailwind dark class so dark:* variants work
  root.classList.toggle('dark', eff === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', eff === 'dark' ? '#0F172A' : '#f8fafc');
}

export { resolveTheme };
