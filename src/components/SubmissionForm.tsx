// ─── Price + Amenity submission form (earns Fuel Credits) ─────────────────
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useSubmitPrice, useSubmitAmenity } from '@/hooks/useStations';
import { AMENITY_LABELS, Amenities, PLAN } from '@/types';

const priceSchema = z.object({
  centsPerLitre: z.coerce
    .number()
    .min(120, 'Prices must be above 120 c/L')
    .max(260, 'Prices must be below 260 c/L')
    .int(),
});
type PriceForm = z.infer<typeof priceSchema>;

export function PriceForm({ stationId, currentPrice }: { stationId: string; currentPrice?: number }) {
  const { mutate, isPending } = useSubmitPrice();
  const [done, setDone] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<PriceForm>({
    resolver: zodResolver(priceSchema),
    defaultValues: { centsPerLitre: currentPrice ?? 180 },
  });

  const onSubmit = (data: PriceForm) => {
    mutate(
      { stationId, centsPerLitre: data.centsPerLitre, photoUrl: photo ?? undefined },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {done ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 p-3 text-emerald-300">
          <Check className="h-5 w-5" aria-hidden />
          <span className="text-sm">Price submitted — you earned {PLAN.fuelCreditValueCents / 100}¢ in Fuel Credits.</span>
        </div>
      ) : (
        <>
          <div>
            <label className="label" htmlFor="price">Current diesel price (c/L)</label>
            <input id="price" type="number" className="input" placeholder="e.g. 178" {...register('centsPerLitre')} />
            {errors.centsPerLitre && <p className="mt-1 text-xs text-red-400">{errors.centsPerLitre.message}</p>}
          </div>
          <div>
            <span className="label">Photo of the pump / price board (optional)</span>
            <label className="cursor-pointer flex items-center gap-2 rounded-xl border border-dashed border-white/20 p-3 text-sm text-slate-400 hover:border-hi">
              <Camera className="h-4 w-4" aria-hidden />
              {photo ? 'Photo attached ✓' : 'Attach a photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPhoto(URL.createObjectURL(f));
                }}
              />
            </label>
          </div>
          <button type="submit" disabled={isPending} className="btn-primary w-full">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Submit price · earn {PLAN.fuelCreditValueCents / 100}¢ credit
          </button>
        </>
      )}
    </form>
  );
}

// ─── Amenity toggle form ──────────────────────────────────────────────────
export function AmenityForm({ stationId, amenities }: { stationId: string; amenities: Amenities }) {
  const { mutate, isPending } = useSubmitAmenity();
  const [state, setState] = useState<Partial<Amenities>>({});
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof Amenities) =>
    setState((s) => ({ ...s, [key]: !s[key] }));

  const submit = () => {
    mutate(
      { stationId, amenities: state },
      { onSuccess: () => setSaved(true) },
    );
  };

  return (
    <div className="space-y-3">
      {saved ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 p-3 text-emerald-300">
          <Check className="h-5 w-5" aria-hidden />
          <span className="text-sm">Amenities updated — 50¢ Fuel Credit added.</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(AMENITY_LABELS) as Array<keyof Amenities>).map((key) => {
              const active = state[key] ?? amenities[key];
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => toggle(key)}
                  className={`rounded-xl border p-2.5 text-left text-sm transition ${active ? 'border-hi bg-hi/10 text-white' : 'border-white/10 text-slate-400'}`}
                >
                  {AMENITY_LABELS[key]}
                </button>
              );
            })}
          </div>
          <button onClick={submit} disabled={isPending} className="btn-outline w-full">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Save amenity report
          </button>
        </>
      )}
    </div>
  );
}
