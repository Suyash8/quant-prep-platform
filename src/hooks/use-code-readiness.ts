'use client';

import { useCallback, useEffect, useState } from 'react';

export type RunnerReadiness = 'ready' | 'degraded' | 'offline' | 'checking';

export interface CodeReadinessState {
  status: RunnerReadiness;
  label: string;
  refresh: () => void;
}

const CACHE_KEY = 'qf-runner-readiness';
const CACHE_TTL_MS = 60_000;

/**
 * Checks whether the live judge/code-runner service is reachable and cached.
 * Automatically updates on online/offline transitions without blocking editing.
 */
export function useCodeReadiness(): CodeReadinessState {
  const [status, setStatus] = useState<RunnerReadiness>(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
    return 'checking';
  });

  const check = useCallback(async (force = false) => {
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }
    if (!force) {
      try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { status: RunnerReadiness; at: number };
          if (Date.now() - parsed.at < CACHE_TTL_MS && parsed.status !== 'offline') {
            setStatus(parsed.status);
            return;
          }
        }
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (!res.ok) {
        setStatus('degraded');
        return;
      }
      const data = (await res.json()) as { runner?: string };
      const next: RunnerReadiness =
        data.runner === 'configured-degraded' ? 'degraded' : 'ready';
      setStatus(next);
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ status: next, at: Date.now() }));
      } catch { /* ignore */ }
    } catch {
      setStatus(navigator.onLine ? 'degraded' : 'offline');
    }
  }, []);

  useEffect(() => {
    void check(false);
    const onOnline = () => void check(true);
    const onOffline = () => setStatus('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [check]);

  const label =
    status === 'offline'
      ? 'Offline · Drafts saved locally'
      : status === 'degraded'
        ? 'Runner degraded'
        : status === 'checking'
          ? 'Checking runner…'
          : 'Runner ready';

  return { status, label, refresh: () => void check(true) };
}
