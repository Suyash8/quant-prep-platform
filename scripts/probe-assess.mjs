import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto('http://localhost:3002/login'); await page.waitForTimeout(1200);
await page.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || ''));
await page.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
const route = process.argv[2] || '/assessments/apt-quantitative';
await page.goto(`http://localhost:3002${route}`, { waitUntil: 'load' }); await page.waitForTimeout(2500);
const r = await page.evaluate(() => {
  const sw = document.documentElement.scrollWidth;
  // walk up from widest element
  let widest = null;
  document.querySelectorAll('body *').forEach(el => {
    const w = el.getBoundingClientRect().width;
    if (!widest || w > widest.w) widest = { el, w };
  });
  const chain = [];
  let cur = widest.el;
  while (cur && cur !== document.body) {
    const cs = getComputedStyle(cur);
    chain.push(`${cur.tagName}.${String(cur.className).slice(0, 55)} w=${Math.round(cur.getBoundingClientRect().width)} display=${cs.display} minW=${cs.minWidth} flexShrink=${cs.flexShrink}`);
    cur = cur.parentElement;
  }
  return { sw, widest: Math.round(widest.w), chain };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
