#!/usr/bin/env node
/**
 * Builds the offline content packs for v3: static JSON under public/packs/v3/.
 *
 * The client store fetches these like any static asset. The service worker
 * caches them cache-first, so after "download everything" the whole app works
 * with zero network. Packs are content-addressed by version directory, so
 * they never go stale mid-session.
 *
 * Output:
 *   public/packs/v3/manifest.json            - pack index + counts + file list
 *   public/packs/v3/map.json                 - curriculum map + lesson registry
 *   public/packs/v3/lessons/<id>.json        - full lesson (quiz answers included
 *                                              for instant local grading)
 *   public/packs/v3/problems/index.json      - light problem list
 *   public/packs/v3/problems/<slug>.json     - problem without test data
 *   public/packs/v3/assessments/index.json
 *   public/packs/v3/assessments/<id>.json    - full assessment (answers included)
 *   public/packs/v3/projects/index.json
 *   public/packs/v3/projects/<slug>.json
 *   public/packs/v3/companies.json           - all company profiles + matrix
 */
const fs = require('fs');
const path = require('path');

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

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const contentDir = path.join(root, 'content');
  const map = readJson(path.join(contentDir, 'map', 'curriculum.json'));
  const registry = fs.existsSync(path.join(contentDir, 'registry.json'))
    ? readJson(path.join(contentDir, 'registry.json'))
    : { generatedAt: new Date().toISOString(), lessons: [] };

  // ---- map + registry ----
  writeJson('map.json', { map, registry });

  // ---- lessons ----
  let lessonCount = 0;
  const seen = new Set();
  for (const modDir of fs.readdirSync(path.join(contentDir, 'lessons')).sort()) {
    const modPath = path.join(contentDir, 'lessons', modDir);
    if (!fs.statSync(modPath).isDirectory()) continue;
    for (const f of fs.readdirSync(modPath).sort()) {
      if (!f.endsWith('.json')) continue;
      const lesson = readJson(path.join(modPath, f));
      if (seen.has(lesson.id)) continue;
      seen.add(lesson.id);
      writeJson(`lessons/${lesson.id}.json`, lesson);
      lessonCount++;
    }
  }

  // ---- problems (statement/editorial/hints/solutions; no test data) ----
  const probDir = path.join(contentDir, 'problems');
  const problemsIndex = [];
  // XP varies by difficulty so the reward system reads as real data, not filler
  const XP_BY_DIFFICULTY = { easy: 30, medium: 50, hard: 80 };
  for (const f of fs.readdirSync(probDir).sort()) {
    if (!f.endsWith('.json')) continue;
    const p = readJson(path.join(probDir, f));
    const { tests, ...rest } = p;
    // one-line pitch from the first statement paragraph, inline maths stripped
    const firstPara = (p.statement || []).find(b => b.type === 'p' && b.md);
    const summary = firstPara
      ? firstPara.md.replace(/\$[^$]*\$/g, '').replace(/[#*`>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 110).replace(/\s+\S*$/, '') + '…'
      : '';
    problemsIndex.push({
      slug: p.slug, title: p.title, difficulty: p.difficulty,
      category: p.category, tags: p.tags, estMinutes: p.estMinutes,
      xp: XP_BY_DIFFICULTY[p.difficulty] ?? 30, summary,
    });
    writeJson(`problems/${p.slug}.json`, rest);
  }
  writeJson('problems/index.json', problemsIndex);

  // ---- assessments ----
  const assessDir = path.join(contentDir, 'assessments');
  const assessIndex = [];
  for (const f of fs.readdirSync(assessDir).sort()) {
    if (!f.endsWith('.json')) continue;
    const a = readJson(path.join(assessDir, f));
    assessIndex.push({
      id: a.id, title: a.title, kind: a.kind, timeLimitMinutes: a.timeLimitMinutes,
      questionCount: (a.sections || []).reduce((n, s) => n + (s.questions || []).length, 0),
    });
    writeJson(`assessments/${a.id}.json`, a);
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
  writeJson('projects/index.json', projIndex);

  // ---- companies + matrix ----
  const companies = [];
  const compDir = path.join(contentDir, 'companies');
  for (const f of fs.readdirSync(compDir).sort()) {
    if (!f.endsWith('.json') || f === '_matrix.json') continue;
    companies.push(readJson(path.join(compDir, f)));
  }
  const matrixPath = path.join(compDir, '_matrix.json');
  const matrix = fs.existsSync(matrixPath) ? readJson(matrixPath) : null;
  writeJson('companies.json', { companies, matrix });

  // ---- manifest (full file list for "download everything") ----
  const files = [];
  function walk(dir, relPrefix) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = `${relPrefix}${e.name}`;
      if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}/`);
      else files.push(`/packs/v3/${rel}`);
    }
  }
  walk(OUT, '');

  const manifest = {
    version: VERSION,
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
  console.log(`[packs] v${VERSION}: ${lessonCount} lessons, ${problemsIndex.length} problems, ${assessIndex.length} assessments, ${projIndex.length} projects, ${companies.length} companies`);
  console.log(`[packs] ${files.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB total`);
}

main();
