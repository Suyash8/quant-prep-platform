import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validate, publicLeaks } from './validate-v5';
const mk = (items: any[], lessons: any[] = []) => {
  const d = mkdtempSync(path.join(tmpdir(), 'v5-')); mkdirSync(path.join(d, 'curriculum')); mkdirSync(path.join(d, 'items')); mkdirSync(path.join(d, 'lessons'));
  cpSync('scripts/fixtures-v5/provisional-map.json', path.join(d, 'curriculum/map.json'));
  writeFileSync(path.join(d, 'items/b.json'), JSON.stringify(items)); lessons.forEach((l, i) => writeFileSync(path.join(d, `lessons/${i}.json`), JSON.stringify(l))); return d;
};
const good = { id: 'qa', revision: 1, kind: 'choice', selectionMode: 'one', shuffle: true, conceptIds: ['qf5-python-values-units.core'], prompt: '', explanation: '', teachingRefs: [], options: [{ id: 'a', text: 'x', why: 'w' }, { id: 'b', text: 'y', why: 'w' }], correct: ['a'] };
test('provisional map: valid ids, no cycles', () => { const r = validate(mk([good])); assert.deepEqual(r.errors, []); assert.ok(r.stats.lessonsInMap >= 90); });
test('flags unresolved concept, missing why, bad correct id, unknown check ref', () => {
  const bad = { ...good, id: 'qb', conceptIds: ['qf5-nope.core'], options: [{ id: 'a', text: 'x', why: '' }, { id: 'b', text: 'y', why: 'w' }], correct: ['z'] };
  const r = validate(mk([bad], [{ id: 'qf5-python-values-units', objectives: [], blocks: [{ type: 'check', id: 'b1', questionId: 'nope' }, { type: 'figure', id: 'f', alt: '', src: '' }] }]));
  for (const needle of ['unresolved concept', "no 'why'", 'not an option', 'unknown question', 'no alt text']) assert.ok(r.errors.some((e) => e.includes(needle)), needle);
});
test('balance rule fails a skewed 4-choice bank', () => {
  const skew = Array.from({ length: 24 }, (_, i) => ({ ...good, id: 'q' + i, options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: 't' + id, why: 'w' })), correct: ['b'] }));
  assert.ok(validate(mk(skew)).errors.some((e) => e.includes('4-choice balance')));
});
test('public pack leak check', () => {
  const a = { tests: [{ input: 'secret-input-123', expected: 'secret-out-456', hidden: true }], solutions: { python: 'def solve():\n    return 42 + 1', cpp: '' } };
  assert.deepEqual(publicLeaks(a, { visibleTests: [] }), []);
  assert.ok(publicLeaks(a, { note: 'secret-out-456' }).length > 0);
  assert.ok(publicLeaks(a, { solutions: {} }).length > 0);
});
