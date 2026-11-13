// Usage: node scripts/shot-lab.mjs <lessonId> <text marker in lab title> <out.png> [element-only]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW_PATH || 'playwright');
const [lesson, marker, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await p.goto('http://127.0.0.1:3002/login'); await p.waitForTimeout(1200);
await p.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || '')); await p.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await p.click('button[type=submit]'); await p.waitForTimeout(2500);
await p.goto('http://127.0.0.1:3002/learn/' + lesson); await p.waitForTimeout(3500);
let found = false;
for (let i = 0; i < 40 && !found; i++) {
  found = (await p.locator('text=' + marker).count()) > 0; if (found) break;
  const btn = p.locator('.btn3d-player').first();
  if (!(await btn.count()) || await btn.isDisabled()) { console.log('stuck at step', i); break; }
  await btn.click(); await p.waitForTimeout(450);
}
console.log('found:', found);
if (found) { await p.locator('text=' + marker).first().scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await p.screenshot({ path: out }); }
await b.close();
