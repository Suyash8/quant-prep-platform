// node scripts/verify-v5-a11y.mjs [baseUrl] [light|dark]  Production build. axe-core (WCAG 2.0/2.1 A+AA rule tags) on the v5 screens at a 390px phone viewport, light theme. Fails on serious/critical violations; lists moderate/minor. Automated rules only: not a full accessibility audit, no screen-reader testing.
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright'); const fs = require('node:fs'); const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const base = process.argv[2] ?? 'http://localhost:3112'; const SCHEME = process.argv[3] === 'dark' ? 'dark' : 'light'; let fails = 0;
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: SCHEME });
await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, SCHEME);
await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } });
const page = await ctx.newPage();
const pages = [['v5 learn', '/v5/learn'], ['v5 lesson (reading)', '/v5/learn/qf5-python-control-flow'], ['v5 lesson (question)', '/v5/learn/qf5-python-control-flow', 'q'], ['v5 practice list', '/v5/practice'], ['v5 practice problem', '/v5/practice/qfp-ledger-replay'], ['v5 progress', '/v5/progress'], ['v5 review', '/v5/review'], ['settings', '/settings']];
for (const [name, url, mode] of pages) {
  await page.goto(base + url, { timeout: 60000 }); await page.waitForTimeout(3000);
  if (mode === 'q') for (let i = 0; i < 14 && (await page.locator('button[aria-pressed]').count()) === 0; i++) { const c = page.getByRole('button', { name: 'Continue' }); if (!(await c.count())) break; await c.click(); await page.waitForTimeout(200); }
  await page.addScriptTag({ content: axeSrc });
  const r = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'); const other = r.violations.filter((v) => !bad.includes(v));
  console.log(bad.length ? 'FAIL' : 'PASS', SCHEME, name, `serious/critical=${bad.length} other=${other.length} passes=${r.passes.length}`); if (bad.length) fails++;
  for (const v of [...bad, ...other]) console.log('   ', v.impact, v.id, v.nodes.length + ' node(s):', v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' ; ').slice(0, 160));
}
console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
