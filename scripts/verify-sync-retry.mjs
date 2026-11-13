// Browser check: a failing /api/sync keeps events queued and shows an error record; a good sync clears it.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW_PATH || 'playwright');
const B = 'http://127.0.0.1:3002';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
await p.goto(B + '/login'); await p.waitForTimeout(1200);
await p.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || '')); await p.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await p.click('button[type=submit]'); await p.waitForTimeout(2500);
const id = 'retry-' + Date.now();
let mode = 'fail';
await p.route('**/api/sync', async route => {
  if (route.request().method() !== 'POST') return route.continue();
  if (mode === 'fail') {
    const sent = JSON.parse(route.request().postData()).events.map(e => e.id);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ applied: 0, accepted: [], duplicates: [], failed: sent, snapshot: {} }) });
  }
  return route.continue();
});
await p.addInitScript(([id]) => {
  if (!localStorage.getItem('qf3-queue-seeded')) {
    const q = JSON.parse(localStorage.getItem('qf3-queue') || '[]');
    q.push({ id, kind: 'drill_session', at: new Date().toISOString(), correct: 2, answered: 3 });
    localStorage.setItem('qf3-queue', JSON.stringify(q)); localStorage.setItem('qf3-queue-seeded', '1');
  }
}, [id]);
await p.goto(B + '/settings'); await p.waitForTimeout(4000);
const st = async () => p.evaluate(([id]) => ({ queued: JSON.parse(localStorage.getItem('qf3-queue') || '[]').some(e => e.id === id), err: localStorage.getItem('qf3:sync-error') }), [id]);
console.log('after failing sync:', JSON.stringify(await st()));
console.log('notice visible:', await p.locator('[role=alert]').filter({ hasText: 'has not reached the server' }).count());
await p.screenshot({ path: '/tmp/sync-error-settings.png', fullPage: false });
mode = 'ok';
await p.waitForTimeout(18000);
console.log('after good sync:', JSON.stringify(await st()));
await b.close();
