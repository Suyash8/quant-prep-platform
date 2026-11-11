/* QuantFoundry v3 service worker: full offline app.
 *
 * Strategies:
 *  - /packs/v3/**  : cache-first (immutable, versioned content packs)
 *  - static assets : cache-first (_next/static, icons, fonts, manifest)
 *  - navigations   : network-first, cache fallback, offline page last
 *  - /api/**       : network only, never cached
 *
 * Messages from the page:
 *  - SKIP_WAITING                : activate the new worker now
 *  - QF3_DOWNLOAD_ALL            : fetch every pack file + shell routes into
 *                                  the pack cache; posts QF3_DL_PROGRESS back
 *  - QF3_DOWNLOAD_STATUS         : reply QF3_DL_STATUS with counts
 *  - QF3_CLEAR_PACKS             : drop pack + page caches
 */

const VERSION = 'qf3-v3';
const STATIC_CACHE = `${VERSION}-static`;
const PACK_CACHE = `${VERSION}-packs`;
const PAGE_CACHE = `${VERSION}-pages`;

// Routes that make the app usable offline when pre-fetched during download-all.
const SHELL_ROUTES = ['/', '/dashboard', '/curriculum', '/learn', '/practice', '/revision', '/drills', '/projects', '/assessments', '/planner', '/lab', '/analytics', '/settings'];

const PRECACHE = [
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
];

const DEV_MODE = new URL(self.location.href).searchParams.get('mode') === 'dev';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => (DEV_MODE ? undefined : self.skipWaiting()))
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

const LESSON_SHELL_HTML = '/__qf3/lesson-shell-html';
const LESSON_SHELL_RSC = '/__qf3/lesson-shell-rsc';
const LESSON_SHELL_ID = '/__qf3/lesson-shell-id';

/** Serve the cached lesson shell rewritten for the requested lesson id, so
 *  the router state matches the URL and hydration completes offline. */
async function lessonShell(request, url, rsc) {
  const cache = await caches.open(PAGE_CACHE);
  const idResp = await cache.match(LESSON_SHELL_ID);
  if (!idResp) return null;
  const anchorId = (await idResp.text()).trim();
  const targetId = decodeURIComponent(url.pathname.slice('/learn/'.length));
  if (!anchorId || !targetId || anchorId === targetId) {
    return cache.match(rsc ? LESSON_SHELL_RSC : LESSON_SHELL_HTML);
  }
  const shell = await cache.match(rsc ? LESSON_SHELL_RSC : LESSON_SHELL_HTML);
  if (!shell) return null;
  const text = await shell.text();
  // the id appears both raw (RSC stream) and backslash-escaped (inline
  // flight data inside <script> tags), replace both forms
  let rewritten = text.split('"' + anchorId + '"').join('"' + targetId + '"');
  rewritten = rewritten.split('\\\"' + anchorId + '\\\"').join('\\\"' + targetId + '\\\"');
  return new Response(rewritten, {
    status: 200,
    headers: {
      'Content-Type': rsc ? 'text/x-component; charset=utf-8' : 'text/html; charset=utf-8',
      'X-QF3-Shell': '1',
    },
  });
}

function isLessonPath(pathname) {
  return /^\/learn\/[^/]+$/.test(pathname);
}

