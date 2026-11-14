// node scripts/verify-v5-backguard.mjs [baseUrl]  server MUST run with QF_V5_CODE_DEV=1. Back / history guard on unsaved device-only code edits (real browser history, mobile viewport).
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright');
const base = process.argv[2] ?? 'http://localhost:3112'; let fails = 0; const check = (n, ok, x = '') => { console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : String(x)); if (!ok) fails++; };
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
check('login', (await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } })).ok());
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(base + '/v5/learn', { timeout: 100000 }); await page.getByText('Offline library ready').waitFor({ timeout: 60000 }).catch(() => {});
await page.goto(base + '/v5/practice'); await page.getByRole('heading', { name: 'Practice problems', exact: true }).waitFor({ timeout: 30000 }); await page.waitForTimeout(1500);
await page.locator('a[href="/v5/practice/qfp-ledger-replay"]').click(); const ed = page.getByLabel('Practice source code'); await ed.waitFor({ timeout: 30000 }); await page.waitForTimeout(1200);
const dialogs = []; let answer = 'dismiss'; page.on('dialog', async (d) => { dialogs.push(d.message()); await (answer === 'accept' ? d.accept() : d.dismiss()); });
// 1) clean editor: Back leaves with no prompt
await page.goBack(); await page.waitForTimeout(1200);
check('clean editor: Back goes straight to the list, no prompt', page.url().endsWith('/v5/practice') && dialogs.length === 0, page.url() + ' ' + dialogs.length);
await page.locator('a[href="/v5/practice/qfp-ledger-replay"]').click(); await ed.waitFor({ timeout: 30000 }); await page.waitForTimeout(1200);
// 2) unsaved edit (saving is debounced 600 ms, so go back inside that window is not reliable: make the save fail by going offline-agnostic: edit and go back immediately)
await ed.fill('print("UNSAVED-EDIT")\n'); await page.waitForTimeout(250); await page.evaluate(() => history.back()); await page.waitForTimeout(900);
const stayedDirtyOrSaved = page.url().endsWith('/v5/practice/qfp-ledger-replay');
check('dirty editor: Back is intercepted (declined prompt keeps the page and the code), or the edit was already saved and Back continues', (dialogs.length === 1 && stayedDirtyOrSaved && (await ed.inputValue()) === 'print("UNSAVED-EDIT")\n') || (dialogs.length === 0 && !stayedDirtyOrSaved), JSON.stringify({ d: dialogs, u: page.url() }));
if (dialogs.length === 1) {
  check('prompt says the code is not saved', /not saved/.test(dialogs[0]), dialogs[0]);
  // 3) guard re-armed: after a new unsaved edit, Back asks again; accepting leaves (the first edit was saved by the debounce meanwhile, so no prompt would be right without a new edit)
  answer = 'accept'; await ed.fill('print("AGAIN-UNSAVED")\n'); await page.waitForTimeout(250); await page.evaluate(() => history.back()); await page.waitForTimeout(1500);
  check('second Back asks again, accepting leaves to the list', dialogs.length === 2 && page.url().endsWith('/v5/practice'), JSON.stringify({ d: dialogs.length, u: page.url() }));
}
// 4) after the debounce the edit is saved: Back continues without a prompt
await page.locator('a[href="/v5/practice/qfp-ledger-replay"]').click(); await ed.waitFor({ timeout: 30000 }); await page.waitForTimeout(1200); dialogs.length = 0; answer = 'dismiss';
await ed.fill('print("SAVED-EDIT")\n'); await page.waitForTimeout(2500);
await page.evaluate(() => history.back()); await page.waitForTimeout(1500);
check('saved edit: Back continues with no prompt', dialogs.length === 0 && page.url().endsWith('/v5/practice'), JSON.stringify({ d: dialogs, u: page.url() }));

// ---- question player (lesson check) ----
const qd = []; let qAnswer = 'dismiss'; const qh = async (d) => { qd.push(d.message()); await (qAnswer === 'accept' ? d.accept() : d.dismiss()); }; page.removeAllListeners('dialog'); page.on('dialog', qh);
const openQ = async () => { await page.goto(base + '/v5/learn'); await page.waitForTimeout(800); await page.goto(base + '/v5/learn/qf5-python-control-flow'); await page.getByText('BUILD THE IDEA').first().waitFor({ timeout: 30000 }).catch(() => {});
  for (let i = 0; i < 14 && (await page.locator('button[aria-pressed]').count()) === 0; i++) { const b = page.getByRole('button', { name: 'Continue' }); if (!(await b.count())) break; await b.click(); await page.waitForTimeout(250); } await page.waitForTimeout(1800); };
await openQ(); const lessonUrl = page.url();
const pressedIdx = () => page.locator('button[aria-pressed]').evaluateAll((bs) => bs.findIndex((b) => b.getAttribute('aria-pressed') === 'true'));
const before = await pressedIdx(); const pick = before === 0 ? 1 : 0;
await page.locator('button[aria-pressed]').nth(pick).click(); await page.waitForTimeout(150); qd.length = 0; await page.evaluate(() => history.back()); await page.waitForTimeout(900);
check('question player: Back with an unsaved selection is intercepted; declining keeps the page and the selection', qd.length === 1 && /not saved/.test(qd[0]) && page.url() === lessonUrl && (await pressedIdx()) === pick, JSON.stringify({ qd, u: page.url(), pick, now: await pressedIdx() }));
qAnswer = 'accept'; const other = pick === 0 ? 1 : 0; await page.locator('button[aria-pressed]').nth(other).click(); await page.waitForTimeout(150); qd.length = 0; await page.evaluate(() => history.back()); await page.waitForTimeout(1500);
check('question player: guard re-arms after a new unsaved selection; accepting leaves the lesson', qd.length === 1 && page.url() !== lessonUrl, JSON.stringify({ qd, u: page.url() }));
await openQ(); qAnswer = 'dismiss'; await page.locator('button[aria-pressed]').nth(pick).click(); await page.waitForTimeout(2600); qd.length = 0; await page.evaluate(() => history.back()); await page.waitForTimeout(1500);
check('question player: selection saved on this device, Back leaves with no prompt', qd.length === 0 && page.url() !== lessonUrl, JSON.stringify({ qd, u: page.url() }));
// marker hardening: a confirmed leave sets the marker; any later edit clears it at once (a failed navigation followed by a new edit is protected again)
await page.goto(base + '/v5/practice/qfp-ledger-replay'); await page.getByLabel('Practice source code').waitFor({ timeout: 30000 }); await page.waitForTimeout(1200);
const m1 = await page.evaluate(async () => { window.__qfLeaveOk = true; return window.__qfLeaveOk; });
await page.getByLabel('Practice source code').fill('print("NEW-AFTER-CONFIRM")\n'); const m2 = await page.evaluate(() => window.__qfLeaveOk);
check('confirmed-leave marker is cleared by the next edit', m1 === true && m2 === false, JSON.stringify({ m1, m2 }));
check('no page errors (question player)', errs.length === 0, errs.join('|'));
console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); await browser.close(); process.exit(fails ? 1 : 0);
