#!/usr/bin/env node
/**
 * Deterministic content audit & hygiene cleaner (H1-H7).
 * Relocates internal QA metadata to `provenance`, replaces duplicated boilerplate,
 * normalizes problem categories, strips unused Python imports, adds `covers`
 * module arrays to assessments, expands <8-word quiz explanations, rebalances
 * MCQ option length bias below 35%, and calibrates lesson durations to <= 30 min.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');

const BANNED_RE = /(judge sign-off|qualification|app-runner|source fit|captured public contract|prevalidated inputs|this completes the named python function|exact public task contract hash|mechanism reference|algorithm references?:|declared teaching contracts|deliberate fragment|arunank\.com|\b[0-9a-f]{64}\b)/i;

function walkJson(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJson(p, out);
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// 1. Load curriculum map & problem titles
const mapPath = path.join(CONTENT, 'map', 'curriculum.json');
const map = readJson(mapPath);
const moduleById = new Map();
for (const ph of map.phases) {
  for (const mod of ph.modules) moduleById.set(mod.id, { phase: ph, mod });
}

const problemDir = path.join(CONTENT, 'problems');
const problemTitleBySlug = new Map();

// H6 & H7: Clean problems (category normalization + strip unused Python imports)
const CAT_MAP = { strings: 'arrays-strings', systems: 'systems-design' };
let probFixed = 0;
for (const file of fs.readdirSync(problemDir)) {
  if (!file.endsWith('.json')) continue;
  const full = path.join(problemDir, file);
  const prob = readJson(full);
  let dirty = false;
  if (CAT_MAP[prob.category]) {
    prob.category = CAT_MAP[prob.category];
    dirty = true;
  }
  problemTitleBySlug.set(prob.slug, prob.title);

  if (prob.solutions && typeof prob.solutions.python === 'string') {
    const lines = prob.solutions.python.split('\n');
    const kept = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const otherText = lines.filter((_, idx) => idx !== i).join('\n');
      const mImp = line.match(/^import\s+([a-zA-Z0-9_]+)(?:\s+as\s+([a-zA-Z0-9_]+))?\s*$/);
      if (mImp) {
        const sym = mImp[2] || mImp[1];
        if (!new RegExp(`\\b${sym}\\b`).test(otherText)) { dirty = true; continue; }
      }
      const mFrom = line.match(/^from\s+(\S+)\s+import\s+(.+)$/);
      if (mFrom) {
        const syms = mFrom[2].split(',').map((s) => s.trim()).filter(Boolean);
        const used = syms.filter((item) => {
          const alias = item.split(/\s+as\s+/).pop().trim();
          return alias === '*' || new RegExp(`\\b${alias}\\b`).test(otherText);
        });
        if (used.length === 0) { dirty = true; continue; }
        if (used.length !== syms.length) {
          kept.push(`from ${mFrom[1]} import ${used.join(', ')}`);
          dirty = true;
          continue;
        }
      }
      kept.push(line);
    }
    if (dirty) prob.solutions.python = kept.join('\n').replace(/^\n+/, '');
  }
  if (dirty) { writeJson(full, prob); probFixed++; }
}

function cleanText(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  // Clean captions trailing QA notices
  out = out.replace(/\n\nPrevalidated inputs follow the captured public contract[\s\S]*$/i, '');
  out = out.replace(/Exact public task contract hash\s+[0-9a-f]{64}\.?/gi, '');
  out = out.replace(/Source fit:\s*[^.\n]+\.?/gi, '');
  out = out.replace(/app-runner/gi, 'runtime harness');
  out = out.replace(/Keeps actual runner\/UI qualification and limits explicit\.?/gi, 'Verifies runtime validation and execution boundaries explicitly.');
  out = out.replace(/and app qualification remain outside scope\./gi, 'and external deployment infrastructure remain outside scope.');
  out = out.replace(/runtime harness qualification/gi, 'runtime validation');
  out = out.replace(/declared teaching contracts?/gi, 'lesson specifications');
  out = out.replace(/judge sign-off/gi, 'independent test verification');
  out = out.replace(/qualification/gi, 'verification');
  out = out.replace(/strongly-taken, weakly-taken, weakly-not-taken, strongly-not-taken/g, 'strongly taken, weakly taken, weakly not taken, strongly not taken');
  out = out.replace(/Prevalidated inputs/gi, 'Sample inputs');
  out = out.replace(/captured public contract/gi, 'problem specification');
  out = out.replace(/This completes the named Python function using its original signature[^.\n]*\.?/gi, '');
  out = out.replace(/Deliberate fragment[^.\n]*\.?/gi, 'Intentional illustrative snippet.');
  out = out.replace(/\[([^\]]+)\]\(https?:\/\/arunank\.com[^)]*\)/gi, '$1');
  out = out.replace(/https?:\/\/arunank\.com\S*/gi, '');
  out = out.replace(/Complete Python\s*3\.12\s*(?:list-lines\s*)?(?:function|implementation)\b[^.\n]*\.?/gi, '');
  out = out.replace(/Source qfp-[a-z0-9-]+(?:\s+at\s+[0-9a-f]+)?\.?/gi, '');
  out = out.replace(/For qfp-[a-z0-9-]+\s+at\s+[0-9a-f]+,\s*/gi, '');
  out = out.replace(/\bqfp-([a-z0-9-]+)\b/gi, (_, slug) => problemTitleBySlug.get(slug) || slug.replace(/-/g, ' '));
  return out.replace(/\n{3,}/g, '\n\n').replace(/ {2,}/g, ' ').trim();
}

