'use client';

/**
 * v3 offline manager: "download everything" control for the settings page.
 * Talks to the service worker (QF3_DOWNLOAD_ALL / QF3_DL_PROGRESS) and shows
 * live progress, storage used, and a clear button.
 */

import * as React from 'react';
import { ArrowDownToLine, CheckCircle2, CloudOff, HardDrive, Loader2, Trash2 } from 'lucide-react';
import { getManifest } from '@/lib/client/packs';

interface DlState {
  running: boolean;
  done: number;
  total: number;
  phase: string;
  error: null | string;
  finishedAt: number | null;
}

export function OfflineManager() {
  const [dl, setDl] = React.useState<DlState | null>(null);
  const [swReady, setSwReady] = React.useState(false);
  const [storage, setStorage] = React.useState<string | null>(null);
  const [packCount, setPackCount] = React.useState<number | null>(null);
  const [cleared, setCleared] = React.useState(false);

  const refreshStorage = React.useCallback(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(e => {
        if (e.usage != null) setStorage((e.usage / 1024 / 1024).toFixed(1) + ' MB');
      }).catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    getManifest().then(m => setPackCount(m.counts.lessons + m.counts.problems + m.counts.assessments + m.counts.projects)).catch(() => {});
    if (!('serviceWorker' in navigator)) return;
    let alive = true;
    navigator.serviceWorker.ready.then(() => { if (alive) setSwReady(true); }).catch(() => {});
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === 'QF3_DL_PROGRESS') {
        setDl({ running: ev.data.running, done: ev.data.done, total: ev.data.total, phase: ev.data.phase, error: ev.data.error, finishedAt: ev.data.finishedAt });
        if (ev.data.phase === 'done') refreshStorage();
      }
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    navigator.serviceWorker.controller?.postMessage({ type: 'QF3_DOWNLOAD_STATUS' });
    refreshStorage();
    return () => { alive = false; navigator.serviceWorker.removeEventListener('message', onMsg); };
  }, [refreshStorage]);

  function startDownload() {
    navigator.serviceWorker.controller?.postMessage({ type: 'QF3_DOWNLOAD_ALL' });
    setDl({ running: true, done: 0, total: 0, phase: 'manifest', error: null, finishedAt: null });
  }

  function clearOffline() {
    navigator.serviceWorker.controller?.postMessage({ type: 'QF3_CLEAR_PACKS' });
    setDl(null);
    setCleared(true);
    setTimeout(refreshStorage, 600);
  }

  const pct = dl && dl.total > 0 ? Math.min(100, Math.round((dl.done / dl.total) * 100)) : 0;
  const finished = dl?.phase === 'done';

  return (
    <section className="qf-card p-5 mt-6">
      <div className="section-head">
        <span className="icon-tile-sm icon-tile-info"><CloudOff /></span>
        <h2>Offline</h2>
        <span className={`chip ml-auto ${finished ? 'chip-success' : ''}`}>
          {finished ? 'ready' : swReady ? 'available' : 'unsupported'}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-muted leading-relaxed">
        Download every lesson, problem, assessment and project to this device. After that the whole
        app opens and scores instantly with no network: lessons, quizzes, XP, streaks and revision all
        run locally and sync the next time you&apos;re online.
      </p>

      {!swReady ? (
        <p className="mt-4 text-sm font-semibold text-faint">Offline storage needs a browser that supports service workers (any modern browser, over HTTPS).</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={startDownload} disabled={dl?.running} className="btn3d btn3d-sm">
              {dl?.running ? <Loader2 className="h-4 w-4 animate-spin" /> : finished ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
              {dl?.running ? 'Downloading…' : finished ? 'Download again' : 'Download everything'}
            </button>
            {(finished || storage) && (
              <button onClick={clearOffline} className="btn3d btn3d-ghost btn3d-sm">
                <Trash2 className="h-4 w-4" /> Clear offline data
              </button>
            )}
            {packCount !== null && (
              <span className="chip tnum">{packCount} content files</span>
            )}
            {storage && (
              <span className="chip tnum"><HardDrive className="h-3.5 w-3.5" /> {storage} used</span>
            )}
          </div>

          {dl && (dl.running || dl.done > 0) && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] font-black text-faint tnum mb-1.5">
                <span>
                  {dl.running
                    ? dl.phase === 'manifest' ? 'Reading the content manifest…'
                    : dl.phase === 'packs' ? `Saving lessons and problems… ${dl.done}/${dl.total}`
                    : dl.phase === 'pages' ? `Saving app pages… ${dl.done}/${dl.total}`
                    : 'Working…'
                    : finished ? 'Everything saved. The app now works offline.'
                    : ''}
                </span>
                <span>{dl.total > 0 ? pct + '%' : ''}</span>
              </div>
              <div className="h-3 rounded-full bg-surface-3 border border-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${finished ? 'bg-accent' : 'bg-info'}`}
                  style={{ width: `${dl.running || finished ? Math.max(pct, 4) : 0}%` }}
                />
              </div>
              {dl.error && <p className="mt-2 text-xs font-bold text-danger">Something failed: {dl.error}. Try again.</p>}
            </div>
          )}

          {finished && !dl?.running && (
            <p className="mt-3 text-xs font-semibold text-success flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Offline ready. Tip: add the app to your home screen for the full experience.
            </p>
          )}
          {cleared && !dl?.running && (
            <p className="mt-3 text-xs font-semibold text-faint">Offline data cleared. The app still works online.</p>
          )}
        </>
      )}
    </section>
  );
}
