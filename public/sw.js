/* QuantFoundry Service Worker — seamless offline packs, dynamic shell fallback, background sync */

const VERSION = 'qf4-v5';
const CACHE_PACKS = `${VERSION}-packs`;
const CACHE_SHELL = `${VERSION}-shell`;
const CACHE_STATIC = `${VERSION}-static`;
const META_KEY = 'qf4-manifest-stamp-v5';

const DEV_MODE = new URL(self.location.href).searchParams.get('mode') === 'dev';

const SHELL_ROUTES = [
  '/',
  '/dashboard',
  '/curriculum',
  '/learn',
  '/practice',
  '/assessments',
  '/projects',
  '/revision',
  '/drills',
  '/lab',
  '/analytics',
  '/planner',
  '/career',
  '/diagnostic',
  '/pricing',
  '/about',
  '/methodology',
  '/privacy',
  '/terms',
  '/contact',
  '/settings',
  '/login',
  '/register',
];

const DYNAMIC_SHELLS = [
  { prefix: '/learn/', seed: '/learn/ap-python-values-units', htmlKey: '/__shell__/learn.html', rscKey: '/__shell__/learn.rsc' },
  { prefix: '/practice/', seed: '/practice/min-stack', htmlKey: '/__shell__/practice.html', rscKey: '/__shell__/practice.rsc' },
  { prefix: '/assessments/', seed: '/assessments/diag-core', htmlKey: '/__shell__/assessments.html', rscKey: '/__shell__/assessments.rsc' },
  { prefix: '/projects/', seed: '/projects/limit-order-book', htmlKey: '/__shell__/projects.html', rscKey: '/__shell__/projects.rsc' },
  { prefix: '/career/', seed: '/career/jane-street', htmlKey: '/__shell__/career.html', rscKey: '/__shell__/career.rsc' },
];

function matchDynamicShell(pathname) {
  for (const entry of DYNAMIC_SHELLS) {
    if (pathname.startsWith(entry.prefix) && pathname.length > entry.prefix.length) {
      return entry;
    }
  }
  return null;
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico' ||
    /\.(?:png|svg|jpg|jpeg|webp|woff2?|css|js)$/i.test(pathname)
  );
}

function isRscRequest(request, url) {
  if (url.searchParams.has('_rsc')) return true;
  if (request.headers.get('rsc') === '1' || request.headers.get('next-router-state-tree')) return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/x-component');
}

function rscCacheKey(url) {
  const clean = new URL(url.href);
  clean.searchParams.delete('_rsc');
  return clean.pathname + (clean.search ? clean.search : '') + '::rsc';
}

