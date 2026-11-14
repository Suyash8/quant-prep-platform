'use client';
import { signOutEverywhere } from '@/lib/v5/signout';

import { APP_VERSION } from '@/lib/version';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import * as React from 'react';
import {
  Activity, BarChart3, BookOpenCheck, BrainCircuit, Briefcase, CloudOff, Code2,
  FlaskConical, GraduationCap, Home, Map as MapIcon, Moon, PersonStanding,
  Settings, Sigma, Sun, Timer, Undo2, Flame, Zap, ShieldCheck, FolderKanban,
  LogOut, ChevronDown, Wifi, UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { section: 'Learn', items: [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/curriculum', label: 'Path', icon: MapIcon },
    { href: '/lab', label: 'Labs', icon: FlaskConical },
    { href: '/revision', label: 'Revise', icon: Undo2 },
    { href: '/drills', label: 'Drills', icon: Timer },
  ]},
  { section: 'Practice', items: [
    { href: '/practice', label: 'Code', icon: Code2 },
    { href: '/assessments', label: 'Tests', icon: BookOpenCheck },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
  ]},
  { section: 'Career', items: [
    { href: '/career', label: 'Career', icon: Briefcase },
    { href: '/analytics', label: 'Stats', icon: BarChart3 },
    { href: '/methodology', label: 'Method', icon: GraduationCap },
  ]},
];

/* ---------------- gamification HUD state (local-first, v3) ---------------- */

import { getState, subscribe, xpSummary, hydrate, getQueueLength, scheduleFlush } from '@/lib/client/local-state';

interface HudData {
  xp: number;
  level: number;
  streakCount: number;
  todayXp: number;
  dailyGoalXp: number;
}

/** Signal that XP changed (award happened) so the HUD refreshes. */
export function refreshHud() {
  window.dispatchEvent(new CustomEvent('qf:hud-refresh'));
}

function localHud(): HudData {
  const s = xpSummary();
  return {
    xp: s.xp,
    level: s.level,
    streakCount: s.streakCount,
    todayXp: s.todayXp,
    dailyGoalXp: s.dailyGoalXp,
  };
}

function useHud(enabled: boolean, refreshKey?: string) {
  const [data, setData] = React.useState<HudData | null>(null);   // the local mirror is read in the effect: reading it during render made server and client HTML differ (hydration #418)
  React.useEffect(() => {
    if (!enabled) return;
    let alive = true;
    // pull the server snapshot once per session so the local mirror is seeded
    void hydrate();
    const load = () => { if (alive) setData(localHud()); };
    load();
    const unsub = subscribe(load);
    window.addEventListener('qf:hud-refresh', load);
    window.addEventListener('online', () => scheduleFlush(500));
    return () => {
      alive = false;
      unsub();
      window.removeEventListener('qf:hud-refresh', load);
    };
  }, [enabled, refreshKey]);
  return data;
}

/* ---------------- offline indicator (v3) ---------------- */

