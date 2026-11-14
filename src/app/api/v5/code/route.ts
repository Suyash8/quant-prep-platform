import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, rateLimit } from '@/lib/auth';
import { runnerPost, judgeRuntimeStatus } from '@/lib/runner-client';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';
type P = { id: string; tests: { input: string; expected: string; hidden?: boolean }[]; limits: Record<string, { timeLimitMs: number; memoryLimitMb: number; provisional?: boolean } | undefined>; checker?: unknown };
const cache = new Map<string, P>();
/** Server-only per-problem file (generated at build; tests can be several MB each). Strict id pattern, small cache, never sent to a client. */
function loadProblem(id: string | undefined): P | undefined {
  if (!id || !/^qfp-[a-z0-9-]+$/.test(id)) return undefined;
  const hit = cache.get(id); if (hit) return hit;
  try { const p = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/v5/server-problems', id + '.json'), 'utf8')) as P; if (p.id !== id) return undefined; cache.set(id, p); if (cache.size > 3) cache.delete(cache.keys().next().value as string); return p; } catch { return undefined; }
}
import readiness from '../../../../../content-v5/_build/code-readiness.json';
const READY_ALL: Record<string, string[]> = { ...(readiness.production as Record<string, string[]>), ...(process.env.QF_V5_CODE_DEV === '1' ? (readiness.devTestOnly as Record<string, string[]>) : {}) };
// QF_V5_READY_ONLY=id1,id2 can only NARROW the list (a test hook for the not-ready 403 path); it can never add a problem.
const READY_ONLY = process.env.QF_V5_READY_ONLY ? new Set(process.env.QF_V5_READY_ONLY.split(',')) : null;
const READY: Record<string, string[]> = READY_ONLY ? Object.fromEntries(Object.entries(READY_ALL).filter(([id]) => READY_ONLY.has(id))) : READY_ALL;   // problemId -> languages approved for judging. FAIL CLOSED: absent = not judged. devTestOnly is active only with QF_V5_CODE_DEV=1.
const MAX_STDIN_BYTES = 4 * 1024 * 1024, MAX_CUSTOM_STDIN_BYTES = 64 * 1024;
const NO_STORE = { 'Cache-Control': 'no-store' };

/** GET -> which problem/language pairs the server will judge right now. Fail closed: absent means not open. Non-sensitive, no account needed. */
export async function GET() { const rt = await judgeRuntimeStatus(); return NextResponse.json({ ready: rt.ok ? READY : {}, devTestOnly: process.env.QF_V5_CODE_DEV === '1', runtimeBlocked: rt.ok ? undefined : rt.reason }, { headers: NO_STORE }); }

/** POST { action: 'run'|'check', problemId, language: 'python'|'cpp', source, stdin? }
 *  run   = run the learner's program on the learner's own input; reports output only, never a correctness verdict.
 *  check = server runs every test (the server supplies tests; hidden ones are never revealed) and returns counts and a verdict.
 *  Neither awards XP or mastery: canonical progress comes only from verified attempt events. A passing check is deterministic correctness only,
 *  not proof the learner worked alone. Account-bound like /api/v5/attempts. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ state: 'signed-out', error: 'Sign in to run code.' }, { status: 401, headers: NO_STORE });
  const claimed = req.headers.get('x-qf-account');
  if (!claimed) return NextResponse.json({ error: 'Missing account header.' }, { status: 400, headers: NO_STORE });
  if (claimed !== user.id) return NextResponse.json({ state: 'account-mismatch', error: 'account-mismatch' }, { status: 409, headers: NO_STORE });
  if (!rateLimit(`v5code:${user.id}`, 12, 0.25)) return NextResponse.json({ state: 'rate-limited', error: 'You are running code too fast. Wait a moment.' }, { status: 429, headers: NO_STORE });
  const body = await req.json().catch(() => null) as { action?: string; problemId?: string; language?: string; source?: string; stdin?: string; publicSha?: string } | null;
  const problem = loadProblem(body?.problemId);
  if (!body || !['run', 'check'].includes(body.action ?? '') || typeof body.source !== 'string' || !body.source.trim() || body.source.length > 131072 || !['python', 'cpp'].includes(body.language ?? '')) return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: NO_STORE });
  if (!problem) return NextResponse.json({ state: 'unknown-problem', error: 'Unknown problem.' }, { status: 404, headers: NO_STORE });
  const lang = body.language as 'python' | 'cpp';
  { const rt = await judgeRuntimeStatus(); if (!rt.ok) return NextResponse.json({ state: 'runtime-unavailable', error: 'Code execution is not available right now. Nothing was run or judged and this is not counted as incorrect.', reason: rt.reason }, { status: 503, headers: NO_STORE }); }
  if (!(READY[problem.id] ?? []).includes(lang)) return NextResponse.json({ state: 'not-ready', error: 'This problem is not open for running or judging in this language yet.' }, { status: 403, headers: NO_STORE });
  // Judging binds to the exact public problem version the learner saw: a different (or missing) version is never graded against the current hidden tests.
  if (body.action === 'check' && (problem as { publicSha?: string }).publicSha !== body.publicSha) return NextResponse.json({ state: 'problem-changed', error: 'This problem was updated. Nothing was judged. Reload to get the current version.' }, { status: 409, headers: NO_STORE });
  if (typeof body.stdin === 'string' && Buffer.byteLength(body.stdin, 'utf8') > MAX_CUSTOM_STDIN_BYTES) return NextResponse.json({ state: 'input-too-large', error: 'Your input is too large to run here.', maxBytes: MAX_CUSTOM_STDIN_BYTES }, { status: 413, headers: NO_STORE });
  if (body.action === 'check' && problem.tests.some((t) => Buffer.byteLength(t.input, 'utf8') > MAX_STDIN_BYTES)) return NextResponse.json({ state: 'runner-error', error: 'A test input exceeds the runner limit. Nothing was judged.' }, { status: 502, headers: NO_STORE });
  const lim = problem.limits?.[lang];
  if (!lim) return NextResponse.json({ state: 'language-unavailable', error: 'This problem has no measured limits for that language yet.' }, { status: 422, headers: NO_STORE });
  const runnerLang = lang === 'cpp' ? 'cpp17' : 'python';
  try {
    if (body.action === 'run') {
      const stdin = typeof body.stdin === 'string' ? body.stdin : (problem.tests.find((t) => !t.hidden)?.input ?? '');
      const out = await runnerPost<{ compile?: { ok: boolean; stderr: string }; run?: { stdout: string; stderr: string; exitCode: number; timedOut: boolean; timeMs: number }; verdict: string }>('/run', { language: runnerLang, code: body.source, stdin, timeLimitMs: Math.max(lim.timeLimitMs, 4000), memoryLimitMb: lim.memoryLimitMb });
      return NextResponse.json({ state: 'ran', verdict: out.verdict, compile: out.compile, run: out.run, stdinUsed: stdin.length > 2000 ? stdin.slice(0, 2000) + '…' : stdin }, { headers: NO_STORE });
    }
    const out = await runnerPost<{ verdict: string; passed?: number; results?: { index: number; passed?: boolean; skipped?: boolean; actual?: string }[]; compile?: { ok: boolean; stderr: string } }>('/submit', { language: runnerLang, code: body.source, tests: problem.tests.map((t) => ({ input: t.input, expected: t.expected, hidden: !!t.hidden })), timeLimitMs: lim.timeLimitMs, memoryLimitMb: lim.memoryLimitMb });
    const total = problem.tests.length; const failedIdx = (out.results ?? []).find((r) => r.passed === false)?.index;
    const shown = failedIdx !== undefined && !problem.tests[failedIdx]?.hidden ? { index: failedIdx, input: problem.tests[failedIdx].input, expected: problem.tests[failedIdx].expected, actual: (out.results ?? []).find((r) => r.index === failedIdx)?.actual ?? '' } : undefined;
    return NextResponse.json({ state: 'checked', verdict: out.verdict, passed: out.passed ?? 0, total, hiddenFailure: failedIdx !== undefined && !shown, firstFailure: shown, compile: out.compile, limitsProvisional: !!lim.provisional, awardsProgress: false }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.startsWith('RUNNER_ERROR:413')) return NextResponse.json({ state: 'input-too-large', error: 'An input exceeds the runner limit. Nothing was judged.' }, { status: 413, headers: NO_STORE });
    if (msg.startsWith('RUNNER_UNAVAILABLE')) return NextResponse.json({ state: 'runtime-unavailable', error: 'Code execution is not available right now. Nothing was judged and this is not counted as incorrect.' }, { status: 503, headers: NO_STORE });
    return NextResponse.json({ state: 'runner-error', error: 'The code runner failed. Nothing was judged.' }, { status: 502, headers: NO_STORE });
  }
}
