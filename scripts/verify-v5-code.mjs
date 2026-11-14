// node scripts/verify-v5-code.mjs [baseUrl]  HTTP test of /api/v5/code (needs QF_DEMO_EMAIL/QF_DEMO_PASSWORD; a code runner reachable for the run/check cases)
import fs from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:3112';
const email = process.env.QF_DEMO_EMAIL, password = process.env.QF_DEMO_PASSWORD;
let fails = 0; const check = (n, ok, extra = '') => { console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : extra); if (!ok) fails++; };
const DEV = process.env.QF_V5_CODE_DEV === '1';   // the server under test must have been started with the same QF_V5_CODE_DEV value
const lr = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
const cookie = (lr.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; '); check('login', lr.ok && !!cookie);
const UID = (await (await fetch(base + '/api/auth/me', { headers: { cookie } })).json()).user?.id;
const MAN = await (await fetch(base + '/v5/manifest.json')).json(); const PSHA = (id) => MAN.packs.find((x) => x.kind === 'problem' && x.id === id)?.sha256;
// Production version-binding expectations follow the host's actual readiness: a QUALIFIED production host (readiness list populated) reaches the version check and must answer 409 problem-changed with nothing judged; an UNQUALIFIED production host fail-closes with 403 before any version check. Both judge nothing. DEV (QF_V5_CODE_DEV=1) is always the 409 path.
const GL = await (await fetch(base + '/api/v5/code')).json(); const QUALIFIED = !DEV && !GL.devTestOnly && !!GL.ready && Object.keys(GL.ready).length > 0;
check('readiness probe decisive: qualified production list populated or fail-closed empty', DEV || QUALIFIED || Object.keys(GL.ready ?? {}).length === 0, JSON.stringify(GL).slice(0, 150));
const post = (b0, o = {}) => { const b = b0.action === 'check' && !('publicSha' in b0) ? { ...b0, publicSha: PSHA(b0.problemId) } : (b0.publicSha === null ? (({ publicSha, ...r }) => r)(b0) : b0); return fetch(base + '/api/v5/code', { method: 'POST', headers: { 'content-type': 'application/json', ...(o.nocookie ? {} : { cookie }), ...(o.acct === null ? {} : { 'x-qf-account': o.acct ?? UID }) }, body: JSON.stringify(b) }); };
const src = JSON.parse(fs.readFileSync('content-v5/problems-src/ledger-replay.json', 'utf8'));
const good = src.solutions.python; const bad = 'print("nope")\n';
check('signed out -> 401 signed-out', (await post({ action: 'run', problemId: 'qfp-ledger-replay', language: 'python', source: good }, { nocookie: true })).status === 401);
check('missing account header -> 400', (await post({ action: 'run', problemId: 'qfp-ledger-replay', language: 'python', source: good }, { acct: null })).status === 400);
const mm = await post({ action: 'run', problemId: 'qfp-ledger-replay', language: 'python', source: good }, { acct: 'someone-else' }); check('wrong account header -> 409 account-mismatch, nothing run', mm.status === 409 && (await mm.json()).state === 'account-mismatch');
check('unknown problem -> 404', (await post({ action: 'run', problemId: 'nope', language: 'python', source: good })).status === 404);
check('invalid body -> 400', (await post({ action: 'check', problemId: 'qfp-ledger-replay', language: 'ruby', source: good })).status === 400);
const vMiss = await post({ action: 'check', problemId: 'qfp-ledger-replay', language: 'python', source: good, publicSha: null }); const vm = await vMiss.json(); check('check without the problem version -> rejected, nothing judged (qualified host: 409 problem-changed; unqualified: 403 fail-closed)', (DEV || QUALIFIED) ? (vMiss.status === 409 && vm.state === 'problem-changed' && !('verdict' in vm)) : vMiss.status === 403, JSON.stringify(vm));
const vOld = await post({ action: 'check', problemId: 'qfp-ledger-replay', language: 'python', source: good, publicSha: 'a'.repeat(64) }); const vo = await vOld.json(); check('check against a stale problem version -> rejected, no verdict, no pass/total (qualified host: 409 problem-changed; unqualified: 403 fail-closed)', (DEV || QUALIFIED) ? (vOld.status === 409 && vo.state === 'problem-changed' && !('verdict' in vo) && !('passed' in vo)) : vOld.status === 403, JSON.stringify(vo));
const r1 = await post({ action: 'run', problemId: 'qfp-ledger-replay', language: 'python', source: good }); const j1 = await r1.json();
if (!DEV) { check('normal mode (production list populated, isolated runner): the problem is judged, not refused', r1.status === 200 && (j1.state === 'ran' || j1.state === 'checked'), JSON.stringify(j1).slice(0, 200)); }
else if (r1.status === 503) { check('runner unreachable is reported as runtime-unavailable, not incorrect', j1.state === 'runtime-unavailable' && !('verdict' in j1)); }
else {
  check('run (own program, sample input): output only, no correctness verdict field "passed"', j1.state === 'ran' && j1.verdict === 'ok' && j1.run?.stdout?.includes('BALANCE') && j1.passed === undefined, JSON.stringify(j1).slice(0, 300));
  const j2 = await (await post({ action: 'check', problemId: 'qfp-ledger-replay', language: 'python', source: good })).json();
  check('check (reference solution): all server tests pass, no XP awarded', j2.state === 'checked' && j2.verdict === 'passed' && j2.passed === j2.total && j2.awardsProgress === false && j2.limitsProvisional === true, JSON.stringify(j2).slice(0, 300));
  const j3 = await (await post({ action: 'check', problemId: 'qfp-ledger-replay', language: 'python', source: bad })).json();
  check('check (wrong program): failed, counts reported, no expected leak for hidden test', j3.verdict !== 'passed' && j3.passed < j3.total && (j3.hiddenFailure === true ? j3.firstFailure === undefined : true), JSON.stringify(j3).slice(0, 300));
  const j4 = await (await post({ action: 'check', problemId: 'qfp-ledger-replay', language: 'python', source: 'def x(:\n' })).json(); check('check (syntax error): compile_error-style failure, not a pass', j4.verdict !== 'passed', JSON.stringify(j4).slice(0, 200));
}

if (DEV) {
const se = await post({ action: 'run', problemId: 'qfp-ledger-replay', language: 'python', source: 'def f(:\n  pass\n' }); const sej = await se.json(); check('python syntax error -> compile_error with compile.ok false and no run', sej.verdict === 'compile_error' && sej.compile?.ok === false && /SyntaxError/.test(sej.compile?.stderr ?? '') && !sej.run, JSON.stringify(sej).slice(0, 300));
// NOTE: run this suite against a server started with QF_V5_READY_ONLY=qfp-ledger-replay (a narrowing-only test hook) so a real not-ready problem exists for the 403 path below; all 78 are ready otherwise.
// readiness is enforced by the route itself (fail closed), not only by learner routes
const nr = await post({ action: 'run', problemId: 'qfp-word-frequency', language: 'python', source: good }); const nrj = await nr.json(); check('direct request for a problem not on the readiness list -> 403 not-ready, not run', nr.status === 403 && nrj.state === 'not-ready', JSON.stringify(nrj));
const nc = await post({ action: 'run', problemId: 'qfp-ledger-replay', language: 'rust', source: 'fn main(){}' }); const ncb = await nc.json(); check('approved problem but language not approved (rust; C++ is dev-listed for ledger-replay) -> rejected, nothing run', (nc.status === 403 || nc.status === 400) && !ncb.run, nc.status + ' ' + JSON.stringify(ncb).slice(0, 150));
// byte-exact input limits (UTF-8: 2 bytes per e-acute). Custom input cap is 65536 BYTES, not characters
const e1 = 'é'.repeat(32768), e2 = 'é'.repeat(32769);
const ok65 = await post({ action: 'run', problemId: 'qfp-ledger-replay', language: 'python', source: 'import sys\nprint(len(sys.stdin.buffer.read()))\n', stdin: e1 }); const okj = await ok65.json();
check('custom input of exactly 65536 UTF-8 bytes is accepted and the program receives all 65536 bytes', ok65.status === 200 && okj.run?.stdout?.trim() === '65536', JSON.stringify(okj).slice(0, 300));
await new Promise((r) => setTimeout(r, 9000));   // the per-user bucket (12, +0.25/s) was drained by the cases above, including the two version-binding rejections
const big = await post({ action: 'run', problemId: 'qfp-ledger-replay', language: 'python', source: good, stdin: e2 }); const bj = await big.json();
check('custom input of 65538 bytes (32769 two-byte chars; under 65536 by character count) is REJECTED 413 input-too-large, never truncated or judged', big.status === 413 && bj.state === 'input-too-large' && bj.verdict === undefined, JSON.stringify(bj));
// runner cap exactly: 4 MiB accepted, 4 MiB + 1 char (2 bytes) rejected with 413, never a verdict
const rr = async (n) => { const r = await fetch('http://127.0.0.1:3010/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: 'python', code: 'import sys\nprint(len(sys.stdin.buffer.read()))\n', stdin: 'é'.repeat(n), timeLimitMs: 4000, memoryLimitMb: 256 }) }); return [r.status, await r.json().catch(() => ({}))]; };
const [s1, r1x] = await rr(2097152); const [s2, r2x] = await rr(2097153);
check('runner: stdin of exactly 4 MiB (2097152 x 2-byte chars) accepted and fully delivered', s1 === 200 && r1x.run?.stdout?.trim() === '4194304', JSON.stringify([s1, r1x]).slice(0, 300));
check('runner: 4 MiB + 2 bytes rejected 413 stdin-too-large (no truncated run, no verdict)', s2 === 413 && r2x.error === 'stdin-too-large' && r2x.verdict === undefined, JSON.stringify([s2, r2x]).slice(0, 300));
// output caps: expected outputs up to ~1.22 MB are legitimate (csv-line-parser); a runaway printer is still killed; /run display is capped and flagged
const sub = async (code, expected) => (await fetch('http://127.0.0.1:3010/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: 'python', code, tests: [{ input: '', expected }], timeLimitMs: 8000, memoryLimitMb: 256 }) })).json();
const big13 = 'x'.repeat(1300000); const o1 = await sub("import sys\nsys.stdout.write('x'*1300000)\n", big13); check('runner: a correct 1.3 MB output is judged passed (not output_limit)', o1.verdict === 'passed', JSON.stringify(o1).slice(0, 200));
const o2 = await sub("import sys\nsys.stdout.write('x'*5000000)\n", 'y'); check('runner: a runaway 5 MB printer is killed with output_limit', o2.verdict === 'output_limit', JSON.stringify(o2).slice(0, 200));
const o3 = await (await fetch('http://127.0.0.1:3010/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: 'python', code: "import sys\nsys.stdout.write('x'*1300000)\n", stdin: '', timeLimitMs: 8000, memoryLimitMb: 256 }) })).json(); check('runner /run: 1.3 MB output returned capped to 256 KiB and flagged stdoutTruncated', o3.run?.stdout?.length === 262144 && o3.run?.stdoutTruncated === true, JSON.stringify(o3).slice(0, 150));

}
console.log(fails ? `FAILED ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
