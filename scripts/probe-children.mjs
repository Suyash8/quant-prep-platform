import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto('http://localhost:3002/login'); await page.waitForTimeout(1200);
await page.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || ''));
await page.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
await page.goto('http://localhost:3002/assessments/apt-quantitative', { waitUntil: 'load' }); await page.waitForTimeout(2500);
const r = await page.evaluate(() => {
  const rc = document.querySelector('a.row-card');
  const kids = [...rc.children].map(c => {
    const cs = getComputedStyle(c);
    return { tag: c.tagName, cls: String(c.className).slice(0, 60), w: Math.round(c.getBoundingClientRect().width), minW: cs.minWidth, shrink: cs.flexShrink, text: (c.textContent || '').slice(0, 40) };
  });
  return { rcW: Math.round(rc.getBoundingClientRect().width), kids };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