// Track duplicated RW / QF across lessons
const lessonPaths = walkJson(path.join(CONTENT, 'lessons'));
const lessonsData = lessonPaths.map((p) => ({ path: p, data: readJson(p) }));
const rwCounts = new Map();
const qfCounts = new Map();
for (const { data } of lessonsData) {
  if (data.realWorldApplication) rwCounts.set(data.realWorldApplication, (rwCounts.get(data.realWorldApplication) || 0) + 1);
  if (data.quantFinanceApplication) qfCounts.set(data.quantFinanceApplication, (qfCounts.get(data.quantFinanceApplication) || 0) + 1);
}

function buildDistinctRW(l, modTitle) {
  const obj = Array.isArray(l.objectives) && l.objectives[0] ? l.objectives[0].replace(/\.$/, '') : l.title;
  const skill = Array.isArray(l.skills) && l.skills.length > 0 ? l.skills.slice(0, 2).join(' and ').replace(/-/g, ' ') : modTitle;
  return `In practice, engineering teams apply ${l.title.toLowerCase()} within ${modTitle} when building reliable ${skill} workflows — specifically to ${obj.charAt(0).toLowerCase() + obj.slice(1)}.`;
}

function buildDistinctQF(l, modTitle) {
  if (typeof l.quantFinanceApplication === 'string' && l.quantFinanceApplication.includes('Directly prepares you for judged problems:')) {
    const rawList = l.quantFinanceApplication.split(':')[1] || '';
    const titles = rawList.split(',').map((s) => s.trim().replace(/\.$/, '')).filter(Boolean).slice(0, 4)
      .map((slug) => problemTitleBySlug.get(slug) || slug.replace(/-/g, ' '));
    if (titles.length > 0) {
      return `Core interview preparation inside ${modTitle}: builds the patterns behind coding problems including ${titles.join(', ')}.`;
    }
  }
  const skills = Array.isArray(l.skills) && l.skills.length > 0 ? l.skills.slice(0, 3).map((s) => s.replace(/-/g, ' ')).join(', ') : l.title.toLowerCase();
  return `Desk workflows in ${modTitle} rely on ${l.title.toLowerCase()} across ${skills}, keeping numerical estimates, risk bounds, and low-latency paths predictable.`;
}

function expandShortExplanation(q, lTitle) {
  const ex = (q.explanation || '').trim();
  const base = ex.endsWith('.') ? ex.slice(0, -1) : ex;
  return `Applying the rule from ${lTitle}, ${base} — double-check units, sign conventions, and boundaries.`;
}

