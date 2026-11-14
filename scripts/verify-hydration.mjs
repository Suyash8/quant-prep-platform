// node scripts/verify-hydration.mjs [baseUrl]  Production build. Visits pages repeatedly in ONE browser context (so persisted localStorage exists) and fails on any page error or console error (React hydration #418 included).
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? 'playwright'); const base = process.argv[2] ?? 'http://localhost:3112'; let fails = 0;
const b = await chromium.launch(); const ctx = await b.newContext(); await ctx.request.post(base + '/api/auth/login', { data: { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD } });
const p = await ctx.newPage(); const e = []; p.on('pageerror', (x) => e.push(String(x).slice(0, 140))); p.on('console', (m) => { if (m.type() === 'error') e.push(m.text().slice(0, 140)); });
for (const u of ['/settings', '/dashboard', '/learn', '/settings', '/dashboard', '/v5/learn', '/v5/progress', '/settings']) { e.length = 0; await p.goto(base + u, { timeout: 60000 }); await p.waitForTimeout(2500); console.log(e.length ? 'FAIL' : 'PASS', u, e.join(' | ')); if (e.length) fails++; }
console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
