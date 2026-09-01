// ─── Price Snap component (camera + OCR + confirm) ────────────────────────
import { useRef, useState } from 'react';
import { Camera, Check, Loader2, X, Zap } from 'lucide-react';
import { snapPriceFromImage, verifyAgainstFeed } from '@/lib/snap';
import { useSubmitPrice, useMedianPrice } from '@/hooks/useStations';
import { Station } from '@/types';
import { PLAN } from '@/types';

/**
 * One-tap "snap the board" flow. When a trucker is near a station they tap
 * this, shoot the price board, we OCR it, verify it against the feed, and
 * auto-submit with an instant Fuel Credit. No typing.
 */
export function PriceSnap({ station, onClose }: { station: Station; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate: submit, isPending } = useSubmitPrice();
  const { data: median } = useMedianPrice();

  const handleFile = async (file: File) => {
    setError(null);
    setPreview(URL.createObjectURL(file));
    setSnapping(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const res = await snapPriceFromImage(reader.result as string);
      setSnapping(false);
      if (!res.ok || !res.priceCentsPerLitre) {
        setError(res.message);
        return;
      }
      // Verify against the feed median before auto-crediting as trusted.
      const verify = await verifyAgainstFeed(res.priceCentsPerLitre, median ?? null);
      submit(
        {
          stationId: station.id,
          centsPerLitre: res.priceCentsPerLitre,
          photoUrl: preview ?? undefined,
        },
        {
          onSuccess: () => setDone(true),
          onError: (e) => setError((e as Error).message ?? 'Could not submit'),
        },
      );
      // `verify` is used to decide whether to prompt a confirm when the OCR
      // doubted itself OR the price is far off the local feed median.
      const needsHumanConfirm = res.needsConfirm || !verify.trusted;
      if (needsHumanConfirm) {
        setError(verify.trusted ? null : `Heads-up: ${verify.reason}. Reported it but flagged for review.`);
      }
    };
  };

  if (done) {
    return (
      <div className="card p-5 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="h-6 w-6 text-emerald-400" aria-hidden />
        </div>
        <p className="text-sm font-bold text-slate-100">Price snapped!</p>
        <p className="mt-1 text-xs text-slate-400">
          Thanks — you earned a {PLAN.fuelCreditValueCents / 100}¢ Fuel Credit. That price is now on the map.
        </p>
        <button onClick={onClose} className="btn-outline mt-3 w-full">Done</button>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
          <Zap className="h-4 w-4 text-hi" aria-hidden /> Snap the board
        </p>
        <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        You're at <span className="text-slate-200">{station.name}</span>. Snap the price board — we'll read it for you.
      </p>

      {preview ? (
        <div className="mt-3">
          <img src={preview} alt="Price board" className="max-h-48 w-full rounded-xl object-cover" />
          {snapping ? (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading price…
            </div>
          ) : null}
        </div>
      ) : null}

      {error && (
        <p className="mt-2 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-400">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={snapping || isPending}
        className="btn-primary mt-3 w-full"
      >
        {snapping || isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
        {snapping ? 'Reading…' : 'Take photo'}
      </button>

      {/* manual fallback for blurred boards */}
      <p className="mt-2 text-center text-[11px] text-slate-500">
        Board too blurry?{' '}
        <button onClick={() => onClose()} className="text-hi">Enter it manually</button>
      </p>
    </div>
  );
}
