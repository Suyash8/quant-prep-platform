// node scripts/verify-v5-answer-kinds.mjs [baseUrl]  Production build. Real browser, network OFF: a NUMERIC and a REFLECTION lesson answer are saved as held drafts (truthful line), survive an offline reload, and are not graded or sent.
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright'); const base = process.argv[2] ?? 'http://localhost:3112'; let fails = 0; const check = (n, ok, x = '') => { console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : String(x)); if (!ok) fails++; };
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
check('login', (await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } })).ok());
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e))); let posts = 0; page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/(v5|sync|attempt)/.test(r.url())) posts++; });
await page.goto(base + '/v5/learn', { timeout: 100000 }); await page.getByText('Offline library ready').waitFor({ timeout: 80000 }).catch(() => {}); await page.waitForTimeout(2500);
const open = async (id) => { await page.goto(base + '/v5/learn/' + id); await page.getByText('BUILD THE IDEA').first().waitFor({ timeout: 30000 }).catch(() => {}); await page.waitForTimeout(1500); };
const NUM = 'input[aria-label="Your answer"][inputmode="decimal"]'; const TA = 'textarea[aria-label="Put your reasoning into words"]';
// Walk the lesson: Continue through text blocks; answer + check any earlier question (choice or numeric) so Continue unlocks; stop at the wanted control.
const advanceTo = async (sel) => { for (let i = 0; i < 80 && (await page.locator(sel).count()) === 0; i++) {
  const c = page.getByRole('button', { name: 'Continue' });
  if (await c.count()) { if (await c.first().isEnabled()) { await c.first().click(); await page.waitForTimeout(200); continue; } }
  if (await page.locator('button[aria-pressed]').count()) { await page.locator('button[aria-pressed]').first().click(); } else if (await page.locator(NUM).count()) { await page.locator(NUM).fill('1'); }
  const chk = page.getByRole('button', { name: /^Check my answer/ }); if (await chk.count()) { await chk.first().click(); await page.waitForTimeout(500); } else break; }
  await page.waitForTimeout(1200); };
await open('qf5-statistics-distributions-tails');
await ctx.setOffline(true); await page.waitForTimeout(400);
const HELD = /account could not be checked/;
await advanceTo(NUM); const num = page.locator(NUM).first(); check('numeric question reached', (await num.count()) === 1);
await num.fill('12.5'); await page.waitForTimeout(2500); let body = await page.locator('body').innerText();
check('numeric: held line shown (saved on device, account could not be checked, not sent or graded)', HELD.test(body) && /not sent or graded/.test(body), body.slice(-500));
await page.reload(); await page.waitForTimeout(2500); await advanceTo(NUM);
check('numeric: offline reload restores 12.5 and the held line', (await page.locator(NUM).first().inputValue()) === '12.5' && HELD.test(await page.locator('body').innerText()));
// reflection: a different lesson, reached offline by answering the earlier checks locally
await open('qf5-algorithms-complexity'); await advanceTo(TA); const ta = page.getByLabel('Put your reasoning into words'); check('reflection question reached', (await ta.count()) === 1);
await ta.fill('OFFLINE REFLECTION TEXT'); await page.waitForTimeout(2500); body = await page.locator('body').innerText();
check('reflection: held line shown', HELD.test(body) && /not sent or graded/.test(body), body.slice(-500));
await page.reload(); await page.waitForTimeout(2500); await advanceTo(TA);
check('reflection: offline reload restores the text and the held line', (await page.getByLabel('Put your reasoning into words').inputValue()) === 'OFFLINE REFLECTION TEXT' && HELD.test(await page.locator('body').innerText()));
check('nothing was uploaded or attempted while offline/held', posts === 0, String(posts));
check('no page errors', errs.length === 0, errs.join('|'));
console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
