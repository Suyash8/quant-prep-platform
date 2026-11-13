'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';

type SyncError = { at: string; failed: number; rejected?: number; queued: number };

function readError(): string | null {
  try { return window.localStorage.getItem('qf3:sync-error'); } catch { return null; }
}
function subscribe(cb: () => void) {
  const t = window.setInterval(cb, 3000);
  window.addEventListener('storage', cb);
  return () => { window.clearInterval(t); window.removeEventListener('storage', cb); };
}

/** Visible, durable sync-error notice: shown while events the server rejected are still queued. */
export function SyncErrorNotice() {
  const raw = React.useSyncExternalStore(subscribe, readError, () => null);
  if (!raw) return null;
  let info: SyncError | null = null;
  try { info = JSON.parse(raw) as SyncError; } catch { /* ignore */ }
  if (!info) return null;
  return (
    <div role="alert" className="qf-card flex items-start gap-3 !border-warning bg-warning-soft p-4">
      <span className="icon-tile-sm icon-tile-warning"><AlertTriangle strokeWidth={2.5} /></span>
      <div>
        <p className="text-[16px] font-extrabold">Some progress has not reached the server yet</p>
        <p className="text-[15px] font-semibold text-muted">
          {info.failed} update{info.failed === 1 ? '' : 's'} failed and {info.queued} {info.queued === 1 ? 'is' : 'are'} waiting on this device. They are kept and retried automatically. Nothing is lost.{info.rejected ? ` ${info.rejected} invalid update${info.rejected === 1 ? ' was' : 's were'} set aside on this device.` : ''}
        </p>
      </div>
    </div>
  );
}
