import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto('http://localhost:3002/login'); await page.waitForTimeout(1200);
await page.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || ''));
await page.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
await page.goto('http://localhost:3002/planner', { waitUntil: 'load' }); await page.waitForTimeout(3000);
const r = await page.evaluate(() => {
  const outer = document.querySelector('.grid.lg\\:grid-cols-\\[320px_1fr\\]');
  const col = outer.children[1].querySelector('.space-y-4');
  const results = [];
  [...col.children].forEach(k => {
    k.style.display = 'none';
    results.push({ hide: (k.className.slice(0, 60) || k.tagName), sw: document.documentElement.scrollWidth });
    k.style.display = '';
  });
  return results;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
