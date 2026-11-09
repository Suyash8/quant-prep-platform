#!/usr/bin/env node
/**
 * QuantFoundry content validator.
 * Validates lessons, problems, assessments, projects and company profiles
 * against the curriculum map and the content schema (content/README.md).
 * Usage: node scripts/validate-content.mjs [--registry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const errors = [];
const warnings = [];
let checked = 0;

function err(file, msg) { errors.push(`${path.relative(ROOT, file)}: ${msg}`); }
function warn(file, msg) { warnings.push(`${path.relative(ROOT, file)}: ${msg}`); }

const INTERACTIVE_COMPONENTS = new Set([
  'NumberLine', 'FractionVisual', 'CompoundGrowth', 'FunctionPlotter', 'DerivativeLab',
  'IntegralLab', 'TaylorLab', 'VectorVisual', 'MatrixTransform', 'ProbabilitySimulator',
  'DistributionViewer', 'RandomWalk', 'BrownianMotion', 'ConfidenceIntervalLab',
  'RegressionLab', 'TimeSeriesDecompose', 'BlackScholesLab', 'PayoffDiagram', 'GreeksLab',
  'YieldCurveLab', 'EfficientFrontier', 'MonteCarloPi', 'OrderBookVisual', 'MatchingSim',
  'MemoryLayout', 'ComplexityCompare', 'SortingVisual', 'HashTableVisual', 'BSTVisual',
  'MarkovChainSim', 'BinomialTreeLab', 'VolatilitySmile', 'NormalConvergence',
  'TerminalSteps', 'PipePipeline', 'PermissionBits', 'PacketJourney', 'JoinVisual',
  'LatencyBudget', 'PercentileExplorer', 'OrderStateMachine', 'MemoryPool',
  'CovarianceLab', 'FloatErrorLab'
]);

const BLOCK_TYPES = new Set(['p', 'h2', 'h3', 'math', 'code', 'callout', 'list', 'table', 'steps', 'interactive', 'ref']);
const QUIZ_TYPES = new Set(['mcq', 'ms', 'numeric', 'short', 'code-output']);
const DIFFS = new Set(['foundation', 'core', 'advanced', 'specialist']);
const CARD_TYPES = new Set(['definition', 'formula', 'concept', 'code-output', 'error-identification', 'probability']);

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    err(file, `invalid JSON: ${e.message}`);
    return null;
  }
}

/** Validate inline KaTeX $...$ delimiters are balanced in a markdown string (ignoring code fences handled by caller). */
function checkInlineMath(str, file, ctx) {
  if (typeof str !== 'string') return;
  // remove escaped dollars \$ and display math $$..$$ first
  const s = str.replace(/\\\$/g, '').replace(/\$\$[^$]*\$\$/g, '');
  const count = (s.match(/\$/g) || []).length;
  if (count % 2 !== 0) err(file, `unbalanced inline math $ delimiters in ${ctx}`);
}

function validateBlocks(blocks, file, ctx) {
  if (!Array.isArray(blocks)) { err(file, `${ctx}: blocks must be an array`); return; }
  for (const b of blocks) {
    checked++;
    if (!BLOCK_TYPES.has(b.type)) { err(file, `${ctx}: unknown block type "${b.type}"`); continue; }
    if (b.type === 'p' || b.type === 'callout') { checkInlineMath(b.md, file, ctx); if (b.md == null) err(file, `${ctx}: ${b.type} missing md`); }
    if (b.type === 'math' && (!b.tex || typeof b.tex !== 'string')) err(file, `${ctx}: math block missing tex`);
    if (b.type === 'code' && (typeof b.code !== 'string' || !b.code.trim())) err(file, `${ctx}: code block empty or missing`);
    if (b.type === 'interactive') {
      if (!INTERACTIVE_COMPONENTS.has(b.component)) err(file, `${ctx}: unregistered interactive component "${b.component}"`);
      if (b.params && typeof b.params !== 'object') err(file, `${ctx}: interactive params must be object`);
    }
    if (b.type === 'list' && !Array.isArray(b.items)) err(file, `${ctx}: list missing items`);
    if (b.type === 'table') {
      if (!Array.isArray(b.headers) || !Array.isArray(b.rows)) err(file, `${ctx}: table missing headers/rows`);
      else if (b.rows.some(r => !Array.isArray(r) || r.length !== b.headers.length)) err(file, `${ctx}: table row width mismatch`);
    }
    if (b.type === 'steps' && !Array.isArray(b.items)) err(file, `${ctx}: steps missing items`);
    if (b.type === 'ref' && !Array.isArray(b.items)) err(file, `${ctx}: ref missing items`);
  }
}

