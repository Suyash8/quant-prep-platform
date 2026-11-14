import { announceAuthChange } from './auth-broadcast';
/** Sign-out that is safe offline. The server session cannot be ended without a network, so the click LOCKS this device's local account view first:
 *  the /v5 screens refuse to open any account (or the anon library) until the learner signs in again or the server sign-out has completed. Nothing is deleted: the account's drafts and held answers stay private on the device.
 *  The lock record carries no account data. It does not end the server session (impossible offline) and cannot clear an httpOnly cookie; it only stops this app from reopening the prior account from the stale cookie/cache. */
const LOCK = 'qf5.signout.lock'; const ACCOUNT = 'qf5.account'; const SID = 'qf5.sid';
export const readLock = (): { at: number } | null => { try { const v = localStorage.getItem(LOCK); return v ? (JSON.parse(v) as { at: number }) : null; } catch { return null; } };
export const clearLock = () => { try { localStorage.removeItem(LOCK); localStorage.removeItem(SID); } catch { /* ignore */ } };
/** 'ended' = the session is gone (or there was none); 'skipped' = the server refused to end an unnamed/newer session; 'failed' = no answer. */
async function tryServerLogout(confirmCurrent: boolean): Promise<boolean> {
  // Name the session being left (the non-secret tag the app saw while online). Without one, only an explicit confirmCurrent may end a session; there is no clock-based guess.
  let tag: string | undefined; try { tag = localStorage.getItem(SID) ?? undefined; } catch { /* ignore */ }
  if (!tag && !confirmCurrent) return false;
  try { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 6000); const r = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(tag ? { tag } : { confirmCurrent: true }), signal: ac.signal }); clearTimeout(t); if (!r.ok) return false; const res = ((await r.json()) as { result?: string }).result; return res === 'ended' || res === 'none' || (res === 'skipped' && !!tag); } catch { return false; }
}
/** Lock first (so a crash or reload cannot reopen the account), then try the server. 'done' = server session ended; 'pending' = locked locally, server sign-out still to finish. */
export async function signOutEverywhere(): Promise<'done' | 'pending'> {
  try { localStorage.setItem(LOCK, JSON.stringify({ at: Date.now() })); localStorage.removeItem(ACCOUNT); } catch { /* storage unavailable */ }
  announceAuthChange('logout');   // other tabs lock at once
  if (await tryServerLogout(true)) { clearLock(); announceAuthChange('logout'); return 'done'; }
  return 'pending';
}
/** Retry a pending server sign-out (online). True when the lock is gone because the server session ended. */
export async function completePendingSignOut(confirmCurrent = false): Promise<boolean> { if (!readLock()) return true; if (typeof navigator !== 'undefined' && !navigator.onLine) return false; if (await tryServerLogout(confirmCurrent)) { clearLock(); return true; } return false; }
