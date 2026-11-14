'use client';
/** Real durable store composition for the /v5 routes (primary-owned). Binds one IndexedDB store to the signed-in account,
 *  tears it down and reopens it when the account changes, and never uses the in-memory fixture. */
import { AccountChangeHold } from './account-change-hold';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthChange } from '@/lib/v5/auth-broadcast';
import { readLock, completePendingSignOut } from '@/lib/v5/signout';
import { countShell, setShellState } from '@/lib/v5/shell-status';
import { openV5Store, type V5ContentStore, type StoredContent } from '@/lib/v5/idb-store';

type Ctx = { store: V5ContentStore; content: StoredContent | undefined; account: string | null; refresh: () => void };
const C = createContext<Ctx | null>(null);
export const useV5 = () => { const v = useContext(C); if (!v) throw new Error('V5Provider missing'); return v; };

/** `live` is true only when the server just answered who is signed in; a cached answer (offline / server unreachable) is never live. */
let lastLive = false;
async function currentAccount(): Promise<string | null> {
  lastLive = false;
  try { const r = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' }); if (r.status === 401) { try { localStorage.removeItem(KEY); } catch { /* ignore */ } return null; }   // signed out: the old account must not be reused for the offline namespace
    if (!r.ok) return lastKnown(); const j = (await r.json()) as { user?: { id?: string }; st?: string | null }; const id = j.user?.id ?? null; try { if (j.st) localStorage.setItem('qf5.sid', j.st); else localStorage.removeItem('qf5.sid'); } catch { /* ignore */ } lastLive = true; return id; }
  catch { return lastKnown(); }   // offline: keep the last known account on this device
}
const KEY = 'qf5.account'; const lastKnown = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

