#!/usr/bin/env node
/**
 * Runs each v5 problem's oracle solutions (python, cpp) against ALL its tests on THIS machine, checks exact output
 * agreement with the stored expected output (checker kinds other than exact are reported unsupported), and records the worst wall time per language.
 * Writes content-v5/_build/limits.json. Limits are PROVISIONAL: max(2000, 5 x measured worst) ms on this host, memory 256 MB (not measured).
 * Toolchain used is recorded; re-measure on the target runner before treating limits as final.
 */
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const dir = path.join(process.cwd(), 'content-v5', 'problems-src');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v5lim-'));
const ver = (c, a) => cp.spawnSync(c, a, { encoding: 'utf8' }); // eslint-disable-line
const PY = process.env.PYTHON_BIN || 'python3', CXX = process.env.CXX_BIN || 'g++';   // target-runtime binaries (see docs/runtime-qualification.md)
const toolchain = { python: ver(PY, ['--version']).stdout.trim(), gpp: ver(CXX, ['--version']).stdout.split('\n')[0] };
const run = (cmd, args, input) => { const t = process.hrtime.bigint(); const r = cp.spawnSync(cmd, args, { input, encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 28 }); return { out: r.stdout, err: r.stderr, status: r.status, ms: Number(process.hrtime.bigint() - t) / 1e6 }; };
const norm = (s) => s.split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
const partialPath = path.join(process.cwd(), 'content-v5', '_build', 'limits.partial.json'); const BUDGET = Number(process.env.QF_LIMITS_BUDGET_S || 0) * 1000; const t0 = Date.now();
let prior = null; try { prior = JSON.parse(fs.readFileSync(partialPath, 'utf8')); } catch {}
if (prior && JSON.stringify(prior.toolchain) !== JSON.stringify(toolchain)) prior = null;   // never mix toolchains
const result = prior ?? { toolchain, host: `${os.type()} ${os.cpus()[0]?.model ?? ''} x${os.cpus().length}`, problems: {}, failures: [] };
let partial = false;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (result.problems[p.id]?.ok) continue;   // measured already on this toolchain
  if (BUDGET && Date.now() - t0 > BUDGET) { partial = true; break; }
  if (p.checker.kind !== 'exact') { result.failures.push(`${p.id}: checker ${p.checker.kind} not supported by this measurer`); continue; }
  fs.writeFileSync(path.join(tmp, 'sol.py'), p.solutions.python); fs.writeFileSync(path.join(tmp, 'sol.cpp'), p.solutions.cpp);
  const comp = cp.spawnSync(CXX, ['-O2', '-std=c++20', '-o', path.join(tmp, 'sol'), path.join(tmp, 'sol.cpp')], { encoding: 'utf8' });
  const worst = { python: 0, cpp: 0 }; let ok = comp.status === 0; if (!ok) result.failures.push(`${p.id}: cpp compile failed: ${comp.stderr.slice(0, 200)}`);
  p.tests.forEach((t, i) => {
    for (const lang of ['python', 'cpp']) {
      if (lang === 'cpp' && comp.status !== 0) continue;
      const r = lang === 'python' ? run(PY, [path.join(tmp, 'sol.py')], t.input) : run(path.join(tmp, 'sol'), [], t.input);
      worst[lang] = Math.max(worst[lang], r.ms);
      if (r.status !== 0 || norm(r.out) !== norm(t.expected)) { ok = false; result.failures.push(`${p.id} test ${i} (${lang}): ${r.status !== 0 ? 'exit ' + r.status + ' ' + r.err.slice(0, 120) : 'output differs'}`); }
    }
  });
  const lim = (ms) => ({ timeLimitMs: Math.max(2000, Math.ceil(ms * 5 / 100) * 100), memoryLimitMb: 256, measuredWorstMs: Math.round(ms), provisional: true });
  result.problems[p.id] = { ok, python: lim(worst.python), cpp: lim(worst.cpp), tests: p.tests.length };
}
fs.mkdirSync(path.join(process.cwd(), 'content-v5', '_build'), { recursive: true });
const total = fs.readdirSync(dir).filter((x) => x.endsWith('.json')).length;
if (partial || Object.keys(result.problems).length + result.failures.filter((x) => /checker .* not supported/.test(x)).length < total) { fs.writeFileSync(partialPath, JSON.stringify(result, null, 1)); console.log(`PARTIAL ${Object.keys(result.problems).length}/${total} measured on ${toolchain.python} / ${toolchain.gpp}; rerun to continue (limits.json NOT replaced)`); process.exit(0); }
fs.writeFileSync(path.join(process.cwd(), 'content-v5', '_build', 'limits.json'), JSON.stringify(result, null, 1)); try { fs.unlinkSync(partialPath); } catch {}
console.log(JSON.stringify({ problems: Object.keys(result.problems).length, allOk: Object.values(result.problems).every((x) => x.ok), failures: result.failures.length, toolchain }));
result.failures.slice(0, 20).forEach((x) => console.log('FAIL', x));
process.exit(result.failures.length ? 1 : 0);
