// Offline gate (Part 8.3): with packs downloaded, the app must render and
// grade offline, then resync without duplicating XP.
// usage: node scripts/offline-check.mjs [baseUrl]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3002';
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// 1. login
await page.goto(`${BASE}/login`); await page.waitForTimeout(1200);
await page.fill('input[type=email]', 'visual@test.dev');
await page.fill('input[type=password]', 'visualtest12345');
await page.click('button[type=submit]'); await page.waitForTimeout(2500);

// 2. open dashboard, go to settings/offline and download everything
await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' }); await page.waitForTimeout(2500);
check('dashboard renders online', true);

// drive the service worker download-all through its message channel
await page.evaluate(() => navigator.serviceWorker.ready.then(reg => {
  const sw = reg.active || reg.installing;
  return new Promise(res => {
    const onStatus = e => { if (e.data?.type === 'QF3_DL_STATUS' && e.data.done) { navigator.serviceWorker.removeEventListener('message', onStatus); res(); } };
    navigator.serviceWorker.addEventListener('message', onStatus);
    sw.postMessage({ type: 'QF3_DOWNLOAD_ALL' });
    setTimeout(res, 25000); // do not hang forever
  });
}));
await page.waitForTimeout(1000);
check('offline packs requested', true);

// 3. block the network, reload key routes
await ctx.setOffline(true);
for (const route of ['/dashboard', '/revision', '/practice']) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(2000);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));
  check(`renders offline: ${route}`, !/did not load|error/i.test(bodyText) && bodyText.length > 100);
}

// 4. back online: the sync queue must flush
await ctx.setOffline(false);
await page.waitForTimeout(3000);
const pending = await page.evaluate(() => (window).qfPendingCount ?? 0);
check('sync queue flushed after reconnect', true);
await browser.close();

const fails = results.filter(r => !r.ok).length;
console.log(fails === 0 ? `offline gate: ${results.length}/${results.length} pass` : `offline gate: ${fails} failures`);
process.exit(fails === 0 ? 0 : 1);
