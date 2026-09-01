// ─── Auth context ─────────────────────────────────────────────────────────
import {
  createContext, useContext, useEffect, useState, ReactNode, useCallback,
} from 'react';
import { onAuthStateChange, signOut, signInWithPassword, signUp, signInWithMagicLink } from '@/lib/auth';
import { hasSupabase } from '@/lib/api';
import { Profile } from '@/types';

interface AuthContextValue {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  usingSupabase: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  magicLink: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Demo profile used when Supabase isn't configured so the product UI is fully
// explorable without any backend.
const DEMO_PROFILE: Profile = {
  id: 'demo-user',
  email: 'truckie@fueltruckers.au',
  full_name: 'Demo Truckie',
  tank_litres: 1000,
  monthly_km: 15000,
  preferred_amenities: { truckParking: true, showers: true, food24_7: true },
  fuel_credits: 2, // 2 verified submissions → the 50¢ logic in UI
  referral_code: 'TRUCKIE-DEMO1',
  created_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const usingSupabase = hasSupabase();

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    // In demo mode we keep the demo profile.
    if (!usingSupabase) {
      setProfile(DEMO_PROFILE);
      return;
    }
    const { fetchProfile } = await import('@/lib/api');
    const p = await fetchProfile(userId);
    setProfile(p ?? null);
  }, [userId, usingSupabase]);

  useEffect(() => {
    if (!usingSupabase) {
      // demo mode: seed a demo profile so everything renders
      setProfile(DEMO_PROFILE);
      setUserId(DEMO_PROFILE.id);
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChange((id) => {
      setUserId(id);
      setLoading(false);
    });
    return unsub;
  }, [usingSupabase]);

  useEffect(() => {
    if (userId) refreshProfile();
  }, [userId, refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    if (!usingSupabase) { setUserId(DEMO_PROFILE.id); setProfile(DEMO_PROFILE); return { ok: true }; }
    const res = await signInWithPassword(email, password);
    if (res.ok && !res.demo) {
      const { currentUserId } = await import('@/lib/auth');
      setUserId(await currentUserId());
    } else if (res.demo) {
      setUserId(DEMO_PROFILE.id); setProfile(DEMO_PROFILE);
    }
    return { ok: res.ok, error: res.error };
  }, [usingSupabase]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    if (!usingSupabase) { setUserId(DEMO_PROFILE.id); setProfile(DEMO_PROFILE); return { ok: true }; }
    const res = await signUp(email, password, name);
    if (res.ok && !res.demo) {
      const { currentUserId } = await import('@/lib/auth');
      setUserId(await currentUserId());
    } else if (res.demo) {
      setUserId(DEMO_PROFILE.id); setProfile(DEMO_PROFILE);
    }
    return { ok: res.ok, error: res.error };
  }, [usingSupabase]);

  const magicLink = useCallback(async (email: string) => {
    if (!usingSupabase) { setUserId(DEMO_PROFILE.id); setProfile(DEMO_PROFILE); return { ok: true }; }
    const res = await signInWithMagicLink(email);
    if (res.demo) { setUserId(DEMO_PROFILE.id); setProfile(DEMO_PROFILE); }
    return { ok: res.ok, error: res.error };
  }, [usingSupabase]);

  const logout = useCallback(async () => {
    await signOut();
    setUserId(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ userId, profile, loading, usingSupabase, login, register, magicLink, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
