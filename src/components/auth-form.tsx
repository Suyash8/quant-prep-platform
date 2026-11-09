'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sigma, Zap, Flame, Trophy, Undo2, Code2, BookOpenCheck, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After a successful sign-in we send the user back to whatever they were
  // trying to reach (the `next` param), falling back to the dashboard.
  // A hard navigation is used deliberately: it guarantees the page loads
  // even if the client-side router is in a bad state, and it picks up the
  // fresh session cookie on the first request.
  function destination(): string {
    if (typeof window === 'undefined') return '/dashboard';
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    // Only allow same-site relative paths — never an external redirect.
    if (next && next.startsWith('/') && !next.startsWith('//')) return next;
    return '/dashboard';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register' ? { name, email, password } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        setBusy(false);
        return;
      }
      toast.success(mode === 'register' ? 'Account created — welcome aboard.' : `Welcome back, ${data.name}.`);
      window.location.assign(destination());
    } catch {
      setError('Network error — is the server running?');
      setBusy(false);
    }
  }

  const perks = mode === 'register'
    ? [
        { icon: BookOpenCheck, text: '283 lessons sequenced by a real prerequisite graph' },
        { icon: Code2, text: 'Code graded by actual compilers, not multiple choice' },
        { icon: Undo2, text: 'Spaced repetition that keeps what you learn' },
        { icon: ShieldCheck, text: 'No job promises — just honest, measurable progress' },
      ]
    : [
        { icon: Flame, text: 'Your streak is counting the days without you' },
        { icon: Zap, text: 'Daily-goal XP picks up exactly where you left off' },
        { icon: Trophy, text: 'Mastery levels and quest history are waiting' },
        { icon: Undo2, text: 'Revision cards scheduled for today' },
      ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* playful background blobs */}
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-accent-soft blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 bottom-8 h-56 w-56 rounded-full bg-info-soft blur-2xl" aria-hidden />

      <div className="w-full max-w-4xl relative grid lg:grid-cols-[1fr_320px] gap-8 items-center">
        {/* the form */}
        <div className="w-full max-w-sm mx-auto lg:mx-0 lg:justify-self-end">
          <div className="text-center mb-7">
            <span className="mx-auto h-14 w-14 rounded-3xl bg-accent text-white flex items-center justify-center shadow-[0_5px_0_0_var(--accent-deep)] anim-bob">
              <Sigma className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight">
              {mode === 'register' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm font-semibold text-muted">
              {mode === 'register'
                ? 'Takes thirty seconds — then the diagnostic finds your starting point.'
                : 'Pick up where you left off — streaks are waiting.'}
            </p>
          </div>
          <form onSubmit={submit} className="qf-card p-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="text-sm font-extrabold">Name</label>
                <input
                  id="name" type="text" required minLength={2} value={name}
                  onChange={e => setName(e.target.value)}
                  className="qf-input mt-1.5 !h-12"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="text-sm font-extrabold">Email</label>
              <input
                id="email" type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="qf-input mt-1.5 !h-12"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-extrabold">Password</label>
              <input
                id="password" type="password" required minLength={mode === 'register' ? 8 : 1}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="qf-input mt-1.5 !h-12"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                aria-describedby={mode === 'register' ? 'pw-hint' : undefined}
              />
              {mode === 'register' && (
                <p id="pw-hint" className="mt-1.5 text-xs font-semibold text-faint">At least 8 characters.</p>
              )}
            </div>
            {error && (
              <p role="alert" className="text-sm font-bold text-danger bg-danger-soft rounded-xl px-3 py-2 anim-shake">{error}</p>
            )}
            <button type="submit" disabled={busy} className="btn3d w-full !py-3.5">
              {busy ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
            <p className="text-sm text-center font-semibold text-muted">
              {mode === 'register' ? (
                <>Already have an account? <Link href="/login" className="text-info hover:underline font-extrabold">Sign in</Link></>
              ) : (
                <>New here? <Link href="/register" className="text-info hover:underline font-extrabold">Create an account</Link></>
              )}
            </p>
          </form>
        </div>

        {/* the pitch panel */}
        <aside className="hidden lg:block">
          <div className="qf-card-flat p-6 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-soft" aria-hidden />
            <div className="relative">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-faint">
                {mode === 'register' ? 'What you get' : 'While you were away'}
              </p>
              <ul className="mt-4 space-y-3.5">
                {perks.map(p => (
                  <li key={p.text} className="flex items-start gap-3">
                    <span className="h-8 w-8 shrink-0 rounded-xl bg-accent-soft text-accent-deep dark:text-accent flex items-center justify-center">
                      <p.icon className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm font-bold leading-snug pt-1">{p.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-5 border-t-2 border-border">
                <div className="flex items-center justify-between text-sm font-black">
                  <span className="text-muted">Price</span>
                  <span className="text-accent-deep dark:text-accent">Free, forever</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-sm font-black">
                  <span className="text-muted">Catch</span>
                  <span>You actually have to study</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
