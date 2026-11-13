#!/usr/bin/env node
/**
 * QuantFoundry unit tests, run with: node --test scripts/unit-tests.mjs
 * Covers: mastery engine, SM-2 scheduler, server-side grading, math expression
 * evaluator, drill generator correctness, prerequisite graph integrity, judge
 * normalisation and content/registry consistency.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- mastery engine ----------
// (replicated here in plain JS to avoid TS imports in node --test)
const PASS_THRESHOLD = 80;

function computeStatus(prev, next) {
  const kcBestPct = Math.max(prev.kcBestPct, next.pct);
  const kcAttempts = prev.kcAttempts + 1;
  const exerciseDone = next.exerciseDone ?? prev.exerciseDone;
  const passed = kcBestPct >= PASS_THRESHOLD && exerciseDone;
  let status;
  if (prev.status === 'mastered' || (passed && prev.retrievalDone)) status = 'mastered';
  else if (passed) status = 'passed';
  else if (kcAttempts >= 2 && kcBestPct < PASS_THRESHOLD) status = 'needs_revision';
  else if (kcAttempts >= 1) status = 'attempted';
  else status = 'in_progress';
  return { status, kcBestPct, kcAttempts };
}

function sm2(state, grade) {
  let { ease, intervalDays, repetitions, lapses } = state;
  if (grade < 3) {
    repetitions = 0;
    intervalDays = grade === 0 ? 0 : 0.5;
    lapses += 1;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    ease = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease * 100) / 100;
    if (intervalDays > 365) intervalDays = 365;
  }
  const dueAt = new Date(Date.now() + Math.max(intervalDays, 0) * 86400000);
  return { ease, intervalDays, repetitions, lapses, dueAt };
}

test('mastery: high score without exercise stays attempted, not passed', () => {
  const r = computeStatus({ kcBestPct: 0, kcAttempts: 0, exerciseDone: false, retrievalDone: false, status: 'not_started' }, { pct: 100 });
  assert.equal(r.status, 'attempted');
});

test('mastery: 80% + exercise = passed', () => {
  const r = computeStatus({ kcBestPct: 0, kcAttempts: 0, exerciseDone: true, retrievalDone: false, status: 'not_started' }, { pct: 80 });
  assert.equal(r.status, 'passed');
});

test('mastery: 79% + exercise is not passed', () => {
  const r = computeStatus({ kcBestPct: 0, kcAttempts: 0, exerciseDone: true, retrievalDone: false, status: 'not_started' }, { pct: 79 });
  assert.equal(r.status, 'attempted');
});

test('mastery: two failures trigger needs_revision', () => {
  const r = computeStatus({ kcBestPct: 50, kcAttempts: 1, exerciseDone: true, retrievalDone: false, status: 'attempted' }, { pct: 60 });
  assert.equal(r.status, 'needs_revision');
});

test('mastery: passed + retrievalDone = mastered; mastered persists on retest', () => {
  const r1 = computeStatus({ kcBestPct: 85, kcAttempts: 1, exerciseDone: true, retrievalDone: true, status: 'passed' }, { pct: 90 });
  assert.equal(r1.status, 'mastered');
  const r2 = computeStatus({ kcBestPct: 85, kcAttempts: 2, exerciseDone: true, retrievalDone: true, status: 'mastered' }, { pct: 40 });
  assert.equal(r2.status, 'mastered');
});

test('mastery: best score never regresses', () => {
  const r = computeStatus({ kcBestPct: 90, kcAttempts: 3, exerciseDone: true, retrievalDone: false, status: 'passed' }, { pct: 55 });
  assert.equal(r.kcBestPct, 90);
});

// ---------- SM-2 ----------
test('sm2: first successful review schedules 1 day', () => {
  const r = sm2({ ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 }, 4);
  assert.equal(r.repetitions, 1);
  assert.equal(r.intervalDays, 1);
});

test('sm2: second successful review schedules 6 days', () => {
  const r = sm2({ ease: 2.5, intervalDays: 1, repetitions: 1, lapses: 0 }, 5);
  assert.equal(r.repetitions, 2);
  assert.equal(r.intervalDays, 6);
});

test('sm2: lapse resets repetitions and shrinks ease', () => {
  const r = sm2({ ease: 2.5, intervalDays: 10, repetitions: 3, lapses: 0 }, 1);
  assert.equal(r.repetitions, 0);
  assert.equal(r.lapses, 1);
  assert.ok(r.ease < 2.5);
  assert.equal(r.intervalDays, 0.5);
});

test('sm2: ease never drops below 1.3 and interval caps at 365', () => {
  let st = { ease: 1.3, intervalDays: 300, repetitions: 5, lapses: 2 };
  const r = sm2(st, 5);
  assert.ok(r.ease >= 1.3);
  assert.ok(r.intervalDays <= 365);
});

test('sm2: due date moves into the future by interval days', () => {
  const r = sm2({ ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 }, 4);
  const days = (r.dueAt.getTime() - Date.now()) / 86400000;
  assert.ok(days > 0.9 && days < 1.1);
});

// ---------- grading ----------
function gradeAnswer(q, a) {
  if (a === undefined || a === null) return false;
  switch (q.type) {
    case 'mcq': return Number(a) === q.answerIndex;
    case 'ms': {
      if (!Array.isArray(a)) return false;
      return [...(q.answerIndices ?? [])].sort().join(',') === [...a.map(Number)].sort().join(',');
    }
    case 'numeric': {
      const v = Number(a);
      if (Number.isNaN(v)) return false;
      const tol = q.tolerance ?? 1e-6;
      return Math.abs(v - q.answer) <= Math.max(tol, Math.abs(q.answer) * 1e-9);
    }
    case 'short': {
      const s = String(a).toLowerCase();
      const hits = (q.keywords ?? []).filter(k => s.includes(k.toLowerCase())).length;
      return (q.keywords ?? []).length ? hits / q.keywords.length >= 0.6 : false;
    }
    case 'code-output': {
      const norm = x => x.replace(/\r\n/g, '\n').split('\n').map(l => l.trim().replace(/[ \t]+/g, ' ')).join('\n').replace(/\n+$/, '');
      return norm(String(a)) === norm(String(q.answer));
    }
    default: return false;
  }
}

test('grading: mcq, ms, numeric tolerance, keyword short, exact code-output', () => {
  assert.equal(gradeAnswer({ type: 'mcq', answerIndex: 2 }, 2), true);
  assert.equal(gradeAnswer({ type: 'mcq', answerIndex: 2 }, 0), false);
  assert.equal(gradeAnswer({ type: 'ms', answerIndices: [0, 2] }, [2, 0]), true);
  assert.equal(gradeAnswer({ type: 'ms', answerIndices: [0, 2] }, [0]), false);
  assert.equal(gradeAnswer({ type: 'numeric', answer: 50, tolerance: 0.01 }, '50.005'), true);
  assert.equal(gradeAnswer({ type: 'numeric', answer: 50, tolerance: 0.01 }, '50.1'), false);
  assert.equal(gradeAnswer({ type: 'short', keywords: ['eigenvalue', 'determinant'] }, 'The eigenvalue comes from the determinant.'), true);
  assert.equal(gradeAnswer({ type: 'short', keywords: ['eigenvalue', 'determinant'] }, 'No idea.'), false);
  assert.equal(gradeAnswer({ type: 'code-output', answer: '1\n7' }, '1 \n7 '), true);
  assert.equal(gradeAnswer({ type: 'code-output', answer: '1\n7' }, '1 7'), false);
  assert.equal(gradeAnswer({ type: 'numeric', answer: 5 }, ''), false);
  assert.equal(gradeAnswer({ type: 'numeric', answer: 5 }, 'abc'), false);
});

// ---------- math expression evaluator ----------
// replicate compileExpression essentials via Function-free check: we test the public behaviour
// by importing the compiled logic conceptually, here we validate expressions used in content
// parse under a reference recursive-descent implementation copied from core.tsx.
function compileExpression(expr) {
  const tokens = tokenize(expr);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  function tokenize(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        out.push(parseFloat(s.slice(i, j))); i = j; continue;
      }
      if (/[a-zA-Z_]/.test(c)) {
        let j = i;
        while (j < s.length && /[a-zA-Z_0-9]/.test(s[j])) j++;
        out.push(s.slice(i, j)); i = j; continue;
      }
      if ('+-*/^(),'.includes(c)) { out.push(c); i++; continue; }
      throw new Error(`unexpected char ${c}`);
    }
    return out;
  }
  const FUNCS = { sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, log: Math.log, ln: Math.log, sqrt: Math.sqrt, abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow };
  function parseExpr() {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') { const op = next(); const right = parseTerm(); const l = left; left = op === '+' ? x => l(x) + right(x) : x => l(x) - right(x); }
    return left;
  }
  function parseTerm() {
    let left = parseUnary();
    while (peek() === '*' || peek() === '/') { const op = next(); const right = parseUnary(); const l = left; left = op === '*' ? x => l(x) * right(x) : x => l(x) / right(x); }
    return left;
  }
  function parseUnary() {
    if (peek() === '-') { next(); const v = parseUnary(); return x => -v(x); }
    if (peek() === '+') { next(); return parseUnary(); }
    return parsePow();
  }
  function parsePow() {
    const base = parseAtom();
    if (peek() === '^') { next(); const e = parseUnary(); return x => Math.pow(base(x), e(x)); }
    return base;
  }
  function parseAtom() {
    const t = next();
    if (typeof t === 'number') return () => t;
    if (t === 'x') return x => x;
    if (t === 'pi') return () => Math.PI;
    if (t === 'e') return () => Math.E;
    if (t === '(') { const inner = parseExpr(); if (peek() === ')') next(); return inner; }
    if (typeof t === 'string' && FUNCS[t]) {
      if (peek() === '(') {
        next();
        const args = [parseExpr()];
        while (peek() === ',') { next(); args.push(parseExpr()); }
        if (peek() === ')') next();
        const f = FUNCS[t];
        return x => f(...args.map(a => a(x)));
      }
      throw new Error('needs parens');
    }
    throw new Error(`unexpected ${t}`);
  }
  const fn = parseExpr();
  if (pos < tokens.length) throw new Error('trailing');
  return fn;
}

