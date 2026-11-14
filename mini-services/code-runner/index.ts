/// <reference types="bun-types" />
/**
 * QuantFoundry code-runner service.
 *
 * Purpose-built sandboxed execution service (port 3010, bound to loopback).
 * The Next.js server never executes untrusted code in its own process; it
 * proxies compile/run jobs here. Isolation measures implemented:
 *   - dedicated process (separate from the web server)
 *   - ephemeral temp directory per job, removed after completion
 *   - clean environment (env -i) — no env leakage into user code
 *   - rlimits via ulimit: address space (memory), CPU time, file size, process count
 *   - wall-clock timeout with SIGKILL
 *   - stdout/stderr caps; stdin supplied per test
 *   - bounded job queue (no unbounded concurrency)
 *
 * For production container-grade isolation, run this service inside a
 * gVisor/Docker sandbox and keep the same HTTP contract (see README).
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, realpathSync, existsSync, mkdirSync, readdirSync, lstatSync } from 'node:fs';
import { tmpdir, totalmem } from 'node:os';
import path from 'node:path';

const PORT = Number(process.env.QF_RUNNER_PORT) || 3010;   // NOT the generic PORT variable: the web app passes its own PORT to a runner it spawns
const HOST = '127.0.0.1';
const MAX_CONCURRENT = 2;
const MAX_CODE_BYTES = 128 * 1024;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;   // KILL threshold for stdout while judging: stored v5 expected outputs reach 1.22 MB, so a 256 KiB cap failed correct solutions (output_limit). A runaway printer is still killed.
const MAX_STDERR_BYTES = 256 * 1024;
const MAX_DISPLAY_BYTES = 256 * 1024;      // what /run returns to the client
const MAX_STDIN_BYTES = 4 * 1024 * 1024;   // v5 problem tests include a ~1.06 MB input; a 1 MiB cap silently truncated it and failed correct solutions


// ---- Sandbox (bubblewrap) -------------------------------------------------------------------------
// Every compile and every run executes inside bubblewrap with NEW user, pid, ipc, uts, cgroup and NETWORK namespaces:
// no network (not even loopback to this service), a private /proc that sees only the job, an empty tmpfs root with
// the system toolchain bind-mounted READ-ONLY, the job directory as the only writable path besides a size-capped /tmp,
// no host environment, and every process dies with the job (pid namespace + --die-with-parent). The ulimits below
// stay in force inside it. QF_SANDBOX=off disables it (development only); the runner then reports sandbox.active=false
// and the web app's readiness gate refuses to judge learners' code on it.
// This is OS-level isolation by namespaces, not a hypervisor boundary: a kernel namespace escape is out of its scope.
const SANDBOX_REQUESTED = (process.env.QF_SANDBOX || 'bwrap').toLowerCase();
const BWRAP = process.env.BWRAP_BIN || 'bwrap';
function toolRoots(): string[] {
  const roots = new Set<string>();
  for (const b of [process.env.PYTHON_BIN, process.env.CXX_BIN]) {
    if (!b || !path.isAbsolute(b)) continue;
    try { const rp = realpathSync(b); roots.add(path.dirname(path.dirname(rp))); roots.add(path.dirname(path.dirname(b))); } catch { /* missing binary: the probe reports it */ }
  }
  for (const x of (process.env.QF_SANDBOX_RO_BINDS || '').split(':').filter(Boolean)) roots.add(x);
  return [...roots].filter(r => r !== '/' && r !== '/usr' && existsSync(r));
}
function sandboxArgs(cwd: string): string[] {
  const a = ['--unshare-all', '--die-with-parent', '--new-session', '--clearenv', '--setenv', 'PATH', '/usr/bin:/bin', '--setenv', 'HOME', '/tmp',
    '--ro-bind', '/usr', '/usr', '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64', '--symlink', 'usr/sbin', '/sbin',
    '--ro-bind-try', '/etc/ld.so.cache', '/etc/ld.so.cache', '--ro-bind-try', '/etc/alternatives', '/etc/alternatives',
    '--proc', '/proc', '--dev', '/dev', '--hostname', 'qfjudge'];
  // /tmp is a per-job directory INSIDE the job directory (not a tmpfs): bwrap 0.6.1 cannot size-cap a tmpfs, so one byte budget covers both and the watchdog in runOnce enforces it.
  const jt = path.join(cwd, '.qftmp'); mkdirSync(jt, { recursive: true });
  const js = path.join(cwd, '.qfshm'); mkdirSync(js, { recursive: true });
  a.push('--bind', jt, '/tmp', '--bind', js, '/dev/shm');   // /dev/shm is also a job-directory path (bwrap --dev makes it an uncapped tmpfs), so the one byte budget covers it
  for (const r of toolRoots()) a.push('--ro-bind', r, r);   // after /tmp: a custom toolchain kept under /tmp (a development layout) stays reachable
  a.push('--bind', cwd, '/work', '--remount-ro', '/', '--chdir', '/work');   // the job directory is mounted at /work, so its host path (under /tmp) is never exposed
  return a;
}
let SANDBOX_ACTIVE = false; let SANDBOX_PROBE = SANDBOX_REQUESTED === 'off' ? 'disabled by QF_SANDBOX=off' : 'not probed';
if (SANDBOX_REQUESTED !== 'off') {
  const dir = mkdtempSync(path.join(tmpdir(), 'qfprobe-'));
  const r = spawnSync(BWRAP, [...sandboxArgs(dir), '/bin/sh', '-c', 'n=$(ls /proc | grep -c "^[0-9]"); i=$(grep -c ":" /proc/net/dev); test "$n" -le 12 && test "$i" -le 1 && echo ok'], { encoding: 'utf8', timeout: 15000 });
  rmSync(dir, { recursive: true, force: true });
  SANDBOX_ACTIVE = r.status === 0 && r.stdout.trim() === 'ok';
  SANDBOX_PROBE = SANDBOX_ACTIVE ? 'bubblewrap namespace probe ok' : `bubblewrap probe failed: ${(r.stderr || String(r.error || '')).trim().slice(0, 200)}`;
}
console.log(`[code-runner] sandbox active=${SANDBOX_ACTIVE} (${SANDBOX_PROBE})`);

