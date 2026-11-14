// node scripts/verify-v5-attempts.mjs [baseUrl]  needs QF_DEMO_EMAIL / QF_DEMO_PASSWORD of a registered account. HTTP test of /api/v5/attempts.
const base = process.argv[2] ?? 'http://127.0.0.1:3002';
const email = process.env.QF_DEMO_EMAIL, password = process.env.QF_DEMO_PASSWORD;
if (!email || !password) { console.error('set QF_DEMO_EMAIL and QF_DEMO_PASSWORD'); process.exit(2); }
let fails = 0; const check = (n, ok, extra = '') => { console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : extra); if (!ok) fails++; };
const lr = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
const cookie = (lr.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
check('login', lr.ok && cookie, String(lr.status));
const uidOf = async (ck) => (await (await fetch(base + '/api/auth/me', { headers: { cookie: ck } })).json()).user?.id;
const UID = await uidOf(cookie);
const post = (events, ck = cookie, acct = UID) => fetch(base + '/api/v5/attempts', { method: 'POST', headers: { 'content-type': 'application/json', cookie: ck, ...(acct ? { 'x-qf-account': acct } : {}) }, body: JSON.stringify({ events }) });
const man = await (await fetch(base + '/v5/manifest.json')).json();
const itemsPack = man.packs.find((p) => p.kind === 'items');
const items = await (await fetch(base + itemsPack.path)).json();
const q = items.find((x) => x.kind === 'choice' && x.selectionMode === 'one');
const good = q.correct[0], bad = q.options.find((o) => o.id !== good).id, run = Date.now();
const ev = (id, sel, claim, over = {}) => ({ eventId: `t-${run}-${id}`, questionId: q.id, revision: q.revision, packSha: itemsPack.sha256, response: { kind: 'choice', selected: [sel] }, clientResult: { verdict: claim, graderVersion: 'x', contentRevision: q.revision }, hintsUsed: 0, startedAt: 0, answeredAt: Date.now(), ...over });
check('manifest has sha-addressed items pack', /^[0-9a-f]{64}$/.test(itemsPack.sha256) && itemsPack.path.includes(itemsPack.sha256.slice(0, 12)));
const hasKey = (o, ks) => o && typeof o === 'object' && (Array.isArray(o) ? o.some((x) => hasKey(x, ks)) : Object.keys(o).some((k) => ks.includes(k) || hasKey(o[k], ks)));
check('public items pack carries no server-only KEYS (solutions/tests/checker/hiddenTests), not just no substring', !hasKey(items, ['solutions', 'tests', 'hiddenTests', 'checker']));
let r = await (await post([ev('a', good, 'correct')])).json(); check('agreeing event verified', r.receipts?.[0]?.status === 'verified', JSON.stringify(r));
r = await (await post([ev('a', good, 'correct')])).json(); check('same eventId is idempotent', r.receipts?.[0]?.status === 'verified');
r = await (await post([ev('b', bad, 'correct')])).json(); check('client lies about correctness: disputed, server verdict incorrect', r.receipts?.[0]?.status === 'disputed' && r.receipts[0].serverVerdict?.verdict === 'incorrect', JSON.stringify(r));
r = await (await post([ev('c', good, 'correct', { packSha: 'f'.repeat(64) })])).json(); check('unknown packSha is version-unavailable', r.receipts?.[0]?.status === 'version-unavailable', JSON.stringify(r));
r = await (await post([ev('d', good, 'correct', { revision: q.revision + 1 })])).json(); check('wrong revision is version-unavailable', r.receipts?.[0]?.status === 'version-unavailable');
r = await (await post([{ eventId: '' }])).json(); check('malformed event invalid-event', r.receipts?.[0]?.status === 'invalid-event');
r = await (await post([ev('e', good, 'correct', { xp: 99999, progress: { done: true } })])).json(); check('extra client totals ignored', r.receipts?.[0]?.status === 'verified' && !JSON.stringify(r).includes('99999'));
check('no cookie -> 401', (await post([ev('f', good, 'correct')], '')).status === 401);
check('empty batch -> 400', (await post([])).status === 400);
check('oversize batch -> 400', (await post(Array.from({ length: 51 }, (_, i) => ev('g' + i, good, 'correct')))).status === 400);
// duplicate eventId with a DIFFERENT payload must not change the stored result
r = await (await post([ev('a', bad, 'correct')])).json(); check('same eventId, different payload: explicit conflict, not graded, no verdict', r.receipts?.[0]?.status === 'conflict' && !r.receipts[0].serverVerdict, JSON.stringify(r));
r = await (await post([ev('a', good, 'correct')])).json(); check('after conflict, original identical event still returns original verified receipt', r.receipts?.[0]?.status === 'verified', JSON.stringify(r));
check('missing account header -> 400', (await post([ev('h', good, 'correct')], cookie, '')).status === 400);
// choose-many normalisation is unit-tested in scripts/server-attempt.test.ts (current content has no choose-many question)
// second account: isolation
const emailB = `http-iso-${run}@test.dev`; const rg = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Http Iso', email: emailB, password: 'isolation-test-12345' }) });
const ckB = (rg.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; '); const UIDB = await uidOf(ckB);
check('second account registered with own id', rg.ok && !!UIDB && UIDB !== UID, String(rg.status));
check('A claim under B session -> 409', (await post([ev('i', good, 'correct')], ckB, UID)).status === 409);
check('B claim under A session -> 409', (await post([ev('i', good, 'correct')], cookie, UIDB)).status === 409);
r = await (await post([ev('a', bad, 'correct')], ckB, UIDB)).json(); check('B same eventId is its own record (own verdict incorrect), not A\'s', r.receipts?.[0]?.status === 'disputed' && r.receipts[0].serverVerdict?.verdict === 'incorrect', JSON.stringify(r));
r = await (await post([ev('a', good, 'correct')])).json(); check("A's original receipt unaffected by B", r.receipts?.[0]?.status === 'verified', JSON.stringify(r));
console.log(fails ? `FAILED ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
