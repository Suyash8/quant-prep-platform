'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import * as React from 'react';
import {
  Activity, BarChart3, BookOpenCheck, BrainCircuit, Briefcase, Code2,
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

/* ---------------- gamification HUD state (module cache) ---------------- */

interface HudData {
  xp: number;
  level: number;
  streakCount: number;
  todayXp: number;
  dailyGoalXp: number;
}
let hudCache: HudData | null = null;
let hudFetch: Promise<HudData | null> | null = null;

async function fetchHud(): Promise<HudData | null> {
  if (hudCache) return hudCache;
  if (!hudFetch) {
    hudFetch = fetch('/api/gamification')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) hudCache = d; return d; })
      .catch(() => null);
  }
  return hudFetch;
}

/** Signal that XP changed (award happened) so the HUD refetches. */
export function refreshHud() {
  hudCache = null;
  hudFetch = null;
  window.dispatchEvent(new CustomEvent('qf:hud-refresh'));
}

function useHud(enabled: boolean, refreshKey?: string) {
  const [data, setData] = React.useState<HudData | null>(hudCache);
  React.useEffect(() => {
    if (!enabled) return;
    let alive = true;
    // a fresh route (or an explicit refresh signal) busts the module cache
    hudCache = null;
    hudFetch = null;
    const load = () => fetchHud().then(d => { if (alive && d) setData(d); });
    load();
    window.addEventListener('qf:hud-refresh', load);
    return () => { alive = false; window.removeEventListener('qf:hud-refresh', load); };
  }, [enabled, refreshKey]);
  return data;
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

          {/* HUD: streak + XP */}
          <div className="ml-auto flex items-center gap-2">
            {hud && (
              <>
                <span className="hud-pill press anim-pop-in" title="Day streak — earn any XP daily to keep it alive">
                  <Flame className={cn('h-4 w-4 text-flame', hud.streakCount > 0 && 'anim-flame')} />
                  <span className="tnum">{hud.streakCount}</span>
                </span>
                <span className="hud-pill press anim-pop-in" title={`Level ${hud.level} · ${hud.todayXp}/${hud.dailyGoalXp} XP today`}>
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="tnum">{hud.xp.toLocaleString()}</span>
                </span>
                <span className="hidden md:inline-flex items-center gap-1.5 hud-pill" title="Today's goal">
                  <span className="relative h-2.5 w-14 gauge-track">
                    <span
                      className={cn('absolute inset-y-0 left-0 gauge-fill', hud.todayXp >= hud.dailyGoalXp ? 'bg-accent xp-stripes' : 'bg-info')}
                      style={{ width: `${Math.min(100, (hud.todayXp / Math.max(hud.dailyGoalXp, 1)) * 100)}%` }}
                    />
                  </span>
                  <span className="tnum text-[11px] text-muted">{Math.min(hud.todayXp, hud.dailyGoalXp)}/{hud.dailyGoalXp}</span>
                </span>
              </>
            )}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="press h-10 w-10 inline-flex items-center justify-center rounded-xl border-2 border-border hover:bg-surface-2"
              aria-label="Toggle theme"
            >
              <Sun className="h-4.5 w-4.5 dark:hidden" />
              <Moon className="h-4.5 w-4.5 hidden dark:block" />
            </button>
            <Link href="/settings" className="press flex items-center gap-2 px-1.5 py-1 rounded-xl hover:bg-surface-2" title="Profile & settings">
              <span className="h-9 w-9 rounded-2xl bg-accent text-white text-sm font-black flex items-center justify-center shadow-[0_3px_0_0_var(--accent-deep)]">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full pb-24 lg:pb-0">{children}</main>

      <footer className="hidden lg:block border-t-2 border-border bg-surface mt-auto">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-faint">
          <span>QuantFoundry — an honest preparation pathway for quantitative engineering.</span>
          <span className="flex items-center gap-3">
            {isAdmin && <Link href="/admin" className="hover:text-muted flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Admin</Link>}
            <Link href="/methodology" className="hover:text-muted">Methodology</Link>
            <Link href="/about" className="hover:text-muted">About</Link>
          </span>
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
                <span className="text-[10px] font-extrabold">{tab.label}</span>
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
