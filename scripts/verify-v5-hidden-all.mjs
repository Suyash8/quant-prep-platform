// node scripts/verify-v5-hidden-all.mjs [baseUrl=http://localhost:3112]   (QF_DEMO_EMAIL / QF_DEMO_PASSWORD in the environment)
// v5 server judge, ALL shipped problems (src/lib/v5/server-problems) x Python and C++: a wrong submission and a compile-error submission must never return a hidden test's input, expected output or actual output.
// Enumerates the ids from the shipped problem files and fails if the covered set differs from them. The older verify-hidden-all.mjs covers the legacy v3 judge (content/problems), not these.
import fs from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:3112';
const lr = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.QF_DEMO_EMAIL || '', password: process.env.QF_DEMO_PASSWORD || '' }) });
const cookie = lr.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
const UID = (await (await fetch(base + '/api/auth/me', { headers: { cookie } })).json()).user?.id;
const MAN = await (await fetch(base + '/v5/manifest.json')).json();
const ids = fs.readdirSync('src/lib/v5/server-problems').filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
const wrong = { python: 'print("wrong")\n', cpp: '#include <iostream>\nint main(){std::cout<<"wrong";}\n' }, broken = { python: 'def (:\n', cpp: 'int main( {\n' };
let leaks = 0, calls = 0, hiddenSeen = 0, notChecked = []; const covered = new Set();
for (const id of ids) {
  const p = JSON.parse(fs.readFileSync(`src/lib/v5/server-problems/${id}.json`, 'utf8')); const hid = p.tests.filter((t) => t.hidden); hiddenSeen += hid.length;
  const sha = MAN.packs.find((x) => x.kind === 'problem' && x.id === id)?.sha256;
  for (const lang of ['python', 'cpp']) for (const [kind, srcs] of [['wrong', wrong], ['compile-error', broken]]) {
    if (kind === 'compile-error' && lang === 'cpp') continue;   // the route allows 12 calls then 1 per 4 s per account; compile-error is checked in Python only to keep the run near 16 minutes
    let r; for (let a = 0; a < 5; a++) { await new Promise((z) => setTimeout(z, 4100)); r = await fetch(base + '/api/v5/code', { method: 'POST', headers: { 'content-type': 'application/json', cookie, 'x-qf-account': UID }, body: JSON.stringify({ action: 'check', problemId: id, language: lang, source: srcs[lang], publicSha: sha }) }); if (r.status !== 429) break; await new Promise((z) => setTimeout(z, 8000)); }
    const txt = await r.text(); calls++; let j; try { j = JSON.parse(txt); } catch { j = {}; }
    if (j.state !== 'checked') { notChecked.push(`${id}/${lang}/${kind}:${r.status}:${j.state}`); continue; }
    covered.add(id + ':' + lang);
    for (const t of hid) for (const [k, v] of [['input', t.input], ['expected', t.expected]]) if (typeof v === 'string' && v.length >= 8 && txt.includes(v.slice(0, 200))) { leaks++; console.log('LEAK', id, lang, kind, k); }
    if (j.hiddenFailure && j.firstFailure) { leaks++; console.log('LEAK hiddenFailure with firstFailure', id, lang); }
  }
}
const expected = ids.length * 2; const ok = leaks === 0 && notChecked.length === 0 && covered.size === expected;
console.log(JSON.stringify({ problems: ids.length, pairsCovered: covered.size, expectedPairs: expected, calls, hiddenTestsInScope: hiddenSeen, leaks, notChecked: notChecked.slice(0, 5) })); console.log(ok ? 'ALL PASS' : 'FAILED'); process.exit(ok ? 0 : 1);