function rscKey(pathname) {
  return `/__qf3/rsc${pathname}`;
}

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

  // Content packs: cache-first, they are immutable per version
  if (url.pathname.startsWith('/packs/')) {
    if (DEV_MODE) return;
    event.respondWith(
      caches.open(PACK_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // Static assets: stale-while-revalidate (skipped in dev)
  if (!DEV_MODE && isStatic(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fresh = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);
        const res = cached || (await fresh);
        // offline and never cached: fail loudly instead of hanging forever
        return res || new Response('offline', { status: 504, statusText: 'offline' });
      })
    );
    return;
  }

  // RSC payload requests (client-side navigation): network-first with cache
  // fallback so moving between pages works offline after download-all.
  if (request.headers.get('RSC') === '1') {
    if (DEV_MODE) return;
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(rscKey(url.pathname), copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          // /learn/<any>/ falls back to the rewritten lesson shell
          if (isLessonPath(url.pathname)) {
            const shell = await lessonShell(request, url, true);
            if (shell) return shell;
          }
          const cached = await (await caches.open(PAGE_CACHE)).match(rscKey(url.pathname));
          return cached || Response.error();
        })
    );
    return;
  }

  // Navigations: network-first, cache fallback, offline notice last
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (!DEV_MODE && res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cached = DEV_MODE ? null : await caches.match(request);
          if (cached) return cached;
          // every lesson renders the same shell; rewriting the id makes the
          // cached anchor lesson serve any lesson offline
          if (!DEV_MODE && isLessonPath(url.pathname)) {
            const shell = await lessonShell(request, url, false);
            if (shell) return shell;
          }
          return new Response(
            `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center;
    background:#0b0e14; color:#e6e9ef; font-family:system-ui, sans-serif; }
  .card { max-width:26rem; padding:2rem; text-align:center; }
  h1 { font-size:1.4rem; margin:0 0 .75rem; }
  p { color:#9aa3b2; line-height:1.5; margin:0 0 1.25rem; }
  a { display:inline-block; background:#58cc02; color:#fff; font-weight:800;
    text-decoration:none; padding:.8rem 1.6rem; border-radius:1rem; }
</style></head><body><div class="card">
<h1>You're offline</h1>
<p>This page hasn't been saved for offline use yet. Reconnect once, or use "Download everything" in Settings to make the whole app work offline.</p>
<a href="/dashboard">Try again</a>
</div></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
  }
});

// ---------- download-all ----------

let dlState = { running: false, done: 0, total: 0, phase: '', error: null, finishedAt: null };

async function broadcast(msg) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const c of clients) c.postMessage(msg);
}

async function downloadAll() {
  if (dlState.running) return;
  dlState = { running: true, done: 0, total: 0, phase: 'manifest', error: null, finishedAt: null };
  broadcast({ type: 'QF3_DL_PROGRESS', ...dlState });
  try {
    const cache = await caches.open(PACK_CACHE);
    const res = await fetch('/packs/v3/manifest.json', { cache: 'reload' });
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    await cache.put('/packs/v3/manifest.json', res.clone());
    const manifest = await res.json();

    const files = manifest.files || [];
    dlState.total = files.length + SHELL_ROUTES.length;
    dlState.phase = 'packs';
    broadcast({ type: 'QF3_DL_PROGRESS', ...dlState });

    // packs in small batches so progress feels live and nothing times out
    const BATCH = 12;
    for (let i = 0; i < files.length; i += BATCH) {
      const slice = files.slice(i, i + BATCH);
      await Promise.all(slice.map(async (f) => {
        try {
          const r = await fetch(f, { cache: 'reload' });
          if (r.ok) await cache.put(f, r.clone());
        } catch {
          /* skip broken file, keep going */
        }
        dlState.done++;
      }));
      broadcast({ type: 'QF3_DL_PROGRESS', ...dlState });
    }

    // shell routes: HTML for hard loads + RSC payloads for client-side nav
    dlState.phase = 'pages';
    broadcast({ type: 'QF3_DL_PROGRESS', ...dlState });
    const pageCache = await caches.open(PAGE_CACHE);
    const staticCache = await caches.open(STATIC_CACHE);
    const chunkSeen = new Set();
    async function cacheRouteChunks(html) {
      const refs = [...html.matchAll(/["']((?:\/_next\/static|\/icons)\/[^"']+)["']/g)].map((m) => m[1]);
      await Promise.all(refs.map(async (ref) => {
        if (chunkSeen.has(ref)) return;
        chunkSeen.add(ref);
        try {
          const cr = await fetch(ref, { cache: 'reload' });
          if (cr.ok) await staticCache.put(ref, cr.clone());
        } catch { /* skip */ }
      }));
    }
    for (const route of SHELL_ROUTES) {
      try {
        const r = await fetch(route, { cache: 'reload' });
        if (r.ok) {
          const body = await r.text();
          await cacheRouteChunks(body);
          await pageCache.put(route, new Response(body, { headers: r.headers }));
        }
      } catch {
        /* route may require auth; skip */
      }
      try {
        const rr = await fetch(route, { cache: 'reload', headers: { RSC: '1' } });
        if (rr.ok) await pageCache.put(rscKey(route), rr.clone());
      } catch {
        /* ignore */
      }
      dlState.done++;
      broadcast({ type: 'QF3_DL_PROGRESS', ...dlState });
    }

    // route-agnostic lesson shell: one lesson page serves every lesson offline
    const firstLessonFile = files.find((x) => x.startsWith('/packs/v3/lessons/'));
    if (firstLessonFile) {
      const lessonId = firstLessonFile.slice('/packs/v3/lessons/'.length, -'.json'.length);
      const lessonRoute = `/learn/${lessonId}`;
      await pageCache.put(LESSON_SHELL_ID, new Response(lessonId, { headers: { 'Content-Type': 'text/plain' } }));
      try {
        const r = await fetch(lessonRoute, { cache: 'reload' });
        if (r.ok) {
          const body = await r.text();
          await cacheRouteChunks(body);
          await pageCache.put(LESSON_SHELL_HTML, new Response(body, { headers: r.headers }));
        }
        const rr = await fetch(lessonRoute, { cache: 'reload', headers: { RSC: '1' } });
        if (rr.ok) await pageCache.put(LESSON_SHELL_RSC, rr.clone());
      } catch {
        /* ignore */
      }
    }

    dlState.phase = 'done';
    dlState.finishedAt = Date.now();
  } catch (e) {
    dlState.error = String(e && e.message || e);
    dlState.phase = 'error';
  }
  dlState.running = false;
  broadcast({ type: 'QF3_DL_PROGRESS', ...dlState });
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data === 'SKIP_WAITING' || data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'QF3_DOWNLOAD_ALL') event.waitUntil(downloadAll());
  if (data.type === 'QF3_DOWNLOAD_STATUS') {
    event.source?.postMessage({ type: 'QF3_DL_PROGRESS', ...dlState });
  }
  if (data.type === 'QF3_CLEAR_PACKS') {
    event.waitUntil((async () => {
      await caches.delete(PACK_CACHE);
      await caches.delete(PAGE_CACHE);
      dlState = { running: false, done: 0, total: 0, phase: '', error: null, finishedAt: null };
      broadcast({ type: 'QF3_DL_PROGRESS', ...dlState });
    })());
  }
});
