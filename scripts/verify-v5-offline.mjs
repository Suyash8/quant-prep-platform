import { readdirSync as __rd } from 'node:fs'; const EXPECT_LESSONS = __rd(new URL('../content-v5/lessons/', import.meta.url)).filter((f) => f.endsWith('.json')).length;
// node scripts/verify-v5-offline.mjs [baseUrl]  PRODUCTION build only (the shell worker is disabled in dev). Cold offline reload of /v5 routes.
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright');
const base = process.argv[2] ?? 'http://localhost:3112'; let fails = 0; const check = (n, ok, x = '') => { console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : String(x)); if (!ok) fails++; };
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
check('login', (await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } })).ok());
let page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(base + '/v5/learn'); await page.getByText('Offline library ready').waitFor({ timeout: 60000 });
// wait for the shell worker to save the routes
const want = 4 + EXPECT_LESSONS + __rd(new URL('../content-v5/problems-src/', import.meta.url)).filter((f) => f.endsWith('.json')).length; let have = 0;
for (let i = 0; i < 60; i++) { have = await page.evaluate(async () => { const c = await caches.open('qf5-shell-v1'); return (await c.keys()).filter((k) => /\/v5\/(learn|review|progress|practice)/.test(new URL(k.url).pathname)).length; }); if (have >= want) break; await page.waitForTimeout(500); }
check(`shell cache holds all ${want} route pages`, have >= want, have);
const assets = await page.evaluate(async () => { const c = await caches.open('qf5-shell-v1'); return (await c.keys()).filter((k) => new URL(k.url).pathname.startsWith('/_next/static/')).length; }); check('shell cache holds static assets', assets > 5, assets);
await page.close(); await ctx.setOffline(true);
page = await ctx.newPage(); page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(base + '/v5/learn'); await page.getByText('Offline library ready').waitFor({ timeout: 30000 }).catch(() => {});
let t = await page.locator('body').innerText(); check('COLD offline: /v5/learn loads and lists lessons from IndexedDB', t.includes('Offline library ready') && (await page.locator('a[href^="/v5/learn/qf5-"]').count()) === EXPECT_LESSONS, t.slice(0, 200));
check('COLD offline: header says learning offline', t.includes('Learning offline'));
await page.goto(base + '/v5/learn/qf5-python-values-units'); await page.getByText('BUILD THE IDEA').first().waitFor({ timeout: 30000 }).catch(() => {});
for (let i = 0; i < 12 && (await page.locator('button[aria-pressed]').count()) === 0; i++) { const b = page.getByRole('button', { name: 'Continue' }); if (!(await b.count())) break; await b.click(); await page.waitForTimeout(200); }
check('COLD offline: lesson renders and reaches a check', (await page.locator('button[aria-pressed]').count()) >= 2);
await page.locator('button[aria-pressed]').nth(0).click(); await page.getByRole('button', { name: 'Check my answer' }).click(); await page.waitForTimeout(800);
t = await page.locator('body').innerText(); check('COLD offline: answer saved on this device, not verified', /saved on this device/i.test(t) && !/Server checked this response/.test(t), t.slice(-300));
await page.reload(); await page.getByText('BUILD THE IDEA').first().waitFor({ timeout: 30000 }).catch(() => {});
await page.goto(base + '/v5/progress'); await page.getByText('Saved on this device').first().waitFor({ timeout: 30000 }).catch(() => {}); t = await page.locator('body').innerText();
check('COLD offline: progress shows the saved answer after reload (waiting for server check)', /1 response|awaiting|waiting/i.test(t), t.slice(0, 400));
await page.goto(base + '/v5/learn/qf5-never-saved-lesson'); await page.waitForTimeout(1500); t = await page.locator('body').innerText(); check('COLD offline: unknown route is honest, not blank', t.length > 40, t.slice(0, 100));
await ctx.setOffline(false); await page.goto(base + '/v5/progress'); await page.waitForTimeout(3500);
const held = await page.evaluate(async () => { const uid = localStorage.getItem('qf5.account'); return await new Promise((res) => { const o = indexedDB.open('qf-v5:' + uid); o.onsuccess = () => { const g = o.result.transaction('attempts').objectStore('attempts').getAll(); g.onsuccess = () => res(g.result.map((r) => ({ identity: r.identity, status: r.receipt.status }))); }; }); });
check('back online: offline-written answer is HELD (identity unconfirmed, still local), not auto-attributed', held.length >= 1 && held.every((h) => h.identity === 'unconfirmed' && h.status === 'local'), JSON.stringify(held));
// REAL end to end: explicit confirmation by the real signed-in user, then real server verification
const ptHeld = await page.locator('body').innerText(); check('progress while held: 1 held, 0 queued, server checked none', /1 held/.test(ptHeld) && /0 queued/.test(ptHeld) && /has not checked any/.test(ptHeld), ptHeld.slice(0, 600));
await page.getByRole('button', { name: 'Review held responses' }).click(); await page.waitForTimeout(1500);
t = await page.locator('body').innerText();
check('held review shows the signed-in account label and the human response', t.includes(process.env.QF_DEMO_EMAIL) && /held response/i.test(t), t.slice(0, 500));
const cb = page.locator('input[type=checkbox]'); const cbtn = page.getByRole('button', { name: 'Confirm these are mine', exact: true });
check('confirm is disabled until the user ticks the checkbox', await cbtn.isDisabled());
await page.screenshot({ path: '/downloads/held-review-390-full.png', fullPage: true });
await cb.check(); await cbtn.scrollIntoViewIfNeeded(); await page.screenshot({ path: '/downloads/held-review-390-checked-confirm.png' }); await cbtn.click(); await page.waitForTimeout(4000); await page.screenshot({ path: '/downloads/held-review-390-after.png', fullPage: true });
const after = await page.evaluate(async () => { const uid = localStorage.getItem('qf5.account'); return await new Promise((res) => { const o = indexedDB.open('qf-v5:' + uid); o.onsuccess = () => { const g = o.result.transaction('attempts').objectStore('attempts').getAll(); g.onsuccess = () => res(g.result.map((r) => ({ identity: r.identity, status: r.receipt.status }))); }; }); });
check('after explicit confirm: server verifies them (real server)', after.length >= 1 && after.every((h) => h.identity === 'confirmed' && h.status === 'verified'), JSON.stringify(after));
const pt = await page.locator('body').innerText();
check('progress after confirm: separate server-checked count with correct/not-correct, held 0, queued 0', /1 response checked by the server: \d+ correct, \d+ not correct/.test(pt) && /0 held/.test(pt) && /0 queued/.test(pt), pt.slice(0, 700));
check('no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
await browser.close(); console.log(fails ? `FAILED ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
