/* QuantFoundry v5 shell service worker. Scope /v5/ only. Caches the app shell (HTML for /v5 routes, hashed static assets) so
 * the learning routes reload offline. Learner content and attempts live in IndexedDB, not here. Never caches /api or content packs.
 * This is a best-effort cache: browsers can evict it, so the UI reports stored counts, not guarantees. */
const SHELL = 'qf5-shell-v1';
const okPath = (p) => p === '/v5/learn' || p === '/v5/review' || p === '/v5/progress' || p === '/v5/practice' || /^\/v5\/practice\/qfp-[a-z0-9-]+$/.test(p) || /^\/v5\/learn\/qf5-[a-z0-9-]+$/.test(p);
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('qf5-shell-') && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
const assetUrls = (html) => [...new Set([...html.matchAll(/["'(](\/_next\/static\/[^"'\s)\\]+)/g)].map((m) => m[1]))];
async function store(url) {
  const cache = await caches.open(SHELL); const res = await fetch(url, { credentials: 'same-origin', headers: { accept: 'text/html' } });
  if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html') || res.redirected) return 0;
  const html = await res.clone().text(); await cache.put(url, res);
  let n = 1; await Promise.all(assetUrls(html).map(async (a) => { if (await cache.match(a)) return; try { const r = await fetch(a); if (r.ok) { await cache.put(a, r); n++; } } catch { /* offline mid-precache */ } }));
  return n;
}
self.addEventListener('message', (e) => {
  if (e.data?.type !== 'qf5-precache') return;
  const urls = (e.data.urls || []).filter((u) => typeof u === 'string' && okPath(u.split('?')[0]));
  const assets = (e.data.assets || []).filter((u) => typeof u === 'string' && u.startsWith('/_next/static/'));
  e.waitUntil((async () => {
    // Bounded parallelism (6): one round trip per page made the full precache take minutes on a slow link. Each page is stored only if it came back as real HTML.
    const pool = async (items, fn, n = 6) => { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const it = items[i++]; try { await fn(it); } catch { /* skip */ } } })); };
    let pages = 0; await pool(urls, async (u) => { if (await store(u)) pages++; });
    const cache = await caches.open(SHELL); await pool(assets, async (a) => { if (!(await cache.match(a))) { const r = await fetch(a); if (r.ok) await cache.put(a, r); } });
    const cs = await self.clients.matchAll(); cs.forEach((c) => c.postMessage({ type: 'qf5-precache-done', pages, wanted: urls.length }));
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return; const url = new URL(req.url); if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/_next/static/')) {   // hashed, immutable: cache-first
    e.respondWith(caches.open(SHELL).then(async (c) => { const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }));
    return;
  }
  if (req.mode === 'navigate' && okPath(url.pathname)) {   // network-first so online users always get the newest shell
    e.respondWith(fetch(req).then((r) => { if (r.ok && !r.redirected) caches.open(SHELL).then((c) => c.put(url.pathname, r.clone())); return r; })
      .catch(async () => (await caches.match(url.pathname)) || new Response('<!doctype html><meta charset=utf-8><title>Offline</title><p style="font-family:system-ui;padding:24px">This page was not saved on this device yet. Connect once and open it again.</p>', { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } })));
  }
});
