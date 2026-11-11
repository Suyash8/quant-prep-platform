'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import * as React from 'react';
import {
  Activity, BarChart3, BookOpenCheck, BrainCircuit, Briefcase, CloudOff, Code2,
  FlaskConical, GraduationCap, Home, Map as MapIcon, Moon, PersonStanding,
  Settings, Sigma, Sun, Timer, Undo2, Flame, Zap, ShieldCheck, FolderKanban,
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
  const [data, setData] = React.useState<HudData | null>(enabled ? localHud() : null);
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
      <span className="tnum">{online ? pending : 'offline'}</span>
    </span>
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
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn3d btn3d-sm"
      >
        Skip to content
      </a>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b-2 border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
        <div className="max-w-6xl mx-auto flex h-16 items-center gap-3 px-4 lg:px-6">
          <Link href="/dashboard" className="press flex items-center gap-2.5 font-black tracking-tight text-lg">
            <span className="h-9 w-9 rounded-2xl bg-accent shadow-[0_3px_0_0_var(--accent-deep)] flex items-center justify-center">
              <Sigma className="h-5 w-5 text-white" aria-hidden />
            </span>
            <span className="hidden xs:block sm:inline">QuantFoundry</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 ml-4" aria-label="Primary">
            {NAV.flatMap(g => g.items).slice(0, 7).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'press px-3.5 py-2 text-sm font-extrabold rounded-xl text-muted hover:bg-surface-2 hover:text-foreground transition-colors',
                  pathname.startsWith(item.href) && 'bg-accent-soft text-accent-deep dark:text-accent'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* HUD: streak + XP + offline. The pills live in a wrapper so the
              sm/md hidden utilities actually win over .hud-pill's own display. */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0">
            <OfflinePill />
            {hud && (
              <span className="hidden sm:flex items-center gap-1.5">
                <span className="hud-pill press anim-pop-in" title="Day streak, earn any XP daily to keep it alive">
                  <Flame className={cn('h-4 w-4 text-flame', hud.streakCount > 0 && 'anim-flame')} />
                  <span className="tnum">{hud.streakCount}</span>
                </span>
                <span className="hud-pill press anim-pop-in" title={`Level ${hud.level} · ${hud.todayXp}/${hud.dailyGoalXp} XP today`}>
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="tnum">{hud.xp.toLocaleString()}</span>
                </span>
                <span className="hidden md:inline-flex items-center gap-1.5">
                  <span className="hud-pill" title="Today's goal">
                    <span className="relative h-2.5 w-14 gauge-track">
                      <span
                        className={cn('absolute inset-y-0 left-0 gauge-fill', hud.todayXp >= hud.dailyGoalXp ? 'bg-accent xp-stripes' : 'bg-info')}
                        style={{ width: `${Math.min(100, (hud.todayXp / Math.max(hud.dailyGoalXp, 1)) * 100)}%` }}
                      />
                    </span>
                    <span className="tnum text-[11px] text-muted">{Math.min(hud.todayXp, hud.dailyGoalXp)}/{hud.dailyGoalXp}</span>
                  </span>
                </span>
              </span>
            )}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="press h-10 w-10 inline-flex items-center justify-center rounded-xl border-2 border-border hover:bg-surface-2"
              aria-label="Toggle theme"
            >
              <Sun className="h-4.5 w-4.5 dark:hidden" aria-hidden="true" />
              <Moon className="h-4.5 w-4.5 hidden dark:block" aria-hidden="true" />
            </button>
            <Link href="/settings" className="press flex items-center gap-2 px-1.5 py-1 rounded-xl hover:bg-surface-2" title="Profile & settings">
              <span className="h-9 w-9 rounded-2xl bg-accent text-white text-sm font-black flex items-center justify-center shadow-[0_3px_0_0_var(--accent-deep)]">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main id="content" className="flex-1 w-full pb-24 lg:pb-0">{children}</main>

      {/* Rich desktop footer: brand block + three link groups */}
      <footer className="hidden lg:block bg-surface mt-auto border-t-2 border-border">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 qf-footer">
          <div>
            <Link href="/dashboard" className="press text-foreground mb-2">
              <span className="flex items-center gap-2.5 font-black tracking-tight text-lg">
                <span className="h-9 w-9 rounded-2xl bg-accent shadow-[0_3px_0_0_var(--accent-deep)] flex items-center justify-center">
                  <Sigma className="h-5 w-5 text-white" aria-hidden />
                </span>
                QuantFoundry
              </span>
            </Link>
            <p className="text-sm font-semibold text-muted max-w-xs mb-3">
              An honest preparation pathway for quantitative engineering. Study daily, get scored, keep the streak.
            </p>
            <div className="flex items-center gap-2">
              <span className="chip chip-accent"><CloudOff className="h-3 w-3" aria-hidden /> Works offline</span>
              <span className="chip">v3.1</span>
            </div>
          </div>
          <nav aria-label="Learn links">
            <h3>Learn</h3>
            <Link href="/dashboard">Home</Link>
            <Link href="/curriculum">Your path</Link>
            <Link href="/lab">Labs</Link>
            <Link href="/revision">Revision</Link>
            <Link href="/drills">Mental drills</Link>
          </nav>
          <nav aria-label="Practice links">
            <h3>Practice</h3>
            <Link href="/practice">Code problems</Link>
            <Link href="/assessments">Assessments</Link>
            <Link href="/projects">Projects</Link>
            <Link href="/diagnostic">Diagnostic</Link>
          </nav>
          <nav aria-label="Product links">
            <h3>Product</h3>
            <Link href="/analytics">Analytics</Link>
            <Link href="/planner">Study planner</Link>
            <Link href="/methodology">Methodology</Link>
            <Link href="/about">About</Link>
            <Link href="/settings">Settings</Link>
            {isAdmin && <Link href="/admin"><span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" aria-hidden />Admin</span></Link>}
          </nav>
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
                  'flex flex-col items-center gap-0.5 py-2.5 relative transition-colors',
                  active ? 'text-accent-deep dark:text-accent' : 'text-faint',
                )}
              >
                {active && <span className="absolute top-0 h-1 w-8 rounded-full bg-accent" />}
                <tab.icon className={cn('h-6 w-6', active && 'anim-bob')} />
                <span className="text-xs font-extrabold">{tab.label}</span>
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
            <Sigma className="h-5 w-5 text-white" aria-hidden />
          </span>
          <span>QuantFoundry</span>
        </Link>
        <nav className="ml-8 hidden sm:flex items-center gap-1 text-sm font-extrabold" aria-label="Public">
          <Link href="/curriculum" className="press px-3.5 py-2 rounded-xl text-muted hover:bg-surface-2 hover:text-foreground">Curriculum</Link>
          <Link href="/methodology" className="press px-3.5 py-2 rounded-xl text-muted hover:bg-surface-2 hover:text-foreground">Methodology</Link>
          <Link href="/career" className="press px-3.5 py-2 rounded-xl text-muted hover:bg-surface-2 hover:text-foreground">Career Tracks</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          {user ? (
            <Link href="/dashboard" className="btn3d btn3d-sm">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="press text-sm font-extrabold px-3 py-2 rounded-xl text-muted hover:bg-surface-2">Sign in</Link>
              <Link href="/register" className="btn3d btn3d-sm">Start learning</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
