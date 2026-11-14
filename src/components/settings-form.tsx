'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Target, UserRound, Palette, ShieldCheck, LogOut, Monitor, Sun, Moon,
  Flame, Check, Accessibility, KeyRound, Download, Trash2, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyncErrorNotice } from '@/components/sync-error-notice';

export function SettingsForm({ user }: { user: { name: string; email: string; role: string; memberSince?: string | Date } }) {
  const { theme: storedTheme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = React.useState(false);
  React.useEffect(() => setThemeMounted(true), []);
  const theme = themeMounted ? storedTheme : undefined;
  const router = useRouter();

  // Name state
  const [name, setName] = React.useState(user.name);
  const [busy, setBusy] = React.useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [pwBusy, setPwBusy] = React.useState(false);

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  // Gamification state
  const [gamed, setGamed] = React.useState<{ xp: number; level: number; streakCount: number; longestStreak: number; dailyGoalXp: number; todayXp: number } | null>(null);
  const [goalBusy, setGoalBusy] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/gamification').then(r => (r.ok ? r.json() : null)).then(setGamed).catch(() => {});
  }, []);

  async function saveName() {
    setBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Save failed.');
        return;
      }
      toast.success('Profile saved.');
      router.refresh();
    } finally {
      setBusy(false);
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

    setDeleteBusy(true);
    try {
      const res = await fetch('/api/settings', { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Could not delete account. Please try again.');
        return;
      }
      toast.success('Your account and all associated data have been deleted.');
      router.push('/register');
      router.refresh();
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
    router.push('/login');
    router.refresh();
  }

  async function setGoal(xp: number) {
    setGoalBusy(true);
    try {
      const res = await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoalXp: xp }),
      });
      if (!res.ok) {
        toast.error('Could not save goal.');
        return;
      }
      setGamed(g => (g ? { ...g, dailyGoalXp: xp } : g));
      toast.success(`Daily goal set to ${xp} XP.`);
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
        <label className="block mt-4">
          <span className="text-[13px] font-extrabold text-muted uppercase tracking-wide">Display name</span>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-1.5">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="qf-input min-w-0 flex-1"
              aria-label="Display name"
            />
            <button
              onClick={saveName}
              disabled={busy || name === user.name}
              className="btn3d btn3d-sm shrink-0"
            >
              {busy ? 'Saving…' : name === user.name ? (<><Check className="h-3.5 w-3.5" /> Saved</>) : 'Save'}
            </button>
          </div>
        </label>
        <dl className="mt-4 space-y-2 text-[15px] font-semibold flex-1">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
            <dt className="text-muted">Email</dt>
            <dd className="truncate">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
            <dt className="text-muted">Role</dt>
            <dd><span className="chip chip-info">{user.role}</span></dd>
          </div>
          {user.memberSince && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
              <dt className="text-muted">Member since</dt>
              <dd className="tnum">{new Date(user.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</dd>
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
            <label className="text-[12px] font-extrabold text-muted uppercase tracking-wide block mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="qf-input w-full"
              placeholder="••••••••••••"
              required
            />
          </div>
          <div>
            <label className="text-[12px] font-extrabold text-muted uppercase tracking-wide block mb-1">New Password (min 8 chars)</label>
            <input
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
            <label className="text-[12px] font-extrabold text-muted uppercase tracking-wide block mb-1">Confirm New Password</label>
            <input
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

      {/* Session */}
      <section className="qf-card p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-neutral h-11 w-11"><LogOut className="h-6 w-6" /></span>
          <div>
            <h2 className="font-black">Active session</h2>
            <p className="text-[13px] font-semibold text-muted">Signed in as {user.email}</p>
          </div>
        </div>
        <div className="mt-4 flex-1">
          <p className="text-[14px] font-semibold text-muted">
            Logging out ends your authenticated session on this browser. Your progress and streaks remain saved.
          </p>
        </div>
        <button
          onClick={logout}
          className="btn3d btn3d-sm btn3d-ghost mt-4 w-full"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>

      {/* Danger Zone: Account Deletion */}
      <section className="qf-card p-5 border-danger/30 lg:col-span-2">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-danger h-11 w-11"><Trash2 className="h-6 w-6 text-danger" /></span>
          <div>
            <h2 className="font-black text-danger">Danger zone</h2>
            <p className="text-[13px] font-semibold text-muted">Permanent account removal</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-danger/20 bg-danger/5 p-4">
          <div>
            <p className="font-bold text-[14px]">Delete account and all learning data</p>
            <p className="text-[13px] text-muted">
              Once deleted, your profile, test submissions, streaks, and mastery progress cannot be recovered.
            </p>
          </div>
          {deleteConfirm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="btn3d btn3d-sm btn3d-ghost"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleteBusy}
                className="btn3d btn3d-sm !bg-danger !text-white !border-danger"
              >
                {deleteBusy ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="btn3d btn3d-sm !border-danger/50 !text-danger hover:!bg-danger-soft shrink-0"
            >
              <Trash2 className="h-4 w-4" /> Delete account
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