export function OfflinePill() {
  const [online, setOnline] = React.useState(true);
  const [pending, setPending] = React.useState(0);
  React.useEffect(() => {
    const sync = () => {
      setOnline(navigator.onLine);
      setPending(getQueueLength());
    };
    sync();
    const t = setInterval(sync, 4000);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => { clearInterval(t); window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
  }, []);
  if (online && pending === 0) return null;
  return (
    <span
      className={cn('hud-pill', online ? 'text-warning' : 'text-danger')}
      title={online ? `${pending} change${pending === 1 ? '' : 's'} waiting to sync` : 'Offline. Everything still works, changes sync later.'}
    >
      {online ? <Zap className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
      <span className="tnum hidden sm:inline">{online ? pending : 'offline'}</span>
    </span>
  );
}

/* ---------------- user menu ---------------- */

function UserMenu({ name, isAdmin }: { name: string; isAdmin?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const signOut = async () => {
    const r = await signOutEverywhere();
    if (r === 'pending') { window.location.assign('/v5/learn'); return; }   // locked locally; the /v5 screen explains that server sign-out is still pending
    router.push('/');
    router.refresh();
  };
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="press flex items-center gap-1.5 px-1.5 py-1 rounded-xl hover:bg-surface-2"
      >
        <span className="h-9 w-9 rounded-2xl bg-accent text-on-accent text-[15px] font-black flex items-center justify-center shadow-[0_3px_0_0_var(--accent-deep)]">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <ChevronDown className="h-4 w-4 text-muted hidden xl:block" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-52 qf-card p-2 anim-bounce-in z-50">
          <p className="px-3 py-2 text-[13px] font-bold text-faint truncate">{name}</p>
          <Link role="menuitem" href="/settings" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[15px] font-bold hover:bg-surface-2" onClick={() => setOpen(false)}>
            <Settings className="h-4 w-4 text-muted" aria-hidden /> Settings
          </Link>
          {isAdmin && (
            <Link role="menuitem" href="/admin" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[15px] font-bold hover:bg-surface-2" onClick={() => setOpen(false)}>
              <ShieldCheck className="h-4 w-4 text-muted" aria-hidden /> Admin
            </Link>
          )}
          <Link role="menuitem" href="/analytics" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[15px] font-bold hover:bg-surface-2" onClick={() => setOpen(false)}>
            <Activity className="h-4 w-4 text-muted" aria-hidden /> My stats
          </Link>
          <button role="menuitem" type="button" onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[15px] font-bold text-danger hover:bg-danger-soft">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- shell ---------------------------------- */

export function AppShell({ user, children, isAdmin }: { user: { name: string; email: string; role: string }; children: React.ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const hud = useHud(true, pathname);

  const tabs = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/curriculum', label: 'Path', icon: MapIcon },
    { href: '/practice', label: 'Code', icon: Code2 },
    { href: '/revision', label: 'Revise', icon: Undo2 },
    { href: '/settings', label: 'You', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:btn3d focus:btn3d-sm">Skip to content</a>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b-2 border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
        <div className="max-w-6xl mx-auto flex h-16 items-center gap-2 sm:gap-3 px-4 lg:px-6">
          <Link href="/dashboard" aria-label="QuantFoundry, go to dashboard" className="press flex items-center gap-2.5 font-black tracking-tight text-lg flex-none">
            <span className="h-9 w-9 rounded-2xl bg-accent shadow-[0_3px_0_0_var(--accent-deep)] flex items-center justify-center">
              <Sigma className="h-5 w-5 text-on-accent" aria-hidden />
            </span>
            <span className="hidden xs:block sm:inline">QuantFoundry</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 ml-2 xl:ml-4" aria-label="Primary">
            {NAV.flatMap(g => g.items).slice(0, 7).map(item => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'press px-2 xl:px-3 py-2 text-[15px] font-extrabold rounded-xl text-muted hover:bg-surface-2 hover:text-foreground transition-colors inline-flex items-center gap-1.5 whitespace-nowrap',
                    active && 'bg-accent-soft text-accent-deep dark:text-accent shadow-[inset_0_-3px_0_0_var(--accent)]'
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* HUD: streak + XP + offline */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0">
            <OfflinePill />
            {hud && (
              <>
                <span className="hud-pill press anim-pop-in hidden sm:inline-flex" title="Day streak, earn any XP daily to keep it alive">
                  <Flame className={cn('h-4 w-4 text-flame', hud.streakCount > 0 && 'anim-flame')} />
                  <span className="tnum">{hud.streakCount}</span>
                </span>
                <span className="hud-pill press anim-pop-in hidden sm:inline-flex" title={`Level ${hud.level} · ${hud.todayXp}/${hud.dailyGoalXp} XP today`}>
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="tnum">{hud.xp.toLocaleString()}</span>
                </span>
                <span className="hidden 2xl:inline-flex items-center gap-1.5 hud-pill" title="Today's goal">
                  <span className="relative h-2.5 w-14 gauge-track">
                    <span
                      className={cn('absolute inset-y-0 left-0 gauge-fill', hud.todayXp >= hud.dailyGoalXp ? 'bg-accent xp-stripes' : 'bg-info')}
                      style={{ width: `${Math.min(100, (hud.todayXp / Math.max(hud.dailyGoalXp, 1)) * 100)}%` }}
                    />
                  </span>
                  <span className="tnum text-[12px] text-muted">{Math.min(hud.todayXp, hud.dailyGoalXp)}/{hud.dailyGoalXp}</span>
                </span>
              </>
            )}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="press h-10 w-10 flex-none inline-flex items-center justify-center rounded-xl border-2 border-border hover:bg-surface-2"
              aria-label="Toggle theme"
            >
              <Sun className="h-4.5 w-4.5 dark:hidden" />
              <Moon className="h-4.5 w-4.5 hidden dark:block" />
            </button>
            <UserMenu name={user.name} isAdmin={isAdmin} />
          </div>
        </div>
      </header>

      <main id="content" className="flex-1 w-full pb-24 lg:pb-0">{children}</main>

      {/* desktop footer */}
      <footer className="hidden lg:block border-t-2 border-border bg-surface mt-auto">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 font-black tracking-tight">
              <span className="h-8 w-8 rounded-2xl bg-accent shadow-[0_3px_0_0_var(--accent-deep)] flex items-center justify-center">
                <Sigma className="h-4 w-4 text-on-accent" aria-hidden />
              </span>
              QuantFoundry
            </div>
            <p className="text-[15px] font-semibold text-muted max-w-xs">An honest preparation pathway for quantitative engineering. Learn by doing, track real mastery.</p>
            <span className="chip chip-info"><Wifi className="h-3.5 w-3.5" aria-hidden /> Works offline</span>
          </div>
          <nav aria-label="Learn links" className="space-y-2.5">
            <p className="text-[13px] font-black uppercase tracking-wider text-faint">Learn</p>
            <Link href="/curriculum" className="block text-[15px] font-bold text-muted hover:text-foreground">Curriculum</Link>
            <Link href="/learn" className="block text-[15px] font-bold text-muted hover:text-foreground">All lessons</Link>
            <Link href="/revision" className="block text-[15px] font-bold text-muted hover:text-foreground">Spaced repetition</Link>
            <Link href="/drills" className="block text-[15px] font-bold text-muted hover:text-foreground">Mental math drills</Link>
          </nav>
          <nav aria-label="Practice links" className="space-y-2.5">
            <p className="text-[13px] font-black uppercase tracking-wider text-faint">Practice</p>
            <Link href="/practice" className="block text-[15px] font-bold text-muted hover:text-foreground">Code problems</Link>
            <Link href="/assessments" className="block text-[15px] font-bold text-muted hover:text-foreground">Assessments</Link>
            <Link href="/projects" className="block text-[15px] font-bold text-muted hover:text-foreground">Projects</Link>
            <Link href="/lab" className="block text-[15px] font-bold text-muted hover:text-foreground">Interactive labs</Link>
          </nav>
          <nav aria-label="Product links" className="space-y-2.5">
            <p className="text-[13px] font-black uppercase tracking-wider text-faint">Product</p>
            <Link href="/methodology" className="block text-[15px] font-bold text-muted hover:text-foreground">Methodology</Link>
            <Link href="/analytics" className="block text-[15px] font-bold text-muted hover:text-foreground">Your analytics</Link>
            <Link href="/planner" className="block text-[15px] font-bold text-muted hover:text-foreground">Study planner</Link>
            {isAdmin && <Link href="/admin" className="block text-[15px] font-bold text-muted hover:text-foreground">Admin</Link>}
          </nav>
        </div>
        <div className="border-t-2 border-border">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-faint">
            <span>QuantFoundry · {APP_VERSION} · content checked by the validator</span>
            <span className="flex items-center gap-3">
              <Link href="/about" className="hover:text-muted">About</Link>
              <Link href="/methodology" className="hover:text-muted">Methodology</Link>
              <Link href="/settings" className="hover:text-muted">Settings</Link>
            </span>
          </div>
        </div>
      </footer>

      {/* mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t-2 border-border bg-surface tabbar-safe" aria-label="Mobile tabs">
        <div className="grid grid-cols-5">
          {tabs.map(tab => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 min-h-[3.25rem] relative transition-colors',
                  active ? 'text-accent-deep dark:text-accent' : 'text-faint',
                )}
              >
                {active && <span className="absolute top-0 h-1 w-8 rounded-full bg-accent" />}
                <tab.icon className={cn('h-6 w-6', active && 'anim-bob')} />
                <span className="text-[13px] font-extrabold">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Public header for marketing pages */
export function PublicHeader({ user }: { user?: { name: string } | null }) {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-surface/95 backdrop-blur">
      <div className="max-w-6xl mx-auto flex h-16 items-center px-4 lg:px-6">
        <Link href="/" className="press flex items-center gap-2.5 font-black tracking-tight text-lg">
          <span className="h-9 w-9 rounded-2xl bg-accent shadow-[0_3px_0_0_var(--accent-deep)] flex items-center justify-center">
            <Sigma className="h-5 w-5 text-on-accent" aria-hidden />
          </span>
          <span>QuantFoundry</span>
        </Link>
        <nav className="ml-4 lg:ml-8 hidden sm:flex items-center gap-1 text-[15px] font-extrabold" aria-label="Public">
          <Link href="/curriculum" className="press px-3.5 py-2 rounded-xl text-muted hover:bg-surface-2 hover:text-foreground">Curriculum</Link>
          <Link href="/methodology" className="press px-3.5 py-2 rounded-xl text-muted hover:bg-surface-2 hover:text-foreground">Methodology</Link>
          <Link href="/career" className="press px-3.5 py-2 rounded-xl text-muted hover:bg-surface-2 hover:text-foreground">Career Tracks</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          {user ? (
            <Link href="/dashboard" className="btn3d btn3d-sm">Continue learning</Link>
          ) : (
            <>
              <Link href="/login" className="press text-[15px] font-extrabold px-3 py-2 rounded-xl text-muted hover:bg-surface-2">Sign in</Link>
              <Link href="/register" className="btn3d btn3d-sm">Start free</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