/** Registers the /v5/ shell worker and asks it to save the route HTML plus the assets this page loaded, once the packs are complete. Best effort. */
let shellBusy = false; let shellAgain = false;
async function registerShell(store: V5ContentStore) {
  try {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') { setShellState({ saved: 0, wanted: 0, unsupported: true }); return; }
    if (shellBusy) { shellAgain = true; return; } shellBusy = true; shellAgain = false;
    const reg = await navigator.serviceWorker.register('/v5-sw.js', { scope: '/v5/' }); await navigator.serviceWorker.ready;
    const content = await store.getContent(); const sw = reg.active ?? (await navigator.serviceWorker.ready).active; if (!sw || !content) return;
    const urls = ['/v5/learn', '/v5/review', '/v5/progress', '/v5/practice', ...content.lessons.map((l) => `/v5/learn/${l.id}`), ...content.problems.map((p) => `/v5/practice/${p.id}`)];
    const assets = performance.getEntriesByType('resource').map((r) => new URL(r.name).pathname).filter((p) => p.startsWith('/_next/static/'));
    const have = await countShell(urls); setShellState({ saved: have, wanted: urls.length });
    if (have < urls.length) sw.postMessage({ type: 'qf5-precache', urls, assets });
    for (let i = 0; i < 120 && have < urls.length; i++) { await new Promise((r) => setTimeout(r, 1500)); const n = await countShell(urls); setShellState({ saved: n, wanted: urls.length }); if (n >= urls.length) break; }
  } catch { /* offline shell is best effort */ } finally { shellBusy = false; if (shellAgain) { shellAgain = false; void registerShell(store); } }
}
export function V5Provider({ children, fallback }: { children: (c: Ctx) => React.ReactNode; fallback?: React.ReactNode }) {
  const [ctx, setCtx] = useState<Ctx | null>(null); const [tick, setTick] = useState(0); const [changed, setChanged] = useState(false); const [locked, setLocked] = useState(false);
  const ctxRef = useRef<Ctx | null>(null); ctxRef.current = ctx;
  useEffect(() => {
    let dead = false; let store: V5ContentStore | undefined; let opened: string | null | undefined; setCtx(null);   // opened: the account THIS effect run opened against; undefined until currentAccount() resolves
    if (readLock()) { setLocked(true); void completePendingSignOut().then((ok) => { if (!dead && ok) { setLocked(false); setTick((t) => t + 1); } }); const offLock = onAuthChange(() => setTick((t) => t + 1)); const onShow = () => setTick((t) => t + 1); window.addEventListener('pageshow', onShow); window.addEventListener('focus', onShow); return () => { dead = true; offLock(); window.removeEventListener('pageshow', onShow); window.removeEventListener('focus', onShow); }; }   // locked: no account (and not the anon library) is opened from the stale cookie/cache
    setLocked(false);   // tear down: nothing renders against the previous account's store while the next one opens
    (async () => {
      const account = await currentAccount(); opened = account; const live = lastLive;
      try { if (account) localStorage.setItem(KEY, account); } catch { /* storage unavailable */ }
      store = await openV5Store({ userId: account, identityConfirmedAt: live && account ? Date.now() : undefined, onAccountMismatch: () => { if (!dead) setChanged(true); } });
      const load = async () => { if (dead) return; const content = await store!.getContent(); if (!dead) setCtx({ store: store!, content, account, refresh: () => setTick((t) => t + 1) }); };
      await load(); // page copies start only AFTER the pack download settles: running both at once made the first lesson on a slow link ~4x slower (measured 5 s -> 22 s at 400 kbps / 400 ms); the library is called ready only when BOTH are verified
      void store.downloadPacks().then(load).then(() => registerShell(store!));
      store.subscribeState(() => { void load(); });
      window.addEventListener('qf5-shell-retry', () => { if (!dead) void registerShell(store!); });
    })();
    // Re-check who is signed in whenever the tab regains focus, becomes visible, returns from bfcache or comes online.
    const recheck = async () => { if (readLock()) { setTick((t) => t + 1); return; } if (opened === undefined) return; const now = await currentAccount(); if (dead || opened === undefined) return;
      // This screen was opened while NOBODY was signed in (e.g. after a sign-out in another tab) and someone is signed in now: it holds no account's private input, so reopen under the account that is signed in. Showing the 'account changed' hold here was a dead end: it told a user who WAS that account to sign back in, and only 'discard' could leave it.
      if (opened === null && now !== null) { setChanged(false); setTick((t) => t + 1); return; }
      setChanged(now !== opened); };   // an early focus/pageshow/online event, before the account has been read, used to compare against 'no account yet' and flash the account-changed screen (the intermittent held-input screen)   // back on the same account: the held screen comes back with its typed input
    const onVis = () => { if (document.visibilityState === 'visible') void recheck(); };
    window.addEventListener('focus', recheck); window.addEventListener('pageshow', recheck); window.addEventListener('online', recheck); document.addEventListener('visibilitychange', onVis); const offAuth = onAuthChange(() => void recheck());
    return () => { dead = true; offAuth(); store?.close(); window.removeEventListener('focus', recheck); window.removeEventListener('pageshow', recheck); window.removeEventListener('online', recheck); document.removeEventListener('visibilitychange', onVis); };   // account change or unmount: close this account's store
  }, [tick]);
  const accountRef = useRef<string | null>(null); accountRef.current = ctx?.account ?? null;
  // Account-change hold: the previous account's screen stays MOUNTED but hidden (so typed input is kept in memory only and never
  // transferred or submitted), writes are already rejected by the store, and nothing of the old account is visible to the new session.
  // Signing back in as the same account (any tab) and refocusing restores the screen. Choosing to continue discards the held input.
  if (locked) return <LockedScreen />;
  if (!ctx) return <>{fallback ?? <p role="status" style={{ padding: 24 }}>Opening your learning library…</p>}</>;
  return <>
    <div hidden={changed} aria-hidden={changed} {...(changed ? { inert: true } : {})}><C.Provider value={ctx}>{children(ctx)}</C.Provider></div>
    {changed && <AccountChangeHold onContinue={() => { setChanged(false); setTick((t) => t + 1); }} />}
  </>;
}

function LockedScreen() {
  const [msg, setMsg] = useState('');
  return <section role="alert" aria-labelledby="locked-title" style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
    <h1 id="locked-title" style={{ fontSize: 22, fontWeight: 800 }}>You signed out on this device</h1>
    <p>Your learning view is locked. Ending your session on the server needs a connection, so that step is still pending and will finish when you are online.</p>
    <p>Your saved work stays on this device. It is not deleted and it is not shown here, and it is never sent anywhere from this screen.</p>
    <button type="button" onClick={async () => { setMsg('Checking…'); let sure = false; try { if (!localStorage.getItem('qf5.sid')) { if (!window.confirm('This browser cannot tell which session to end. Sign out whichever account is signed in on this browser right now?')) { setMsg(''); return; } sure = true; } } catch { /* ignore */ } const ok = await completePendingSignOut(sure); if (ok) window.location.assign('/login'); else setMsg('Still offline or the server did not answer. Try again when you are connected.'); }} style={{ marginTop: 12, padding: '10px 16px', fontWeight: 700, border: '1px solid currentColor', borderRadius: 8 }}>Finish signing out</button>
    <p role="status" aria-live="polite">{msg}</p>
  </section>;
}