function isCacheablePage(res) {
  if (!res || !res.ok) return false;
  if (res.redirected && res.url && res.url.includes('/login')) return false;
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then((cache) => cache.addAll(['/']).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => !n.startsWith(VERSION))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

function extractStaticUrls(text) {
  const urls = new Set();
  if (!text) return [];
  const fullRe = /(\/_next\/static\/[A-Za-z0-9_.\-%\[\]\/~@+]+)/g;
  let m;
  while ((m = fullRe.exec(text)) !== null) {
    urls.add(m[1]);
  }
  const relRe = /["'](static\/(?:chunks|css|media)\/[A-Za-z0-9_.\-%\[\]\/~@+]+)["']/g;
  while ((m = relRe.exec(text)) !== null) {
    urls.add('/_next/' + m[1]);
  }
  const mediaRelRe = /\.\.\/(media\/[A-Za-z0-9_.\-%\/~@+]+)/g;
  while ((m = mediaRelRe.exec(text)) !== null) {
    urls.add('/_next/static/' + m[1]);
  }
  return Array.from(urls);
}

async function cacheAssetFromHtml(htmlText, staticCache, seenUrls = new Set()) {
  const urls = extractStaticUrls(htmlText);
  const fetchQueue = urls.filter((u) => !seenUrls.has(u));
  for (const u of fetchQueue) seenUrls.add(u);

  const nestedTexts = [];
  for (let i = 0; i < fetchQueue.length; i += 8) {
    await Promise.all(
      fetchQueue.slice(i, i + 8).map(async (u) => {
        try {
          const hit = await staticCache.match(u, { ignoreSearch: true });
          if (hit) {
            if (/\.(?:js|css)$/i.test(u)) {
              nestedTexts.push(await hit.clone().text().catch(() => ''));
            }
            return;
          }
          const r = await fetch(u);
          if (r.ok) {
            const clone = r.clone();
            await staticCache.put(u, r);
            if (/\.(?:js|css)$/i.test(u)) {
              nestedTexts.push(await clone.text().catch(() => ''));
            }
          }
        } catch { /* ignore individual asset failure */ }
      }),
    );
  }

  // Depth-1 pass: discover dynamic/lazy JS chunks & CSS fonts referenced by downloaded bundles
  if (nestedTexts.length > 0) {
    const nestedUrls = new Set();
    for (const body of nestedTexts) {
      for (const nu of extractStaticUrls(body)) {
        if (!seenUrls.has(nu)) {
          seenUrls.add(nu);
          nestedUrls.add(nu);
        }
      }
    }
    const extra = Array.from(nestedUrls);
    const depth2Texts = [];
    for (let i = 0; i < extra.length; i += 8) {
      await Promise.all(
        extra.slice(i, i + 8).map(async (u) => {
          try {
            const hit = await staticCache.match(u, { ignoreSearch: true });
            if (hit) {
              if (/\.(?:js|css)$/i.test(u)) {
                depth2Texts.push(await hit.clone().text().catch(() => ''));
              }
              return;
            }
            const r = await fetch(u);
            if (r.ok) {
              const clone = r.clone();
              await staticCache.put(u, r);
              if (/\.(?:js|css)$/i.test(u)) {
                depth2Texts.push(await clone.text().catch(() => ''));
              }
            }
          } catch { /* ignore */ }
        }),
      );
    }
    if (depth2Texts.length > 0) {
      const depth2Urls = new Set();
      for (const body of depth2Texts) {
        for (const nu of extractStaticUrls(body)) {
          if (!seenUrls.has(nu)) {
            seenUrls.add(nu);
            depth2Urls.add(nu);
          }
        }
      }
      const d2 = Array.from(depth2Urls);
      for (let i = 0; i < d2.length; i += 8) {
        await Promise.all(
          d2.slice(i, i + 8).map(async (u) => {
            try {
              if (await staticCache.match(u, { ignoreSearch: true })) return;
              const r = await fetch(u);
              if (r.ok) await staticCache.put(u, r);
            } catch { /* ignore */ }
          }),
        );
      }
    }
  }
}

let downloadingPromise = null;

async function broadcastMsg(payload) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage(payload);
  }
}

