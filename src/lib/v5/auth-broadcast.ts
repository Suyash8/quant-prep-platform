/** Cross-tab sign-in / sign-out notice. Tabs re-check who is signed in at once instead of waiting for focus.
 *  The message carries NO account id or data (it is only a nudge); each tab asks the server itself. BroadcastChannel where present, a localStorage ping otherwise. Best effort: tabs also re-check on focus, pageshow and online. */
const NAME = 'qf5-auth'; const PING = 'qf5.auth.ping';
export function announceAuthChange(kind: 'login' | 'logout'): void {
  try { if (typeof BroadcastChannel !== 'undefined') { const c = new BroadcastChannel(NAME); c.postMessage({ kind, at: Date.now() }); c.close(); } } catch { /* ignore */ }
  try { localStorage.setItem(PING, `${kind}:${Date.now()}`); } catch { /* ignore */ }
}
export function onAuthChange(cb: () => void): () => void {
  let ch: BroadcastChannel | undefined; const onStorage = (e: StorageEvent) => { if (e.key === PING) cb(); };
  try { if (typeof BroadcastChannel !== 'undefined') { ch = new BroadcastChannel(NAME); ch.onmessage = () => cb(); } } catch { /* ignore */ }
  window.addEventListener('storage', onStorage);
  return () => { try { ch?.close(); } catch { /* ignore */ } window.removeEventListener('storage', onStorage); };
}
