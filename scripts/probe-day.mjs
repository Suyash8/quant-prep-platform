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
  const chips = [...day.querySelectorAll('.chip')].slice(0, 4).map(c => ({ cls: c.className.slice(0, 70), w: Math.round(c.getBoundingClientRect().width) }));
  const card = { cls: day.className.slice(0, 80), w: Math.round(day.getBoundingClientRect().width) };
  // find widest descendant inside the day card
  let widest = [];
  day.querySelectorAll('*').forEach(el => { const w = el.getBoundingClientRect().width; if (w > 300) widest.push(`${el.tagName}.${String(el.className).slice(0,50)} w=${Math.round(w)} text=${(el.textContent||'').slice(0,30)}`); });
  return { card, chips, widest: widest.slice(0, 6) };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
