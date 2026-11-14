'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker. In production the SW provides full offline
 * support (static assets + visited pages). In development it runs in a
 * dev-safe mode: network-first navigation with the offline notice only, * no asset caching, so Fast Refresh and recompiles behave normally.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    const isDev = process.env.NODE_ENV !== 'production';
    const onLoad = () => {
      // Unregister any stale legacy scoped service workers
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) {
          if (reg.scope !== window.location.origin + '/' && reg.scope !== window.location.origin) {
            reg.unregister();
          }
        }
      }).catch(() => {});

      navigator.serviceWorker
        .register(`/sw.js${isDev ? '?mode=dev' : ''}`, { scope: '/' })
        .catch(() => {
          /* registration failure is non-fatal, the app works without offline support */
        });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
