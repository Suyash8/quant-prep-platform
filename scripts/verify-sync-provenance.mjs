// Regression: a device-reported assessment score must not overwrite a server-graded attempt or its per-question detail.
const B = 'http://127.0.0.1:3002';
const email = 'prov-' + Date.now() + '@test.dev';
const r = await fetch(B + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Provenance', email, password: 'provenance-test-1234' }) });
const cookie = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
const J = (path, body) => fetch(B + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined }).then(x => x.json());
const t = Date.now(), at = new Date().toISOString();
const server = await J('/api/assessments/submit', { assessmentId: 'assess-probability', answers: {} }); // all unanswered: server-graded low score
const serverPct = server.scorePct ?? server.pct ?? server.result?.scorePct;
await J('/api/sync', { events: [{ id: 'prov-' + t, kind: 'assessment_result', at, assessmentId: 'assess-probability', pct: 100 }] });
const page = await fetch(B + '/assessments/assess-probability', { headers: { cookie } }).then(x => x.text());
const list = await fetch(B + '/assessments', { headers: { cookie } }).then(x => x.text());
const ok = typeof serverPct === 'number' && serverPct < 100
  && /device, not verified/.test(page) && /not verified/.test(list)
  && !/>100%</.test(page.replace(/<[^>]*device[^<]*/g, ''));
console.log(ok ? 'PASS' : 'FAIL', JSON.stringify({ serverPct, deviceLabelOnDetail: /device, not verified/.test(page), deviceChipOnList: /not verified/.test(list) }));
process.exit(ok ? 0 : 1);
