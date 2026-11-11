import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto('http://localhost:3002/login'); await page.waitForTimeout(1200);
await page.fill('input[type=email]', 'visual@test.dev');
await page.fill('input[type=password]', 'visualtest12345');
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
await page.goto('http://localhost:3002/planner', { waitUntil: 'load' }); await page.waitForTimeout(3000);
const r = await page.evaluate(() => {
  const day = document.querySelector('.qf-card-flat.p-3.flex');
  const chain = [];
  let cur = day;
  while (cur && cur !== document.body) {
    const cs = getComputedStyle(cur);
    chain.push(`${cur.tagName}.${String(cur.className).slice(0, 55)} w=${Math.round(cur.getBoundingClientRect().width)} ovX=${cs.overflowX} sw=${cur.scrollWidth} minW=${cs.minWidth}`);
    cur = cur.parentElement;
  }
  return chain;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
