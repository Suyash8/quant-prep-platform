import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto('http://localhost:3002/login'); await page.waitForTimeout(1200);
await page.fill('input[type=email]', 'visual@test.dev');
await page.fill('input[type=password]', 'visualtest12345');
await page.click('button[type=submit]'); await page.waitForTimeout(2500);
await page.goto('http://localhost:3002/assessments/apt-quantitative', { waitUntil: 'load' }); await page.waitForTimeout(2500);
const r = await page.evaluate(() => {
  const rc = document.querySelector('a.row-card');
  const grid = rc.closest('.grid');
  const gcs = getComputedStyle(grid);
  const ics = getComputedStyle(rc);
  // min-content measurement via range
  const range = document.createRange();
  range.selectNodeContents(rc);
  return {
    gridW: Math.round(grid.getBoundingClientRect().width),
    gridTemplate: gcs.gridTemplateColumns,
    rcW: Math.round(rc.getBoundingClientRect().width),
    rcJustifySelf: ics.justifySelf,
    rcWidth: ics.width,
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
