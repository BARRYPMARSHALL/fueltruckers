// ─── Profile / truck details editor ───────────────────────────────────────
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AMENITY_LABELS, Amenities } from '@/types';

const schema = z.object({
  fullName: z.string().min(1, 'Required'),
  tankLitres: z.coerce.number().min(100).max(10000),
  monthlyKm: z.coerce.number().min(100).max(200000),
});
type Form = z.infer<typeof schema>;

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: profile?.full_name ?? '',
      tankLitres: profile?.tank_litres ?? 1000,
      monthlyKm: profile?.monthly_km ?? 15000,
    },
  });

  const onSubmit = async (data: Form) => {
    // MVP — persist to Supabase when configured; demo otherwise updates local state only.
    const { getSupabase } = await import('@/lib/supabase');
    const hasSb = getSupabase() !== null;
    if (hasSb && profile) {
      const sb = getSupabase()!;
      await sb.from('profiles').update({
        full_name: data.fullName,
        tank_litres: data.tankLitres,
        monthly_km: data.monthlyKm,
      }).eq('id', profile.id);
    }
    await refreshProfile();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-navy pb-safe">
      <header className="sticky top-0 z-30 bg-navy/90 backdrop-blur border-b border-white/10 p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard')} className="btn-ghost -ml-1" aria-label="Back">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="text-lg font-bold text-white">Your rig</h1>
        </div>
      </header>

      <main className="space-y-5 p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" className="input" {...register('fullName')} />
            {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="tankLitres">Tank size (litres)</label>
            <input id="tankLitres" type="number" className="input" {...register('tankLitres')} />
            {errors.tankLitres && <p className="mt-1 text-xs text-red-400">{errors.tankLitres.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="monthlyKm">Typical monthly km</label>
            <input id="monthlyKm" type="number" className="input" {...register('monthlyKm')} />
            {errors.monthlyKm && <p className="mt-1 text-xs text-red-400">{errors.monthlyKm.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Save
          </button>
        </form>

        <section className="card p-5">
          <h2 className="mb-2 text-sm font-bold text-slate-100">Preferred amenities</h2>
          <p className="mb-3 text-xs text-slate-400">We weight the ranking toward stops that have what you need.</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(AMENITY_LABELS) as Array<keyof Amenities>).map((key) => (
              <div key={key} className={`rounded-xl p-2.5 text-sm ${(profile?.preferred_amenities?.[key] ?? false) ? 'bg-hi/10 text-white' : 'bg-navy-lighter/40 text-slate-500'}`}>
                {AMENITY_LABELS[key]}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
