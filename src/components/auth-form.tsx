'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sigma, Zap, Flame, Trophy, Undo2, Code2, BookOpenCheck, ShieldCheck,
  Mail, Lock, User, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Mascot } from '@/components/brand/mascot';

export function AuthForm({ mode, stats }: { mode: 'login' | 'register'; stats?: { lessons: number; labs: number; problems: number } }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });

  const lessons = stats?.lessons ?? 0;
  const labs = stats?.labs ?? 0;
  const problems = stats?.problems ?? 0;

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

  const pwLen = password.length;
  const strength = Math.min(100, pwLen >= 12 ? 100 : pwLen >= 8 ? 65 : pwLen >= 5 ? 35 : pwLen > 0 ? 15 : 0);
  const strengthLabel = pwLen === 0 ? '' : strength >= 100 ? 'Strong' : strength >= 65 ? 'Good' : strength >= 35 ? 'Fair' : 'Weak';

  const perks = mode === 'register'
    ? [
        { icon: BookOpenCheck, text: `${lessons} lessons sequenced by a real prerequisite graph` },
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
    { icon: BookOpenCheck, text: 'Lesson one of the path, about six minutes' },
    { icon: Zap, text: 'Your first 20 XP and the daily goal ring' },
    { icon: Undo2, text: 'The diagnostic offer, so you can skip what you know' },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* playful background blobs and floating math symbols */}
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-accent-soft blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 bottom-8 h-56 w-56 rounded-full bg-info-soft blur-2xl" aria-hidden />
      <span className="pointer-events-none absolute left-[8%] top-[22%] text-4xl font-black text-accent/15 anim-float" aria-hidden>Σ</span>
      <span className="pointer-events-none absolute right-[10%] top-[16%] text-3xl font-black text-info/20 anim-float-slow" aria-hidden>σ</span>
      <span className="pointer-events-none absolute left-[12%] bottom-[14%] text-3xl font-black text-accent/15 anim-float-slow" aria-hidden>Δ</span>

      <div className="flex-1 flex items-center justify-center px-4 py-10 relative">
      <div className="w-full max-w-4xl relative grid lg:grid-cols-[1fr_400px] gap-8 items-stretch">
        {/* the pitch panel, fills the left half with real content */}
        <aside className="hidden lg:block">
          <div className="qf-card-flat p-6 relative overflow-hidden bg-dots h-full">
            <Mascot pose={mode === 'login' ? 'wave' : 'cheer'} size={84} className="absolute right-5 top-5 anim-bob" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="h-11 w-11 rounded-2xl bg-accent text-on-accent flex items-center justify-center shadow-[0_4px_0_0_var(--accent-deep)]">
                  <Sigma className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="font-black tracking-tight text-lg leading-none">QuantFoundry</p>
                  <p className="text-[12px] font-bold text-faint uppercase tracking-[0.12em] mt-1">Quant dev, built properly</p>
                </div>
              </div>

              {(

                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  <div className="stat-tile !p-3">
                    <div className="stat-body">
                      <p className="stat-value !text-xl tnum">{lessons}</p>
                      <p className="stat-label">lessons</p>
                    </div>
                  </div>
                  <div className="stat-tile !p-3">
                    <div className="stat-body">
                      <p className="stat-value !text-xl tnum">{labs}</p>
                      <p className="stat-label">live labs</p>
                    </div>
                  </div>
                  <div className="stat-tile !p-3">
                    <div className="stat-body">
                      <p className="stat-value !text-xl tnum">{problems}</p>
                      <p className="stat-label">code problems</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-5 text-[12px] font-black uppercase tracking-[0.14em] text-faint">
                What you get
              </p>
              <ul className="mt-3.5 space-y-3.5">
                {perks.map(p => (
                  <li key={p.text} className="flex items-start gap-3">
                    <span className="h-8 w-8 shrink-0 rounded-xl bg-accent-soft text-accent-deep dark:text-accent flex items-center justify-center">
                      <p.icon className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    <span className="text-[15px] font-bold leading-snug pt-1">{p.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-5 border-t-2 border-border">
                <div className="flex items-center justify-between text-[15px] font-black">
                  <span className="text-muted">Price</span>
                  <span className="text-accent-deep dark:text-accent">Free, while we earn your trust</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[15px] font-black">
                  <span className="text-muted">Catch</span>
                  <span>You actually have to study</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* the form, vertically centered in its stretched column */}
        <div className="w-full max-w-sm mx-auto lg:mx-0 lg:justify-self-center flex flex-col justify-center items-center">
          <div className="text-center mb-6">
            <span className="mx-auto h-14 w-14 rounded-3xl bg-accent text-on-accent flex items-center justify-center shadow-[0_5px_0_0_var(--accent-deep)] anim-bob">
              <Sigma className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight">
              {mode === 'register' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-[15px] font-semibold text-muted">
              {mode === 'register'
                ? 'Takes thirty seconds, then the diagnostic finds your starting point.'
                : 'Pick up where you left off, streaks are waiting.'}
            </p>
          </div>
          <form onSubmit={submit} className="qf-card p-6 space-y-4 w-full">
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="text-[15px] font-extrabold">Name</label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" aria-hidden />
                  <input
                    id="name" type="text" required minLength={2} value={name}
                    onChange={e => setName(e.target.value)}
                    className="qf-input !h-12 !pl-10"
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="email" className="text-[15px] font-extrabold">Email</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" aria-hidden />
                <input
                  id="email" type="email" required value={email}
                  onChange={e => { setEmail(e.target.value); setTouched(t => ({ ...t, email: true })); }}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  className="qf-input !h-12 !pl-10"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {mode === 'register' && touched.email && email.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && (
                <p className="mt-1 text-[13px] font-bold text-danger">That does not look like an email address yet.</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="text-[15px] font-extrabold">Password</label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" aria-hidden />
                <input
                  id="password" type={showPw ? 'text' : 'password'} required minLength={mode === 'register' ? 8 : 1}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setTouched(t => ({ ...t, password: true })); }}
                  className="qf-input !h-12 !pl-10 !pr-11"
                  placeholder="••••••••"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  aria-describedby={mode === 'register' ? 'pw-hint' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-xl text-muted hover:bg-surface-2"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <>
                  <div className="mt-2 flex items-center gap-2" aria-hidden>
                    <span className="flex gap-1.5 flex-1">
                      {[1, 2, 3, 4].map(seg => (
                        <span
                          key={seg}
                          className={`h-2 flex-1 rounded-full transition-colors ${
                            strength >= seg * 25
                              ? strength >= 100 ? 'bg-accent' : strength >= 65 ? 'bg-accent-strong' : strength >= 35 ? 'bg-info-strong' : 'bg-danger-strong'
                              : 'bg-surface-3'
                          }`}
                        />
                      ))}
                    </span>
                    {strengthLabel && (
                      <span className={`text-[12px] font-black ${strength >= 65 ? 'text-accent-deep dark:text-accent' : strength >= 35 ? 'text-info-strong dark:text-info' : 'text-danger'}`}>
                        {strengthLabel}
                      </span>
                    )}
                  </div>
                  <p id="pw-hint" className="mt-1.5 text-[13px] font-bold text-muted">At least 8 characters.</p>
                </>
              )}
            </div>
            {error && (
              <p role="alert" className="text-[15px] font-bold text-danger bg-danger-soft rounded-xl px-3 py-2 anim-shake">{error}</p>
            )}
            <button type="submit" disabled={busy} className="btn3d w-full !py-3.5 text-base">
              {busy ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
            {mode === 'register' && (
              <div className="pt-1">
                <p className="text-[12px] font-black uppercase tracking-[0.14em] text-faint">Your first five minutes</p>
                <ul className="mt-2 space-y-2">
                  {firstFive.map(f => (
                    <li key={f.text} className="flex items-center gap-2.5 text-[13px] font-bold">
                      <span className="icon-tile-sm icon-tile-accent !h-7 !w-7"><f.icon className="!h-3.5 !w-3.5" aria-hidden /></span>
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[15px] text-center font-semibold text-muted">
              {mode === 'register' ? (
                <>Already have an account? <Link href="/login" className="text-accent-deep dark:text-accent hover:underline font-extrabold">Sign in</Link></>
              ) : (
                <>New here? <Link href="/register" className="text-accent-deep dark:text-accent hover:underline font-extrabold">Create an account</Link></>
              )}
            </p>
          </form>
          <p className="mt-4 text-center text-[13px] font-semibold text-muted max-w-xs">
            No card needed. Your progress stays on your device and syncs when you are online.
          </p>
        </div>
      </div>
      </div>

      {/* anchored footer bar instead of links floating mid-page */}
      <footer className="relative border-t-2 border-border/70 py-4 mt-auto">
        <p className="text-center text-[13px] font-semibold text-muted">
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          <span className="mx-2 text-faint" aria-hidden>·</span>
          <Link href="/methodology" className="hover:text-foreground transition-colors">Methodology</Link>
          <span className="mx-2 text-faint" aria-hidden>·</span>
          <Link href="/curriculum" className="hover:text-foreground transition-colors">Peek at the curriculum</Link>
        </p>
      </footer>
    </div>
  );
}
