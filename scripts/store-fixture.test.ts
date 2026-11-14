import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFixtureStore } from '../src/lib/v5/store.fixture';
const q: any = { id: 'q1', revision: 2, conceptIds: ['qf5-x.a'], prompt: '', explanation: '', teachingRefs: [], kind: 'choice', selectionMode: 'one', shuffle: true, options: [{ id: 'a', text: '', why: '' }, { id: 'b', text: '', why: '' }], correct: ['a'] };
test('fixture: offline attempt is local, schedules review, resolves exact revision, verify only via explicit call', async () => {
  let t = 1000; const s = createFixtureStore([{ packSha: 'sha1', q }], { now: () => t });
  const r = { kind: 'choice' as const, selected: ['b'] };
  const res = s.gradeLocal(q, r); assert.equal(res.verdict, 'incorrect');
  const rc = await s.submitAttempt({ eventId: 'e1', questionId: 'q1', revision: 2, packSha: 'sha1', response: r, clientResult: res, hintsUsed: 0, startedAt: 0, answeredAt: t });
  assert.equal(rc.status, 'local'); assert.equal(s.getSnapshot().pending, 1); assert.equal(s.getSnapshot().verified, undefined);
  assert.equal((await s.submitAttempt({ eventId: 'e1', questionId: 'q1', revision: 2, packSha: 'sha1', response: r, clientResult: res, hintsUsed: 0, startedAt: 0, answeredAt: t })).eventId, 'e1');
  assert.equal(s.getSnapshot().pending, 1);
  t += 11 * 60_000; const due = await s.getDueReviews(t); assert.equal(due.length, 1); assert.equal(due[0].packSha, 'sha1'); assert.equal(due[0].question.revision, 2);
  s.fixtureVerify('e1', { ...res, graderVersion: 'srv' }); assert.equal((await s.getReceipts({ questionId: 'q1' }))[0].receipt.status, 'verified');
});
