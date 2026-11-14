'use client';
import { useEffect, useState } from 'react';
/** What the SERVER will judge right now (GET /api/v5/code). The server enforces it again on every request; this only decides what the page shows.
 *  Last known answer is kept per device so an offline reader sees the same state; a stale list never authorises a run (the POST re-checks). */
export type CodeReadiness = { state: 'loading' } | { state: 'known'; ready: Record<string, string[]>; devTestOnly: boolean; cached: boolean; runtimeBlocked?: string } | { state: 'unknown' };
const KEY = 'qf5.codeReadiness';
export function useCodeReadiness(): CodeReadiness {
  const [r, setR] = useState<CodeReadiness>({ state: 'loading' });
  useEffect(() => {
    let dead = false;
    (async () => {
      try { const res = await fetch('/api/v5/code', { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(20_000) }); if (!res.ok) throw new Error('x'); const j = (await res.json()) as { ready?: Record<string, string[]>; devTestOnly?: boolean; runtimeBlocked?: string };
        if (!j.ready || typeof j.ready !== 'object') throw new Error('x');
        try { localStorage.setItem(KEY, JSON.stringify(j)); } catch { /* ignore */ }
        if (!dead) setR({ state: 'known', ready: j.ready, devTestOnly: !!j.devTestOnly, cached: false, runtimeBlocked: typeof j.runtimeBlocked === 'string' ? j.runtimeBlocked : undefined });
      } catch {
        try { const c = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { ready?: Record<string, string[]>; devTestOnly?: boolean; runtimeBlocked?: string } | null; if (c?.ready && !dead) { setR({ state: 'known', ready: c.ready, devTestOnly: !!c.devTestOnly, cached: true, runtimeBlocked: typeof c.runtimeBlocked === 'string' ? c.runtimeBlocked : undefined }); return; } } catch { /* ignore */ }
        if (!dead) setR({ state: 'unknown' });
      }
    })();
    return () => { dead = true; };
  }, []);
  return r;
}
