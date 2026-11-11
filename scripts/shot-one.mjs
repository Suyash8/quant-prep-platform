// usage: node scripts/shot-one.mjs <name> <route> [baseUrl]
// Quick single-page check shot at 1280x900, logged in as the demo learner.
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';

const [NAME = 'page', ROUTE = '/', BASE = 'http://localhost:3002'] = process.argv.slice(2);
const OUT = '/tmp/quick';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`${BASE}/login`); await page.waitForTimeout(1200);
await page.fill('input[type=email]', 'visual@test.dev');
await page.fill('input[type=password]', 'visualtest12345');
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'load' }); await page.waitForTimeout(3500);
await page.screenshot({ path: path.join(OUT, `${NAME}.png`), fullPage: true });
console.log(`${OUT}/${NAME}.png`);
await browser.close();
