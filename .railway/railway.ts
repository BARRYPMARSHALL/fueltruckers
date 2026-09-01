/**
 * FuelTruckers — Railway Infrastructure as Code.
 *
 * Railway's modern IaC authoring file (replaces railway.json, which is
 * deprecated until 2026-12-01). This targets the EXISTING `web` service on
 * the "FUEL TRUCKERS" project.
 *
 * Nixpacks build: install + build the Vite PWA, then serve dist/ via
 * `vite preview` (which needs preview.allowedHosts — see vite.config.ts).
 *
 * Reference: https://docs.railway.com/infrastructure-as-code
 */
import { defineRailway, project, service } from 'railway/iac';

export default defineRailway(() => {
  const web = service('web', {
    build: 'npm install && npm run build',
    start: 'npm run preview -- --host 0.0.0.0 --port $PORT',
    healthcheck: '/',
    healthcheckTimeout: 120,
    // builder from CaC: "NIXPACKS"
  });

  return project('FUEL TRUCKERS', {
    resources: [web],
  });
});
