'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { broadcast } from '@/lib/client/broadcast';

/**
 * Registers the QuantFoundry service worker in both dev and production so
 * offline caching works seamlessly, then kicks off a quiet background
 * download of all content packs and route shells on first idle.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const isDev = process.env.NODE_ENV !== 'production';
    const swUrl = isDev ? '/sw.js?mode=dev' : '/sw.js';

    try {
      void navigator.storage?.persist?.().catch(() => {});
    } catch { /* ignore */ }

    let triggered = false;
    const triggerBackgroundDownload = (reg: ServiceWorkerRegistration) => {
      if (triggered || !navigator.onLine) return;
      const target = reg.active || navigator.serviceWorker.controller;
      if (!target) return;
      triggered = true;
      const run = () => target.postMessage({ type: 'QF3_DOWNLOAD_ALL' });
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) setTimeout(() => ric(run, { timeout: 3000 }), 1200);
      else setTimeout(run, 2000);
    };

    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === 'QF3_DL_DONE') {
        broadcast('offline-ready', ev.data);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    navigator.serviceWorker
      .register(swUrl, { scope: '/' })
      .then((reg) => {
        if (reg.active) {
          triggerBackgroundDownload(reg);
        }
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'activated') {
              triggerBackgroundDownload(reg);
              if (navigator.serviceWorker.controller && !isDev) {
                toast.info('App updated with latest packs & fixes.', {
                  action: { label: 'Refresh', onClick: () => window.location.reload() },
                });
              }
            }
          });
        });
        return navigator.serviceWorker.ready;
      })
      .then((readyReg) => {
        if (readyReg) triggerBackgroundDownload(readyReg);
      })
      .catch(() => {
        /* SW registration blocked (e.g. private window): app remains online-only */
      });

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  return null;
}
