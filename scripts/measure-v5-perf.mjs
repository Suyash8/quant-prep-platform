// node scripts/measure-v5-perf.mjs [baseUrl]  Production build, local machine, unthrottled Chromium at 390px. MEASUREMENT, not a pass/fail SLO and not a claim about any user's device or network. Reports per route: transferred JS bytes, FCP, LCP, DOMContentLoaded, long-task total; warm (second load) numbers.
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright'); const base = process.argv[2] ?? 'http://localhost:3112';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } });
const routes = ['/v5/learn', '/v5/learn/qf5-python-control-flow', '/v5/practice', '/v5/practice/qfp-ledger-replay', '/v5/progress', '/v5/review', '/dashboard'];
const rows = [];
for (const r of routes) for (const pass of ['cold', 'warm']) {
  const page = await ctx.newPage(); let js = 0; page.on('response', async (res) => { try { if (/\.js(\?|$)/.test(res.url())) js += Number((await res.allHeaders())['content-length'] ?? 0) || (await res.body()).length; } catch {} });
  await page.addInitScript(() => { window.__lcp = 0; window.__lt = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt += e.duration; }).observe({ type: 'longtask', buffered: true }); });
  await page.goto(base + r, { waitUntil: 'load', timeout: 90000 }); await page.waitForTimeout(3000);
  const m = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), fcp: Math.round(fcp?.startTime ?? 0), lcp: Math.round(window.__lcp), longTaskMs: Math.round(window.__lt) }; });
  rows.push({ route: r, pass, jsKB: Math.round(js / 1024), ...m }); await page.close();
}
console.table(rows); await b.close();