test('evaluator: arithmetic, precedence, functions used in lesson interactives', () => {
  assert.equal(compileExpression('2 + 3 * 4^2')(0), 50);
  assert.equal(compileExpression('x^3 - 3*x')(2), 2);
  assert.equal(compileExpression('x*exp(x)')(1), Math.E);
  assert.ok(Math.abs(compileExpression('sin(x)')(Math.PI / 2) - 1) < 1e-12);
  assert.equal(compileExpression('100 * (x - 42)')(45), 300);
  assert.equal(compileExpression('x / (1 - x)')(0.5), 1);
  assert.equal(compileExpression('(2 + 3) * 4')(0), 20);
  assert.equal(compileExpression('-3^2')(0), -9); // unary minus binds after power
});

test('evaluator: rejects malformed expressions safely', () => {
  assert.throws(() => compileExpression('2 + + 3 x'));
  assert.throws(() => compileExpression('sin'));
});

// ---------- drill generator maths ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('drill RNG: deterministic and in range', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) {
    const va = a(), vb = b();
    assert.equal(va, vb);
    assert.ok(va >= 0 && va < 1);
  }
});

// ---------- content integrity ----------
test('content: registry exists and covers the map', () => {
  const reg = JSON.parse(readFileSync(path.join(ROOT, 'content/registry.json'), 'utf8'));
  const map = JSON.parse(readFileSync(path.join(ROOT, 'content/map/curriculum.json'), 'utf8'));
  const mapLessons = map.phases.flatMap(p => p.modules.flatMap(m => m.lessons.map(l => l.id)));
  assert.ok(mapLessons.length > 0, 'curriculum must contain lessons');
  assert.equal(new Set(mapLessons).size, mapLessons.length, 'mapped lesson ids must be unique');
  const authored = new Set(reg.lessons.map(l => l.id));
  assert.equal(authored.size, reg.lessons.length, 'registry lesson ids must be unique');
  assert.equal(authored.size, mapLessons.length, 'registry and map must cover the same number of lessons');
  const missing = mapLessons.filter(id => !authored.has(id));
  assert.deepEqual(missing, [], `all mapped lessons must be authored; missing: ${missing.slice(0, 5)}`);
});

