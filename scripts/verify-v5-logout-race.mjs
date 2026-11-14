// node scripts/verify-v5-logout-race.mjs [baseUrl]  A sign-out aimed at an OLD session must never end a session created by a LATER sign-in (late queued/offline logout POST).
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { request } = require(process.env.PW_PATH ?? 'playwright');
const base = process.argv[2] ?? 'http://localhost:3112'; let fails = 0; const check = (n, ok, x = '') => { console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : String(x)); if (!ok) fails++; };
const creds = { email: process.env.QF_DEMO_EMAIL, password: process.env.QF_DEMO_PASSWORD };
const ctx = await request.newContext({ baseURL: base });
const login = async () => (await ctx.post('/api/auth/login', { data: creds })).ok();
const me = async () => { const r = await ctx.get('/api/auth/me'); return { status: r.status(), st: r.ok() ? (await r.json()).st : null }; };
const out = (data) => ctx.post('/api/auth/logout', { data }).then(async (r) => (await r.json()).result);
check('login 1', await login()); const old = await me(); check('/me returns a non-secret session tag', old.status === 200 && /^[0-9a-f]{16}$/.test(old.st ?? ''), JSON.stringify(old));
const oldAt = Date.now(); await new Promise((r) => setTimeout(r, 1200));
check('login 2 (a later, knowing sign-in)', await login()); const nw = await me(); check('the new session has a different tag', nw.st && nw.st !== old.st);
check('late logout naming the OLD session tag is skipped, new session survives', (await out({ tag: old.st })) === 'skipped' && (await me()).status === 200);
check('body-less logout (no tag, no confirmation) fails safe: ends nothing', (await out({})) === 'skipped' && (await out({ at: oldAt })) === 'skipped' && (await out({ confirmCurrent: false })) === 'skipped' && (await me()).status === 200);
check('logout naming the CURRENT session tag ends it', (await out({ tag: nw.st })) === 'ended' && (await me()).status === 401);
check('login 3, then an explicit confirmCurrent ends it', await login() && (await out({ confirmCurrent: true })) === 'ended' && (await me()).status === 401);
check('no session: logout is harmless', ['none', 'ended'].includes(await out({ confirmCurrent: true })) && (await me()).status === 401);   // the stale cookie is inert
console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); await ctx.dispose(); process.exit(fails ? 1 : 0);
