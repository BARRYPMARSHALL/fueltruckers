// ─── Amenity icon row plus truck score ────────────────────────────────────
import {
  Bus, ShowerHead, UtensilsCrossed, Wrench, Scale, Droplets,
  Fuel, ArrowRight, Wifi, Shirt, DoorOpen,
} from 'lucide-react';
import { Amenities } from '@/types';

const AMENITY_ICONS: Array<{ key: keyof Amenities; icon: typeof Bus; label: string }> = [
  { key: 'truckParking', icon: Bus, label: 'Truck parking' },
  { key: 'showers', icon: ShowerHead, label: 'Showers' },
  { key: 'food24_7', icon: UtensilsCrossed, label: '24/7 food' },
  { key: 'mechanic', icon: Wrench, label: 'Mechanic' },
  { key: 'weighbridge', icon: Scale, label: 'Weighbridge' },
  { key: 'defOrAdBlue', icon: Droplets, label: 'AdBlue' },
  { key: 'highClearance', icon: DoorOpen, label: 'High clearance' },
  { key: 'fuelPayAtPump', icon: Fuel, label: 'Pay at pump' },
  { key: 'wifi', icon: Wifi, label: 'Wi-Fi' },
  { key: 'laundry', icon: Shirt, label: 'Laundry' },
];

export function AmenityIcons({ amenities, limited = true }: { amenities: Amenities; limited?: boolean }) {
  const shown = limited ? AMENITY_ICONS.slice(0, 5) : AMENITY_ICONS;
  const active = shown.filter((a) => amenities[a.key]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map((a) => {
        const Icon = a.icon;
        return (
          <span
            key={a.key}
            title={a.label}
            aria-label={a.label}
            className="inline-flex items-center gap-1 rounded-md bg-navy-lighter/70 px-1.5 py-1 text-slate-300"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span className="text-[11px] font-medium">{a.label}</span>
          </span>
        );
      })}
      {active.length === 0 && (
        <span className="text-xs text-slate-500">No amenities reported yet</span>
      )}
    </div>
  );
}

export function TruckScore({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1 badge bg-navy-lighter/70 text-slate-200" title="Truck friendliness score">
      <Bus className="h-3 w-3" aria-hidden />
      {score}
    </span>
  );
}

export { ArrowRight };