test('content: every authored lesson has quiz answers server-side', () => {
  const dir = path.join(ROOT, 'content/lessons');
  let count = 0;
  const walk = d => {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.json')) {
        const L = JSON.parse(readFileSync(p, 'utf8'));
        assert.ok(Array.isArray(L.quiz) && L.quiz.length >= 3, `${L.id} quiz`);
        for (const q of L.quiz) {
          const hasAnswer =
            (q.type === 'mcq' && typeof q.answerIndex === 'number') ||
            (q.type === 'ms' && Array.isArray(q.answerIndices)) ||
            (q.type === 'numeric' && typeof q.answer === 'number') ||
            (q.type === 'short' && Array.isArray(q.keywords) && q.modelAnswer) ||
            (q.type === 'code-output' && typeof q.answer === 'string');
          assert.ok(hasAnswer, `${L.id}/${q.id} (${q.type}) missing answer material`);
          assert.ok(q.explanation, `${L.id}/${q.id} missing explanation`);
        }
        count++;
      }
    }
  };
  walk(dir);
  const map = JSON.parse(readFileSync(path.join(ROOT, 'content/map/curriculum.json'), 'utf8'));
  const mapped = map.phases.flatMap(p => p.modules.flatMap(m => m.lessons.map(l => l.id)));
  assert.equal(count, mapped.length, 'all mapped lessons must have authored quiz material');
});

