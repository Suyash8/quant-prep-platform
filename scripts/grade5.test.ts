import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grade, patternProblem, shuffleIds, parseNumber, validateShortText } from '../src/lib/grade5/index';
const base = { id: 'q1', revision: 3, conceptIds: ['c'], prompt: 'p', explanation: 'e', teachingRefs: [] };
const mcq: any = { ...base, kind: 'choice', selectionMode: 'one', shuffle: true, options: [{ id: 'a', text: '', why: '' }, { id: 'b', text: '', why: '' }, { id: 'c', text: '', why: '' }], correct: ['b'], misconceptionFeedback: [{ optionId: 'a', text: 'Not a.' }] };
test('choice: ids, validity, feedback, revision stamped', () => {
  assert.equal(grade(mcq, { kind: 'choice', selected: ['b'] }).verdict, 'correct');
  const w = grade(mcq, { kind: 'choice', selected: ['a'] });
  assert.equal(w.verdict, 'incorrect'); assert.equal(w.feedback, 'Not a.'); assert.equal(w.contentRevision, 3);
  assert.equal(grade(mcq, { kind: 'choice', selected: ['z'] }).verdict, 'invalid');
  assert.equal(grade(mcq, { kind: 'choice', selected: ['a', 'b'] }).verdict, 'invalid');
  assert.equal(grade(mcq, { kind: 'choice', selected: [] }).verdict, 'invalid');
  assert.equal(grade(mcq, { kind: 'numeric', raw: '1' }).verdict, 'invalid');
  const multi = { ...mcq, selectionMode: 'many', correct: ['a', 'b'] };
  assert.equal(grade(multi, { kind: 'choice', selected: ['b', 'a'] }).verdict, 'correct');
  assert.equal(grade(multi, { kind: 'choice', selected: ['a', 'a'] }).verdict, 'invalid');
});
test('numeric: tolerance, units, non-finite', () => {
  const q: any = { ...base, kind: 'numeric', answer: 100, relTol: 0.01, units: ['bps', '%'] };
  assert.equal(grade(q, { kind: 'numeric', raw: '100.9', unit: '%' }).verdict, 'correct');
  assert.equal(grade(q, { kind: 'numeric', raw: '102', unit: '%' }).verdict, 'incorrect');
  const nu = grade(q, { kind: 'numeric', raw: '100' }); assert.equal(nu.verdict, 'invalid'); assert.equal(nu.feedback, 'Check the unit.');
  assert.equal(grade(q, { kind: 'numeric', raw: '100', unit: 'USD' }).verdict, 'invalid');
  assert.equal(grade(q, { kind: 'numeric', raw: 'NaN', unit: '%' }).verdict, 'invalid');
  assert.equal(grade(q, { kind: 'numeric', raw: '', unit: '%' }).verdict, 'invalid');
  assert.ok(Number.isNaN(parseNumber('0x10')));
});
const st: any = { ...base, kind: 'shortText', normalize: ['lower', 'trim', 'collapseWs'], accepted: [{ type: 'regex', pattern: 'o\\(n log n\\)' }, { type: 'numeric', pattern: '-0.5' }], rejected: [{ type: 'regex', pattern: 'o\\(n\\^2\\)', hint: 'That is the worst case.' }],
  fixtures: [{ response: ' O(n  log n) ', expect: 'correct' }, { response: 'it is O(n log n) always', expect: 'needs-review' }, { response: 'O(n^2)', expect: 'incorrect' }] };
