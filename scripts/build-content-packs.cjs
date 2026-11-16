#!/usr/bin/env node
/**
 * Builds two clean outputs:
 *   1. content/index.json          - Light metadata index (problems, assessments, projects, companies, labCount)
 *                                    so SSR/runtime never parses 90 MB of problem test data per request (F3).
 *   2. public/packs/v3/            - Two-tier public offline packs (A2): ALL secret quiz answer keys,
 *                                    short-answer keywords, solutions, and internal provenance are STRIPPED!
 *                                    Answers & editorials are served only by authenticated /api/packs/answers/...
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = process.cwd();
const OUT = path.join(root, 'public', 'packs', 'v3');
const VERSION = require(path.join(root, 'package.json')).version;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(rel, data) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data));
}

function sanitizeQuizQuestion(q) {
  const {
    answerIndex: _ai,
    answerIndices: _ais,
    answer: _ans,
    tolerance: _tol,
    modelAnswer: _ma,
    keywords: _kw,
    sampleOutput: _so,
    explanation: _exp,
    ...safe
  } = q;
  return safe;
}

function sanitizeLessonForPublicPack(lesson, contentHash) {
  const { provenance: _prov, ...rest } = lesson;
  return {
    ...rest,
    contentHash,
    quiz: Array.isArray(lesson.quiz) ? lesson.quiz.map(sanitizeQuizQuestion) : [],
  };
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const contentDir = path.join(root, 'content');
  const map = readJson(path.join(contentDir, 'map', 'curriculum.json'));
  const registry = fs.existsSync(path.join(contentDir, 'registry.json'))
    ? readJson(path.join(contentDir, 'registry.json'))
    : { generatedAt: new Date().toISOString(), lessons: [] };

  writeJson('map.json', { map, registry });

  // ---- lessons (sanitized, no answer keys or provenance) ----
  let lessonCount = 0;
  const seen = new Set();
  const labNames = new Set();
  const hashAccum = crypto.createHash('sha256');

  for (const modDir of fs.readdirSync(path.join(contentDir, 'lessons')).sort()) {
    const modPath = path.join(contentDir, 'lessons', modDir);
    if (!fs.statSync(modPath).isDirectory()) continue;
    for (const f of fs.readdirSync(modPath).sort()) {
      if (!f.endsWith('.json')) continue;
      const rawText = fs.readFileSync(path.join(modPath, f), 'utf8');
      const lesson = JSON.parse(rawText);
      if (seen.has(lesson.id)) continue;
      seen.add(lesson.id);

      for (const b of lesson.blocks || []) {
        if (b && typeof b.component === 'string') labNames.add(b.component);
      }

      const lHash = crypto.createHash('sha256').update(rawText).digest('hex').slice(0, 16);
      hashAccum.update(lHash);
      writeJson(`lessons/${lesson.id}.json`, sanitizeLessonForPublicPack(lesson, lHash));
      lessonCount++;
    }
  }

  // ---- problems (strip tests, solutions, AND editorial from public pack — unlocked after solve/give-up via API) ----
  const probDir = path.join(contentDir, 'problems');
  const problemsIndex = [];
  const problemsMetaForServer = [];
  const XP_BY_DIFFICULTY = { easy: 30, medium: 50, hard: 80 };
  for (const f of fs.readdirSync(probDir).sort()) {
    if (!f.endsWith('.json')) continue;
    const p = readJson(path.join(probDir, f));
    const { tests: _t, solutions: _s, editorial: _e, ...rest } = p;
    const firstPara = (p.statement || []).find((b) => b.type === 'p' && b.md);
    const summary = firstPara
      ? firstPara.md.replace(/\$[^$]*\$/g, '').replace(/[#*`>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 110).replace(/\s+\S*$/, '') + '…'
      : '';
    problemsIndex.push({
      slug: p.slug, title: p.title, difficulty: p.difficulty,
      category: p.category, tags: p.tags, estMinutes: p.estMinutes,
      xp: XP_BY_DIFFICULTY[p.difficulty] ?? 30, summary,
    });
    problemsMetaForServer.push({
      slug: p.slug, title: p.title, difficulty: p.difficulty,
      category: p.category, tags: p.tags, estMinutes: p.estMinutes,
    });
    writeJson(`problems/${p.slug}.json`, rest);
  }
  problemsMetaForServer.sort((a, b) => a.title.localeCompare(b.title));
  writeJson('problems/index.json', problemsIndex);

  // ---- assessments (strip all quiz answer fields & explanations from public pack) ----
  const assessDir = path.join(contentDir, 'assessments');
  const assessIndex = [];
  for (const f of fs.readdirSync(assessDir).sort()) {
    if (!f.endsWith('.json')) continue;
    const a = readJson(path.join(assessDir, f));
    assessIndex.push({
      id: a.id, title: a.title, kind: a.kind, timeLimitMinutes: a.timeLimitMinutes,
      questionCount: (a.sections || []).reduce((n, s) => n + (s.questions || []).length, 0),
    });
    const sanitizedAssessment = {
      ...a,
      sections: (a.sections || []).map((sec) => ({
        ...sec,
        questions: (sec.questions || []).map(sanitizeQuizQuestion),
      })),
    };
    writeJson(`assessments/${a.id}.json`, sanitizedAssessment);
  }
  writeJson('assessments/index.json', assessIndex);

  // ---- projects ----
  const projDir = path.join(contentDir, 'projects');
  const projIndex = [];
  for (const f of fs.readdirSync(projDir).sort()) {
    if (!f.endsWith('.json')) continue;
    const p = readJson(path.join(projDir, f));
    projIndex.push({
      slug: p.slug, title: p.title, order: p.order,
      difficulty: p.difficulty, language: p.language,
    });
    writeJson(`projects/${p.slug}.json`, p);
  }
  projIndex.sort((a, b) => a.order - b.order);
  writeJson('projects/index.json', projIndex);

  // ---- companies + matrix ----
  const companies = [];
  const companiesIndex = [];
  const compDir = path.join(contentDir, 'companies');
  for (const f of fs.readdirSync(compDir).sort()) {
    if (!f.endsWith('.json') || f === '_matrix.json') continue;
    const c = readJson(path.join(compDir, f));
    companies.push(c);
    companiesIndex.push({ slug: c.slug, name: c.name, category: c.category });
  }
  companiesIndex.sort((a, b) => a.name.localeCompare(b.name));
  const matrixPath = path.join(compDir, '_matrix.json');
  const matrix = fs.existsSync(matrixPath) ? readJson(matrixPath) : null;
  writeJson('companies.json', { companies, matrix });

  // Write server-side metadata index (content/index.json)
  fs.writeFileSync(
    path.join(contentDir, 'index.json'),
    JSON.stringify({
      problems: problemsMetaForServer,
      assessments: assessIndex,
      projects: projIndex,
      companies: companiesIndex,
      labCount: labNames.size,
    }),
  );

  // ---- manifest ----
  const files = [];
  function walk(dir, relPrefix) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = `${relPrefix}${e.name}`;
      if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}/`);
      else files.push(`/packs/v3/${rel}`);
    }
  }
  walk(OUT, '');

  const contentHash = hashAccum.digest('hex').slice(0, 16);
  const manifest = {
    version: VERSION,
    contentHash,
    builtAt: new Date().toISOString(),
    counts: {
      lessons: lessonCount,
      problems: problemsIndex.length,
      assessments: assessIndex.length,
      projects: projIndex.length,
      companies: companies.length,
    },
    index: {
      map: '/packs/v3/map.json',
      problems: '/packs/v3/problems/index.json',
      assessments: '/packs/v3/assessments/index.json',
      projects: '/packs/v3/projects/index.json',
      companies: '/packs/v3/companies.json',
    },
    files,
  };
  writeJson('manifest.json', manifest);

  const totalBytes = files.reduce((n, f) => n + fs.statSync(path.join(root, 'public', f.slice(1))).size, 0);
  console.log(`[packs] v${VERSION} (${contentHash}): ${lessonCount} lessons, ${problemsIndex.length} problems, ${assessIndex.length} assessments, ${projIndex.length} projects, ${companies.length} companies`);
  console.log(`[packs] ${files.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB total`);
}

main();
