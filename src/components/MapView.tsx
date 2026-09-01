// ─── Map view (Leaflet + OpenStreetMap) ───────────────────────────────────
import { useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useStations } from '@/hooks/useStations';
import { useLocation } from '@/stores/locationStore';
import { useUi } from '@/stores/uiStore';
import { makePriceIcon } from './PriceMarker';

// Keep Leaflet's default icon from being replaced with a broken icon path.
// We use custom divIcons exclusively, so we do not need the default pin image,
// but react-leaflet requires a Marker icon to avoid a missing-image flash.
import L from 'leaflet';
const defaultIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' +
    btoa('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="6" fill="#F97316"/></svg>'),
  iconSize: [12, 12],
});
L.Marker.prototype.options.icon = defaultIcon;

/** Re-centre the map whenever the user location updates. */
function FitToUser() {
  const map = useMap();
  const lat = useLocation((s) => s.lat);
  const lng = useLocation((s) => s.lng);
  const loaded = useLocation((s) => s.loaded);
  const did = useRef(false);

  useEffect(() => {
    if (loaded && !did.current) {
      map.setView([lat, lng], 9);
      did.current = true;
    }
  }, [lat, lng, loaded, map]);

  return null;
}

export function MapView() {
  const { data: stations } = useStations();
  const filters = useUi((s) => s.filters);
  const selectedStationId = useUi((s) => s.selectedStationId);
  const selectStation = useUi((s) => s.selectStation);
  const setSheetOpen = useUi((s) => s.setSheetOpen);
  const lat = useLocation((s) => s.lat);
  const lng = useLocation((s) => s.lng);

  // Filter markers to visually match the list (only truck-friendly/showers/24-7)
  const visible = useMemo(() => {
    return (stations ?? []).filter((s) => {
      if (filters.truckFriendlyOnly && s.truckFriendlyScore < 60) return false;
      if (filters.hasShowers && !s.amenities.showers) return false;
      if (filters.open24_7 && !s.amenities.food24_7) return false;
      if (filters.maxPriceCentsPerLitre && (s.price ?? 999) > filters.maxPriceCentsPerLitre) return false;
      if (filters.maxDistanceKm && (s.distanceKm ?? 999) > filters.maxDistanceKm) return false;
      return true;
    });
  }, [stations, filters]);

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={7}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={true}
      style={{ minHeight: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToUser />

      {visible.map((s) => {
        const selected = s.id === selectedStationId;
        const price = s.price ?? 0;
        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={makePriceIcon(price, selected)}
            eventHandlers={{
              click: () => {
                selectStation(s.id);
                setSheetOpen(true);
              },
            }}
            zIndexOffset={selected ? 500 : 0}
          >
            {/* invisible, we render the price divIcon manually */}
          </Marker>
        );
      })}

      {/* user location dot */}
      <Marker position={[lat, lng]} icon={userDotIcon} />
    </MapContainer>
  );
}

const userDotIcon = L.divIcon({
  className: '',
  html: `<div class="relative" style="width:18px;height:18px"><div style="position:absolute;inset:0;border-radius:9999px;background:#3B82F6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.3)"></div></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