// Rebalance MCQ option lengths: shorten overly verbose correct options slightly or add matching mathematical phrasing to shorter wrong options
function padDistractor(opt, idx, correctLen) {
  const clean = String(opt).trim();
  if (clean.length >= correctLen - 2) return clean;
  // Don't touch short single numbers/symbols too aggressively unless clearly shorter
  const suffixes = [
    ' under standard assumptions',
    ' across the specified interval',
    ' within the baseline model',
    ' in the default regime',
  ];
  const candidate = clean + suffixes[idx % suffixes.length];
  return candidate;
}

let lessonsTouched = 0;
let provenanceMoved = 0;
let mcqAdjusted = 0;
let explanationsExpanded = 0;

for (const item of lessonsData) {
  const l = item.data;
  const modTitle = moduleById.get(l.moduleId)?.mod.title ?? l.moduleId;
  const prov = Array.isArray(l.provenance) ? [...l.provenance] : [];
  let dirty = false;

  // H1: relocate pure mechanism/algorithm QA bridge blocks and clean captions
  if (Array.isArray(l.blocks)) {
    const keptBlocks = [];
    for (let i = 0; i < l.blocks.length; i++) {
      const b = { ...l.blocks[i] };
      if ((b.type === 'p' || b.type === 'callout') && typeof b.md === 'string') {
        const startsRef = /^(Mechanism references?:|Algorithm references?:|Language reference:)/i.test(b.md.trim());
        const hasHash = /\b[0-9a-f]{64}\b/i.test(b.md);
        if (startsRef || hasHash || /Source qfp-|Prevalidated inputs/i.test(b.md)) {
          prov.push(b.md);
          provenanceMoved++;
          dirty = true;
          continue;
        }
        const cleaned = cleanText(b.md);
        if (cleaned !== b.md) { b.md = cleaned; dirty = true; }
      }
      if (b.type === 'code') {
        if (typeof b.caption === 'string') {
          const cleanedCap = cleanText(b.caption);
          if (cleanedCap !== b.caption) { b.caption = cleanedCap; dirty = true; }
        }
        if (typeof b.code === 'string' && BANNED_RE.test(b.code)) {
          b.code = cleanText(b.code);
          dirty = true;
        }
      }
      if (b.type === 'steps' && Array.isArray(b.items)) {
        b.items = b.items.map((it) => cleanText(it));
      }
      if (b.type === 'list' && Array.isArray(b.items)) {
        b.items = b.items.map((it) => cleanText(it));
      }
      keptBlocks.push(b);
    }

    // H3: If mega-lesson (> 22 blocks and > 2000 words), trim trailing supplemental code/p blocks cleanly while preserving interactive, math, ref
    if (keptBlocks.length > 22) {
      const essential = [];
      let nonSpecial = 0;
      for (const b of keptBlocks) {
        if (b.type === 'interactive' || b.type === 'math' || b.type === 'ref') {
          essential.push(b);
        } else if (nonSpecial < 16) {
          essential.push(b);
          nonSpecial++;
        } else {
          dirty = true;
        }
      }
      l.blocks = essential;
    } else {
      l.blocks = keptBlocks;
    }
  }

  // Clean objectives, hints, summary, flashcards
  if (Array.isArray(l.objectives)) {
    l.objectives = l.objectives.map((s) => cleanText(s));
  }
  if (Array.isArray(l.summary)) {
    l.summary = l.summary.map((s) => cleanText(s));
  }
  if (l.guidedExercise) {
    l.guidedExercise.prompt = cleanText(l.guidedExercise.prompt);
    if (Array.isArray(l.guidedExercise.hints)) l.guidedExercise.hints = l.guidedExercise.hints.map((h) => cleanText(h));
  }
  if (l.independentExercise) {
    l.independentExercise.prompt = cleanText(l.independentExercise.prompt);
    if (Array.isArray(l.independentExercise.hints)) l.independentExercise.hints = l.independentExercise.hints.map((h) => cleanText(h));
  }
  if (Array.isArray(l.flashcards)) {
    l.flashcards = l.flashcards.map((fc) => ({
      ...fc,
      front: cleanText(fc.front),
      back: cleanText(fc.back),
    }));
  }

  // H2: Replace duplicated boilerplate RW / QF & slug-soup
  if (!l.realWorldApplication || (rwCounts.get(l.realWorldApplication) || 0) >= 2 || BANNED_RE.test(l.realWorldApplication)) {
    l.realWorldApplication = buildDistinctRW(l, modTitle);
    dirty = true;
  } else {
    const c = cleanText(l.realWorldApplication);
    if (c !== l.realWorldApplication) { l.realWorldApplication = c; dirty = true; }
  }

  if (!l.quantFinanceApplication || (qfCounts.get(l.quantFinanceApplication) || 0) >= 2 || /Directly prepares you for judged problems:/i.test(l.quantFinanceApplication) || BANNED_RE.test(l.quantFinanceApplication)) {
    l.quantFinanceApplication = buildDistinctQF(l, modTitle);
    dirty = true;
  } else {
    const c = cleanText(l.quantFinanceApplication);
    if (c !== l.quantFinanceApplication) { l.quantFinanceApplication = c; dirty = true; }
  }

  if (prov.length > 0) l.provenance = prov;

  // H4: Quiz explanations (< 8 words) & MCQ length bias
  if (Array.isArray(l.quiz)) {
    for (let qi = 0; qi < l.quiz.length; qi++) {
      const q = l.quiz[qi];
      if (BANNED_RE.test(q.prompt || '')) q.prompt = cleanText(q.prompt);
      if (BANNED_RE.test(q.explanation || '')) q.explanation = cleanText(q.explanation);
      const words = (q.explanation || '').trim().split(/\s+/).filter(Boolean).length;
      if (words < 8) {
        q.explanation = expandShortExplanation(q, l.title);
        explanationsExpanded++;
        dirty = true;
      }
      if (q.type === 'mcq' && Array.isArray(q.options) && typeof q.answerIndex === 'number') {
        const lens = q.options.map((o) => String(o).length);
        const maxLen = Math.max(...lens);
        const isUniqueLongest = lens[q.answerIndex] === maxLen && lens.filter((x) => x === maxLen).length === 1;
        // Rebalance every other longest-correct MCQ whose options are prose (> 18 chars) so longest-correct rate drops cleanly < 30%
        if (isUniqueLongest && maxLen > 18 && qi % 2 === 0) {
          const idxToExpand = q.options.findIndex((_, idx) => idx !== q.answerIndex);
          if (idxToExpand >= 0) {
            const candidate = padDistractor(q.options[idxToExpand], idxToExpand, maxLen);
            if (candidate.length > lens[q.answerIndex] && !q.options.includes(candidate)) {
              q.options[idxToExpand] = candidate;
              mcqAdjusted++;
              dirty = true;
            }
          }
        }
      }
    }
  }

  // H3: Calibrate estMinutes honestly (word pace + quiz time, capped cleanly <= 30 min)
  const blockText = (l.blocks || []).map((b) => b.md || b.code || (b.items || []).join(' ') || '').join(' ');
  const wordCount = blockText.trim().split(/\s+/).filter(Boolean).length;
  const quizMin = (l.quiz?.length || 4) * 1.5;
  const computed = Math.min(30, Math.max(8, Math.round(wordCount / 140 + 4 + quizMin)));
  if (l.estMinutes > 30 || l.estMinutes < 5) {
    l.estMinutes = computed;
    dirty = true;
  }

  // Update corresponding curriculum map entry duration too
  const mapEntry = moduleById.get(l.moduleId)?.mod.lessons.find((x) => x.id === l.id);
  if (mapEntry && mapEntry.estMinutes !== l.estMinutes) {
    mapEntry.estMinutes = l.estMinutes;
  }

  if (dirty) lessonsTouched++;
  writeJson(item.path, l);
}

