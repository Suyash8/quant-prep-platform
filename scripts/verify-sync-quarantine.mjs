// Browser check: a schema-invalid queued event is quarantined and does not block valid events.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW_PATH || 'playwright');
const B = 'http://127.0.0.1:3002';
const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
await p.goto(B + '/login'); await p.waitForTimeout(1200);
await p.fill('input[type=email]', (process.env.QF_DEMO_EMAIL || '')); await p.fill('input[type=password]', (process.env.QF_DEMO_PASSWORD || ''));
await p.click('button[type=submit]'); await p.waitForTimeout(2500);
const t = Date.now();
await p.addInitScript(([t]) => {
  if (!localStorage.getItem('seeded-q')) {
    localStorage.setItem('qf3-queue', JSON.stringify([
      { id: 'poison-' + t, kind: 'drill_session', at: new Date().toISOString(), correct: 9, answered: 2 },
      { id: 'good-' + t, kind: 'drill_session', at: new Date().toISOString(), correct: 1, answered: 2 },
    ])); localStorage.setItem('seeded-q', '1');
  }
}, [t]);
await p.goto(B + '/settings'); await p.waitForTimeout(5000);
console.log(JSON.stringify(await p.evaluate(() => ({ queue: JSON.parse(localStorage.getItem('qf3-queue') || '[]').map(e => e.id), rejected: JSON.parse(localStorage.getItem('qf3-rejected') || '[]').map(r => r.event.id + ': ' + r.reason), err: localStorage.getItem('qf3:sync-error') }))));
await b.close();