test('parseNumber: strict grammar, separators only as thousands groups', () => {
  for (const bad of ['6,21', '1,2,3', '1,23', '12,34,567', ',5', '5,', '1,000,', '1e', '--1', '1 000', '0x10', '', ' ', 'Infinity', '1,000.', '٣'])
    assert.ok(Number.isNaN(parseNumber(bad)), `should reject: ${JSON.stringify(bad)}`);
  assert.equal(parseNumber('1,234'), 1234); assert.equal(parseNumber('1,234,567.5'), 1234567.5); assert.equal(parseNumber('-0.5'), -0.5);
  assert.equal(parseNumber(' 621 '), 621); assert.equal(parseNumber('1e3'), 1000); assert.equal(parseNumber('.5'), 0.5);
  assert.ok(Number.isNaN(parseNumber('6,21')) && Number.isNaN(parseNumber('1,2,3')));
});
test('shortText: full match, sign preserved, fixtures validate', () => {
  assert.equal(grade(st, { kind: 'shortText', text: ' O(n  log n) ' }).verdict, 'correct');
  assert.equal(grade(st, { kind: 'shortText', text: 'it is O(n log n) always' }).verdict, 'needs-review');   // unrecognised is never 'incorrect'
  assert.equal(grade(st, { kind: 'shortText', text: 'O(n^2)' }).hint, 'That is the worst case.');
  assert.equal(grade(st, { kind: 'shortText', text: '-0.5' }).verdict, 'correct');
  assert.equal(grade(st, { kind: 'shortText', text: '0.5' }).verdict, 'needs-review');
  const money: any = { ...base, kind: 'shortText', normalize: ['trim'], accepted: [{ type: 'exact', pattern: '£1,234.50' }], fixtures: [{ response: '£1,234.50', expect: 'correct' }, { response: '1234.5', expect: 'needs-review' }] };
  assert.equal(grade(money, { kind: 'shortText', text: '1234.50' }).verdict, 'needs-review');
  assert.equal(grade(money, { kind: 'shortText', text: '£1,234.50' }).verdict, 'correct');
  assert.deepEqual(validateShortText(money), []);
  assert.deepEqual(validateShortText(st), []);
  assert.ok(validateShortText({ ...st, fixtures: [{ response: 'zzz', expect: 'correct' }, { response: 'q', expect: 'incorrect' }] }).length > 0);
  assert.ok(validateShortText({ ...st, fixtures: [] }).length >= 2);
});
test('bad or ReDoS pattern: needs-review, bounded time, input cap', () => {
  assert.ok(patternProblem('(a+)+$')); assert.ok(patternProblem('(a)\\1')); assert.ok(patternProblem('(')); assert.equal(patternProblem('o\\(n\\)'), null);
  const q = { ...st, accepted: [{ type: 'regex', pattern: '(a+)+$' }], rejected: [] };
  const t0 = Date.now();
  assert.equal(grade(q, { kind: 'shortText', text: 'a'.repeat(40) + 'b' }).verdict, 'needs-review');
  assert.ok(Date.now() - t0 < 200);
  assert.equal(grade(st, { kind: 'shortText', text: 'a'.repeat(501) }).verdict, 'invalid');
});
test('ordered, reflection, code, shuffle', () => {
  const o: any = { ...base, kind: 'ordered', steps: [{ id: 'x', text: '' }, { id: 'y', text: '' }] };
  assert.equal(grade(o, { kind: 'ordered', stepIds: ['x', 'y'] }).verdict, 'correct');
  assert.equal(grade(o, { kind: 'ordered', stepIds: ['y', 'x'] }).verdict, 'incorrect');
  assert.equal(grade(o, { kind: 'ordered', stepIds: ['x', 'x'] }).verdict, 'invalid');
  assert.equal(grade({ ...base, kind: 'reflection', modelAnswer: '', criteria: [] } as any, { kind: 'reflection', text: 'long prose' }).verdict, 'not-assessed');
  assert.equal(grade({ ...base, kind: 'code', problemId: 'p' } as any, { kind: 'code', language: 'python', source: '' }).verdict, 'pending');
  const ids = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(shuffleIds(ids, 's1'), shuffleIds(ids, 's1'));
  assert.deepEqual([...shuffleIds(ids, 's')].sort(), ids);
});
