// Usage: node scripts/shot-labpage.mjs "<text in lab title>" <out.png> [orderSliderValue]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW_PATH || 'playwright');
const [marker, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await p.goto('http://127.0.0.1:3002/login'); await p.waitForTimeout(1200);
await p.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || '')); await p.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await p.click('button[type=submit]'); await p.waitForTimeout(2500);
await p.goto('http://127.0.0.1:3002/lab'); await p.waitForTimeout(3500);
const cap = process.argv[4]; const card = p.locator('text=' + cap).first(); await card.scrollIntoViewIfNeeded(); await p.locator('h3:text-is("' + cap + '")').first().click(); await p.waitForTimeout(2500);
const el = p.locator('text=' + marker).first();
console.log('found:', await el.count()); if (!(await el.count())) { await p.screenshot({ path: '/tmp/labdiag.png' }); process.exit(3); }
await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
await p.screenshot({ path: out });
await b.close();