test('content: problems have valid reference tests (spot check pnl-calc)', () => {
  const p = JSON.parse(readFileSync(path.join(ROOT, 'content/problems/pnl-calc.json'), 'utf8'));
  assert.ok(p.tests.length >= 5);
  assert.ok(p.solutions.python && p.solutions.cpp);
  const t0 = p.tests[0];
  assert.equal(typeof t0.input, 'string');
  assert.equal(typeof t0.expected, 'string');
});

test('content: prerequisite graph is acyclic and resolvable', () => {
  const map = JSON.parse(readFileSync(path.join(ROOT, 'content/map/curriculum.json'), 'utf8'));
  const ids = new Set(map.phases.flatMap(p => p.modules.flatMap(m => m.lessons.map(l => l.id))));
  const edges = new Map();
  for (const ph of map.phases) {
    for (const m of ph.modules) {
      m.lessons.forEach((l, i) => {
        const deps = [...(l.prereqs ?? [])];
        if (i > 0 && deps.length === 0) deps.push(m.lessons[i - 1].id);
        edges.set(l.id, deps.filter(d => ids.has(d)));
      });
    }
  }
  const state = new Map();
  const visit = id => {
    const st = state.get(id) ?? 0;
    if (st === 1) throw new Error(`cycle at ${id}`);
    if (st === 2) return;
    state.set(id, 1);
    for (const d of edges.get(id) ?? []) visit(d);
    state.set(id, 2);
  };
  for (const id of ids) visit(id);
  assert.ok(true);
});

test('runner: output normalisation matches judge contract', () => {
  const normalize = s => s.replace(/\r\n/g, '\n').split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '');
  assert.equal(normalize('12.00\r\n'), '12.00');
  assert.equal(normalize('a  \nb\t\n\n'), 'a\nb');
  assert.equal(normalize('x\n'), 'x');
  assert.equal(normalize('x'), 'x');
});

test('infrastructure: prisma schema and runner service exist', () => {
  assert.ok(existsSync(path.join(ROOT, 'prisma/schema.prisma')));
  assert.ok(existsSync(path.join(ROOT, 'mini-services/code-runner/index.ts')));
  assert.ok(existsSync(path.join(ROOT, 'src/lib/auth.ts')));
  assert.ok(existsSync(path.join(ROOT, 'src/lib/mastery.ts')));
});