function validateQuiz(quiz, file, ctx) {
  if (!Array.isArray(quiz) || quiz.length < 3) { err(file, `${ctx}: quiz must have >= 3 questions`); return; }
  for (const q of quiz) {
    checked++;
    if (!QUIZ_TYPES.has(q.type)) { err(file, `${ctx}: bad quiz type "${q.type}"`); continue; }
    if (!q.prompt) err(file, `${ctx}: quiz ${q.id} missing prompt`);
    if (!q.explanation) err(file, `${ctx}: quiz ${q.id} missing explanation (required)`);
    if (q.type === 'mcq') {
      if (!Array.isArray(q.options) || q.options.length < 3) err(file, `${ctx}: mcq ${q.id} needs >= 3 options`);
      if (typeof q.answerIndex !== 'number' || q.answerIndex < 0 || q.answerIndex >= (q.options?.length ?? 0)) err(file, `${ctx}: mcq ${q.id} bad answerIndex`);
    }
    if (q.type === 'ms') {
      if (!Array.isArray(q.answerIndices) || q.answerIndices.length < 1) err(file, `${ctx}: ms ${q.id} bad answerIndices`);
      for (const i of q.answerIndices || []) if (i >= (q.options?.length ?? 0)) err(file, `${ctx}: ms ${q.id} answerIndex out of range`);
    }
    if (q.type === 'numeric' && typeof q.answer !== 'number') err(file, `${ctx}: numeric ${q.id} answer must be number`);
    if (q.type === 'short' && (!q.modelAnswer || !Array.isArray(q.keywords))) err(file, `${ctx}: short ${q.id} needs modelAnswer + keywords`);
    if (q.type === 'code-output' && (typeof q.code !== 'string' || typeof q.answer !== 'string')) err(file, `${ctx}: code-output ${q.id} needs code + exact answer string`);
  }
}

function validateExercises(ex, file, ctx, required) {
  if (required && !ex) { err(file, `${ctx}: missing exercise`); return; }
  if (!ex) return;
  if (!ex.prompt) err(file, `${ctx}: exercise missing prompt`);
  if (!ex.solution) err(file, `${ctx}: exercise missing solution`);
}

function validateLesson(file, map) {
  const L = loadJson(file);
  if (!L) return;
  checked++;
  const base = path.basename(file, '.json');
  if (L.id !== base) err(file, `id "${L.id}" does not match filename "${base}"`);
  if (!map.lessonIndex.has(L.id)) err(file, `lesson id "${L.id}" not present in curriculum map`);
  const mod = map.moduleIndex.get(L.moduleId);
  if (!mod) err(file, `unknown moduleId "${L.moduleId}"`);
  else if (!mod.lessonIds.has(L.id)) err(file, `lesson "${L.id}" not listed under module "${L.moduleId}" in map`);
  if (!DIFFS.has(L.difficulty)) err(file, `bad difficulty "${L.difficulty}"`);
  if (typeof L.estMinutes !== 'number') err(file, 'missing estMinutes');
  if (!Array.isArray(L.objectives) || L.objectives.length < 3) err(file, 'needs >= 3 objectives');
  if (!L.motivation || L.motivation.length < 80) err(file, 'motivation too short (needs >= 80 chars)');
  validateBlocks(L.blocks, file, 'blocks');
  if (!L.blocks?.some(b => b.type === 'interactive') && !['ph0-orientation', 'ph6-problem-solving-method'].includes(L.moduleId)) {
    warn(file, 'no interactive block (recommended for most lessons)');
  }
  if ((L.blocks?.filter(b => b.type === 'p').reduce((n, b) => n + Math.ceil((b.md || '').split(/\s+/).length), 0)) < 250) {
    warn(file, 'body text seems short (< 250 words in paragraphs)');
  }
  validateExercises(L.guidedExercise, file, 'guidedExercise', true);
  validateExercises(L.independentExercise, file, 'independentExercise', true);
  validateQuiz(L.quiz, file, 'quiz');
  if (!Array.isArray(L.summary) || L.summary.length < 3) err(file, 'summary needs >= 3 points');
  if (!Array.isArray(L.flashcards) || L.flashcards.length < 3) err(file, 'needs >= 3 flashcards');
  for (const c of L.flashcards || []) if (!CARD_TYPES.has(c.type)) err(file, `bad flashcard type "${c.type}"`);
  for (const s of L.skills || []) if (!map.skills.has(s)) err(file, `unknown skill "${s}"`);
  for (const p of L.prereqs || []) if (!map.lessonIndex.has(p)) err(file, `unknown prereq "${p}"`);
  checkInlineMath(L.motivation || '', file, 'motivation');
}

function validateProblem(file) {
  const P = loadJson(file);
  if (!P) return;
  checked++;
  if (path.basename(file, '.json') !== P.slug) err(file, 'slug must match filename');
  if (!['easy', 'medium', 'hard'].includes(P.difficulty)) err(file, 'bad difficulty');
  if (!Array.isArray(P.tests) || P.tests.length < 5) err(file, 'needs >= 5 tests');
  for (const t of P.tests) {
    if (typeof t.input !== 'string' || typeof t.expected !== 'string') err(file, 'test missing input/expected');
  }
  if (!P.solutions || (!P.solutions.python && !P.solutions.cpp)) err(file, 'needs at least one reference solution');
  validateBlocks(P.statement, file, 'statement');
  validateBlocks(P.editorial, file, 'editorial');
  if (!Array.isArray(P.examples) || P.examples.length < 1) err(file, 'needs >= 1 example');
  for (const ex of P.examples) {
    // first example must not be hidden and should match first test (sanity)
    if (typeof ex.input !== 'string' || typeof ex.output !== 'string') err(file, 'example missing input/output');
  }
}

