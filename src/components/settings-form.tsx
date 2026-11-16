'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Target, UserRound, Palette, ShieldCheck, LogOut, Monitor, Sun, Moon,
  Flame, Check, Accessibility, KeyRound, Download, Trash2, AlertTriangle,
  Wifi, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyncErrorNotice } from '@/components/sync-error-notice';
import { setDailyGoalXp, xpSummary, subscribe, wipeLocalLearningData } from '@/lib/client/local-state';
import { broadcast } from '@/lib/client/broadcast';

interface SettingsUser {
  name: string;
  email: string;
  role: string;
  plan?: string;
  timezone?: string;
  emailVerified?: boolean;
  memberSince?: string | Date;
}

export function SettingsForm({ user }: { user?: SettingsUser }) {
  const { theme: storedTheme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = React.useState(false);
  React.useEffect(() => setThemeMounted(true), []);
  const theme = themeMounted ? storedTheme : undefined;
  const router = useRouter();

  const [activeUser, setActiveUser] = React.useState<SettingsUser | null>(user ?? null);
  // Name state
  const [name, setName] = React.useState(user?.name ?? '');
  const [busy, setBusy] = React.useState(false);
  const [swState, setSwState] = React.useState<{ ready: boolean; cachedCount: number | null; refreshing: boolean }>({
    ready: false,
    cachedCount: null,
    refreshing: false,
  });

  // Password state
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [pwBusy, setPwBusy] = React.useState(false);

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteTyped, setDeleteTyped] = React.useState('');
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  // Timezone, email verify & active sessions state
  const [timezone, setTimezone] = React.useState('UTC');
  const [verifyBusy, setVerifyBusy] = React.useState(false);
  const [sessions, setSessions] = React.useState<{ id: string; current: boolean; userAgent: string; lastUsedAt: string }[]>([]);
  const [sessionsBusy, setSessionsBusy] = React.useState(false);

  // Gamification state
  const [gamed, setGamed] = React.useState<{ xp: number; level: number; streakCount: number; longestStreak: number; dailyGoalXp: number; todayXp: number } | null>(null);
  const [goalBusy, setGoalBusy] = React.useState(false);

  const inspectOfflineCache = React.useCallback(async () => {
    try {
      if (!('caches' in window)) return;
      const names = await caches.keys();
      const target = names.find((n) => n.startsWith('qf')) ?? names[0];
      let cachedCount = 0;
      if (target) {
        const cache = await caches.open(target);
        cachedCount = (await cache.keys()).length;
      }
      const swReady = 'serviceWorker' in navigator && Boolean((await navigator.serviceWorker.getRegistration())?.active);
      setSwState((s) => ({ ...s, ready: swReady || cachedCount > 0, cachedCount }));
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    if (!user) {
      try {
        const raw = window.localStorage.getItem('qf-chrome-user');
        if (raw) {
          const parsed = JSON.parse(raw) as SettingsUser;
          if (parsed?.email) {
            setActiveUser(parsed);
            setName((prev) => prev || parsed.name || '');
          }
        }
      } catch { /* ignore */ }
      if (typeof navigator === 'undefined' || navigator.onLine) {
        fetch('/api/auth/me')
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.user) {
              setActiveUser(d.user);
              setName(d.user.name ?? '');
              if (d.user.timezone) setTimezone(d.user.timezone);
              try { window.localStorage.setItem('qf-chrome-user', JSON.stringify(d.user)); } catch {}
            }
          })
          .catch(() => {});
        fetch('/api/settings/sessions')
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { sessions?: { id: string; current: boolean; userAgent: string; lastUsedAt: string }[] } | null) => {
            if (d?.sessions) setSessions(d.sessions);
          })
          .catch(() => {});
      }
    }

    const syncLocalXp = () => {
      const s = xpSummary();
      setGamed((prev) => ({
        xp: Math.max(prev?.xp ?? 0, s.xp),
        level: Math.max(prev?.level ?? 1, s.level),
        streakCount: Math.max(prev?.streakCount ?? 0, s.streakCount),
        longestStreak: Math.max(prev?.longestStreak ?? 0, s.longestStreak),
        dailyGoalXp: s.dailyGoalXp,
        todayXp: Math.max(prev?.todayXp ?? 0, s.todayXp),
      }));
    };
    syncLocalXp();
    const unsub = subscribe(syncLocalXp);

    if (typeof navigator === 'undefined' || navigator.onLine) {
      fetch('/api/gamification')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setGamed(d);
        })
        .catch(() => {});
    }
    inspectOfflineCache();
    return () => unsub();
  }, [user, inspectOfflineCache]);

  async function refreshOfflineCache() {
    if (!('serviceWorker' in navigator)) {
      toast.info('Service worker offline caching is not available in this browser.');
      return;
    }
    setSwState((s) => ({ ...s, refreshing: true }));
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: 'QF3_DOWNLOAD_ALL' });
      toast.success('Refreshing offline lessons, problems, and study packs in the background.');
      setTimeout(() => {
        inspectOfflineCache();
        setSwState((s) => ({ ...s, refreshing: false }));
      }, 2500);
    } catch {
      setSwState((s) => ({ ...s, refreshing: false }));
    }
  }

  async function saveProfile(patch: { name?: string; timezone?: string }) {
    setBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Save failed.');
        return;
      }
      if (activeUser) {
        const nextUser = { ...activeUser, ...patch };
        setActiveUser(nextUser);
        try { window.localStorage.setItem('qf-chrome-user', JSON.stringify(nextUser)); } catch {}
        window.dispatchEvent(new CustomEvent('qf:auth-refresh'));
        broadcast('auth-changed', nextUser);
      }
      toast.success('Profile saved.');
      router.refresh();
    } catch {
      toast.error('Connect to the internet to update your account profile.');
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setVerifyBusy(true);
    try {
      const res = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error ?? 'Could not send verification email.'); return; }
      toast.success(d.devVerifyPath ? `Verification link logged in dev server (${d.devVerifyPath})` : 'Verification email sent.');
    } finally {
      setVerifyBusy(false);
    }
  }

  async function revokeOthers() {
    setSessionsBusy(true);
    try {
      const res = await fetch('/api/settings/sessions', { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error ?? 'Could not revoke sessions.'); return; }
      setSessions((s) => s.filter((x) => x.current));
      toast.success(`Signed out ${d.revoked ?? 0} other session(s).`);
    } finally {
      setSessionsBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setPwBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to update password.');
        return;
      }
      toast.success('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setPwBusy(false);
    }
  }

  async function deleteAccount() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    if (deleteTyped !== 'DELETE' || !deletePassword) {
      toast.error('Enter your password and type DELETE to confirm.');
      return;
    }

    setDeleteBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: deletePassword, confirm: 'DELETE' }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || 'Could not delete account. Please try again.');
        return;
      }
      try { window.localStorage.removeItem('qf-chrome-user'); } catch {}
      await wipeLocalLearningData();
      window.dispatchEvent(new CustomEvent('qf:auth-refresh'));
      broadcast('auth-changed', null);
      toast.success('Your account and all associated data have been deleted.');
      router.push('/register');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmCurrent: true }),
    }).catch(() => {});
    try { window.localStorage.removeItem('qf-chrome-user'); } catch {}
    await wipeLocalLearningData();
    window.dispatchEvent(new CustomEvent('qf:auth-refresh'));
    broadcast('auth-changed', null);
    router.push('/login');
  }

  async function setGoal(xp: number) {
    setGoalBusy(true);
    setDailyGoalXp(xp);
    setGamed(g => (g ? { ...g, dailyGoalXp: xp } : g));
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast.success(`Daily goal set to ${xp} XP (saved locally — will sync online).`);
        return;
      }
      const res = await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoalXp: xp }),
      });
      if (!res.ok) {
        toast.success(`Daily goal set to ${xp} XP (saved locally).`);
        return;
      }
      toast.success(`Daily goal set to ${xp} XP.`);
    } catch {
      toast.success(`Daily goal set to ${xp} XP (saved locally).`);
    } finally {
      setGoalBusy(false);
    }
  }

  const themeOptions = [
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 max-w-4xl min-w-0">
      <div className="lg:col-span-2 empty:hidden"><SyncErrorNotice /></div>

      {/* Gamification summary + daily goal */}
      {gamed && (
        <section className="qf-card p-5 lg:col-span-2">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="icon-tile icon-tile-gold h-11 w-11"><Target className="h-6 w-6" /></span>
              <div className="flex-1 min-w-[180px]">
                <h2 className="font-black">Daily goal</h2>
                <p className="text-[13px] font-semibold text-muted">How much XP do you want to chase each day?</p>
              </div>
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

      {/* Profile */}
      <section className="qf-card p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-neutral h-11 w-11"><UserRound className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Profile</h2>
            <p className="text-[13px] font-semibold text-muted">How your identity appears across the platform</p>
          </div>
        </div>
        <label htmlFor="settings-display-name" className="block mt-4">
          <span className="text-[13px] font-extrabold text-muted uppercase tracking-wide">Display name</span>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-1.5">
            <input
              id="settings-display-name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="qf-input min-w-0 flex-1"
            />
            <button
              onClick={() => saveProfile({ name })}
              disabled={busy || name === (activeUser?.name ?? '')}
              className="btn3d btn3d-sm shrink-0"
            >
              {busy ? 'Saving…' : name === (activeUser?.name ?? '') ? (<><Check className="h-3.5 w-3.5" /> Saved</>) : 'Save'}
            </button>
          </div>
        </label>
        <label htmlFor="settings-timezone" className="block mt-3">
          <span className="text-[13px] font-extrabold text-muted uppercase tracking-wide">Study timezone (streak rollover)</span>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-1.5">
            <select
              id="settings-timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="qf-select min-w-0 flex-1"
            >
              {['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => saveProfile({ timezone })}
              disabled={busy || timezone === (activeUser?.timezone ?? 'UTC')}
              className="btn3d btn3d-ghost btn3d-sm shrink-0"
            >
              Save TZ
            </button>
          </div>
        </label>
        <dl className="mt-4 space-y-2 text-[15px] font-semibold flex-1">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
            <dt className="text-muted">Email</dt>
            <dd className="truncate flex items-center gap-2">
              <span className="truncate">{activeUser?.email ?? '—'}</span>
              {activeUser?.emailVerified === false && (
                <button type="button" onClick={resendVerification} disabled={verifyBusy} className="chip chip-warning cursor-pointer">
                  {verifyBusy ? 'Sending…' : 'Verify'}
                </button>
              )}
              {activeUser?.emailVerified === true && <span className="chip chip-success">verified</span>}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
            <dt className="text-muted">Role</dt>
            <dd><span className="chip chip-info">{activeUser?.role ?? 'learner'}</span></dd>
          </div>
          {activeUser?.memberSince && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
              <dt className="text-muted">Member since</dt>
              <dd className="tnum">{new Date(activeUser.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Appearance */}
      <section className="qf-card p-5">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-violet h-11 w-11"><Palette className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Appearance</h2>
            <p className="text-[13px] font-semibold text-muted">Pick the color mode that matches your focus</p>
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
        <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-surface-2/60 border border-border/50 px-3 py-2.5 text-[13px] font-semibold text-muted leading-relaxed">
          <Accessibility className="h-4 w-4 text-violet shrink-0 mt-0.5" aria-hidden />
          <span>Reduced-motion preferences are respected. Keyboard navigation, visible focus indicators, and accessible math rendering are active throughout.</span>
        </p>
      </section>

      {/* Security: Password change */}
      <section className="qf-card p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-accent h-11 w-11"><KeyRound className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Security</h2>
            <p className="text-[13px] font-semibold text-muted">Update your account password</p>
          </div>
        </div>
        <form onSubmit={changePassword} className="mt-4 space-y-3">
          <div>
            <label htmlFor="settings-current-pw" className="text-[12px] font-extrabold text-muted uppercase tracking-wide block mb-1">Current Password</label>
            <input
              id="settings-current-pw"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="qf-input w-full"
              placeholder="••••••••••••"
              required
            />
          </div>
          <div>
            <label htmlFor="settings-new-pw" className="text-[12px] font-extrabold text-muted uppercase tracking-wide block mb-1">New Password (min 8 chars)</label>
            <input
              id="settings-new-pw"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="qf-input w-full"
              placeholder="••••••••••••"
              minLength={8}
              required
            />
          </div>
          <div>
            <label htmlFor="settings-confirm-pw" className="text-[12px] font-extrabold text-muted uppercase tracking-wide block mb-1">Confirm New Password</label>
            <input
              id="settings-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="qf-input w-full"
              placeholder="••••••••••••"
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            disabled={pwBusy || !currentPassword || !newPassword}
            className="btn3d btn3d-sm w-full mt-2"
          >
            {pwBusy ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      </section>

      {/* Data & privacy / Export */}
      <section className="qf-card p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-info h-11 w-11"><ShieldCheck className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Data &amp; privacy</h2>
            <p className="text-[13px] font-semibold text-muted">Your rights under GDPR &amp; CCPA</p>
          </div>
        </div>
        <p className="mt-3 text-[14px] font-semibold text-muted leading-relaxed">
          You own your data. You can download an entire machine-readable JSON archive of your account, attempts, and XP ledger at any time.
        </p>
        <div className="mt-4">
          <a
            href="/api/settings/export"
            download
            className="btn3d btn3d-sm btn3d-ghost w-full flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" /> Export my personal data (JSON)
          </a>
        </div>
      </section>

      {/* Offline storage */}
      <section className="qf-card p-5 lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-accent h-11 w-11"><Wifi className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Offline availability</h2>
            <p className="text-[13px] font-semibold text-muted">
              {swState.ready
                ? `Lessons, coding problems, assessments, and progress are cached for seamless offline study${swState.cachedCount !== null ? ` (${swState.cachedCount} items cached)` : ''}.`
                : 'Background sync prepares your lessons, problems, and drills automatically on first load.'}
            </p>
          </div>
        </div>
        <button
          onClick={refreshOfflineCache}
          disabled={swState.refreshing}
          className="btn3d btn3d-sm btn3d-ghost shrink-0"
        >
          <RefreshCw className={cn('h-4 w-4', swState.refreshing && 'animate-spin')} />
          {swState.refreshing ? 'Syncing…' : 'Refresh offline cache'}
        </button>
      </section>

      {/* Session */}
      <section className="qf-card p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-neutral h-11 w-11"><LogOut className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Active sessions</h2>
            <p className="text-[13px] font-semibold text-muted">Signed in as {activeUser?.email ?? 'local session'}</p>
          </div>
        </div>
        <div className="mt-4 flex-1 space-y-2">
          <p className="text-[14px] font-semibold text-muted">
            Logging out clears cached progress on this browser and signs out this session.
          </p>
          {sessions.length > 0 && (
            <ul className="space-y-1.5 text-[12px] font-semibold text-muted max-h-28 overflow-y-auto thin-scroll">
              {sessions.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2/60 px-2.5 py-1.5">
                  <span className="truncate">{s.current ? 'This device · ' : ''}{s.userAgent.slice(0, 42)}</span>
                  <span className="tnum text-faint shrink-0">{new Date(s.lastUsedAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={revokeOthers}
              disabled={sessionsBusy}
              className="btn3d btn3d-sm btn3d-ghost flex-1"
            >
              {sessionsBusy ? 'Signing out…' : 'Sign out other devices'}
            </button>
          )}
          <button
            onClick={logout}
            className="btn3d btn3d-sm btn3d-ghost flex-1"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </section>

      {/* Danger Zone: Account Deletion */}
      <section className="qf-card p-5 border-danger/30 lg:col-span-2">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-danger h-11 w-11"><Trash2 className="h-6 w-6 text-danger" /></span>
          <div>
            <h2 className="font-black text-danger">Danger zone</h2>
            <p className="text-[13px] font-semibold text-muted">Permanent account removal &amp; subscription cancellation</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-danger/20 bg-danger/5 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-[14px]">Delete account and all learning data</p>
              <p className="text-[13px] text-muted">
                Cancels any active Pro subscription and permanently deletes all progress, attempts, and support history.
              </p>
            </div>
            {!deleteConfirm && (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="btn3d btn3d-sm !border-danger/50 !text-danger hover:!bg-danger-soft shrink-0"
              >
                <Trash2 className="h-4 w-4" /> Delete account
              </button>
            )}
          </div>
          {deleteConfirm && (
            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-danger/20">
              <div>
                <label htmlFor="delete-account-pw" className="block text-[12px] font-extrabold text-muted uppercase mb-1">Current password</label>
                <input
                  id="delete-account-pw"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="qf-input w-full"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="delete-account-confirm" className="block text-[12px] font-extrabold text-muted uppercase mb-1">Type DELETE to confirm</label>
                <input
                  id="delete-account-confirm"
                  type="text"
                  value={deleteTyped}
                  onChange={(e) => setDeleteTyped(e.target.value)}
                  className="qf-input w-full"
                  placeholder="DELETE"
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setDeleteConfirm(false); setDeletePassword(''); setDeleteTyped(''); }}
                  className="btn3d btn3d-sm btn3d-ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={deleteBusy || deleteTyped !== 'DELETE' || !deletePassword}
                  className="btn3d btn3d-sm !bg-danger !text-white !border-danger disabled:opacity-50"
                >
                  {deleteBusy ? 'Deleting…' : 'Yes, permanently delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
