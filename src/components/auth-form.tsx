'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sigma, Zap, Flame, Trophy, Undo2, Code2, BookOpenCheck, ShieldCheck, Mail, Lock, User, Eye, EyeOff,
  CheckCircle2, LockKeyhole, CloudOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Mascot } from '@/components/brand/mascot';

function pwStrength(pw: string): { label: string; pct: number; tone: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const table = [
    { label: 'Too short', pct: 12, tone: 'prog-fill-danger' },
    { label: 'Weak', pct: 30, tone: 'prog-fill-danger' },
    { label: 'Fair', pct: 55, tone: 'prog-fill-gold' },
    { label: 'Good', pct: 80, tone: 'prog-fill' },
    { label: 'Strong', pct: 100, tone: 'prog-fill' },
  ];
  return table[score];
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
    // Only allow same-site relative paths, never an external redirect.
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
      toast.success(mode === 'register' ? 'Account created, welcome aboard.' : `Welcome back, ${data.name}.`);
      window.location.assign(destination());
    } catch {
      setError('Network error, is the server running?');
      setBusy(false);
    }
  }

  const perks = mode === 'register'
    ? [
        { icon: BookOpenCheck, text: '283 lessons sequenced by a real prerequisite graph' },
        { icon: Code2, text: 'Code graded by actual compilers, not multiple choice' },
        { icon: Undo2, text: 'Spaced repetition that keeps what you learn' },
        { icon: ShieldCheck, text: 'No job promises, just honest, measurable progress' },
      ]
    : [
        { icon: Flame, text: 'Your streak is counting the days without you' },
        { icon: Zap, text: 'Daily-goal XP picks up exactly where you left off' },
        { icon: Trophy, text: 'Mastery levels and quest history are waiting' },
        { icon: Undo2, text: 'Revision cards scheduled for today' },
      ];

  const firstFive = [
    'The placement diagnostic, 28 questions',
    'Your first lesson, 6 minutes long',
    'The first 5 flashcards in your deck',
  ];

  const strength = pwStrength(password);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* playful background blobs + floating math symbols */}
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-accent-soft blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 bottom-8 h-56 w-56 rounded-full bg-info-soft blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
        <span className="absolute left-[8%] top-[16%] text-4xl font-black text-accent/15 anim-float">Σ</span>
        <span className="absolute right-[10%] top-[24%] text-3xl font-black text-info/15 anim-float-slow" style={{ animationDelay: '0.8s' }}>σ</span>
        <span className="absolute left-[16%] bottom-[14%] text-3xl font-black text-violet/15 anim-float-slow" style={{ animationDelay: '1.4s' }}>Δ</span>
      </div>

      <div className="w-full max-w-4xl relative grid lg:grid-cols-[1fr_400px] gap-8 items-center">
        {/* the pitch panel, fills the left half with real content */}
        <aside className="hidden lg:block">
          <div className="qf-card-flat p-6 relative overflow-hidden bg-dots">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-soft" aria-hidden />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-11 w-11 rounded-2xl bg-accent text-white flex items-center justify-center shadow-[0_4px_0_0_var(--accent-deep)]">
                    <Sigma className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <p className="font-black tracking-tight text-lg leading-none">QuantFoundry</p>
                    <p className="text-xs font-bold text-faint uppercase tracking-[0.12em] mt-1">Quant dev, built properly</p>
                  </div>
                </div>
                <Mascot pose="wave" size={64} />
              </div>

              {mode === 'login' ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="hud-pill"><Flame className="h-4 w-4 text-flame anim-flame" /> 7-day streak</span>
                  <span className="hud-pill"><Zap className="h-4 w-4 text-gold" /> 1,480 XP</span>
                  <span className="hud-pill"><Trophy className="h-4 w-4 text-accent-deep dark:text-accent" /> Level 4</span>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  {[['283', 'lessons'], ['40+', 'live labs'], ['25', 'code problems']].map(([v, l]) => (
                    <div key={l} className="stat-tile text-center" style={{ padding: '.7rem .5rem' }}>
                      <p className="tnum text-xl font-black">{v}</p>
                      <p className="stat-label">{l}</p>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-faint">
                {mode === 'register' ? 'What you get' : 'While you were away'}
              </p>
              <ul className="mt-3.5 space-y-3.5">
                {perks.map(p => (
                  <li key={p.text} className="flex items-start gap-3">
                    <span className="icon-tile-sm icon-tile-accent shrink-0">
                      <p.icon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-bold leading-snug pt-0.5">{p.text}</span>
                  </li>
                ))}
              </ul>
              {mode === 'register' && (
                <div className="mt-5 qf-callout qf-callout-info">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-muted mb-1.5">In your first 5 minutes</p>
                    <ul className="space-y-1">
                      {firstFive.map(t => <li key={t} className="text-sm font-bold">{t}</li>)}
                    </ul>
                  </div>
                </div>
              )}
              <div className="mt-6 pt-5 border-t-2 border-border flex flex-wrap gap-2">
                <span className="chip"><CloudOff className="h-3 w-3" aria-hidden="true" /> Works offline</span>
                <span className="chip chip-accent">Free, forever</span>
                <span className="chip chip-warning">You actually have to study</span>
              </div>
            </div>
          </div>
        </aside>

        {/* the form */}
        <div className="w-full max-w-sm mx-auto lg:mx-0 lg:justify-self-start">
          <div className="text-center mb-7">
            <span className="mx-auto h-14 w-14 rounded-3xl bg-accent text-white flex items-center justify-center shadow-[0_5px_0_0_var(--accent-deep)] anim-bob">
              <Sigma className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight">
              {mode === 'register' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm font-semibold text-muted">
              {mode === 'register'
                ? 'Takes thirty seconds, then the diagnostic finds your starting point.'
                : 'Pick up where you left off, streaks are waiting.'}
            </p>
          </div>
          <form onSubmit={submit} className="qf-card p-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="qf-field-label"><User className="h-3.5 w-3.5" aria-hidden="true" /> Name</label>
                <input
                  id="name" type="text" required minLength={2} value={name}
                  onChange={e => setName(e.target.value)}
                  className="qf-input h-12"
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="qf-field-label"><Mail className="h-3.5 w-3.5" aria-hidden="true" /> Email</label>
              <input
                id="email" type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="qf-input h-12"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="qf-field-label"><Lock className="h-3.5 w-3.5" aria-hidden="true" /> Password</label>
              <div className="relative">
                <input
                  id="password" type={showPw ? 'text' : 'password'} required minLength={mode === 'register' ? 8 : 1}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="qf-input h-12"
                  style={{ paddingRight: '3rem' }}
                  placeholder="••••••••"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  aria-describedby={mode === 'register' ? 'pw-hint' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 press h-9 w-9 inline-flex items-center justify-center rounded-xl text-muted hover:bg-surface-2"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-4.5 w-4.5" aria-hidden /> : <Eye className="h-4.5 w-4.5" aria-hidden />}
                </button>
              </div>
              {mode === 'register' && password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="prog-track flex-1"><div className={strength.tone} style={{ width: `${strength.pct}%` }} /></div>
                  <span className="chip">{strength.label}</span>
                </div>
              )}
              {mode === 'register' && (
                <p id="pw-hint" className="qf-field-hint">At least 8 characters. Longer with a mix of cases and digits grades faster.</p>
              )}
            </div>
            {error && (
              <p role="alert" className="text-sm font-bold text-danger bg-danger-soft rounded-xl px-3 py-2 anim-shake">{error}</p>
            )}
            <button type="submit" disabled={busy} className="btn3d w-full text-base" style={{ padding: '.9rem 1.5rem' }}>
              {busy ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
            <p className="text-sm text-center font-semibold text-muted">
              {mode === 'register' ? (
                <>Already have an account? <Link href="/login" className="text-accent-deep dark:text-accent hover:underline font-extrabold">Sign in</Link></>
              ) : (
                <>New here? <Link href="/register" className="text-accent-deep dark:text-accent hover:underline font-extrabold">Create an account</Link></>
              )}
            </p>
          </form>
          <p className="mt-4 text-center text-xs font-bold text-muted flex items-center justify-center gap-1.5">
            <LockKeyhole className="h-3.5 w-3.5 text-accent-deep dark:text-accent" aria-hidden="true" />
            No card needed. Your progress stays on your device and syncs when you are online.
          </p>
          <p className="mt-2 text-center text-xs font-bold text-faint">
            <Link href="/about" className="hover:text-muted">About</Link> · <Link href="/methodology" className="hover:text-muted">Methodology</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
