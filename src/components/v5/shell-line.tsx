'use client';
import { useSyncExternalStore } from 'react';
import { getShellState, subscribeShell } from '@/lib/v5/shell-status';
/** Offline page copies, counted from the browser cache. Shown only once the library is downloaded; says "not ready" until every page copy is really there. */
export function ShellLine({ libraryComplete }: { libraryComplete: boolean }) {
  const st = useSyncExternalStore(subscribeShell, getShellState, () => null);
  if (!libraryComplete) return null;
  if (st?.unsupported) return <small>Page copies for reopening offline are not available in this browser. Opening a page you have not visited offline may need a connection.</small>;
  if (!st) return <small>Page copies for reopening offline are being prepared.</small>;
  return <small>{st.saved >= st.wanted ? `Lesson and practice pages saved for offline reopening: ${st.saved} of ${st.wanted}.` : `Preparing page copies for offline reopening: ${st.saved} of ${st.wanted} saved. Until this finishes, a lesson you have not opened may not open without a connection.`}</small>;
}
