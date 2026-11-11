import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto('http://localhost:3002/login'); await page.waitForTimeout(1200);
await page.fill('input[type=email]', 'visual@test.dev');
await page.fill('input[type=password]', 'visualtest12345');
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
await page.goto('http://localhost:3002/planner', { waitUntil: 'load' }); await page.waitForTimeout(2500);
const r = await page.evaluate(() => {
  const grid = document.querySelector('.grid.lg\\:grid-cols-\\[320px_1fr\\]');
  const card = document.querySelector('.qf-card.p-6');
  const planCol = card.parentElement.children[1];
  const probe = el => {
    const cs = getComputedStyle(el);
    return { cls: String(el.className).slice(0, 60), w: Math.round(el.getBoundingClientRect().width), display: cs.display, gridAutoCols: cs.gridAutoColumns, gridTemplateCols: cs.gridTemplateColumns, minW: cs.minWidth };
  };
  // find widest descendant of the PLAN column
  let widest = [];
  planCol.querySelectorAll('*').forEach(el => {
    const w = el.getBoundingClientRect().width;
    if (w > 350) widest.push(`${el.tagName}.${String(el.className).slice(0, 60)} w=${Math.round(w)}`);
  });
  return { sw: document.documentElement.scrollWidth, grid: probe(grid), card: probe(card), planCol: probe(planCol), widest: widest.slice(0, 10) };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
