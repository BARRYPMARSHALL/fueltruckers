// ─── Empty state ──────────────────────────────────────────────────────────
import { MapPinOff } from 'lucide-react';

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-lighter/60">
        <MapPinOff className="h-7 w-7 text-slate-400" aria-hidden />
      </div>
      <p className="max-w-xs text-sm text-slate-400">{message}</p>
    </div>
  );
}