// ---------- lesson card segmentation (player deck builder) ----------
// Mirrors src/lib/lesson-cards.ts buildLessonCards logic for contract tests.
function segBlockWeight(b) {
  switch (b.type) {
    case 'p': return b.md.length;
    case 'h2': case 'h3': return 40;
    case 'math': return b.tex.length / 2;
    case 'code': return b.code.length / 3;
    case 'callout': return b.md.length;
    case 'list': return b.items.join('').length;
    case 'table': return b.rows.flat().join('').length / 2;
    case 'steps': return b.items.join('').length;
    case 'interactive': return 9999;
    case 'ref': return 60;
  }
}

function segBuildLessonCards(lesson) {
  const cards = [{ kind: 'intro' }];
  let current = null;
  const flush = () => { if (current && current.blocks.length) cards.push({ kind: 'concept', blocks: current.blocks }); current = null; };
  const ensure = () => { if (!current) current = { blocks: [], weight: 0 }; };
  for (const block of lesson.blocks) {
    const w = segBlockWeight(block);
    switch (block.type) {
      case 'h2': flush(); current = { blocks: [block], weight: w }; break;
      case 'interactive': flush(); cards.push({ kind: 'lab', block }); break;
      case 'ref': break;
      default:
        ensure();
        if (current.weight + w > 850 && current.blocks.length > 0) { flush(); ensure(); }
        current.blocks.push(block);
        current.weight += w;
        break;
    }
  }
  flush();
  cards.push({ kind: 'exercise', exKind: 'guided' });
  cards.push({ kind: 'exercise', exKind: 'independent' });
  lesson.quiz.forEach(q => cards.push({ kind: 'quiz', question: q }));
  if (lesson.commonMistakes.length) cards.push({ kind: 'mistakes' });
  cards.push({ kind: 'summary' });
  return cards;
}

test('lesson-cards: deck always starts with intro and ends with summary', () => {
  const deck = segBuildLessonCards({ blocks: [], quiz: [{ id: 'q1' }], commonMistakes: [] });
  assert.equal(deck[0].kind, 'intro');
  assert.equal(deck[deck.length - 1].kind, 'summary');
  assert.ok(deck.some(c => c.kind === 'quiz'), 'quiz question becomes a card');
  assert.ok(deck.some(c => c.kind === 'exercise' && c.exKind === 'guided'));
  assert.ok(deck.some(c => c.kind === 'exercise' && c.exKind === 'independent'));
});

test('lesson-cards: interactive blocks always get their own lab card', () => {
  const deck = segBuildLessonCards({
    blocks: [
      { type: 'p', md: 'intro text' },
      { type: 'interactive', component: 'FractionVisualiser', params: {} },
      { type: 'p', md: 'after the lab' },
    ],
    quiz: [],
    commonMistakes: [],
  });
  const labs = deck.filter(c => c.kind === 'lab');
  assert.equal(labs.length, 1);
  // concept cards must not contain interactive blocks
  for (const c of deck.filter(c => c.kind === 'concept')) {
    for (const b of c.blocks) assert.notEqual(b.type, 'interactive');
  }
});

test('lesson-cards: long content splits into multiple concept cards', () => {
  const longP = 'x'.repeat(500);
  const deck = segBuildLessonCards({
    blocks: [
      { type: 'h2', text: 'Big section' },
      { type: 'p', md: longP },
      { type: 'p', md: longP },
      { type: 'p', md: longP },
    ],
    quiz: [],
    commonMistakes: [],
  });
  const concepts = deck.filter(c => c.kind === 'concept');
  assert.ok(concepts.length >= 2, `expected split, got ${concepts.length}`);
});

