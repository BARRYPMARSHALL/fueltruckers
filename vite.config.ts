import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'FuelTruckers',
        short_name: 'FuelTruckers',
        description:
          'Diesel price optimisation for Australian truck drivers — real prices, truck-friendly stops, real savings.',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en-AU',
        categories: ['travel', 'utilities', 'navigation'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,jpg,webp,woff2}'],
        // Cache the OpenStreetMap tiles (bounded: max 1 day, max 100 entries)
        // so the map still renders when the driver is off network.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z.]*tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/[a-z.]*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 200, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Background sync: retry queued price submissions when back online.
        // (Registration of the sync is in src/lib/backgroundSync.ts)
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  // Resolve the @/ alias to src/
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // Railway serves the built app via `vite preview` on a *.up.railway.app host.
  // Vite's preview server only allows localhost by default, which makes the
  // Railway edge reject the host with a 403. Allow any host so deploys work.
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
