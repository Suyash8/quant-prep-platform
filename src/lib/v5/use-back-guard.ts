'use client';
import { useEffect, type RefObject } from 'react';
/** Back / swipe-back / hardware-back guard for unsaved device-only work (code edits, an unsaved answer).
 *  While `isDirty()` is true (and the page is visible, not hidden/inert) one extra same-URL history entry is parked in front of the page. Back first lands on that entry:
 *   - still dirty: the learner is asked; "stay" re-parks the entry (nothing lost), "leave" continues Back.
 *   - clean (saved meanwhile): Back simply continues, no prompt.
 *  The existing history.state is copied (Next.js keeps its router marker there; a state without it makes the router hard-reload).
 *  Limit: after a confirmed link navigation away, one parked entry can remain behind it, so a later Back may need one extra step. No promise that it prevents loss when the tab or browser is closed (beforeunload is best effort). */
/** The learner has just confirmed discarding unsaved work: the browser's own beforeunload prompt must not ask a second time. Auto-clears after 2.5 s, and is cleared the moment work becomes unsaved again (a failed navigation followed by a new edit is protected again). */
export function markLeaveConfirmed() { (window as unknown as { __qfLeaveOk?: boolean }).__qfLeaveOk = true; window.setTimeout(clearLeaveConfirmed, 2500); }
export function clearLeaveConfirmed() { (window as unknown as { __qfLeaveOk?: boolean }).__qfLeaveOk = false; }
export const leaveAlreadyConfirmed = () => !!(window as unknown as { __qfLeaveOk?: boolean }).__qfLeaveOk;
export function useBackGuard(isDirty: () => boolean, root: RefObject<HTMLElement | null>, message: string) {
  useEffect(() => {
    let parked = false; let leaving = false; let wasDirty = false;
    const hidden = () => !!root.current?.closest('[hidden],[inert]');
    const active = () => isDirty() && !hidden();
    const park = () => { try { history.pushState({ ...(history.state ?? {}), qfBackGuard: true }, '', location.href); parked = true; } catch { /* history unavailable: the link and unload guards still apply */ } };
    const tick = () => { const d = isDirty(); if (d && !wasDirty) { clearLeaveConfirmed(); leaving = false; } wasDirty = d; if (!leaving && !parked && active()) park(); };
    const onPop = () => {
      if (!parked || leaving) return;
      parked = false;   // the browser has just consumed the parked entry
      if (!active()) { leaving = true; history.back(); return; }
      if (window.confirm(message)) { leaving = true; markLeaveConfirmed(); history.back(); return; }
      park();
    };
    const edit = () => { clearLeaveConfirmed(); leaving = false; };   // any typing or change after a confirmed leave means the leave did not happen: protect again
    const iv = window.setInterval(tick, 200); window.addEventListener('popstate', onPop); document.addEventListener('input', edit, true); document.addEventListener('keydown', edit, true); tick();
    return () => { window.clearInterval(iv); window.removeEventListener('popstate', onPop); document.removeEventListener('input', edit, true); document.removeEventListener('keydown', edit, true); };
  }, [isDirty, root, message]);
}