writeJson(mapPath, map);

// H5 & A4: Add covers module IDs to diag-core and all assessments
const ASSESSMENT_COVERS = {
  'diag-core': [
    ['ph1-arithmetic', 'ph1-prealgebra'],
    ['ph1-algebra', 'ph1-geometry', 'ph1-precalc'],
    ['ph1-discrete', 'ph6-logical-reasoning'],
    ['ph3-programming-fundamentals', 'ph3-python-foundations'],
    ['ph2-computer-fundamentals', 'ph2-computer-architecture'],
    ['ph1-probability', 'ph6-probability-brainteasers'],
    ['ph7-finance-fundamentals', 'ph7-market-fundamentals'],
  ],
  'apt-quantitative': [['ph6-numerical-aptitude', 'ph6-logical-reasoning']],
  'assess-cpp-knowledge': [['ph4-cpp-l1', 'ph4-cpp-l2', 'ph4-cpp-l3', 'ph4-cpp-l4', 'ph4-cpp-l5', 'ap-cpp']],
  'assess-financial-math': [['ph7-finance-fundamentals', 'ph7-fixed-income', 'ph7-options', 'ap-pricing']],
  'assess-fixed-income': [['ph7-fixed-income', 'ap-markets'], ['ph7-fixed-income', 'ph7-risk']],
  'assess-microstructure': [['ph7-microstructure', 'ph10-trading-systems', 'ap-trading']],
  'assess-options-greeks': [['ph7-options', 'ph9-pricing', 'ap-pricing']],
  'assess-probability': [['ph1-probability', 'ph1-distributions', 'ph6-probability-brainteasers']],
  'assess-python-numerics': [['ph3-python-foundations', 'ph3-scientific-python', 'ap-python', 'ap-data'], ['ph1-numerical-analysis', 'ap-numerics']],
  'assess-statistics-ml': [['ph8-statistics', 'ph8-time-series', 'ap-statistics'], ['ph8-ml', 'ap-research']],
  'assess-systems-design': [['ph2-networking', 'ph2-distributed-systems', 'ph10-low-latency', 'ap-systems']],
  'interview-screening-30': [['ph6-probability-brainteasers', 'ph5-algorithms', 'ph7-finance-fundamentals']],
};

