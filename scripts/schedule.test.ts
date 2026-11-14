import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule, newCard, outcomeFromVerdict } from '../src/lib/v5/schedule';
test('scheduler is deterministic and bounded', () => {
  const t = 1_000_000; let c = newCard(t);
  c = schedule(c, 'good', t); assert.equal(c.interval, 1);
  c = schedule(c, 'good', t); assert.equal(c.interval, 3);
  c = schedule(c, 'good', t); assert.ok(c.interval >= 7);
  assert.deepEqual(schedule(newCard(t), 'good', t), schedule(newCard(t), 'good', t));
  const lapsed = schedule(c, 'again', t); assert.equal(lapsed.interval, 0); assert.equal(lapsed.lapses, 1); assert.ok(lapsed.ease >= 1.3);
  let big = newCard(t); for (let i = 0; i < 40; i++) big = schedule(big, 'easy', t); assert.ok(big.interval <= 365);
  let low = newCard(t); for (let i = 0; i < 30; i++) low = schedule(low, 'again', t); assert.equal(low.ease, 1.3);
});
test('only graded verdicts schedule', () => {
  assert.equal(outcomeFromVerdict('correct'), 'good'); assert.equal(outcomeFromVerdict('incorrect'), 'again');
  for (const v of ['needs-review', 'not-assessed', 'invalid', 'pending', 'runtime-unavailable']) assert.equal(outcomeFromVerdict(v), null);
});
