/* QuantFoundry service worker — offline shell + static asset caching.
 *
 * Strategy:
 *  - Navigation requests: network-first with an offline fallback to a cached
 *    shell page (so "no internet" is explicit, never a silent blank screen).
 *  - Static assets (icons, fonts, manifest): stale-while-revalidate.
 *  - Never cache: /api/*, /_next/webpack-hmr (dev), non-GET requests.
 *  - The lesson player already renders server-side; visited lessons are cached
 *    opportunistically so revision works offline.
 */

const VERSION = 'qf-v5';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
// Dev mode (registered with ?mode=dev): never cache assets or pages, only
// provide the offline notice on failed navigations. Keeps Fast Refresh sane.
const DEV_MODE = new URL(self.location.href).searchParams.get('mode') === 'dev';

const PRECACHE = DEV_MODE
  ? ['/manifest.json']
  : [
      '/manifest.json',
      '/icons/icon.svg',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
    ];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isStatic(url) {
  return (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/manifest.json' ||
    /\.(?:css|js|woff2?|png|svg|jpg|jpeg|webp|avif)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // Static assets: stale-while-revalidate (skipped entirely in dev mode)
  if (!DEV_MODE && isStatic(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fresh = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  // Navigations: network-first, fall back to cache, then to offline notice
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (!DEV_MODE) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cached = DEV_MODE ? null : await caches.match(request);
          if (cached) return cached;
          return new Response(
            `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline — QuantFoundry</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; background: #0b0e14; color: #e6e9ef;
         display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
  .box { max-width: 28rem; padding: 2rem; text-align: center; }
  h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
  p { color: #9aa3b2; font-size: .875rem; line-height: 1.6; }
  button { margin-top: 1.25rem; padding: .5rem 1.25rem; border-radius: .5rem; border: 0;
           background: #4f8cff; color: #fff; font-weight: 600; cursor: pointer; }
</style></head>
<body><div class="box">
<h1>You are offline</h1>
<p>QuantFoundry needs the network for lessons you have not opened yet. Pages you have already
visited remain available — reconnect and reload to continue.</p>
<button onclick="location.reload()">Try again</button>
</div></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
  }
});
