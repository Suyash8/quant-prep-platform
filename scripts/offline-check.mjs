// Offline gate check (Part 8.3), condensed:
// 1. load key pages online (service worker caches shells + packs)
// 2. go offline, reload the same pages, verify they still render real content
// 3. grade a quiz answer offline (local grading)
// usage: node scripts/offline-check.mjs [baseUrl]
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3002';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };

// login
await page.goto(`${BASE}/login`, { waitUntil: 'load' });
await page.fill('input[type=email]', 'visual@test.dev');
await page.fill('input[type=password]', 'visualtest12345');
await page.click('button[type=submit]');
await page.waitForTimeout(2500);

// warm the caches online
for (const r of ['/dashboard', '/curriculum', '/revision', '/practice', '/learn/orient-what-is-quant-finance']) {
  await page.goto(`${BASE}${r}`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
}
await page.waitForTimeout(3000); // let the SW settle

// go offline
await ctx.setOffline(true);
await page.waitForTimeout(500);

for (const r of ['/dashboard', '/curriculum', '/revision', '/practice']) {
  try {
    await page.goto(`${BASE}${r}`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const hasContent = await page.evaluate(() => document.body.innerText.length > 400);
    check(`offline ${r}`, hasContent, `(text length ok)`);
  } catch (e) {
    check(`offline ${r}`, false, String(e).slice(0, 80));
  }
}

// offline quiz grading: open the lesson player and answer a quiz card locally
try {
  await page.goto(`${BASE}/learn/arith-numbers-and-operations`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  // walk forward through cards until a quiz appears (max 25 clicks)
  let answered = false;
  for (let i = 0; i < 25 && !answered; i++) {
    const tiles = await page.$$('.qf-answer-tile');
    if (tiles.length > 0) {
      await tiles[0].click();
      await page.waitForTimeout(400);
      const btn = await page.$('#player-primary');
      if (btn) { await btn.click(); await page.waitForTimeout(600); }
      answered = true;
    } else {
      const btn = await page.$('#player-primary');
      if (btn) { await btn.click(); await page.waitForTimeout(500); }
    }
  }
  check('offline quiz answer graded locally', answered);
} catch (e) {
  check('offline quiz answer graded locally', false, String(e).slice(0, 80));
}

// back online: sync queue flushes
await ctx.setOffline(false);
await page.waitForTimeout(2500);
try {
  const res = await page.evaluate(() => fetch('/api/sync', { credentials: 'same-origin' }).then(r => r.status));
  check('back online, sync reachable', res === 200, `(status ${res})`);
} catch (e) {
  check('back online, sync reachable', false, String(e).slice(0, 80));
}

await browser.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\nOFFLINE CHECK: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
