/** Client adapter for /api/v5/code. Pure request/response mapping, no UI and no store writes:
 *  running or checking code never creates an attempt, XP or mastery. Every outcome that is NOT a judged result is a distinct non-verdict phase,
 *  so "could not run" is never shown as "incorrect". */
export type CodeAction = 'run' | 'check';
export type CodeRunState =
  | { phase: 'running'; action: CodeAction }
  | { phase: 'ran'; verdict: string; compile?: { ok: boolean; stderr: string }; run?: { stdout: string; stdoutTruncated?: boolean; stderr: string; exitCode: number; timedOut: boolean; timeMs: number }; stdinUsed: string }
  | { phase: 'checked'; verdict: string; passed: number; total: number; hiddenFailure: boolean; firstFailure?: { index: number; input: string; expected: string; actual: string }; compile?: { ok: boolean; stderr: string }; limitsProvisional: boolean }
  | { phase: 'offline' }                 // no connection: nothing was run. Live code execution needs a connection.
  | { phase: 'cancelled' }               // the caller aborted: nothing was judged, not an error
  | { phase: 'connection-failed' }       // browser says online but the request did not complete: nothing was judged, try again. NOT 'offline'
  | { phase: 'signed-out' }
  | { phase: 'problem-changed' }        // the server has a newer version of this problem than the one on screen: nothing was judged
  | { phase: 'account-changed' }         // session is another account: nothing was run
  | { phase: 'not-ready' }               // problem/language not open for judging (server-enforced)
  | { phase: 'runtime-unavailable' }     // runner down: NOT incorrect
  | { phase: 'rate-limited' }
  | { phase: 'input-too-large' }
  | { phase: 'language-unavailable' }
  | { phase: 'error'; message: string }; // invalid request, runner failure, unexpected response: nothing was judged

export async function runCodeV5(a: { accountId: string | null; problemId: string; language: 'python' | 'cpp'; source: string; action: CodeAction; stdin?: string; publicSha?: string; signal?: AbortSignal; fetchImpl?: typeof fetch; baseUrl?: string }): Promise<Exclude<CodeRunState, { phase: 'running' }>> {
  if (!a.accountId) return { phase: 'signed-out' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { phase: 'offline' };
  const f = a.fetchImpl ?? fetch;
  let r: Response;
  try { r = await f(`${a.baseUrl ?? ''}/api/v5/code`, { method: 'POST', credentials: 'same-origin', signal: a.signal, headers: { 'content-type': 'application/json', 'x-qf-account': a.accountId }, body: JSON.stringify({ action: a.action, problemId: a.problemId, ...(a.publicSha ? { publicSha: a.publicSha } : {}), language: a.language, source: a.source, ...(a.stdin !== undefined ? { stdin: a.stdin } : {}) }) }); }
  catch { if (a.signal?.aborted) return { phase: 'cancelled' }; if (typeof navigator !== 'undefined' && navigator.onLine === false) return { phase: 'offline' }; return { phase: 'connection-failed' }; }
  const j = (await r.json().catch(() => null)) as Record<string, unknown> | null;
  const st = typeof j?.state === 'string' ? j.state : '';
  if (r.status === 401) return { phase: 'signed-out' };
  if (r.status === 409 && st === 'problem-changed') return { phase: 'problem-changed' };
  if (r.status === 409) return { phase: 'account-changed' };
  if (r.status === 429) return { phase: 'rate-limited' };
  if (r.status === 403 && st === 'not-ready') return { phase: 'not-ready' };
  if (r.status === 413) return { phase: 'input-too-large' };
  if (r.status === 422 && st === 'language-unavailable') return { phase: 'language-unavailable' };
  if (r.status === 503 && st === 'runtime-unavailable') return { phase: 'runtime-unavailable' };
  if (r.ok && st === 'ran' && typeof j?.verdict === 'string') return { phase: 'ran', verdict: j.verdict, compile: j.compile as never, run: j.run as never, stdinUsed: String(j.stdinUsed ?? '') };
  if (r.ok && st === 'checked' && typeof j?.verdict === 'string' && typeof j.passed === 'number' && typeof j.total === 'number') return { phase: 'checked', verdict: j.verdict, passed: j.passed, total: j.total, hiddenFailure: !!j.hiddenFailure, firstFailure: j.firstFailure as never, compile: j.compile as never, limitsProvisional: !!j.limitsProvisional };
  return { phase: 'error', message: typeof j?.error === 'string' ? j.error : 'No usable result was received. Your code is still here; try again.' };
}
