// ─── Auth page (login / register / magic link) ────────────────────────────
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, KeyRound, Truck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signInWithMagicLink } from '@/lib/auth';

type Mode = 'login' | 'register' | 'magic';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
  fullName: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const { register: reg, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', fullName: '' },
  });

  const onSubmit = async (data: Form) => {
    setError(null);
    let res;
    if (mode === 'login') res = await login(data.email, data.password);
    else res = await register(data.email, data.password, data.fullName ?? '');
    if (!res.ok) { setError(res.error ?? 'Something went wrong'); return; }
    navigate((location.state?.from ?? '/') , { replace: true });
  };

  const sendMagic = async (email: string) => {
    setError(null);
    const res = await signInWithMagicLink(email);
    if (!res.ok) { setError(res.error ?? 'Failed to send link'); return; }
    setMagicSent(true);
  };

  const changeMode = (m: Mode) => { setMode(m); setError(null); setMagicSent(false); };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-navy px-4 py-8">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-hi">
            <Truck className="h-7 w-7 text-navy" aria-hidden />
          </div>
          <h1 className="text-2xl font-extrabold text-white">FuelTruckers</h1>
          <p className="text-sm text-slate-400">Diesel savings for the long haul</p>
        </div>

        <div className="card p-5">
          {/* mode switch */}
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-navy-lighter/60 p-1">
            <Seg active={mode === 'login'} onClick={() => changeMode('login')}>Log in</Seg>
            <Seg active={mode === 'register'} onClick={() => changeMode('register')}>Sign up</Seg>
            <Seg active={mode === 'magic'} onClick={() => changeMode('magic')}>Magic link</Seg>
          </div>

          {mode === 'magic' ? (
            <MagicForm onSend={sendMagic} sent={magicSent} error={errors.email?.message} />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="label" htmlFor="fullName">Full name</label>
                  <input id="fullName" className="input" placeholder="e.g. Rob 'B-Double' Smith" {...reg('fullName')} />
                </div>
              )}
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" type="email" className="input" placeholder="you@example.com" {...reg('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input id="password" type="password" className="input" placeholder="••••••••" {...reg('password')} />
                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
              </div>
              {error && <p className="rounded-lg bg-red-500/10 p-2.5 text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {mode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-600">
          7-day free trial · ${'30'}/mo · 25% of revenue to cash giveaways
        </p>
      </div>
    </div>
  );
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg py-2 text-sm font-semibold transition ${active ? 'bg-navy-light text-white' : 'text-slate-400'}`}>
      {children}
    </button>
  );
}

function MagicForm({ onSend, sent, error }: {
  onSend: (e: string) => void;
  sent: boolean;
  error?: string;
}) {
  const [email, setEmail] = useState('');
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input
            className="input pl-9"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
      {sent ? (
        <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <KeyRound className="mr-1 inline h-4 w-4" aria-hidden />
          Check your inbox — a magic sign-in link is on its way.
        </div>
      ) : (
        <button type="button" onClick={() => onSend(email)} className="btn-primary w-full">Email me a link</button>
      )}
    </div>
  );
}
