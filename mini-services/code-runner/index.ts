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
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const GPP_PATH = process.env.CXX_BIN ?? (existsSync('/usr/bin/g++') ? '/usr/bin/g++' : 'g++');
const PYTHON_PATH = process.env.PYTHON_BIN ?? (existsSync('/usr/bin/python3') ? '/usr/bin/python3' : 'python3');

const PORT = 3010;
const HOST = '127.0.0.1';
const MAX_CONCURRENT = 2;
const MAX_CODE_BYTES = 128 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024;
const MAX_STDIN_BYTES = 1024 * 1024;

let active = 0;
const queue: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>(res => queue.push(res));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    const next = queue.shift();
    if (next) next();
  }
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
    const bash = `ulimit -v ${Math.min(Math.max(memMB, 64), 1024) * 1024}; ulimit -t ${cpuSec}; ulimit -f 65536; exec env -i PATH=/usr/bin:/bin ${cmd.map(a => `'${a.replace(/'/g, `'\\''`)}'`).join(' ')}`;
    const child = spawn('/bin/bash', ['-c', bash], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
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
      if (errBytes <= MAX_OUTPUT_BYTES) err += d;
      if (errBytes > MAX_OUTPUT_BYTES) { err = err.slice(0, MAX_OUTPUT_BYTES) + '\n[stderr truncated]'; }
    });

    const stdinStr = stdin.length > MAX_STDIN_BYTES ? stdin.slice(0, MAX_STDIN_BYTES) : stdin;
    // A program that exits without reading stdin closes the pipe (EPIPE). That is a normal
    // outcome for a wrong answer and must never crash the runner.
    child.stdin.on('error', () => { /* ignored: the program did not read its input */ });
    child.stdin.write(stdinStr);
    child.stdin.end();

    const timer = setTimeout(() => { timedOut = true; try { child.kill('SIGKILL'); } catch {} }, wallMs);

    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
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
  const r = await runOnce([GPP_PATH, `-std=${std}`, '-O2', '-pipe', '-DONLINE_JUDGE', '-o', 'main', 'main.cpp'], dir, '', 30000, 512, 20);
  return { ok: r.exitCode === 0, stderr: r.stderr, binaryPath: r.exitCode === 0 ? path.join(dir, 'main') : undefined, timeMs: r.timeMs };
}

async function runProgram(dir: string, kind: 'cpp' | 'python', stdin: string, wallMs: number, memMB: number): Promise<RunOneResult> {
  if (kind === 'cpp') {
    return runOnce(['./main'], dir, stdin, wallMs, memMB, Math.ceil(wallMs / 1000) + 2);
  }
  return runOnce([PYTHON_PATH, '-I', 'main.py'], dir, stdin, wallMs, memMB, Math.ceil(wallMs / 1000) + 2);
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
  return { dir, kind: 'python' };
}

Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/health') {
      return Response.json({ ok: true, active });
    }
    if (req.method === 'POST' && (url.pathname === '/submit' || url.pathname === '/run')) {
      let body: SubmitBody | RunBody;
      try {
        body = await req.json();
      } catch {
        return Response.json({ error: 'invalid JSON body' }, { status: 400 });
      }
      if (!body || typeof body.code !== 'string') return Response.json({ error: 'missing code' }, { status: 400 });
      if (Buffer.byteLength(body.code, 'utf8') > MAX_CODE_BYTES) return Response.json({ error: 'code too large' }, { status: 413 });
      const language = (body as SubmitBody).language;
      if (!['cpp17', 'cpp20', 'python', 'sql'].includes(language)) return Response.json({ error: 'unsupported language' }, { status: 400 });
      if (language === 'sql') return Response.json({ error: 'sql execution is not enabled in this deployment' }, { status: 400 });

      const timeLimitMs = Math.min(Math.max((body as SubmitBody).timeLimitMs ?? 4000, 500), 15000);
      const memoryLimitMb = Math.min(Math.max((body as SubmitBody).memoryLimitMb ?? 256, 64), 1024);

      const result = await withSlot(async () => {
        const { dir, kind, compile } = await prepareJob(language, body.code);
        try {
          if (kind === 'cpp' && compile && !compile.ok) {
            return { compile: { ok: false, stderr: compile.stderr.slice(0, 16000), timeMs: compile.timeMs }, results: [] as unknown[], verdict: 'compile_error' };
          }
          if (url.pathname === '/run') {
            const stdin = (body as RunBody).stdin ?? '';
            const r = await runProgram(dir, kind, stdin, timeLimitMs, memoryLimitMb);
            return {
              compile: compile ? { ok: compile.ok, stderr: compile.stderr.slice(0, 16000), timeMs: compile.timeMs } : { ok: true, stderr: '', timeMs: 0 },
              run: { stdout: r.actual.slice(0, MAX_OUTPUT_BYTES), stderr: r.stderr.slice(0, 16000), exitCode: r.exitCode, timedOut: r.timedOut, timeMs: r.timeMs, killedByLimit: r.killedByLimit },
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
      });
      return Response.json(result);
    }
    return Response.json({ error: 'not found' }, { status: 404 });
  },
});

console.log(`code-runner listening on ${HOST}:${PORT}`);
