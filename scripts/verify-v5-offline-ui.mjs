// node scripts/verify-v5-offline-ui.mjs [baseUrl]  server MUST run with QF_V5_CODE_DEV=1 (production build). Real browser, network switched OFF: typing code, reload, held-state honesty, and offline sign-out lock.
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright');
const base = process.argv[2] ?? 'http://localhost:3112'; let fails = 0; const check = (n, ok, x = '') => { console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : String(x)); if (!ok) fails++; };
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
check('login', (await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } })).ok());
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(base + '/v5/learn', { timeout: 100000 }); await page.getByText('Offline library ready').waitFor({ timeout: 80000 }).catch(() => {}); await page.waitForTimeout(2500);
await page.goto(base + '/v5/practice'); await page.waitForTimeout(2500); await page.goto(base + '/v5/practice/qfp-ledger-replay'); const ed = page.getByLabel('Practice source code'); await ed.waitFor({ timeout: 30000 }); await page.waitForTimeout(3000);
const uid = await page.evaluate(() => localStorage.getItem('qf5.account'));
// ---- offline typing + reload ----
await ctx.setOffline(true); await page.waitForTimeout(500);
await ed.fill('print("OFFLINE-HELD-CODE")\n'); await page.waitForTimeout(2500);
let body = await page.locator('body').innerText();
check('offline typing: saved on this device with the truthful held note (not verified account, not uploaded)', /Saved on this device/.test(body) && /account could not be checked/.test(body) && /not uploaded/.test(body), body.slice(-700));
await page.reload(); await ed.waitFor({ timeout: 30000 }); await page.waitForTimeout(2500);
check('offline reload: the exact code is restored from the device, held note still shown', (await ed.inputValue()) === 'print("OFFLINE-HELD-CODE")\n' && /account could not be checked/.test(await page.locator('body').innerText()));
// ---- offline held lesson answer ----
const HELDQ = /account could not be checked/;
const openQ = async () => { await page.goto(base + '/v5/learn/qf5-python-control-flow'); await page.getByText('BUILD THE IDEA').first().waitFor({ timeout: 30000 }).catch(() => {}); for (let i = 0; i < 14 && (await page.locator('button[aria-pressed]').count()) === 0; i++) { const b = page.getByRole('button', { name: 'Continue' }); if (!(await b.count())) break; await b.click(); await page.waitForTimeout(250); } await page.waitForTimeout(1800); };
await openQ(); await page.locator('button[aria-pressed]').first().click(); await page.waitForTimeout(2500);
body = await page.locator('body').innerText();
check('offline lesson answer: draft line says saved on device, account could not be checked, not sent or graded', HELDQ.test(body) && /not sent or graded/.test(body), body.slice(-600));
await page.reload(); await page.waitForTimeout(2500); for (let i = 0; i < 14 && (await page.locator('button[aria-pressed]').count()) === 0; i++) { const b = page.getByRole('button', { name: 'Continue' }); if (!(await b.count())) break; await b.click(); await page.waitForTimeout(250); } await page.waitForTimeout(2000);
check('offline reload: the selected option is restored and the held line is shown again', (await page.locator('button[aria-pressed="true"]').count()) === 1 && HELDQ.test(await page.locator('body').innerText()));
await page.goto(base + '/v5/practice/qfp-ledger-replay'); await page.getByLabel('Practice source code').waitFor({ timeout: 30000 }); await page.waitForTimeout(1500);
// ---- offline sign-out ----
const t2 = await ctx.newPage(); await t2.goto(base + '/v5/practice'); await t2.waitForTimeout(2000);
await page.getByRole('button', { name: 'Sign out' }).click();
await page.getByRole('heading', { name: 'You signed out on this device' }).waitFor({ timeout: 20000 }).catch(() => {});
body = await page.locator('body').innerText();
check('offline sign-out: account view locked at once, with the pending-server explanation', /You signed out on this device/.test(body) && /still pending/.test(body) && (await page.getByLabel('Practice source code').count()) === 0, body.slice(0, 500));
let lockedT2 = false; for (let i = 0; i < 16 && !lockedT2; i++) { await t2.waitForTimeout(250); lockedT2 = /You signed out on this device/.test(await t2.locator('body').innerText().catch(() => '')); }
check('the other tab locks too, without focus', lockedT2);
await page.reload(); await page.waitForTimeout(2500);
body = await page.locator('body').innerText();
check('offline reload after sign-out: still locked, does not reopen the prior account from the stale cookie/cache', /You signed out on this device/.test(body) && (await page.getByLabel('Practice source code').count()) === 0 && (await page.evaluate(() => localStorage.getItem('qf5.account'))) === null, body.slice(0, 300));
const kept = await page.evaluate(async (u) => await new Promise((res) => { const o = indexedDB.open('qf-v5:' + u); o.onsuccess = () => { const g = o.result.transaction('meta').objectStore('meta').getAll(); g.onsuccess = () => { res(g.result.filter((r) => String(r.k).startsWith('cdraft:')).map((r) => r.v.source)); o.result.close(); }; }; }), uid);
check('the signed-out account\'s code is preserved privately on the device (not deleted)', kept.includes('print("OFFLINE-HELD-CODE")\n'), JSON.stringify(kept));
// ---- back online: finishing sign-out ends the server session ----
await ctx.setOffline(false); await page.waitForTimeout(500);
await page.evaluate(() => localStorage.removeItem('qf5.sid'));   // simulate: this browser never cached which session it was
await page.reload(); await page.waitForTimeout(3500);
check('online, no cached session tag: the automatic retry does NOT end the session (still locked, /me still 200)', (await ctx.request.get(base + '/api/auth/me')).status() === 200 && /You signed out on this device/.test(await page.locator('body').innerText()));
let dlg = ''; page.on('dialog', async (d) => { dlg = d.message(); await d.accept(); });
await page.getByRole('button', { name: 'Finish signing out' }).click(); await page.waitForURL(/\/login/, { timeout: 20000 }).catch(() => {});
check('online: Finish signing out ends the server session and leaves to login', /\/login/.test(page.url()) && (await ctx.request.get(base + '/api/auth/me')).status() === 401, page.url());
check('without a tag, finishing asks for explicit confirmation of whichever session is current', /which session/.test(dlg), dlg);
check('no page errors', errs.length === 0, errs.join('|'));
console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); await browser.close(); process.exit(fails ? 1 : 0);
