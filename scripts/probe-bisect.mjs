import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto('http://localhost:3002/login'); await page.waitForTimeout(1200);
await page.fill('input[type=email]', 'visual@test.dev');
await page.fill('input[type=password]', 'visualtest12345');
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
await page.goto('http://localhost:3002/planner', { waitUntil: 'load' }); await page.waitForTimeout(3000);
const r = await page.evaluate(() => {
  const out = [];
  const sw = () => document.documentElement.scrollWidth;
  const scroller = document.querySelector('.max-h-\\[640px\\].overflow-y-auto');
  out.push({ level: 'scroller children', sw0: sw() });
  // hide each week card
  const weeks = [...scroller.children];
  weeks.forEach((w, i) => { w.style.display = 'none'; out.push({ hideWeek: i, sw: sw() }); w.style.display = ''; });
  // inside first week: hide each child
  if (weeks[0]) [...weeks[0].children].forEach((c, i) => { c.style.display = 'none'; out.push({ hideWeek0Child: i, cls: c.className.slice(0, 40), sw: sw() }); c.style.display = ''; });
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
