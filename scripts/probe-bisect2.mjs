import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto('http://localhost:3002/login'); await page.waitForTimeout(1200);
await page.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || ''));
await page.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
await page.goto('http://localhost:3002/planner', { waitUntil: 'load' }); await page.waitForTimeout(3000);
const r = await page.evaluate(() => {
  const out = [];
  const sw = () => document.documentElement.scrollWidth;
  const scroller = document.querySelector('.max-h-\\[640px\\].overflow-y-auto');
  const weeks = [...scroller.children];
  // bisect the widest week (index 3 from previous probe)
  const wk = weeks[3];
  [...wk.children].forEach((c, i) => { c.style.display = 'none'; out.push({ hideWkChild: i, cls: c.className.slice(0, 45), sw: sw() }); c.style.display = ''; });
  // bisect day cards in that week
  const days = [...wk.querySelectorAll('.qf-card-flat.p-3')];
  days.forEach((d, di) => { d.style.display = 'none'; out.push({ hideDay: di, sw: sw() }); d.style.display = ''; });
  // inside a day card: hide each flex child
  if (days[0]) [...days[0].children].forEach((c, i) => { c.style.display = 'none'; out.push({ hideDay0Child: i, cls: c.className.slice(0, 45), sw: sw() }); c.style.display = ''; });
  return { nWeeks: weeks.length, out };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
