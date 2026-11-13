// Pixels of the offline manager when one pack file is blocked (partial) and when clean.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW_PATH || 'playwright');
const B = 'http://127.0.0.1:3002';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
await p.goto(B + '/login'); await p.waitForTimeout(1200);
await p.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || '')); await p.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await p.click('button[type=submit]'); await p.waitForTimeout(2500);
await p.goto(B + '/settings', { waitUntil: 'load' }); await p.waitForTimeout(3000);
await ctx.route('**/packs/v3/lessons/alg-dynamic-programming.json', r => r.abort());
await p.locator('button:has-text("Download everything")').click();
await p.locator('text=incomplete').first().waitFor({ timeout: 90000 });
const sec = p.locator('section:has(h2:text-is("Offline"))');
await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
await sec.screenshot({ path: process.argv[2] || '/downloads/offline-partial-state.png' });
console.log((await sec.innerText()).replace(/\n+/g, ' | '));
await b.close();
