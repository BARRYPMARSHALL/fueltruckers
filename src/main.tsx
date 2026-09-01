// ─── App entry ────────────────────────────────────────────────────────────
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AuthProvider } from './hooks/useAuth';
import { applyTheme } from './stores/settingsStore';
import './index.css';

// Apply theme before React mounts to avoid a dark->light flash.
applyTheme();

// A resilient React Query client. Retries a couple of times; caches staleTime
// tuned for slow-moving fuel prices.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

// Register the PWA service worker (vite-plugin-pwa injects it in prod).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    import('virtual:pwa-register')
      .then(({ registerSW }) => registerSW({ immediate: true }))
      .catch(() => {
        // no-op in dev if the virtual module isn't available
      });
  });
}