const MAX_JOB_BYTES = 64 * 1024 * 1024, MAX_JOB_FILES = 2000, WATCHDOG_MS = 25;
/** Total bytes and file count under the job directory (user code, binary, outputs and /tmp together). */
function jobUsage(dir: string): { bytes: number; files: number } {
  let bytes = 0, files = 0; const stack = [dir];
  while (stack.length) { const d = stack.pop()!; let ents: string[] = []; try { ents = readdirSync(d); } catch { continue; }
    for (const e of ents) { const f = path.join(d, e); let st; try { st = lstatSync(f); } catch { continue; } files++; if (st.isDirectory()) stack.push(f); else bytes += st.size; if (files > MAX_JOB_FILES * 2) return { bytes, files }; } }
  return { bytes, files };
}
/** Between the tests of one submission nothing a program wrote survives: only the source and the compiled binary stay. */
function resetJobDir(dir: string) {
  try { for (const e of readdirSync(dir)) if (e !== 'main' && e !== 'main.py' && e !== 'main.cpp') rmSync(path.join(dir, e), { recursive: true, force: true }); } catch { /* best effort; the watchdog still bounds it */ }
}

// ---- Toolchain baseline (reported on /health; the web app refuses to judge below it) ----------------
function verOf(cmd: string): string { try { return (spawnSync(cmd, ['--version'], { encoding: 'utf8', timeout: 8000 }).stdout || '').split('\n')[0].trim(); } catch { return ''; } }
const TOOLCHAIN = { python: verOf(process.env.PYTHON_BIN || 'python3'), gpp: verOf(process.env.CXX_BIN || '/usr/bin/g++') };
function atLeast(text: string, re: RegExp, min: number[]): boolean { const m = text.match(re); if (!m) return false; const v = m.slice(1).map(Number); for (let i = 0; i < min.length; i++) { if ((v[i] ?? 0) > min[i]) return true; if ((v[i] ?? 0) < min[i]) return false; } return true; }
const BASELINE = { python: atLeast(TOOLCHAIN.python, /Python (\d+)\.(\d+)/, [3, 12]), gpp: atLeast(TOOLCHAIN.gpp, /(?:^|\s|\))(\d+)\.(\d+)(?:\.\d+)?/, [12, 4]) };
console.log(`[code-runner] toolchain python="${TOOLCHAIN.python}" g++="${TOOLCHAIN.gpp}" meetsBaseline=${BASELINE.python && BASELINE.gpp}`);

let active = 0;
const MAX_QUEUE = 8;   // queued requests hold their full request body in memory until they run: keep the worst case small
const MAX_BODY_BYTES = 16 * 1024 * 1024;   // sized from the real payloads: the largest /submit body (all stored tests of one problem) is 7.3 MB raw, so 16 MiB leaves more than 2x headroom; 8 queued x 16 MiB = 128 MiB worst case