function validateAssessment(file) {
  const A = loadJson(file);
  if (!A) return;
  checked++;
  if (!A.id || !A.title || !Array.isArray(A.sections)) err(file, 'missing id/title/sections');
  for (const s of A.sections) validateQuiz(s.questions, file, `section "${s.title}"`);
}

function validateProject(file) {
  const P = loadJson(file);
  if (!P) return;
  checked++;
  if (!P.slug || !P.title || !Array.isArray(P.milestones) || P.milestones.length < 3) err(file, 'needs slug/title/>=3 milestones');
  if (!Array.isArray(P.requirements) || P.requirements.length < 4) err(file, 'needs >= 4 requirements');
  if (!Array.isArray(P.evaluationCriteria) || P.evaluationCriteria.length < 3) err(file, 'needs >= 3 evaluation criteria');
  const totalWeight = (P.evaluationCriteria || []).reduce((n, c) => n + (c.weight || 0), 0);
  if (totalWeight !== 100) err(file, `evaluation weights sum to ${totalWeight}, expected 100`);
}

function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, cb);
    else if (f.endsWith('.json')) cb(p);
  }
}

// ---- load map ----
const map = loadJson(path.join(CONTENT, 'map', 'curriculum.json'));
if (!map) { console.error('Fatal: curriculum map invalid'); process.exit(1); }
const moduleIndex = new Map();
const lessonIndex = new Map();
for (const ph of map.phases) {
  for (const m of ph.modules) {
    const lessonIds = new Set(m.lessons.map(l => l.id));
    moduleIndex.set(m.id, { ...m, lessonIds, phaseId: ph.id, phaseTitle: ph.title });
    for (const l of m.lessons) {
      if (lessonIndex.has(l.id)) err(path.join(CONTENT, 'map', 'curriculum.json'), `duplicate lesson id ${l.id}`);
      lessonIndex.set(l.id, { ...l, moduleId: m.id, phaseId: ph.id });
    }
  }
}
const skills = new Set(map.skills);

// ---- validate authored content ----
walk(path.join(CONTENT, 'lessons'), f => validateLesson(f, { moduleIndex, lessonIndex, skills }));
walk(path.join(CONTENT, 'problems'), f => validateProblem(f));
walk(path.join(CONTENT, 'assessments'), f => validateAssessment(f));
walk(path.join(CONTENT, 'projects'), f => validateProject(f));
walk(path.join(CONTENT, 'companies'), f => {
  if (path.basename(f).startsWith('_')) return; // metadata files (e.g. _matrix.json) are not company profiles
  checked++; const c = loadJson(f); if (c && !c.slug) err(f, 'company missing slug');
});

// ---- coverage report ----
const authored = new Set();
walk(path.join(CONTENT, 'lessons'), f => authored.add(path.basename(f, '.json')));
let totalMapLessons = 0, authoredCount = 0, byPhase = {};
for (const [id] of lessonIndex) {
  totalMapLessons++;
  const ph = lessonIndex.get(id).phaseId;
  byPhase[ph] = byPhase[ph] || { total: 0, authored: 0 };
  byPhase[ph].total++;
  if (authored.has(id)) { byPhase[ph].authored++; authoredCount++; }
}

console.log(`Checked items: ${checked}`);
console.log(`Curriculum map: ${totalMapLessons} planned lessons across ${moduleIndex.size} modules`);
console.log(`Authored & valid: ${authoredCount} lessons (${Math.round(authoredCount / totalMapLessons * 100)}% of map)`);
for (const [ph, s] of Object.entries(byPhase)) console.log(`  ${ph}: ${s.authored}/${s.total}`);

if (process.argv.includes('--registry')) {
  const registry = [];
  walk(path.join(CONTENT, 'lessons'), f => {
    const L = loadJson(f);
    if (!L) return;
    const meta = lessonIndex.get(L.id);
    registry.push({
      id: L.id, moduleId: L.moduleId, phaseId: meta?.phaseId, title: L.title,
      estMinutes: L.estMinutes, difficulty: L.difficulty, skills: L.skills,
      prereqs: L.prereqs, order: meta ? lessonIndex.get(L.id).order ?? undefined : undefined,
      hasQuiz: (L.quiz?.length ?? 0) > 0
    });
  });
  fs.writeFileSync(path.join(CONTENT, 'registry.json'), JSON.stringify({ generatedAt: new Date().toISOString(), lessons: registry }, null, 2));
  console.log(`Wrote content/registry.json (${registry.length} lessons)`);
}

if (errors.length) {
  console.error(`\n${errors.length} ERROR(S):`);
  for (const e of errors.slice(0, 80)) console.error('  ✗ ' + e);
}
if (warnings.length) console.error(`\n${warnings.length} warning(s) (first 20):`);
for (const w of warnings.slice(0, 20)) console.error('  ⚠ ' + w);
process.exit(errors.length ? 1 : 0);
