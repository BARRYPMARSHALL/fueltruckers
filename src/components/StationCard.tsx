// ─── Station card (used in the bottom-sheet list) ─────────────────────────
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ChevronRight } from 'lucide-react';
import { Station } from '@/types';
import { centsPerLitreToDollars, formatKm, lastVerifiedLabel, priceColor } from '@/lib/utils';
import { AmenityIcons, TruckScore } from './AmenityIcons';

export function StationCard({ station }: { station: Station }) {
  const navigate = useNavigate();
  const price = station.price ?? 0;
  return (
    <button
      onClick={() => navigate(`/station/${station.id}`)}
      className="w-full text-left card p-3 mb-2 active:scale-[0.99] transition"
      aria-label={`${station.name}, ${price} cents per litre`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-slate-100 truncate">{station.name}</p>
          <p className="text-xs text-slate-400">{station.brand}</p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-extrabold ${priceColor(price)}`}>
            {centsPerLitreToDollars(price)}
            <span className="text-xs font-medium text-slate-400">/L</span>
          </p>
          <p className="text-[11px] text-slate-500">{price} c/L</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" aria-hidden /> {formatKm(station.distanceKm ?? 0)}
        </span>
        {station.lastVerified && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden /> Updated {lastVerifiedLabel(station.lastVerified)}
          </span>
        )}
        <TruckScore score={station.truckFriendlyScore} />
      </div>

      <div className="mt-2">
        <AmenityIcons amenities={station.amenities} />
      </div>

      <div className="mt-2 flex items-center justify-between">
        {station.netSavingsCents !== undefined && (
          <span className={`text-xs font-semibold ${(station.netSavingsCents ?? 0) < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
            Net {(station.netSavingsCents ?? 0) < 0 ? 'saving' : 'cost'} {Math.abs(station.netSavingsCents ?? 0)} c/L
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-hi">
          Details <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </button>
  );
}