class Busy extends Error {}
// Admission: a job reserves memory before it starts (its address-space limit, at least 512 MB for the compiler) against 70% of this machine's RAM,
// and at most MAX_CONCURRENT jobs run at once. FIFO. A job larger than the whole budget still runs, but alone. At most MAX_QUEUE wait; the rest get 503.
const MEM_BUDGET_MB = Math.floor(totalmem() / 1048576 * 0.7);
let reservedMb = 0;
const waiters: { cost: number; go: () => void }[] = [];
function pump() { while (waiters.length) { const w = waiters[0]; if (active >= MAX_CONCURRENT || (active > 0 && reservedMb + w.cost > MEM_BUDGET_MB)) return; waiters.shift(); active++; reservedMb += w.cost; w.go(); } }
async function withSlot<T>(fn: () => Promise<T>, memoryMb = 512): Promise<T> {
  const cost = Math.max(memoryMb, 512);
  if (waiters.length >= MAX_QUEUE) throw new Busy('runner busy');
  await new Promise<void>(res => { waiters.push({ cost, go: res }); pump(); });
  try { return await fn(); } finally { active--; reservedMb -= cost; pump(); }
}

interface RunOneResult {
  actual: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  timeMs: number;
  killedByLimit: boolean;
}

function runOnce(cmd: string[], cwd: string, stdin: string, wallMs: number, memMB: number, cpuSec: number): Promise<RunOneResult> {
  return new Promise(resolve => {
    const started = Date.now();
    const bash = `ulimit -v ${Math.min(Math.max(memMB, 64), 1024) * 1024}; ulimit -t ${cpuSec}; ulimit -u 768; ulimit -f 65536; exec env -i PATH=/usr/bin:/bin ${cmd.map(a => `'${a.replace(/'/g, `'\\''`)}'`).join(' ')}`;
    if (SANDBOX_REQUESTED !== 'off' && !SANDBOX_ACTIVE) { resolve({ actual: '', stderr: 'sandbox unavailable: code was NOT run', exitCode: -1, timedOut: false, timeMs: 0, killedByLimit: false }); return; }
    const child = SANDBOX_ACTIVE ? spawn(BWRAP, [...sandboxArgs(cwd), '/bin/bash', '-c', bash], { stdio: ['pipe', 'pipe', 'pipe'] }) : spawn('/bin/bash', ['-c', bash], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    let outBytes = 0, errBytes = 0;
    let timedOut = false, killedByLimit = false, settled = false;

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d: string) => {
      outBytes += Buffer.byteLength(d);
      if (outBytes <= MAX_OUTPUT_BYTES) out += d;
      if (outBytes > MAX_OUTPUT_BYTES) { killedByLimit = true; try { child.kill('SIGKILL'); } catch {} }
    });
    child.stderr.on('data', (d: string) => {
      errBytes += Buffer.byteLength(d);
      if (errBytes <= MAX_STDERR_BYTES) err += d;
      if (errBytes > MAX_STDERR_BYTES) { err = err.slice(0, MAX_STDERR_BYTES) + '\n[stderr truncated]'; }
    });

    const stdinStr = stdin;   // size is validated (bytes) before any run; never truncated here
    // A program that exits without reading stdin closes the pipe (EPIPE). That is a normal
    // outcome for a wrong answer and must never crash the runner.
    child.stdin.on('error', () => { /* ignored: the program did not read its input */ });
    child.stdin.write(stdinStr);
    child.stdin.end();

    const timer = setTimeout(() => { timedOut = true; try { child.kill('SIGKILL'); } catch {} }, wallMs);
    const dog = setInterval(() => { if (settled) return; const u = jobUsage(cwd); if (u.bytes > MAX_JOB_BYTES || u.files > MAX_JOB_FILES) { killedByLimit = true; err += '\n[disk budget exceeded: job killed]'; try { child.kill('SIGKILL'); } catch {} } }, WATCHDOG_MS);

    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); clearInterval(dog);
      resolve({ actual: out, stderr: err, exitCode, timedOut, timeMs: Date.now() - started, killedByLimit });
    };
    child.on('close', code => finish(code));
    child.on('error', e => { err += `\n[spawn error] ${e.message}`; finish(-1); });
  });
}

function normalize(s: string): string {
  return s.replace(/\r\n/g, '\n').split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '');
}

interface CompileResult { ok: boolean; stderr: string; binaryPath?: string; timeMs: number }

