// find elements wider than the viewport on a given route
import { chromium } from 'playwright';
const BASE = 'http://localhost:3002';
const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1280, height: 900 } }).then(c => c.newPage());
await page.goto(`${BASE}/login`); await page.waitForTimeout(1200);
await page.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || ''));
await page.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' }); await page.waitForTimeout(2500);
const offenders = await page.evaluate(() => {
  const vw = window.innerWidth;
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} right=${Math.round(r.right)} left=${Math.round(r.left)}`);
    }
  });
  return { vw, sw: document.documentElement.scrollWidth, out: out.slice(0, 12) };
});
console.log(JSON.stringify(offenders, null, 1));
await browser.close();
