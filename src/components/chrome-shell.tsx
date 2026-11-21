'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell, PublicHeader, PublicFooter } from '@/components/app-shell';
import { onBroadcast } from '@/lib/client/broadcast';
import { bindOwner } from '@/lib/client/local-state';
import { prefetchAllIndexes } from '@/lib/client/packs';
import { CommandPalette } from '@/components/command-palette';

export interface ChromeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  plan?: string;
  emailVerified?: boolean;
  onboardingDone?: boolean;
}

const USER_CACHE_KEY = 'qf-chrome-user';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/revision',
  '/drills',
  '/practice',
  '/assessments',
  '/analytics',
  '/planner',
  '/settings',
  '/admin',
];

const PREFETCH_ROUTES = [
  '/dashboard',
  '/curriculum',
  '/practice',
  '/assessments',
  '/projects',
  '/revision',
  '/drills',
  '/lab',
  '/analytics',
  '/planner',
  '/career',
  '/pricing',
  '/settings',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/'),
  );
}

function isAuthPage(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')
  );
}

function readCachedUser(): ChromeUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as Partial<ChromeUser>;
    if (u && typeof u.name === 'string') {
      return {
        id: u.id ?? '',
        name: u.name,
        email: u.email ?? '',
        role: u.role ?? 'learner',
        plan: u.plan,
        emailVerified: u.emailVerified,
        onboardingDone: u.onboardingDone,
      };
    }
  } catch { /* ignore */ }
  return null;
}

export function writeCachedUser(user: ChromeUser | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_CACHE_KEY);
  } catch { /* ignore */ }
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export function ChromeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();

  // Always start identical on SSR & initial client pass to prevent hydration mismatches
  const [user, setUser] = React.useState<ChromeUser | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const [verifiedOnline, setVerifiedOnline] = React.useState(false);
  const [networkOffline, setNetworkOffline] = React.useState(false);

  const syncFromServer = React.useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) {
      setNetworkOffline(true);
      setVerifiedOnline(true);
      return;
    }
    if (isAuthPage(window.location.pathname) && !readCachedUser()) {
      setVerifiedOnline(true);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      setNetworkOffline(false);
      if (res.status === 401) {
        writeCachedUser(null);
        setUser(null);
        setVerifiedOnline(true);
        return;
      }
      if (!res.ok) {
        if (res.status >= 500) setNetworkOffline(true);
        setVerifiedOnline(true);
        return;
      }
      const data = (await res.json()) as { user?: ChromeUser | null };
      const u = data.user ?? null;
      if (u?.id) bindOwner(u.id);
      writeCachedUser(u);
      setUser(u);
      setVerifiedOnline(true);
    } catch {
      /* offline or network unreachable: fall into offline preview instead of spinning forever */
      setNetworkOffline(true);
      setVerifiedOnline(true);
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    const cached = readCachedUser();
    if (cached) setUser(cached);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    void syncFromServer();

    const onAuthEvent = (ev: Event) => {
      const custom = ev as CustomEvent<ChromeUser | null | undefined>;
      if (custom.detail !== undefined) {
        writeCachedUser(custom.detail);
        setUser(custom.detail);
        if (custom.detail) void syncFromServer();
      } else {
        setUser(readCachedUser());
      }
    };
    window.addEventListener('qf:auth-refresh', onAuthEvent);

    const unsubBroadcast = onBroadcast((pkt) => {
      if (pkt.topic === 'auth-changed') {
        const nextUser = (pkt.payload as ChromeUser | null) ?? null;
        writeCachedUser(nextUser);
        setUser(nextUser);
      }
    });

    return () => {
      window.removeEventListener('qf:auth-refresh', onAuthEvent);
      unsubBroadcast();
    };
  }, [syncFromServer]);

  // Redirect online unauthenticated visits away from protected routes (skip offline so cached mode works cleanly)
  React.useEffect(() => {
    if (!hydrated || !verifiedOnline) return;
    if (isProtectedPath(pathname) && !user && navigator.onLine && !networkOffline) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, verifiedOnline, networkOffline, pathname, user, router]);

  // Idle prefetch of core routes & content pack indexes once per session for instant zero-stall navigation
  const prefetchedRef = React.useRef(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || isAuthPage(pathname) || prefetchedRef.current) return;
    let cancelled = false;
    const runPrefetch = () => {
      if (cancelled || prefetchedRef.current) return;
      prefetchedRef.current = true;
      prefetchAllIndexes();
      for (const route of PREFETCH_ROUTES) {
        try { router.prefetch(route); } catch { /* ignore */ }
      }
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    const cancelRic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
    if (ric && cancelRic) {
      const id = ric(runPrefetch, { timeout: 2500 });
      return () => { cancelled = true; cancelRic(id); };
    }
    const t = setTimeout(runPrefetch, 1000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [router, pathname]);

  // 1. Distraction-free lesson player
  if (pathname.startsWith('/learn/')) {
    return <>{children}</>;
  }

  // 2. Auth pages: minimal public header, no footer
  if (isAuthPage(pathname)) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader user={null} />
        {children}
      </div>
    );
  }

  // 3. Protected routes: wait briefly on blank storage while online before redirecting
  if (isProtectedPath(pathname) && !user) {
    const isOffline = (typeof navigator !== 'undefined' && !navigator.onLine) || networkOffline;
    if (!hydrated || (!isOffline && !verifiedOnline)) {
      return (
        <div className="min-h-screen flex flex-col bg-background">
          <div className="h-16 border-b-2 border-border bg-surface" />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
            <div className="h-8 w-48 rounded-xl bg-surface-2 animate-pulse mb-4" />
            <div className="h-40 rounded-2xl bg-surface-2 animate-pulse" />
          </main>
        </div>
      );
    }
    if (isOffline) {
      return (
        <AppShell user={{ name: 'Offline guest', email: 'local', role: 'learner' }} isAdmin={false} offlinePreview>
          {children}
          <CommandPalette />
        </AppShell>
      );
    }
    return null;
  }

  // 4. Public home & landing page uses public marketing chrome
  if (pathname === '/') {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader user={user ? { name: user.name } : null} />
        {children}
        <PublicFooter />
        <CommandPalette />
      </div>
    );
  }

  // 5. Logged-in workspace shell stays mounted continuously across all pages
  if (user) {
    return (
      <AppShell user={user} isAdmin={user.role === 'admin'}>
        {children}
        <CommandPalette />
      </AppShell>
    );
  }

  // 6. Guest viewing hybrid public pages (curriculum, pricing, career, projects, methodology, legal)
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader user={null} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <CommandPalette />
    </div>
  );
}
