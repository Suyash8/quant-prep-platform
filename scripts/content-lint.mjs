#!/usr/bin/env node
/**
 * CI Content & Public Pack Guard (Section 11.8 / A2 / H1-H7).
 * Fails on internal QA leaks, 64-hex hashes, duplicated boilerplate sentences,
 * slug-soup, MCQ length bias (>35%), <8-word explanations, >30m lessons, or leaked answer keys in public/packs/v3.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const PACKS = path.join(ROOT, 'public', 'packs', 'v3');

const BANNED_RE = /(judge sign-off|qualification|app-runner|source fit|captured public contract|prevalidated inputs|this completes the named python function|exact public task contract hash|mechanism reference|declared teaching contracts|deliberate fragment|arunank\.com)/i;
const HEX64_RE = /\b[0-9a-f]{64}\b/i;
const SLUG_SOUP_RE = /\b[a-z]+(?:-[a-z0-9]+){1,4}(?:,\s*[a-z]+(?:-[a-z0-9]+){1,4}){3,}/;

const errors = [];

function walkJson(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJson(p, out);
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

function scanValue(val, file, fieldPath) {
  if (fieldPath === '.provenance' || fieldPath.startsWith('.provenance[')) return;
  const isRawCodeOrTest = /\.(code|solution|tests)\b/.test(fieldPath);
  if (typeof val === 'string') {
    if (BANNED_RE.test(val)) errors.push(`${path.relative(ROOT, file)} ${fieldPath}: banned QA prose`);
    if (!isRawCodeOrTest && HEX64_RE.test(val)) errors.push(`${path.relative(ROOT, file)} ${fieldPath}: 64-hex contract hash leaked`);
    if (!isRawCodeOrTest && SLUG_SOUP_RE.test(val)) errors.push(`${path.relative(ROOT, file)} ${fieldPath}: comma-separated slug-soup`);
  } else if (Array.isArray(val)) {
    val.forEach((v, i) => scanValue(v, file, `${fieldPath}[${i}]`));
  } else if (val && typeof val === 'object') {
    for (const [k, v] of Object.entries(val)) scanValue(v, file, `${fieldPath}.${k}`);
  }
}

const rwSeen = new Map();
const qfSeen = new Map();
let totalMcq = 0;
let longestCorrect = 0;

for (const f of walkJson(path.join(CONTENT, 'lessons'))) {
  const l = JSON.parse(fs.readFileSync(f, 'utf8'));
  scanValue(l, f, '');
  if ((l.estMinutes || 0) > 30) {
    errors.push(`${path.relative(ROOT, f)}: estMinutes ${l.estMinutes} exceeds 30m target`);
  }
  if (typeof l.realWorldApplication === 'string' && l.realWorldApplication.length >= 40) {
    rwSeen.set(l.realWorldApplication, (rwSeen.get(l.realWorldApplication) || 0) + 1);
  }
  if (typeof l.quantFinanceApplication === 'string' && l.quantFinanceApplication.length >= 40) {
    qfSeen.set(l.quantFinanceApplication, (qfSeen.get(l.quantFinanceApplication) || 0) + 1);
  }
  for (const q of l.quiz || []) {
    const words = String(q.explanation || '').trim().split(/\s+/).filter(Boolean).length;
    if (words < 8) {
      errors.push(`${path.relative(ROOT, f)} quiz.${q.id}: explanation < 8 words (${words})`);
    }
    if (q.type === 'mcq' && Array.isArray(q.options) && typeof q.answerIndex === 'number') {
      totalMcq++;
      const lens = q.options.map((o) => String(o).length);
      const maxLen = Math.max(...lens);
      if (lens[q.answerIndex] === maxLen && lens.filter((x) => x === maxLen).length === 1) {
        longestCorrect++;
      }
    }
  }
}

for (const [txt, n] of [...rwSeen.entries(), ...qfSeen.entries()]) {
  if (n >= 3) errors.push(`Repeated application boilerplate (${n}x): "${txt.slice(0, 60)}..."`);
}

const biasPct = totalMcq > 0 ? Math.round((longestCorrect / totalMcq) * 1000) / 10 : 0;
if (biasPct > 35) {
  errors.push(`Corpus MCQ longest-correct rate is ${biasPct}% (limit <= 35%)`);
}

for (const f of walkJson(path.join(CONTENT, 'problems'))) {
  const p = JSON.parse(fs.readFileSync(f, 'utf8'));
  scanValue(p, f, '');
  if (p.category === 'strings' || p.category === 'systems') {
    errors.push(`${path.relative(ROOT, f)}: deprecated duplicate category "${p.category}"`);
  }
}

for (const f of walkJson(path.join(CONTENT, 'assessments'))) {
  const a = JSON.parse(fs.readFileSync(f, 'utf8'));
  scanValue(a, f, '');
  if (a.id === 'diag-core') {
    for (const sec of a.sections || []) {
      if (!Array.isArray(sec.covers) || sec.covers.length === 0) {
        errors.push(`content/assessments/diag-core.json section "${sec.title}" missing covers[]`);
      }
    }
  }
}

// Verify public/packs/v3 strips all secret answer/solution keys
if (fs.existsSync(PACKS)) {
  for (const f of walkJson(path.join(PACKS, 'lessons'))) {
    const l = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (l.provenance) errors.push(`${path.relative(ROOT, f)}: leaked provenance`);
    for (const q of l.quiz || []) {
      if (q.answerIndex !== undefined || q.answerIndices !== undefined || q.answer !== undefined || q.modelAnswer !== undefined || q.keywords !== undefined || q.explanation !== undefined) {
        errors.push(`${path.relative(ROOT, f)} quiz.${q.id}: leaked answer key or explanation in public pack`);
      }
    }
  }
  for (const f of walkJson(path.join(PACKS, 'assessments'))) {
    if (f.endsWith('/index.json')) continue;
    const a = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const sec of a.sections || []) {
      for (const q of sec.questions || []) {
        if (q.answerIndex !== undefined || q.answerIndices !== undefined || q.answer !== undefined || q.modelAnswer !== undefined || q.keywords !== undefined || q.explanation !== undefined) {
          errors.push(`${path.relative(ROOT, f)} question.${q.id}: leaked answer key in public pack`);
        }
      }
    }
  }
  for (const f of walkJson(path.join(PACKS, 'problems'))) {
    if (f.endsWith('/index.json')) continue;
    const p = JSON.parse(fs.readFileSync(f, 'utf8'));
    if ((p.solutions && Object.keys(p.solutions).length > 0) || (Array.isArray(p.editorial) && p.editorial.length > 0)) {
      errors.push(`${path.relative(ROOT, f)}: leaked solutions or editorial in public pack`);
    }
  }
}

if (errors.length > 0) {
  console.error(`CONTENT LINT FAILED (${errors.length} issue(s)):`);
  for (const e of errors.slice(0, 40)) console.error(' -', e);
  process.exit(1);
}

console.log(`content-lint OK: MCQ longest-correct ${longestCorrect}/${totalMcq} (${biasPct}%), zero leaks, zero boilerplate.`);
