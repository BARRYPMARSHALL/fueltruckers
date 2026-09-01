// ─── App layout + routing ─────────────────────────────────────────────────
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { NavBar } from '@/components/NavBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HomePage } from '@/pages/HomePage';
import { StationDetailPage } from '@/pages/StationDetailPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AuthPage } from '@/pages/AuthPage';
import { applyTheme, useSettings } from '@/stores/settingsStore';
import { flushOfflineQueue } from '@/lib/backgroundSync';

/** Layout that renders the bottom nav for in-app pages (not auth). */
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-md">
      {children}
      <NavBar />
    </div>
  );
}

export function App() {
  const theme = useSettings((s) => s.theme);
  const queryClient = useQueryClient();

  // Apply theme on mount + whenever it changes.
  useEffect(() => {
    applyTheme();
  }, [theme]);

  // Best-effort flush of any queued offline submissions when online.
  useEffect(() => {
    const flush = () => void flushOfflineQueue().catch(() => {});
    window.addEventListener('online', flush);
    flush();
    return () => window.removeEventListener('online', flush);
  }, [queryClient]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell><HomePage /></AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/station/:id"
          element={
            <ProtectedRoute>
              <AppShell><StationDetailPage /></AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell><DashboardPage /></AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppShell><ProfilePage /></AppShell>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