async function compileCpp(dir: string, code: string, std: 'c++17' | 'c++20'): Promise<CompileResult> {
  const src = path.join(dir, 'main.cpp');
  writeFileSync(src, code);
  const r = await runOnce([process.env.CXX_BIN || '/usr/bin/g++', `-std=${std}`, '-O2', '-pipe', '-DONLINE_JUDGE', '-o', 'main', 'main.cpp'], dir, '', 30000, 512, 20);
  return { ok: r.exitCode === 0, stderr: r.stderr, binaryPath: r.exitCode === 0 ? path.join(dir, 'main') : undefined, timeMs: r.timeMs };
}

async function runProgram(dir: string, kind: 'cpp' | 'python', stdin: string, wallMs: number, memMB: number): Promise<RunOneResult> {
  const r = kind === 'cpp' ? await runOnce(['./main'], dir, stdin, wallMs, memMB, Math.ceil(wallMs / 1000) + 2)
    : await runOnce([process.env.PYTHON_BIN || 'python3', '-I', 'main.py'], dir, stdin, wallMs, memMB, Math.ceil(wallMs / 1000) + 2);
  resetJobDir(dir);   // nothing a program wrote is visible to the next test of the same submission
  return r;
}

interface TestSpec { input: string; expected: string; hidden?: boolean }
interface SubmitBody {
  language: 'cpp17' | 'cpp20' | 'python' | 'sql';
  code: string;
  tests: TestSpec[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
}
interface RunBody {
  language: 'cpp17' | 'cpp20' | 'python' | 'sql';
  code: string;
  stdin?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

async function prepareJob(language: string, code: string): Promise<{ dir: string; kind: 'cpp' | 'python'; compile?: CompileResult }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'qfrun-'));
  if (language === 'cpp17' || language === 'cpp20') {
    const compile = await compileCpp(dir, code, language === 'cpp20' ? 'c++20' : 'c++17');
    return { dir, kind: 'cpp', compile };
  }
  // python
  writeFileSync(path.join(dir, 'main.py'), code);
  // syntax stage: compile() only, the learner's code is NOT executed here
  const r = await runOnce([process.env.PYTHON_BIN || 'python3', '-I', '-c', "import sys\ntry:\n    compile(open('main.py', encoding='utf-8').read(), 'main.py', 'exec')\nexcept SyntaxError as e:\n    sys.stderr.write(type(e).__name__ + ': ' + str(e.msg) + ' (line ' + str(e.lineno) + ')\\n'); sys.exit(3)"], dir, '', 10000, 256, 12);
  return { dir, kind: 'python', compile: { ok: r.exitCode !== 3, stderr: r.exitCode === 3 ? r.stderr : '', timeMs: r.timeMs } };
}

