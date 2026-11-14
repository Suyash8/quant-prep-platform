// node scripts/populate-readiness.mjs [evidence.json]
// Writes the production list in content-v5/_build/code-readiness.json from a qualification evidence file, and ONLY when that file says qualified=true
// with every reference run, zero skipped, an active sandbox and all isolation probes passing. Pairs listed are exactly the problems whose reference passed in that file.
// The route still fails closed at run time: the runner must report an active sandbox on a baseline toolchain (judgeRuntimeStatus).
import fs from 'node:fs';
const ev = JSON.parse(fs.readFileSync(process.argv[2] ?? 'content-v5/_evidence/runtime-qualification-sandboxed-local.json', 'utf8'));
if (!(ev.qualified === true && ev.referencesAllPass === true && ev.referenceRuns?.skipped === 0 && ev.referenceRuns?.ran > 0 && ev.referenceRuns.ran === ev.referenceRuns.expected && ev.sandbox?.active === true && ev.isolation?.failed?.length === 0 && ev.isolation?.passed === ev.isolation?.total)) { console.error('evidence does not qualify; readiness not changed'); process.exit(1); }
// per-id check: the set of (problem, language) pairs whose reference passed in the evidence must equal the shipped problem set exactly
const shipped = fs.readdirSync('src/lib/v5/server-problems').map((x) => x.replace(/\.json$/, '')).sort();
const passedPairs = new Set((ev.results ?? []).filter((x) => !x.skipped && (x.verdict === 'accepted' || x.verdict === 'ok' || x.verdict === 'passed' || x.passed === x.tests)).map((x) => x.id + ':' + x.lang));
const wanted = shipped.flatMap((id) => ['python', 'cpp'].map((l) => id + ':' + l));
const missing = wanted.filter((k) => !passedPairs.has(k)), extra = [...passedPairs].filter((k) => !wanted.includes(k));
if (missing.length || extra.length) { console.error('evidence problem set differs from the shipped problems; readiness not changed', { missing: missing.slice(0, 5), extra: extra.slice(0, 5) }); process.exit(1); }
const f = 'content-v5/_build/code-readiness.json'; const r = JSON.parse(fs.readFileSync(f, 'utf8'));
const prod = {}; for (const id of fs.readdirSync('src/lib/v5/server-problems').map((x) => x.replace(/\.json$/, '')).sort()) prod[id] = ['python', 'cpp'];
r.production = prod;
r._note = "Server-side judging gate, FAIL CLOSED. 'production' lists problem/language pairs approved for learners, written by scripts/populate-readiness.mjs from a qualification evidence file (qualified=true: every reference run passed, none skipped, sandbox active, all isolation probes passed). Scope is LOCAL single-user isolation. At run time the route still refuses unless the runner reports an active sandbox on Python >= 3.12 and g++ >= 12.4. 'devTestOnly' is active only with QF_V5_CODE_DEV=1 and is not approval of any kind. Technical evidence is not user permission: the entries rest on the user's original request for the Python and C++ practice problems plus the qualification evidence.";
fs.writeFileSync(f, JSON.stringify(r, null, 1) + '\n'); console.log('production entries:', Object.keys(prod).length);
