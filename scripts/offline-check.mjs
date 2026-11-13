// Offline gate (spec Part 8.3). Every check asserts observed behaviour.
// usage: node scripts/offline-check.mjs [baseUrl]   (needs a running server and the demo user)
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3002';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`); await page.waitForTimeout(1200);
await page.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || ''));
await page.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await page.click('button[type=submit]');
await page.waitForURL(/dashboard|learn|onboarding/, { timeout: 10000 }).catch(() => {});
check('signed in', !/\/login/.test(page.url()), page.url());

await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' }); await page.waitForTimeout(2500);
const online = await page.evaluate(() => document.querySelector('h1,h2') ? document.body.innerText.length : 0);
check('dashboard renders online', online > 200, `${online} chars`);

// Download every pack through the service worker and wait for its real completion message.
const dl = await page.evaluate(() => navigator.serviceWorker.ready.then(reg => new Promise(res => {
  const t = setTimeout(() => res({ timeout: true }), 90000);
  navigator.serviceWorker.addEventListener('message', e => {
    const d = e.data;
    if (d?.type === 'QF3_DL_PROGRESS' && !d.running && (d.finishedAt || d.error)) { clearTimeout(t); res(d); }
  });
  (reg.active || reg.installing).postMessage({ type: 'QF3_DOWNLOAD_ALL' });
})));
check('download-all finished without error', !!dl.finishedAt && !dl.error && !dl.timeout, JSON.stringify({ done: dl.done, total: dl.total, error: dl.error, timeout: dl.timeout }));
check('every file actually cached (no failures)', dl.total > 0 && dl.cached === dl.total && dl.failed === 0 && dl.phase === 'done', `cached ${dl.cached}/${dl.total}, failed ${dl.failed}, phase ${dl.phase}`);

// Offline: each shell route renders real app content, not the offline fallback page.
await ctx.setOffline(true);
for (const route of ['/dashboard', '/revision', '/practice', '/learn', '/settings']) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => ({ len: document.body.innerText.length, fallback: /hasn't been saved for offline use/i.test(document.body.innerText), h: !!document.querySelector('h1') }));
  check(`renders offline: ${route}`, info.len > 200 && !info.fallback && info.h, `${info.len} chars`);
}

// Offline: queue an event, then reconnect and require the queue to flush and the server to hold it once.
const evId = 'offline-check-' + Date.now();
await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' }).catch(() => {});
await page.evaluate(id => {
  const q = JSON.parse(localStorage.getItem('qf3-queue') || '[]');
  q.push({ id, kind: 'drill_session', at: new Date().toISOString(), correct: 1, answered: 1 });
  localStorage.setItem('qf3-queue', JSON.stringify(q));
}, evId);
// Reload offline so the app loads the persisted queue exactly as it would after a restart.
await page.reload({ waitUntil: 'load' }).catch(() => {}); await page.waitForTimeout(2500);
const queuedOffline = await page.evaluate(id => JSON.parse(localStorage.getItem('qf3-queue') || '[]').some(e => e.id === id), evId);
check('event stays queued while offline', queuedOffline);
await ctx.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event('online')));
let flushed = false;
for (let i = 0; i < 20 && !flushed; i++) {
  await page.waitForTimeout(1000);
  flushed = await page.evaluate(id => !JSON.parse(localStorage.getItem('qf3-queue') || '[]').some(e => e.id === id), evId);
}
check('queue flushed after reconnect', flushed);

// Replaying the same id must be a duplicate (no double XP).
const replay = await page.evaluate(async id => {
  const r = await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events: [{ id, kind: 'drill_session', at: new Date().toISOString(), correct: 1, answered: 1 }] }) });
  return r.json();
}, evId);
check('replayed id is a duplicate', (replay.duplicates || []).includes(evId) && !(replay.accepted || []).includes(evId), JSON.stringify({ dup: replay.duplicates, acc: replay.accepted }));

// Partial outage: block one pack file; the download must report a partial result, not claim completion.
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto(`${BASE}/login`); await p2.waitForTimeout(1200);
await p2.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || '')); await p2.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await p2.click('button[type=submit]'); await p2.waitForURL(/dashboard|learn|onboarding/, { timeout: 10000 }).catch(() => {});
await p2.goto(`${BASE}/dashboard`, { waitUntil: 'load' }); await p2.waitForTimeout(2500);
const mf = await p2.evaluate(() => fetch('/packs/v3/manifest.json').then(r => r.json()));
const victim = (mf.files || []).find(f => /lessons|map/.test(f)) || mf.files[0];
await ctx2.route('**' + victim, r => r.abort());
const dl2 = await p2.evaluate(() => navigator.serviceWorker.ready.then(reg => new Promise(res => {
  const t = setTimeout(() => res({ timeout: true }), 90000);
  navigator.serviceWorker.addEventListener('message', e => { const d = e.data; if (d?.type === 'QF3_DL_PROGRESS' && !d.running && (d.finishedAt || d.error)) { clearTimeout(t); res(d); } });
  (reg.active || reg.installing).postMessage({ type: 'QF3_DOWNLOAD_ALL' });
})));
check('partial outage reported as partial, not complete', dl2.phase === 'partial' && dl2.failed >= 1 && dl2.cached < dl2.total && !!dl2.error, `phase ${dl2.phase}, cached ${dl2.cached}/${dl2.total}, failed ${dl2.failed} (${(dl2.failedFiles || [])[0]})`);

await browser.close();
const fails = results.filter(r => !r.ok).length;
console.log(fails === 0 ? `offline gate: ${results.length}/${results.length} pass` : `offline gate: ${fails} of ${results.length} FAILED`);
process.exit(fails === 0 ? 0 : 1);
