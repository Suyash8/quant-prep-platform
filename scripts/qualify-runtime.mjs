// node scripts/qualify-runtime.mjs [runnerUrl=http://127.0.0.1:3010] [out.json]
// Reproducible runtime qualification. Records the runtime fingerprint of the machine the runner runs on, compares it with the documented baseline
// (SETUP.md: Python 3.12+, GCC 12.4+), then runs every problem's authored reference solution through the runner against its stored tests and records
// verdicts and wall times, then runs the isolation probes (scripts/verify-runner-isolation.mjs). Evidence only: it never edits code-readiness.json. A machine below the baseline, or any reference failure, is NOT qualified.
// Re-run on the real deployment target (same runner HTTP contract, CODE_RUNNER_URL) before any production readiness entry is considered.
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os';
const url = process.argv[2] ?? 'http://127.0.0.1:3010'; const out = process.argv[3] ?? 'content-v5/_evidence/runtime-qualification-local.json';
const ver = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8' }).split('\n')[0].trim(); } catch { return null; } };
const num = (s, re) => { const m = s?.match(re); return m ? m[1].split('.').map(Number) : null; };
const gte = (a, b) => a && a.every((_, i) => (a[i] ?? 0) > (b[i] ?? 0) ? true : (a[i] ?? 0) === (b[i] ?? 0) ? i === a.length - 1 || undefined : false) !== false && cmp(a, b) >= 0;
const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? 0) - (b[i] ?? 0); if (d) return d; } return 0; };
const py = ver(process.env.PYTHON_BIN || 'python3', ['--version']), gpp = ver(process.env.CXX_BIN || '/usr/bin/g++', ['--version']);
const pyv = num(py, /Python (\d+\.\d+(?:\.\d+)?)/), gv = num(gpp, /(\d+\.\d+\.\d+)\s*(?:\(|$|\d{8})/) ?? num(gpp, /(\d+\.\d+\.\d+)/);
const fp = { python: py, gpp, nodeVersion: process.version, os: `${os.type()} ${os.release()} ${os.arch()}`, cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, memGiB: +(os.totalmem() / 2 ** 30).toFixed(1), runnerUrl: url };
const baseline = { python: [3, 12], gpp: [12, 4] };
const meetsBaseline = { python: !!pyv && cmp(pyv, baseline.python) >= 0, gpp: !!gv && cmp(gv, baseline.gpp) >= 0 };
const problems = {}; for (const f of fs.readdirSync('src/lib/v5/server-problems')) { const d = JSON.parse(fs.readFileSync('src/lib/v5/server-problems/' + f, 'utf8')); problems[d.id] = d; } const src = {};
for (const f of fs.readdirSync('content-v5/problems-src')) { const d = JSON.parse(fs.readFileSync('content-v5/problems-src/' + f, 'utf8')); src[d.id] = d; }
const results = [];
for (const id of Object.keys(problems).sort()) for (const lang of ['python', 'cpp']) {
  const code = src[id]?.solutions?.[lang]; if (!code) { results.push({ id, lang, skipped: 'no reference solution' }); continue; }
  const lim = problems[id].limits?.[lang]; const t0 = Date.now(); let r;
  try { const res = await fetch(url + '/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: lang === 'cpp' ? 'cpp17' : 'python', code, tests: problems[id].tests.map((t) => ({ input: t.input, expected: t.expected, hidden: !!t.hidden })), timeLimitMs: lim?.timeLimitMs, memoryLimitMb: lim?.memoryLimitMb }) }); r = { status: res.status, ...(await res.json()) }; } catch (e) { r = { status: 0, error: String(e) }; }
  results.push({ id, lang, tests: problems[id].tests.length, passed: r.passed, verdict: r.verdict ?? r.error, wallMs: Date.now() - t0, maxTestMs: Math.max(0, ...(r.results ?? []).map((x) => x.timeMs ?? 0)), limits: lim ?? null });
  console.log(id, lang, r.verdict ?? r.error, `${r.passed}/${problems[id].tests.length}`, Date.now() - t0, 'ms');
}
const ran = results.filter((x) => !x.skipped), skippedN = results.length - ran.length;
// vacuous success is not success: at least one reference must have run, none may be skipped, and every problem must have both languages run
const refOk = ran.length > 0 && skippedN === 0 && ran.length === Object.keys(problems).length * 2 && ran.every((x) => x.verdict === 'accepted' || x.verdict === 'ok' || x.passed === x.tests);
const health = await (await fetch(url + '/health')).json().catch(() => ({}));
const isoFile = out.replace(/\.json$/, '') + '-isolation.json'; let isolation = { ran: false };
try { execFileSync('node', ['scripts/verify-runner-isolation.mjs', url, isoFile], { encoding: 'utf8', stdio: 'pipe', timeout: 300000 }); } catch { /* a failing probe exits 1; its results are still written */ }
try { const iso = JSON.parse(fs.readFileSync(isoFile, 'utf8')); isolation = { ran: true, total: iso.results.length, passed: iso.results.filter((r) => r.ok).length, failed: iso.results.filter((r) => !r.ok).map((r) => r.name), file: isoFile }; } catch { /* not run */ }
const sandboxOk = health.sandbox?.active === true && isolation.ran && isolation.failed.length === 0;
const qualified = meetsBaseline.python && meetsBaseline.gpp && refOk && sandboxOk;
const report = { generatedAt: new Date().toISOString(), fingerprint: fp, baseline: { python: '3.12+', gpp: '12.4+', source: 'SETUP.md' }, meetsBaseline, referencesAllPass: refOk, referenceRuns: { ran: ran.length, skipped: skippedN, expected: Object.keys(problems).length * 2 }, sandbox: health.sandbox ?? null, isolation, qualified, scope: 'LOCAL, SINGLE-USER qualification: Linux namespace isolation (bubblewrap: no network, read-only root, per-job disk budget, pid/ipc/uts/user namespaces, rlimits, bounded queue) on the hardware that produced this file. Not a hypervisor or gVisor boundary, not a shared multi-user host guarantee, no cheat-resistance claim. Re-run after any change to the runner, toolchain, image or hardware.', why: qualified ? 'Baseline toolchain met, every reference solution passes its stored tests, the sandbox is active and every isolation probe passed.' : 'Not qualified: ' + [!meetsBaseline.python && 'Python below 3.12', !meetsBaseline.gpp && 'g++ below 12.4', !refOk && 'a reference solution failed', health.sandbox?.active !== true && 'sandbox not active', !(isolation.ran && isolation.failed.length === 0) && 'isolation probes missing or failing'].filter(Boolean).join('; ') + '.', results };
fs.writeFileSync(out, JSON.stringify(report, null, 1)); console.log(JSON.stringify({ fp, meetsBaseline, referencesAllPass: refOk }, null, 1));
