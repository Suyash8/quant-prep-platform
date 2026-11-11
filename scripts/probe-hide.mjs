import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto('http://localhost:3002/login'); await page.waitForTimeout(1200);
await page.fill('input[type=email]', 'visual@test.dev');
await page.fill('input[type=password]', 'visualtest12345');
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
await page.goto('http://localhost:3002/planner', { waitUntil: 'load' }); await page.waitForTimeout(3000);
const r = await page.evaluate(() => {
  const sw0 = document.documentElement.scrollWidth;
  const grid = document.querySelector('.grid.lg\\:grid-cols-\\[320px_1fr\\]');
  const planCol = grid.children[1];
  // try hiding each top-level child of the plan column
  const results = [];
  const kids = [...planCol.children];
  kids.forEach(k => { k.style.display = 'none'; results.push({ hide: k.className.slice(0, 50) || k.tagName, sw: document.documentElement.scrollWidth }); k.style.display = ''; });
  // also hide the constraints card
  grid.children[0].style.display = 'none';
  const swNoCard = document.documentElement.scrollWidth;
  grid.children[0].style.display = '';
  return { sw0, kidsTest: results, swNoCard };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
