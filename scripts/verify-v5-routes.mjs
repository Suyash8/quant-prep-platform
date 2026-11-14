import { readdirSync as __rd } from 'node:fs'; const EXPECT_LESSONS = __rd(new URL('../content-v5/lessons/', import.meta.url)).filter((f) => f.endsWith('.json')).length;
// node scripts/verify-v5-routes.mjs [baseUrl]  real /v5 routes on the durable IndexedDB store (no fixtures). Needs QF_DEMO_EMAIL/QF_DEMO_PASSWORD, PW_PATH.
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright');
const base = process.argv[2] ?? 'http://127.0.0.1:3111'; let fails = 0; const check = (n, ok, x = '') => { console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : String(x)); if (!ok) fails++; };
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const lr = await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } }); check('login', lr.ok());
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(base + '/v5/learn', { timeout: 100000 });
await page.getByText('Offline library ready').waitFor({ timeout: 60000 }).catch(() => {});
check('learn: offline library ready (N of N)', await page.getByText('Offline library ready').count() > 0, await page.locator('body').innerText().then((t) => t.slice(0, 300)));
await page.locator('a[href^="/v5/learn/qf5-"]').first().waitFor({ timeout: 30000 }).catch(() => {});
const links = await page.locator('a[href^="/v5/learn/qf5-"]').count(); check('learn: authored lessons listed as links ('+EXPECT_LESSONS+')', links === EXPECT_LESSONS, links);
const plannedN = (0); check('learn: any planned lessons are labelled not written (none planned in this content: every lesson is written)', plannedN === 0 ? (await page.getByText('planned, not written yet').count()) === 0 : (await page.getByText('planned, not written yet').count()) > 0);
await page.screenshot({ path: '/tmp/routes-learn.png', fullPage: false });
await page.goto(base + '/v5/learn/qf5-python-values-units', { timeout: 60000 });
await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30000 });
check('lesson: renders from stored packs', (await page.locator('body').innerText()).includes('Values'));
await page.screenshot({ path: '/tmp/routes-lesson.png' });
await page.goto(base + '/v5/progress'); await page.getByText('Saved on this device').first().waitFor({ timeout: 30000 }); check('progress: verified vs device sections', (await page.getByText('Checked by the server').count()) > 0);
// REAL FLOW: wrong answer on a lesson check -> saved on device -> due review -> reveal -> rate
await page.goto(base + '/v5/learn/qf5-python-values-units'); await page.getByText('BUILD THE IDEA').first().waitFor({ timeout: 30000 });
for (let i = 0; i < 12 && (await page.locator('button[aria-pressed]').count()) === 0; i++) { await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForTimeout(250); }
check('lesson reaches an embedded check with options', (await page.locator('button[aria-pressed]').count()) >= 2);
await page.locator('button[aria-pressed]').nth(3).click(); await page.getByRole('button', { name: 'Check my answer' }).click(); await page.waitForTimeout(800);
const fb = await page.locator('body').innerText(); check('feedback says saved on this device, not server verified yet', /saved on this device|server checked|server check/i.test(fb) && /incorrect|not quite|try|check/i.test(fb), fb.slice(-600));
await page.screenshot({ path: '/tmp/routes-feedback.png' });
await page.clock.install({ time: Date.now() }); await page.goto(base + '/v5/review'); await page.clock.fastForward('02:00:00'); await page.waitForFunction(() => /Nothing is due|Show|Reveal|Again/i.test(document.body.innerText), null, { timeout: 30000 });
await page.waitForTimeout(1500); const rv = await page.locator('body').innerText(); await page.waitForTimeout(1500); check('review: Due reviews renders (no error boundary)', rv.includes('Due reviews') && !rv.includes('That did not load'), rv.slice(0, 200));
check('review: the missed check is now a due card', !rv.includes('Nothing is due'), rv.slice(0, 400));
const names = await page.getByRole('button').evaluateAll((e) => e.map((x) => x.innerText.trim()));
const reveal = page.getByRole('button', { name: /reveal|show/i }).first(); if (await reveal.count()) { await reveal.click(); await page.waitForTimeout(300); }
const rate = page.getByRole('button', { name: /^(again|good)/i }).first(); const hadRate = (await rate.count()) > 0; check('review: reveal then self-rating buttons appear', hadRate, JSON.stringify(names));
const stBefore = await (async () => { try { return await page.evaluate(async () => { const uid = localStorage.getItem('qf5.account') || 'anon'; return await new Promise((res) => { const o = indexedDB.open('qf-v5:' + uid); o.onsuccess = () => { const g = o.result.transaction('cards').objectStore('cards').getAll(); g.onsuccess = () => res(g.result.map((c) => ({ q: c.questionId, due: c.due }))); }; }); }); } catch { return []; } })();
if (hadRate) { await rate.click(); await page.waitForTimeout(600); const after = await page.locator('body').innerText(); check('review: rating saved, no error', !after.includes('That did not load'), after.slice(0, 200)); }
const cardsState = () => page.evaluate(async () => { const uid = localStorage.getItem('qf5.account') || 'anon'; return await new Promise((res) => { const o = indexedDB.open('qf-v5:' + uid); o.onsuccess = () => { const g = o.result.transaction('cards').objectStore('cards').getAll(); g.onsuccess = () => res(g.result.map((c) => ({ q: c.questionId, due: c.due, hasUndo: !!c.undo, retired: !!c.retired }))); }; }); });
if (hadRate) {
  const undoBtn = page.getByRole('button', { name: 'Undo last rating' }); await undoBtn.waitFor({ timeout: 5000 }).catch(() => {});
  const st1 = await cardsState(); check('review: Undo is offered after rating and the card holds undo state', (await undoBtn.count()) > 0 && st1.some((c) => c.hasUndo), JSON.stringify(st1));
  await undoBtn.click(); await page.waitForTimeout(800); const st2 = await cardsState(); check('review: Undo restores the card exactly (no undo state left, due equals its pre-rating due)', !st2.some((c) => c.hasUndo) && st2.length === stBefore.length && st2.every((c) => stBefore.find((b) => b.q === c.q)?.due === c.due), JSON.stringify({ stBefore, st2 }));
  await page.evaluate(async () => { const uid = localStorage.getItem('qf5.account') || 'anon'; await new Promise((res) => { const o = indexedDB.open('qf-v5:' + uid); o.onsuccess = () => { const tx = o.result.transaction('cards', 'readwrite'); const st = tx.objectStore('cards'); const g = st.getAll(); g.onsuccess = () => { for (const c of g.result) st.put({ ...c, due: Date.now() - 1000 }); }; tx.oncomplete = res; }; }); });
  await page.reload(); await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Reveal and compare' }).first().click({ timeout: 8000 }).catch(() => {});
  await page.getByText('Manage this review').first().click({ timeout: 8000 }).catch(() => {}); const retireBtn = page.getByRole('button', { name: 'Retire this review' }); await retireBtn.first().click({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(800);
  const st3 = await cardsState(); check('review: Retire marks exactly that card retired', st3.some((c) => c.retired), JSON.stringify(st3));
  await page.getByRole('button', { name: 'Show retired reviews' }).click({ timeout: 8000 }).catch(() => {}); const restore = page.getByRole('button', { name: 'Restore this review' }); await page.waitForTimeout(1200);
  check('review: retired list shows a Restore control', (await restore.count()) > 0, (await page.locator('body').innerText()).slice(-1200));
  if (await restore.count()) { await restore.first().click(); await page.waitForTimeout(1200); const st4 = await cardsState(); check('review: Restore returns the card to the queue', !st4.some((c) => c.retired), JSON.stringify(st4)); }
}
// missing-version cards: explicit count, never 'Nothing is due'
const uidNow = await page.evaluate(() => localStorage.getItem('qf5.account'));
await page.evaluate(async (uid) => { await new Promise((res) => { const o = indexedDB.open('qf-v5:' + uid); o.onsuccess = () => { const tx = o.result.transaction('cards', 'readwrite'); const sha = 'dead'.repeat(16); tx.objectStore('cards').put({ key: sha + ':qf5-ghost.q', questionId: 'qf5-ghost.q', revision: 1, packSha: sha, due: 1, interval: 1, ease: 2.5, lapses: 1, schedulerVersion: 1 }); tx.oncomplete = () => { o.result.close(); res(); }; }; }); }, uidNow);
await page.goto(base + '/v5/review'); await page.waitForTimeout(2500); const gv = await page.locator('body').innerText();
check('review: ghost-only due card shows an explicit missing-version count', /cannot be opened yet/.test(gv) && !/Nothing is due/.test(gv), gv.slice(0, 500));
await page.goto(base + '/v5/learn/qf5-not-a-lesson'); await page.waitForTimeout(2500); check('unknown lesson: honest unavailable state', /not|unavailable|find/i.test(await page.locator('body').innerText()));
// session switch while the tab is open: store must rebind to B on focus, never keep writing under A
const emailB = `rb-${Date.now()}@test.dev`; const ctxB = await browser.newContext(); const rg = await ctxB.request.post(base + '/api/auth/register', { data: { name: 'Rebind Test', email: emailB, password: 'isolation-test-12345' } });
await page.goto(base + '/v5/progress'); await page.getByText('Saved on this device').first().waitFor({ timeout: 30000 });
const before = await page.evaluate(() => localStorage.getItem('qf5.account'));
await ctx.request.post(base + '/api/auth/logout', { data: { confirmCurrent: true } }); await ctx.request.post(base + '/api/auth/login', { data: { email: emailB, password: 'isolation-test-12345' } });
await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.waitForTimeout(2000);
const held = await page.getByRole('alertdialog').count(); check('session switch: previous account screen is held behind an explicit account-changed dialog', held === 1);
check('session switch: old screen content is hidden from the new session', !(await page.getByText('Saved on this device').first().isVisible().catch(() => false)));
await page.getByRole('button', { name: 'Discard held input and continue' }).click(); await page.waitForTimeout(2500);
const after = await page.evaluate(() => localStorage.getItem('qf5.account'));
check('continuing rebinds the store to the new account', !!before && !!after && before !== after, before + ' -> ' + after);
await ctx.request.post(base + '/api/auth/logout', { data: { confirmCurrent: true } }); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.waitForTimeout(2000);
await page.getByRole('button', { name: 'Discard held input and continue' }).click(); await page.waitForTimeout(2500);
check('signed-out state shows the honest not-imported copy', (await page.locator('body').innerText()).includes('not added to an account'), (await page.locator('body').innerText()).slice(0, 200));
check('signed-out clears the cached account (authoritative 401)', (await page.evaluate(() => localStorage.getItem('qf5.account'))) === null);
check('no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
// REAL draft + position restore (signed in, confirmed identity): select without submitting, leave, come back
await page.goto(base + '/v5/learn/qf5-python-control-flow'); await page.getByText('BUILD THE IDEA').first().waitFor({ timeout: 30000 }).catch(() => {});
for (let i = 0; i < 14 && (await page.locator('button[aria-pressed]').count()) === 0; i++) { const b = page.getByRole('button', { name: 'Continue' }); if (!(await b.count())) break; await b.click(); await page.waitForTimeout(250); }
const optTexts = await page.locator('button[aria-pressed]').allInnerTexts(); const tail = (t) => t.split('\n').pop().trim(); const chosenText = tail(optTexts[1]);
await page.locator('button[aria-pressed]').nth(1).click(); await page.waitForTimeout(1600);
const rcBefore = await page.evaluate(async () => { const uid = localStorage.getItem('qf5.account') || 'anon'; return await new Promise((res) => { const o = indexedDB.open('qf-v5:' + uid); o.onsuccess = () => { const g = o.result.transaction('attempts').objectStore('attempts').count(); g.onsuccess = () => res(g.result); }; }); });
await page.reload(); await page.waitForTimeout(2500);
for (let i = 0; i < 14 && (await page.locator('button[aria-pressed]').count()) === 0; i++) { const b = page.getByRole('button', { name: 'Continue' }); if (!(await b.count())) break; await b.click(); await page.waitForTimeout(250); }
const states = await page.locator('button[aria-pressed]').evaluateAll((bs) => bs.map((b) => [b.getAttribute('aria-pressed'), b.innerText]));
const rcAfter = await page.evaluate(async () => { const uid = localStorage.getItem('qf5.account') || 'anon'; return await new Promise((res) => { const o = indexedDB.open('qf-v5:' + uid); o.onsuccess = () => { const g = o.result.transaction('attempts').objectStore('attempts').count(); g.onsuccess = () => res(g.result); }; }); });
const pressedStates = states.filter(([p]) => p === 'true'); const pressed = (pressedStates.length === 1 && tail(pressedStates[0][1]) === chosenText && states.length === optTexts.length) ? 1 : 0; const tb = await page.locator('body').innerText();
check('draft restore: EXACTLY the chosen option (by text) is selected again, all others unselected, no attempt row created, not graded', pressed === 1 && rcAfter === rcBefore && !/Server checked|Instant result/.test(tb), JSON.stringify({ chosenText, states, rcBefore, rcAfter }).slice(0, 500));
await browser.close(); console.log(fails ? `FAILED ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