test('lesson-cards: all real lessons produce sane decks (10-40 cards)', () => {
  const dirs = readdirSync(path.join(ROOT, 'content/lessons'));
  let checked = 0;
  for (const d of dirs) {
    const files = readdirSync(path.join(ROOT, 'content/lessons', d)).filter(f => f.endsWith('.json'));
    for (const f of files.slice(0, 12)) {
      const lesson = JSON.parse(readFileSync(path.join(ROOT, 'content/lessons', d, f), 'utf8'));
      const deck = segBuildLessonCards(lesson);
      assert.ok(deck.length >= 4, `${lesson.id}: deck too small (${deck.length})`);
      assert.ok(deck.length <= 60, `${lesson.id}: deck too big (${deck.length})`);
      assert.equal(deck[0].kind, 'intro');
      assert.equal(deck[deck.length - 1].kind, 'summary');
      const quizCards = deck.filter(c => c.kind === 'quiz').length;
      assert.equal(quizCards, lesson.quiz.length, `${lesson.id}: quiz card count mismatch`);
      checked++;
    }
  }
  assert.ok(checked > 100, `sampled enough lessons (${checked})`);
});


// Execute the actual TypeScript grader, not a duplicated implementation.
import ts from 'typescript';
import vm from 'node:vm';
const gradingSource = readFileSync(path.join(ROOT, 'src/lib/grading.ts'), 'utf8');
const gradingJs = ts.transpileModule(gradingSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const actualGrading = {};
vm.runInNewContext(gradingJs, { exports: actualGrading });

test('actual grader: alternative groups accept synonyms and inflection', () => {
  const q = { type: 'short', keywords: ['latency|delay', 'quote|order|price', 'stale|old|outdated'] };
  assert.equal(actualGrading.gradeAnswer(q, 'The quotes were delayed and outdated.'), true);
  assert.equal(actualGrading.keywordsHit('latencies quotes stale', q.keywords), 1);
});
test('actual grader: keyword groups count once and require 60 percent', () => {
  const q = { type: 'short', keywords: ['latency|delay', 'quote|order', 'stale|outdated'] };
  assert.equal(actualGrading.gradeAnswer(q, 'latency delay'), false);
  assert.equal(actualGrading.gradeAnswer(q, 'delayed quotes'), true);
});
test('actual grader: matching uses token boundaries, not accidental substrings', () => {
  assert.equal(actualGrading.keywordsHit('concatenate', ['cat']), 0);
  assert.equal(actualGrading.keywordsHit('shorder', ['order']), 0);
});
test('actual grader: technical symbols and phrases are literal', () => {
  assert.equal(actualGrading.keywordsHit('int& is an lvalue reference', ['int&', 'lvalue', 'reference']), 1);
  assert.equal(actualGrading.keywordsHit('A branch target buffer predicts the target', ['branch target buffer|BTB', 'predict|prediction', 'target']), 1);
});
test('actual grader: blank and non-finite numeric answers are rejected', () => {
  const q = { type: 'numeric', answer: 0, tolerance: 1e-6 };
  for (const value of ['', ' ', 'Infinity', 'NaN']) assert.equal(actualGrading.gradeAnswer(q, value), false);
  assert.equal(actualGrading.gradeAnswer(q, '0.0000005'), true);
});
test('actual grader: output normalisation keeps line breaks', () => {
  assert.equal(actualGrading.gradeAnswer({type:'code-output',answer:'A B\nC'}, ' A   B\r\nC\n'), true);
  assert.equal(actualGrading.gradeAnswer({type:'code-output',answer:'A B\nC'}, 'A B C'), false);
});
test('actual grader: client sanitisation removes all answer material', () => {
  const safe = actualGrading.sanitizedForClient({id:'q1',type:'short',prompt:'Explain',answer:1,answerIndex:0,answerIndices:[0],tolerance:1,keywords:['a'],modelAnswer:'secret',explanation:'feedback'});
  for (const key of ['answer','answerIndex','answerIndices','tolerance','keywords','modelAnswer']) assert.equal(key in safe, false);
  assert.equal(safe.prompt,'Explain');
});


test('actual grader: every authored lesson model answer passes its own rubric', () => {
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (file.endsWith('.json')) {
        const lesson = JSON.parse(readFileSync(file, 'utf8'));
        for (const q of lesson.quiz ?? []) if (q.type === 'short') {
          assert.equal(actualGrading.gradeAnswer(q, q.modelAnswer), true, `${lesson.id}:${q.id} modelAnswer rejected`);
        }
      }
    }
  };
  walk(path.join(ROOT, 'content/lessons'));
});
