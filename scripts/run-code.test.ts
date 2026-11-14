import { test, expect } from 'bun:test';
import { runCodeV5 } from '../src/lib/v5/run-code';
const mk = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const base = { accountId: 'u1', problemId: 'p', language: 'python' as const, source: 'x', action: 'check' as const };
test('signed out never calls the server', async () => { let called = false; const r = await runCodeV5({ ...base, accountId: null, fetchImpl: (async () => { called = true; return new Response('{}'); }) as unknown as typeof fetch }); expect(r.phase).toBe('signed-out'); expect(called).toBe(false); });
test('fetch failure while online is connection-failed, never offline or incorrect', async () => { expect((await runCodeV5({ ...base, fetchImpl: (async () => { throw new Error('x'); }) as unknown as typeof fetch })).phase).toBe('connection-failed'); });
test('aborted request is cancelled', async () => { const c = new AbortController(); c.abort(); expect((await runCodeV5({ ...base, signal: c.signal, fetchImpl: (async () => { throw new DOMException('a', 'AbortError'); }) as unknown as typeof fetch })).phase).toBe('cancelled'); });
test('navigator offline is offline', async () => { (globalThis as any).navigator = { onLine: false }; try { expect((await runCodeV5({ ...base, fetchImpl: (async () => { throw new Error('x'); }) as unknown as typeof fetch })).phase).toBe('offline'); } finally { delete (globalThis as any).navigator; } });
test('status mapping', async () => {
  const cases: [number, unknown, string][] = [[401, { state: 'signed-out' }, 'signed-out'], [409, { state: 'account-mismatch' }, 'account-changed'], [429, {}, 'rate-limited'], [403, { state: 'not-ready' }, 'not-ready'], [413, { state: 'input-too-large' }, 'input-too-large'], [503, { state: 'runtime-unavailable' }, 'runtime-unavailable'], [502, { state: 'runner-error', error: 'boom' }, 'error'], [200, { weird: 1 }, 'error']];
  for (const [s, b, want] of cases) expect((await runCodeV5({ ...base, fetchImpl: mk(s, b) })).phase).toBe(want);
});
test('checked and ran map through; unavailable is never a verdict', async () => {
  const c = await runCodeV5({ ...base, fetchImpl: mk(200, { state: 'checked', verdict: 'failed', passed: 9, total: 10, hiddenFailure: true, limitsProvisional: true }) }); expect(c.phase).toBe('checked'); if (c.phase === 'checked') { expect(c.passed).toBe(9); expect(c.firstFailure).toBeUndefined(); }
  const u = await runCodeV5({ ...base, fetchImpl: mk(503, { state: 'runtime-unavailable', error: 'x' }) }); expect('verdict' in u).toBe(false);
  expect((await runCodeV5({ ...base, action: 'run', fetchImpl: mk(200, { state: 'ran', verdict: 'ok', run: { stdout: 'a', stderr: '', exitCode: 0, timedOut: false, timeMs: 1 }, stdinUsed: '' }) })).phase).toBe('ran');
});
