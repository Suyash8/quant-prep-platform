'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Target, UserRound, Palette, ShieldCheck, LogOut, Monitor, Sun, Moon, Flame, Zap, Star, Trophy, Check, Accessibility, Keyboard, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SettingsForm({ user }: { user: { name: string; email: string; role: string; memberSince?: string | Date } }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [name, setName] = React.useState(user.name);
  const [busy, setBusy] = React.useState(false);

  async function saveName() {
    setBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { toast.error('Save failed.'); return; }
      toast.success('Profile saved.');
      router.refresh();
    } finally { setBusy(false); }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const [gamed, setGamed] = React.useState<{ xp: number; level: number; streakCount: number; longestStreak: number; dailyGoalXp: number; todayXp: number } | null>(null);
  const [goalBusy, setGoalBusy] = React.useState(false);
  React.useEffect(() => {
    fetch('/api/gamification').then(r => (r.ok ? r.json() : null)).then(setGamed).catch(() => {});
  }, []);

  async function setGoal(xp: number) {
    setGoalBusy(true);
    try {
      const res = await fetch('/api/gamification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoalXp: xp }),
      });
      if (!res.ok) { toast.error('Could not save goal.'); return; }
      setGamed(g => (g ? { ...g, dailyGoalXp: xp } : g));
      toast.success(`Daily goal set to ${xp} XP.`);
    } finally { setGoalBusy(false); }
  }

  const themeOptions = [
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2 max-w-4xl">
      {/* gamification summary + daily goal */}
      {gamed && (
        <section className="qf-card p-5 lg:col-span-2 relative overflow-hidden">
          <div className="relative">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="icon-tile-gold h-11 w-11"><Target className="h-6 w-6" /></span>
              <div className="flex-1 min-w-[180px]">
                <h2 className="font-black">Daily goal</h2>
                <p className="text-xs font-semibold text-muted">How much XP do you want to chase each day?</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="chip chip-warning tnum"><Star className="h-3 w-3" /> Level {gamed.level}</span>
                <span className="chip chip-gold tnum"><Zap className="h-3 w-3" /> {gamed.xp.toLocaleString()} XP</span>
                <span className="chip chip-danger tnum"><Flame className="h-3 w-3" /> {gamed.streakCount}d streak</span>
                <span className="chip tnum"><Trophy className="h-3 w-3" /> best {gamed.longestStreak}d</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[20, 50, 100, 200].map(xp => {
                const active = gamed.dailyGoalXp === xp;
                const vibe = xp === 20 ? 'casual' : xp === 50 ? 'regular' : xp === 100 ? 'serious' : 'intense';
                return (
                  <button
                    key={xp}
                    onClick={() => setGoal(xp)}
                    disabled={goalBusy}
                    aria-pressed={active}
                    className={cn(
                      'press rounded-2xl border-2 p-3 text-center relative transition-all',
                      active
                        ? 'border-accent bg-accent-soft shadow-[0_4px_0_0_var(--accent-deep)] -translate-y-0.5'
                        : 'border-border bg-surface hover:bg-surface-2 hover:border-border-strong',
                    )}
                  >
                    {active && (
                      <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-accent text-white flex items-center justify-center shadow-[0_2px_0_0_var(--accent-deep)]" aria-hidden>
                        <Zap className="h-3.5 w-3.5" strokeWidth={2.75} />
                      </span>
                    )}
                    <span className={cn('block text-lg font-black tnum', active && 'text-accent-deep dark:text-accent')}>{xp}</span>
                    <span className="block text-[11px] font-extrabold text-muted">XP / day</span>
                    <span className="block text-[10px] font-bold text-faint">{vibe}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* profile */}
      <section className="qf-card p-5">
        <div className="flex items-center gap-3">
          <span className="icon-tile h-11 w-11"><UserRound className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Profile</h2>
            <p className="text-xs font-semibold text-muted">How your name appears across the app</p>
          </div>
        </div>
        <label className="block mt-4">
          <span className="text-xs font-extrabold text-muted uppercase tracking-wide">Display name</span>
          <div className="flex gap-2 mt-1.5">
            <input value={name} onChange={e => setName(e.target.value)} className="qf-input flex-1" aria-label="Display name" />
            <button
              onClick={saveName}
              disabled={busy || name === user.name}
              className='btn3d btn3d-sm shrink-0'
            >
              {busy ? 'Saving…' : name === user.name ? (<><Check className="h-3.5 w-3.5" /> Saved</>) : 'Save'}
            </button>
          </div>
        </label>
        <dl className="mt-4 space-y-2 text-sm font-semibold">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
            <dt className="text-muted">Email</dt><dd className="truncate">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
            <dt className="text-muted">Role</dt><dd><span className="chip chip-info">{user.role}</span></dd>
          </div>
        </dl>
      </section>

      {/* appearance */}
      <section className="qf-card p-5">
        <div className="flex items-center gap-3">
          <span className="icon-tile-violet h-11 w-11"><Palette className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Appearance</h2>
            <p className="text-xs font-semibold text-muted">Pick the theme that is easy on your eyes</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Theme">
          {themeOptions.map(opt => {
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'press rounded-2xl border-2 px-2 py-3.5 flex flex-col items-center gap-1.5 transition-all',
                  active ? 'border-violet bg-violet-soft shadow-[0_4px_0_0_var(--violet)] -translate-y-0.5' : 'border-border bg-surface hover:bg-surface-2',
                )}
              >
                <opt.icon className={cn('h-5 w-5', active ? 'text-violet' : 'text-muted')} />
                <span className={cn('text-xs font-extrabold', active && 'text-violet')}>{opt.label}</span>
              </button>
            );
          })}
        </div>
        <ul className="mt-4 grid gap-2 text-xs font-semibold">
          {[
            { icon: Accessibility, text: 'Reduced-motion preferences are respected, animations tone down automatically.' },
            { icon: Keyboard, text: 'Everything is keyboard-navigable with visible focus rings.' },
            { icon: Sigma, text: 'Mathematics stays selectable, copyable and searchable.' },
          ].map(row => (
            <li key={row.text} className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 border border-border/50 px-3 py-2.5">
              <row.icon className="h-4 w-4 text-violet shrink-0" />
              <span className="leading-relaxed">{row.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* privacy */}
      <section className="qf-card p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-info h-11 w-11"><ShieldCheck className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Data &amp; privacy</h2>
            <p className="text-xs font-semibold text-muted">Your data stays in this deployment</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm font-semibold flex-1">
          {[
            { k: 'Storage', v: 'This deployment’s own database, nothing leaves it' },
            { k: 'Passwords', v: 'Salted scrypt hashes, never plain text' },
            { k: 'Sessions', v: 'httpOnly cookies with signed ids' },
            { k: 'Third parties', v: 'None, no analytics, no trackers, no ads' },
          ].map(row => (
            <li key={row.k} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
              <span className="text-muted shrink-0">{row.k}</span>
              <span className="text-right">{row.v}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] font-semibold text-faint leading-relaxed">
          To erase your data, contact the deployment administrator.
        </p>
      </section>

      {/* session */}
      <section className="qf-card p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-danger h-11 w-11"><LogOut className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Session</h2>
            <p className="text-xs font-semibold text-muted">Done for now? Your streak will wait for you.</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-sm font-semibold flex-1">
          {user.memberSince && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
              <dt className="text-muted">Learning since</dt>
              <dd className="tnum">{new Date(user.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
            <dt className="text-muted">Signed in as</dt>
            <dd className="truncate max-w-[180px]">{user.email}</dd>
          </div>
          {gamed && (
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Today</dt>
                <dd className="tnum">{gamed.todayXp} / {gamed.dailyGoalXp} XP</dd>
              </div>
              <div className="prog-track mt-2">
                <div
                  className={cn('prog-fill', gamed.todayXp >= gamed.dailyGoalXp ? 'prog-fill-gold' : '')}
                  style={{ width: `${Math.min(100, Math.round((gamed.todayXp / Math.max(gamed.dailyGoalXp, 1)) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </dl>
        <button onClick={logout} className="btn3d btn3d-sm btn3d-ghost !border-danger/40 !text-danger hover:!bg-danger-soft mt-4 w-full">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>
    </div>
  );
}
