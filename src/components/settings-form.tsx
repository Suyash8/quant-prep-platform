'use client';
import { signOutEverywhere } from '@/lib/v5/signout';

import { SyncErrorNotice } from '@/components/sync-error-notice';
import * as React from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Target, UserRound, Palette, ShieldCheck, LogOut, Monitor, Sun, Moon, Flame, Check, Accessibility } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SettingsForm({ user }: { user: { name: string; email: string; role: string; memberSince?: string | Date } }) {
  const { theme: storedTheme, setTheme } = useTheme();
  // next-themes reads localStorage on the client only; render the server's answer (no active option) until mounted, so hydration matches.
  const [themeMounted, setThemeMounted] = React.useState(false); React.useEffect(() => setThemeMounted(true), []);
  const theme = themeMounted ? storedTheme : undefined;
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
    const r = await signOutEverywhere();
    if (r === 'pending') { window.location.assign('/v5/learn'); return; }
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
      <div className="lg:col-span-2 empty:hidden"><SyncErrorNotice /></div>
      {/* gamification summary + daily goal */}
      {gamed && (
        <section className="qf-card p-5 lg:col-span-2">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="icon-tile icon-tile-gold h-11 w-11"><Target className="h-6 w-6" /></span>
              <div className="flex-1 min-w-[180px]">
                <h2 className="font-black">Daily goal</h2>
                <p className="text-[13px] font-semibold text-muted">How much XP do you want to chase each day?</p>
              </div>
              {/* one highlighted chip, the rest are quiet text stats */}
              <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap">
                <span className="chip chip-warning tnum"><Flame className="h-3 w-3" /> {gamed.streakCount}-day streak</span>
                <span className="text-[15px] font-semibold text-muted whitespace-nowrap">Level <span className="font-black text-foreground tnum">{gamed.level}</span></span>
                <span className="text-[15px] font-semibold text-muted whitespace-nowrap tnum"><span className="font-black text-foreground">{gamed.xp.toLocaleString()}</span> XP</span>
                <span className="text-[15px] font-semibold text-muted whitespace-nowrap">best <span className="font-black text-foreground tnum">{gamed.longestStreak}d</span></span>
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
                        ? 'border-accent bg-accent-soft'
                        : 'border-border bg-surface hover:bg-surface-2 hover:border-border-strong',
                    )}
                  >
                    {active && (
                      <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-accent text-on-accent flex items-center justify-center" aria-hidden>
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    <span className={cn('block text-lg font-black tnum', active && 'text-accent-deep dark:text-accent')}>{xp}</span>
                    <span className="block text-[12px] font-extrabold text-muted">XP / day</span>
                    <span className="block text-[12px] font-bold text-muted">{vibe}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* profile */}
      <section className="qf-card p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-neutral h-11 w-11"><UserRound className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Profile</h2>
            <p className="text-[13px] font-semibold text-muted">How your name appears across the app</p>
          </div>
        </div>
        <label className="block mt-4">
          <span className="text-[13px] font-extrabold text-muted uppercase tracking-wide">Display name</span>
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
        <dl className="mt-4 space-y-2 text-[15px] font-semibold flex-1">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
            <dt className="text-muted">Email</dt><dd className="truncate">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
            <dt className="text-muted">Role</dt><dd><span className="chip chip-info">{user.role}</span></dd>
          </div>
          {user.memberSince && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
              <dt className="text-muted">Learning since</dt>
              <dd className="tnum">{new Date(user.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* appearance */}
      <section className="qf-card p-5">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-violet h-11 w-11"><Palette className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Appearance</h2>
            <p className="text-[13px] font-semibold text-muted">Pick the theme that is easy on your eyes</p>
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
                <span className={cn('text-[13px] font-extrabold', active && 'text-violet')}>{opt.label}</span>
              </button>
            );
          })}
        </div>
        {/* one compact note instead of three identical full-width rows */}
        <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-surface-2/60 border border-border/50 px-3 py-2.5 text-[13px] font-semibold text-muted leading-relaxed">
          <Accessibility className="h-4 w-4 text-violet shrink-0 mt-0.5" aria-hidden />
          <span>Reduced-motion preferences are respected and animations tone down automatically. Everything is keyboard-navigable with visible focus rings, and mathematics stays selectable, copyable and searchable.</span>
        </p>
      </section>

      {/* privacy */}
      <section className="qf-card p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-info h-11 w-11"><ShieldCheck className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Data &amp; privacy</h2>
            <p className="text-[13px] font-semibold text-muted">How your data is handled</p>
          </div>
        </div>
        {/* two-column definition grid: labels left on a shared column, values right with consistent padding */}
        <dl className="mt-4 flex-1 grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5 sm:gap-y-2.5 content-start rounded-2xl border border-border/60 bg-surface-2/60 p-3.5 text-[15px] font-semibold">
          {[
            { k: 'Storage', v: 'Account and progress are kept in this deployment’s database. Drafts and the offline library are also kept on this device.' },
            { k: 'Code you run', v: 'Sent to the code runner this deployment is set up with, to be run or checked.' },
            { k: 'Passwords', v: 'Salted scrypt hashes, never plain text' },
            { k: 'Sessions', v: 'httpOnly cookies with signed ids' },
            { k: 'Third parties', v: 'This app loads no analytics, trackers, ads or outside fonts and scripts. The host and any code runner are chosen by whoever runs the deployment.' },
          ].map(row => (
            <React.Fragment key={row.k}>
              <dt className="text-muted sm:pt-0 pt-2">{row.k}</dt>
              <dd className="sm:text-right sm:pr-2 min-w-0">{row.v}</dd>
            </React.Fragment>
          ))}
        </dl>
        <p className="mt-3 text-[12px] font-semibold text-faint leading-relaxed">
          To erase your data, contact the deployment administrator.
        </p>
      </section>

      {/* session */}
      <section className="qf-card p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-danger h-11 w-11"><LogOut className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Session</h2>
            <p className="text-[13px] font-semibold text-muted">Done for now? Your streak will wait for you.</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-[15px] font-semibold flex-1">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
            <dt className="text-muted">Signed in as</dt>
            <dd className="truncate max-w-[180px]">{user.email}</dd>
          </div>
          {gamed && (
            <div className="flex items-start justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
              <dt className="text-muted">Today</dt>
              <dd className="tnum min-w-[7.5rem] text-right">
                {gamed.todayXp} / {gamed.dailyGoalXp} XP
                <span className="prog-track mt-2 block">
                  <span
                    className={cn('prog-fill block', gamed.todayXp >= gamed.dailyGoalXp ? 'prog-fill-gold' : '')}
                    style={{ width: `${Math.min(100, Math.round((gamed.todayXp / Math.max(gamed.dailyGoalXp, 1)) * 100))}%` }}
                  />
                </span>
              </dd>
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
