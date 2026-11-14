import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processAttempt, validateEvent } from '../src/lib/v5/server-attempt';
const q: any = { id: 'q1', revision: 2, conceptIds: ['c'], prompt: '', explanation: '', teachingRefs: [], kind: 'choice', selectionMode: 'one', shuffle: true, options: [{ id: 'a', text: '', why: '' }, { id: 'b', text: '', why: '' }], correct: ['a'] };
const mk = () => { const rows = new Map<string, any>(); return { rows, deps: {
  findExisting: async (u: string, id: string) => rows.get(u + id) ?? null,
  resolveQuestion: async (sha: string, id: string) => (sha === 'sha1' && id === 'q1' ? q : undefined),
  save: async (u: string, e: any, row: any) => { rows.set(u + e.eventId, row); } } }; };
const ev = (over: any = {}) => ({ eventId: 'e1', questionId: 'q1', revision: 2, packSha: 'sha1', response: { kind: 'choice', selected: ['a'] }, clientResult: { verdict: 'correct', graderVersion: 'x', contentRevision: 2 }, hintsUsed: 0, startedAt: 0, answeredAt: 0, ...over });
test('verified when server agrees; idempotent; server decides, not the client', async () => {
  const { deps, rows } = mk();
  const r = await processAttempt(deps, 'u1', ev() as any); assert.equal(r.status, 'verified');
  const r2 = await processAttempt(deps, 'u1', ev({ clientResult: { verdict: 'incorrect' } }) as any); assert.equal(r2.status, 'verified'); assert.equal(rows.size, 1);
  const lie = await processAttempt(deps, 'u1', ev({ eventId: 'e2', response: { kind: 'choice', selected: ['b'] } }) as any);
  assert.equal(lie.status, 'disputed'); assert.equal(lie.serverVerdict?.verdict, 'incorrect');
});
test('unknown pack/revision is version-unavailable, never graded against latest', async () => {
  const { deps } = mk();
  assert.equal((await processAttempt(deps, 'u1', ev({ packSha: 'old' }) as any)).status, 'version-unavailable');
  assert.equal((await processAttempt(deps, 'u1', ev({ eventId: 'e3', revision: 1 }) as any)).status, 'version-unavailable');
});
test('invalid events rejected without storing', async () => {
  const { deps, rows } = mk();
  assert.equal((await processAttempt(deps, 'u1', { eventId: '' } as any)).status, 'invalid-event');
  assert.equal(validateEvent(ev({ response: { kind: 'shortText', text: 'x'.repeat(30000) } })), 'response too large');
  assert.equal(rows.size, 0);
});
test('same eventId from another user is separate', async () => {
  const { deps, rows } = mk(); await processAttempt(deps, 'u1', ev() as any); await processAttempt(deps, 'u2', ev() as any); assert.equal(rows.size, 2);
});
test('conflict detection: choose-many order is not semantic, a different selection or other ordered content is', async () => {
  const qm: any = { ...q, id: 'qm', selectionMode: 'many', correct: ['a', 'b'], options: [{ id: 'a', text: '', why: '' }, { id: 'b', text: '', why: '' }, { id: 'c', text: '', why: '' }] };
  const rows = new Map<string, any>();
  const deps: any = { findExisting: async (u: string, id: string) => rows.get(u + id) ?? null, resolveQuestion: async (sha: string, id: string) => (sha === 'sha1' && id === 'qm' ? qm : undefined),
    save: async (u: string, e: any, row: any) => { rows.set(u + e.eventId, { ...row, payload: { questionId: e.questionId, revision: e.revision, packSha: e.packSha, response: e.response } }); } };
  const m = (sel: string[], over: any = {}) => ({ ...ev({ eventId: 'm1', questionId: 'qm', response: { kind: 'choice', selected: sel }, ...over }) });
  const first = await processAttempt(deps, 'u1', m(['a', 'b']) as any); assert.notEqual(first.status, 'conflict');
  assert.equal((await processAttempt(deps, 'u1', m(['b', 'a']) as any)).status, first.status);
  assert.equal((await processAttempt(deps, 'u1', m(['a']) as any)).status, 'conflict');
  assert.equal((await processAttempt(deps, 'u1', m(['a', 'b'], { revision: 3 }) as any)).status, 'conflict');
});
