// For every problem: a wrong Python submission must never leak expected/actual/stderr of hidden tests.
import fs from 'node:fs';
const B = 'http://127.0.0.1:3002';
let r = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: (process.env.QF_DEMO_EMAIL || ''), password: (process.env.QF_DEMO_PASSWORD || '') }) });
const ck = r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
let leaks = 0, checked = 0, hiddenTotal = 0, noHidden = [];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const f of fs.readdirSync('content/problems').filter(f => f.endsWith('.json') && (!ONLY || ONLY.includes(f.replace('.json',''))))) {
  const p = JSON.parse(fs.readFileSync('content/problems/' + f));
  if (!p.tests.some(t => t.hidden)) noHidden.push(p.slug);
  await new Promise(r => setTimeout(r, 3300));
  const res = await fetch(B + '/api/judge/submit', { method: 'POST', headers: { 'content-type': 'application/json', cookie: ck }, body: JSON.stringify({ slug: p.slug, language: 'python', code: 'print("wrong")' }) });
  const j = await res.json(); if (!j.results) { console.log('no results', p.slug, res.status, JSON.stringify(j).slice(0,80)); await new Promise(r => setTimeout(r, 6000)); continue; }
  for (const x of j.results || []) {
    checked++;
    if (x.hidden) { hiddenTotal++; if ('expected' in x || 'actual' in x || 'stderr' in x || 'stdout' in x) { leaks++; console.log('LEAK', p.slug, x.index, Object.keys(x)); } }
  }
}
console.log(JSON.stringify({ testsChecked: checked, hiddenSeen: hiddenTotal, leaks, problemsWithNoHiddenTests: noHidden }));
process.exit(leaks ? 1 : 0);
