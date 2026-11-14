// Regression: offline-synced assessment_result must use the assessment's own passMarkPercent (80), not 70.
const B = process.argv[2] ?? 'http://127.0.0.1:3002';
const email = 'passmark-' + Date.now() + '@test.dev';
const r = await fetch(B + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Pass Mark', email, password: 'passmark-test-1234' }) });
const cookie = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
const post = (events) => fetch(B + '/api/sync', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ events }) }).then(x => x.json());
const snap = () => fetch(B + '/api/sync', { headers: { cookie } }).then(x => x.json()).then(j => j.snapshot.lessons['prealg-inequalities']);
const at = new Date().toISOString(); const t = Date.now();
await post([{ id: 'pm-l-' + t, kind: 'lesson_result', at, lessonId: 'prealg-inequalities', pct: 100 }, { id: 'pm-e-' + t, kind: 'exercise_done', at, lessonId: 'prealg-inequalities' }]);
const s0 = await snap();
await post([{ id: 'pm-a1-' + t, kind: 'assessment_result', at, assessmentId: 'assess-probability', pct: 75 }]);
const s1 = await snap();
await post([{ id: 'pm-a2-' + t, kind: 'assessment_result', at, assessmentId: 'assess-probability', pct: 85 }]);
const s2 = await snap();
const ok = s0?.status === 'passed' && s0.retrievalDone === false && s1.retrievalDone === false && s2.retrievalDone === true;
console.log(ok ? 'PASS' : 'FAIL', JSON.stringify({ afterLesson: s0, at75: s1?.retrievalDone, at85: s2?.retrievalDone }));
process.exit(ok ? 0 : 1);
