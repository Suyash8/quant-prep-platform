import { chromium } from 'playwright';
const BASE = 'http://localhost:3002';
const routes = process.argv.slice(2);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto(`${BASE}/login`); await page.waitForTimeout(1200);
await page.fill('input[type=email]', 'visual@test.dev');
await page.fill('input[type=password]', 'visualtest12345');
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
for (const r of routes) {
  await page.goto(`${BASE}${r}`, { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const offenders = await page.evaluate(() => {
    const vw = window.innerWidth;
    const out = [];
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) {
        out.push(`${el.tagName.toLowerCase()} right=${Math.round(r.right)} left=${Math.round(r.left)} cls=${String(el.className).slice(0, 90)}`);
      }
    });
    return { vw, sw: document.documentElement.scrollWidth, out: out.slice(0, 8) };
  });
  console.log(`=== ${r} (scrollW=${offenders.sw}) ===`); offenders.out.forEach(o => console.log('  ', o));
}
await browser.close();