Bun.serve({
  maxRequestBodySize: MAX_BODY_BYTES,
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/health') {
      return Response.json({ ok: true, active, admission: { memBudgetMb: MEM_BUDGET_MB, reservedMb, queued: waiters.length, maxQueue: MAX_QUEUE, maxConcurrent: MAX_CONCURRENT, maxBodyBytes: MAX_BODY_BYTES }, sandbox: { requested: SANDBOX_REQUESTED, active: SANDBOX_ACTIVE, detail: SANDBOX_PROBE }, toolchain: { ...TOOLCHAIN, baseline: 'Python >= 3.12 and g++ >= 12.4', pythonMeetsBaseline: BASELINE.python, gppMeetsBaseline: BASELINE.gpp } });
    }
    if (req.method === 'POST' && (url.pathname === '/submit' || url.pathname === '/run')) {
      let body: SubmitBody | RunBody;
      if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return Response.json({ error: 'request too large', maxBytes: MAX_BODY_BYTES }, { status: 413 });
      try {
        body = await req.json();
      } catch {
        return Response.json({ error: 'invalid JSON body' }, { status: 400 });
      }
      if (!body || typeof body.code !== 'string') return Response.json({ error: 'missing code' }, { status: 400 });
      if (Buffer.byteLength(body.code, 'utf8') > MAX_CODE_BYTES) return Response.json({ error: 'code too large' }, { status: 413 });
      // Input over the cap is REJECTED (non-verdict), never silently truncated: a truncated input would turn a correct program into a wrong answer.
      const bigIn = (v: unknown) => typeof v === 'string' && Buffer.byteLength(v, 'utf8') > MAX_STDIN_BYTES;
      const anyBody = body as unknown as { stdin?: unknown; tests?: { input?: unknown }[] };
      if (bigIn(anyBody.stdin) || (Array.isArray(anyBody.tests) && anyBody.tests.some((t) => bigIn(t?.input)))) return Response.json({ error: 'stdin-too-large', maxBytes: MAX_STDIN_BYTES }, { status: 413 });
      const language = (body as SubmitBody).language;
      if (!['cpp17', 'cpp20', 'python', 'sql'].includes(language)) return Response.json({ error: 'unsupported language' }, { status: 400 });
      if (language === 'sql') return Response.json({ error: 'sql execution is not enabled in this deployment' }, { status: 400 });

      const timeLimitMs = Math.min(Math.max((body as SubmitBody).timeLimitMs ?? 4000, 500), 15000);
      const memoryLimitMb = Math.min(Math.max((body as SubmitBody).memoryLimitMb ?? 256, 64), 1024);

      let result: unknown;
      try { result = await withSlot(async () => {
        const { dir, kind, compile } = await prepareJob(language, body.code);
        try {
          if (compile && !compile.ok) {
            return { compile: { ok: false, stderr: compile.stderr.slice(0, 16000), timeMs: compile.timeMs }, results: [] as unknown[], verdict: 'compile_error' };
          }
          if (url.pathname === '/run') {
            const stdin = (body as RunBody).stdin ?? '';
            const r = await runProgram(dir, kind, stdin, timeLimitMs, memoryLimitMb);
            return {
              compile: compile ? { ok: compile.ok, stderr: compile.stderr.slice(0, 16000), timeMs: compile.timeMs } : { ok: true, stderr: '', timeMs: 0 },
              run: { stdout: r.actual.slice(0, MAX_DISPLAY_BYTES), stdoutTruncated: r.actual.length > MAX_DISPLAY_BYTES, stderr: r.stderr.slice(0, 16000), exitCode: r.exitCode, timedOut: r.timedOut, timeMs: r.timeMs, killedByLimit: r.killedByLimit },
              verdict: r.timedOut ? 'timeout' : r.killedByLimit ? 'output_limit' : r.exitCode === 0 ? 'ok' : 'runtime_error',
            };
          }
          // /submit — judge against tests
          const tests = (body as SubmitBody).tests ?? [];
          if (!Array.isArray(tests) || tests.length === 0) return Response.json({ error: 'no tests' }, { status: 400 });
          const results: Record<string, unknown>[] = [];
          let passed = 0;
          let totalMs = 0;
          let early: 'timeout' | 'output_limit' | null = null;
          for (let i = 0; i < tests.length; i++) {
            if (early) { results.push({ index: i, skipped: true }); continue; }
            const r = await runProgram(dir, kind, tests[i].input ?? '', timeLimitMs, memoryLimitMb);
            totalMs += r.timeMs;
            const ok = !r.timedOut && !r.killedByLimit && r.exitCode === 0 && normalize(r.actual) === normalize(tests[i].expected ?? '');
            if (ok) passed++;
            if (r.timedOut) early = 'timeout';
            if (r.killedByLimit) early = 'output_limit';
            results.push({
              index: i,
              passed: ok,
              timedOut: r.timedOut,
              killedByLimit: r.killedByLimit,
              exitCode: r.exitCode,
              timeMs: r.timeMs,
              hidden: !!tests[i].hidden,
              // hidden tests report only the verdict: no expected output, actual output or stderr
              ...(tests[i].hidden ? {} : {
                stderr: r.stderr.slice(0, 4000),
                actual: r.actual.slice(0, 8000),
                expected: (tests[i].expected ?? '').slice(0, 8000),
              }),
            });
          }
          const verdict = early === 'timeout' ? 'timeout' : early === 'output_limit' ? 'output_limit' : passed === tests.length ? 'passed' : 'failed';
          return {
            compile: compile ? { ok: compile.ok, stderr: compile.stderr.slice(0, 16000), timeMs: compile.timeMs } : { ok: true, stderr: '', timeMs: 0 },
            results, passed, total: tests.length, totalMs, verdict,
          };
        } finally {
          try { rmSync(dir, { recursive: true, force: true }); } catch {}
        }
      }, memoryLimitMb); } catch (e) { if (e instanceof Busy) return Response.json({ error: 'busy' }, { status: 503 }); throw e; }
      return Response.json(result);
    }
    return Response.json({ error: 'not found' }, { status: 404 });
  },
});

console.log(`code-runner listening on ${HOST}:${PORT}`);