async function runDownloadAll(force = false) {
  if (downloadingPromise) return downloadingPromise;
  downloadingPromise = (async () => {
    try {
      const packCache = await caches.open(CACHE_PACKS);
      const shellCache = await caches.open(CACHE_SHELL);
      const staticCache = await caches.open(CACHE_STATIC);

      const mRes = await fetch('/packs/v3/manifest.json', { cache: 'no-store' });
      if (!mRes.ok) return;
      const manifest = await mRes.clone().json();
      await packCache.put('/packs/v3/manifest.json', mRes);

      const stamp = `${manifest.version || '0'}@${manifest.builtAt || '0'}`;
      if (!force) {
        const metaRes = await packCache.match(META_KEY);
        const prevStamp = metaRes ? await metaRes.text() : null;
        if (prevStamp === stamp) {
          // Verify key shell HTML and RSC Flight payload are still present before skipping
          const [dashHit, dashRscHit] = await Promise.all([
            shellCache.match('/dashboard'),
            shellCache.match('/dashboard::rsc'),
          ]);
          if (dashHit && dashRscHit) {
            await broadcastMsg({ type: 'QF3_DL_DONE', total: (manifest.files || []).length, skipped: true });
            return;
          }
        }
      }

      const files = Array.isArray(manifest.files) ? manifest.files : [];
      const total = files.length + SHELL_ROUTES.length + DYNAMIC_SHELLS.length;
      let done = 0;

      // 1. Download all static content packs in polite low-concurrency batches
      const BATCH = 12;
      for (let i = 0; i < files.length; i += BATCH) {
        const slice = files.slice(i, i + BATCH);
        await Promise.all(
          slice.map(async (url) => {
            try {
              const hit = !force ? await packCache.match(url) : null;
              if (!hit) {
                const r = await fetch(url);
                if (r.ok) await packCache.put(url, r);
              }
            } catch { /* retry next load */ }
            done++;
          }),
        );
        await broadcastMsg({ type: 'QF3_DL_PROGRESS', done, total });
      }

      // 2. Cache navigation HTML shells + RSC Flight payloads + static JS/CSS chunks referenced by them
      const seenAssets = new Set();
      for (let i = 0; i < SHELL_ROUTES.length; i += 4) {
        const slice = SHELL_ROUTES.slice(i, i + 4);
        await Promise.all(
          slice.map(async (route) => {
            try {
              const res = await fetch(route, { credentials: 'same-origin' });
              if (isCacheablePage(res)) {
                const clone = res.clone();
                await shellCache.put(route, res);
                const text = await clone.text();
                await cacheAssetFromHtml(text, staticCache, seenAssets);
              }
            } catch { /* ignore individual route failure */ }
            try {
              const rscRes = await fetch(route, {
                credentials: 'same-origin',
                headers: { RSC: '1', Accept: 'text/x-component' },
              });
              const ct = (rscRes.headers.get('content-type') || '').toLowerCase();
              if (isCacheablePage(rscRes) && !ct.includes('text/html')) {
                const rscClone = rscRes.clone();
                await shellCache.put(`${route}::rsc`, rscRes);
                const rscText = await rscClone.text();
                await cacheAssetFromHtml(rscText, staticCache, seenAssets);
              }
            } catch { /* ignore individual RSC failure */ }
            done++;
          }),
        );
        await broadcastMsg({ type: 'QF3_DL_PROGRESS', done, total });
      }

      // 2b. Cache essential app icons & webmanifest so zero 503s occur offline
      await Promise.all(
        ['/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/favicon-32.png', '/favicon-64.png', '/manifest.json', '/manifest.webmanifest'].map(
          async (assetUrl) => {
            try {
              if (await staticCache.match(assetUrl)) return;
              const r = await fetch(assetUrl);
              if (r.ok) await staticCache.put(assetUrl, r);
            } catch { /* ignore */ }
          },
        ),
      );

      // 3. Seed canonical dynamic shells (HTML + RSC) so any /learn/*, /practice/*, /assessments/*, /projects/*, /career/* works offline
      await Promise.all(
        DYNAMIC_SHELLS.map(async (entry) => {
          try {
            const htmlRes = await fetch(entry.seed, { credentials: 'same-origin' });
            if (isCacheablePage(htmlRes)) {
              const clone = htmlRes.clone();
              await shellCache.put(entry.htmlKey, htmlRes);
              await shellCache.put(entry.seed, clone.clone());
              const text = await clone.text();
              await cacheAssetFromHtml(text, staticCache, seenAssets);
            }
          } catch { /* ignore */ }
          try {
            const rscRes = await fetch(entry.seed, {
              credentials: 'same-origin',
              headers: { RSC: '1', Accept: 'text/x-component' },
            });
            if (isCacheablePage(rscRes)) {
              const rscClone = rscRes.clone();
              await shellCache.put(entry.rscKey, rscRes);
              await shellCache.put(`${entry.seed}::rsc`, rscClone.clone());
              const rscText = await rscClone.text();
              await cacheAssetFromHtml(rscText, staticCache, seenAssets);
            }
          } catch { /* ignore */ }
          done++;
        }),
      );

      await packCache.put(META_KEY, new Response(stamp));
      await broadcastMsg({ type: 'QF3_DL_PROGRESS', done: total, total });
      await broadcastMsg({ type: 'QF3_DL_DONE', total, skipped: false });
    } catch {
      // silent retry on next load
    } finally {
      downloadingPromise = null;
    }
  })();
  return downloadingPromise;
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'QF3_DOWNLOAD_ALL') {
    event.waitUntil(runDownloadAll(!!data.force));
  } else if (data.type === 'QF3_CLEAR_PACKS') {
    event.waitUntil(
      (async () => {
        await caches.delete(CACHE_PACKS);
        await caches.delete(CACHE_SHELL);
        await broadcastMsg({ type: 'QF3_CLEARED' });
      })(),
    );
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // 1. Manifest: network-first so version bumps are detected promptly, cache fallback offline
  if (url.pathname === '/packs/v3/manifest.json') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_PACKS);
        try {
          const res = await fetch(request);
          if (res.ok) await cache.put(request, res.clone());
          return res;
        } catch {
          const cached = await cache.match(request);
          return cached || new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } });
        }
      })(),
    );
    return;
  }

  // 2. Content packs (/packs/**): cache-first with network fallback in both dev & prod
  if (url.pathname.startsWith('/packs/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_PACKS);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) await cache.put(request, res.clone());
          return res;
        } catch {
          return new Response(JSON.stringify({ error: 'Offline pack unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })(),
    );
    return;
  }

  // 3. Static JS/CSS/fonts/images: network-first in dev (preserves HMR), cache-first in prod
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_STATIC);
        const matchStatic = async () => {
          let hit = await cache.match(request, { ignoreSearch: true });
          if (hit) return hit;
          try {
            const decoded = decodeURIComponent(url.pathname);
            if (decoded !== url.pathname) {
              hit = await cache.match(decoded, { ignoreSearch: true });
              if (hit) return hit;
            }
          } catch { /* ignore malformed uri */ }
          return null;
        };
        if (!DEV_MODE && url.pathname.startsWith('/_next/static/')) {
          const hit = await matchStatic();
          if (hit) return hit;
        }
        try {
          const res = await fetch(request);
          if (res.ok) await cache.put(request, res.clone());
          return res;
        } catch {
          const hit = await matchStatic();
          if (hit) return hit;
          return new Response('', { status: 503 });
        }
      })(),
    );
    return;
  }

  // 4. Next.js RSC Flight requests: network-first, fallback to exact cached RSC or wildcard dynamic shell RSC
  if (isRscRequest(request, url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_SHELL);
        const key = rscCacheKey(url);
        const matchCachedRsc = async () => {
          const exact = await cache.match(key);
          if (exact) return exact;
          const byPath = await cache.match(`${url.pathname}::rsc`);
          if (byPath) return byPath;
          const dyn = matchDynamicShell(url.pathname);
          if (dyn) {
            const dynRes = await cache.match(dyn.rscKey);
            if (dynRes) return dynRes;
          }
          return null;
        };
        if (typeof self.navigator !== 'undefined' && self.navigator.onLine === false) {
          const hit = await matchCachedRsc();
          if (hit) return hit;
        }
        try {
          const res = await fetch(request);
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          if (isCacheablePage(res) && !ct.includes('text/html')) {
            await cache.put(key, res.clone());
            const dyn = matchDynamicShell(url.pathname);
            if (dyn && !request.headers.get('next-router-segment-prefetch')) {
              await cache.put(dyn.rscKey, res.clone());
            }
          }
          return res;
        } catch {
          const cached = await matchCachedRsc();
          if (cached) return cached;
          return new Response('', { status: 503 });
        }
      })(),
    );
    return;
  }

  // 5. Navigation / HTML documents: network-first, fallback to cached page -> dynamic shell -> '/'
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_SHELL);
        const matchCachedHtml = async () => {
          const exact = await cache.match(url.pathname);
          if (exact) return exact;
          const dyn = matchDynamicShell(url.pathname);
          if (dyn) {
            const dynHit = await cache.match(dyn.htmlKey);
            if (dynHit) return dynHit;
          }
          const rootHit = await cache.match('/');
          if (rootHit) return rootHit;
          return null;
        };
        if (typeof self.navigator !== 'undefined' && self.navigator.onLine === false) {
          const hit = await matchCachedHtml();
          if (hit) return hit;
        }
        try {
          const res = await fetch(request);
          if (isCacheablePage(res)) {
            await cache.put(url.pathname, res.clone());
            const dyn = matchDynamicShell(url.pathname);
            if (dyn) await cache.put(dyn.htmlKey, res.clone());
          }
          return res;
        } catch {
          const cached = await matchCachedHtml();
          if (cached) return cached;
          return new Response(
            '<!doctype html><html><body style="font-family:sans-serif;padding:2rem"><h2>Offline</h2><p>This page has not been cached yet. Return to <a href="/dashboard">Dashboard</a> or <a href="/curriculum">Curriculum</a>.</p></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          );
        }
      })(),
    );
  }
});
