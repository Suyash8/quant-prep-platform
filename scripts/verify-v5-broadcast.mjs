// node scripts/verify-v5-broadcast.mjs [baseUrl]  Cross-tab sign-out: tab A (signed in, /v5/learn) must show the account-change hold promptly after tab B signs out, WITHOUT a focus/visibility event; then the old account's screen is not visible.
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright');
const base = process.argv[2] ?? 'http://localhost:3112'; let fails = 0; const check = (n, ok, x = '') => { console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : String(x)); if (!ok) fails++; };
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
check('login', (await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } })).ok());
const a = await ctx.newPage(); const errs = []; a.on('pageerror', (e) => errs.push(String(e)));
await a.goto(base + '/v5/learn', { timeout: 100000 }); await a.getByText('Offline library ready').waitFor({ timeout: 60000 }).catch(() => {}); await a.waitForTimeout(1500);
const b = await ctx.newPage(); await b.goto(base + '/v5/learn'); await b.waitForTimeout(1500);
const holdVisible = () => a.evaluate(() => !!document.querySelector('[role="dialog"], [role="alertdialog"]') || /signed in as a different|account (changed|has changed)|signed out/i.test(document.body.innerText));
check('before: no hold in tab A', !(await holdVisible()));
// tab B signs out on the server, then announces exactly as the app does (BroadcastChannel nudge, no data)
await b.evaluate(async () => { await fetch('/api/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmCurrent: true }) }); const c = new BroadcastChannel('qf5-auth'); c.postMessage({ kind: 'logout', at: Date.now() }); c.close(); });
let shown = false; for (let i = 0; i < 20 && !shown; i++) { await a.waitForTimeout(250); shown = await holdVisible(); }
check('tab A shows the account-change hold within 5 s with no focus event', shown);
const hiddenMain = await a.evaluate(() => { const h = [...document.querySelectorAll('div[hidden][aria-hidden="true"]')]; return h.length > 0; });
check('the previous account screen is hidden/inert while held', hiddenMain);
check('no page errors', errs.length === 0, errs.join('|'));
console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); await browser.close(); process.exit(fails ? 1 : 0);