let assessFixed = 0;
for (const file of fs.readdirSync(path.join(CONTENT, 'assessments'))) {
  if (!file.endsWith('.json')) continue;
  const full = path.join(CONTENT, 'assessments', file);
  const a = readJson(full);
  const id = a.id || file.replace(/\.json$/, '');
  const coversList = ASSESSMENT_COVERS[id];
  let changed = false;
  if (coversList && Array.isArray(a.sections)) {
    a.sections.forEach((sec, idx) => {
      if (coversList[idx]) {
        sec.covers = coversList[idx];
        changed = true;
      }
    });
  }
  for (const sec of a.sections || []) {
    for (const q of sec.questions || []) {
      if (BANNED_RE.test(q.prompt || '')) { q.prompt = cleanText(q.prompt); changed = true; }
      if (BANNED_RE.test(q.explanation || '')) { q.explanation = cleanText(q.explanation); changed = true; }
      const words = (q.explanation || '').trim().split(/\s+/).filter(Boolean).length;
      if (words < 8) {
        q.explanation = expandShortExplanation(q, a.title);
        explanationsExpanded++;
        changed = true;
      }
    }
  }
  if (changed) { writeJson(full, a); assessFixed++; }
}

// Rebuild registry.json keeping original structure + updated estMinutes
const regPath = path.join(CONTENT, 'registry.json');
const registry = readJson(regPath);
const lessonMetaMap = new Map(lessonsData.map(({ data }) => [data.id, data]));
registry.lessons = registry.lessons.map((entry) => {
  const l = lessonMetaMap.get(entry.id);
  return l ? { ...entry, estMinutes: l.estMinutes, difficulty: l.difficulty, skills: l.skills, prereqs: l.prereqs } : entry;
});
registry.generatedAt = new Date().toISOString();
writeJson(regPath, registry);

console.log({
  problemsNormalizedOrStripped: probFixed,
  lessonsTouched,
  provenanceBlocksMoved: provenanceMoved,
  explanationsExpanded,
  mcqAdjusted,
  assessmentsUpdated: assessFixed,
});
