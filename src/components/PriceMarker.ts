// ─── Price marker (Leaflet custom divIcon) ─────────────────────────────────
import L, { DivIcon, PointExpression } from 'leaflet';
import { priceBadgeClass } from '@/lib/utils';

/**
 * Build a Leaflet divIcon that renders each station's diesel price as a
 * coloured badge — green (cheap) / amber / red (expensive).
 */
export function makePriceIcon(centsPerLitre: number, selected = false): DivIcon {
  const cls = priceBadgeClass(centsPerLitre);
  return L.divIcon({
    className: '',
    html: `<div class="price-marker ${cls} ${selected ? 'selected' : ''}">${centsPerLitre}</div>`,
    iconSize: [46, 30],
    iconAnchor: [23, 30] as PointExpression,
  });
}
