/** Truthful state of the offline PAGE copies (service-worker cache), separate from the content packs in IndexedDB. Counts come from the Cache API itself, never from "we asked for it". */
export type ShellState = { saved: number; wanted: number; unsupported?: boolean } | null;
let state: ShellState = null; const subs = new Set<() => void>();
export const getShellState = () => state; export const subscribeShell = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };
export const setShellState = (s: ShellState) => { if (state?.saved === s?.saved && state?.wanted === s?.wanted && state?.unsupported === s?.unsupported) return; state = s; subs.forEach((f) => f()); };
export async function countShell(urls: string[]): Promise<number> {
  try { if (typeof caches === 'undefined') return 0; const c = await caches.open('qf5-shell-v1'); let n = 0; await Promise.all(urls.map(async (u) => { if (await c.match(u)) n++; })); return n; } catch { return 0; }
}
export const shellReady = (s: ShellState) => !!s && !s.unsupported && s.wanted > 0 && s.saved >= s.wanted;
