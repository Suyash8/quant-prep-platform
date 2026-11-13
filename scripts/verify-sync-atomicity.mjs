// Local check of /api/sync (needs the app running on :3002 and the seeded demo user).
const B = 'http://127.0.0.1:3002';
let r = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: (process.env.QF_DEMO_EMAIL || ''), password: (process.env.QF_DEMO_PASSWORD || '') }) });
const ck = r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
const post = (events) => fetch(B + '/api/sync', { method: 'POST', headers: { 'content-type': 'application/json', cookie: ck }, body: JSON.stringify({ events }) }).then(async r => ({ status: r.status, body: await r.json() }));
const before = (await fetch(B + '/api/sync', { headers: { cookie: ck } }).then(r => r.json())).snapshot;
const id = 'atom-' + Date.now();
const ev = { id, kind: 'drill_session', at: new Date().toISOString(), correct: 4, answered: 5 };
const [a, b] = await Promise.all([post([ev]), post([ev])]);
console.log('concurrent: accepted', a.body.accepted.length, b.body.accepted.length, 'duplicates', a.body.duplicates.length, b.body.duplicates.length, 'failed', a.body.failed.length, b.body.failed.length);
const c = await post([ev]);
const after = c.body.snapshot;
console.log('replay duplicates', c.body.duplicates.length, 'sessions', before.drills.sessions, '->', after.drills.sessions, 'xp', before.xp, '->', after.xp);
const good = { id: 'mix-' + Date.now(), kind: 'drill_session', at: new Date().toISOString(), correct: 1, answered: 2 };
const mix = await post([{ id: 'bad-' + Date.now(), kind: 'drill_session', correct: 5, answered: 2 }, { id: 'bad2', kind: 'nope' }, good]);
console.log('mixed batch status', mix.status, 'accepted', mix.body.accepted.length, 'rejected', JSON.stringify(mix.body.rejected));
