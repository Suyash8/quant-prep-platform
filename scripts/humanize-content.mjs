// Humanize all content copy with the LLM skill (z-ai-web-dev-sdk).
//
// Usage:
//   node scripts/humanize-content.mjs --types lessons,problems --limit 5 [--concurrency 6]
//   node scripts/humanize-content.mjs --apply   # copy staged files over content/ after validation
//
// Safety:
//   - Only prose fields are sent for rewriting; ids, answers, code, math
//     delimiters, test data are never touched.
//   - Every rewritten string is validated ($-count, backtick-count, length
//     ratio, no em/en dashes). Failures fall back to a deterministic
//     transform so a run always completes.
//   - Output goes to content/.humanized/<type>/<relpath> first (checkpoint),
//     --apply validates structure and copies over.

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const STAGE = path.join(ROOT, 'content', '.humanized');

const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  return args[i + 1];
}
const TYPES = (arg('types', 'lessons') || '').split(',');
const LIMIT = parseInt(arg('limit', '0'), 10);
const CONC = parseInt(arg('concurrency', '6'), 10);
const APPLY = args.includes('--apply');
const REDO = args.includes('--redo');

function stagedQuality(type, rel) {
  const p = path.join(STAGE, type, rel + '.stats.json');
  if (!fs.existsSync(p)) return { llm: 0, det: 0 };
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { llm: 0, det: 0 }; }
}

// ---------- extraction: given parsed JSON, return [{path, get, set, text}] ----------
function collect(obj, fn, prefix = '') {
  const out = [];
  fn(obj, (path, getter, setter) => out.push({ path, getter, setter }), prefix);
  return out.filter(e => typeof e.getter() === 'string' && e.getter().trim().length > 0);
}

function walkBlocks(blocks, emit, prefix) {
  blocks.forEach((b, i) => {
    if (b.type === 'p') emit(`${prefix}.blocks[${i}].md`, () => b.md, v => (b.md = v));
    if (b.type === 'callout') {
      emit(`${prefix}.blocks[${i}].callout.title`, () => b.title, v => (b.title = v));
      emit(`${prefix}.blocks[${i}].callout.md`, () => b.md, v => (b.md = v));
    }
    if (b.type === 'list') b.items.forEach((it, j) => emit(`${prefix}.blocks[${i}].items[${j}]`, () => it, v => (b.items[j] = v)));
    if (b.type === 'steps') b.items.forEach((it, j) => emit(`${prefix}.blocks[${i}].steps[${j}]`, () => it, v => (b.items[j] = v)));
  });
}

function strArrEmitter(list, prefix) {
  return (_o, emit) => list.forEach((it, j) => emit(`${prefix}[${j}]`, () => it, v => (list[j] = v)));
}

function extractLessons(d) {
  const emitters = [];
  emitters.push((_o, emit) => emit('motivation', () => d.motivation, v => (d.motivation = v)));
  if (Array.isArray(d.objectives)) emitters.push(strArrEmitter(d.objectives, 'objectives'));
  if (Array.isArray(d.commonMistakes)) emitters.push(strArrEmitter(d.commonMistakes, 'commonMistakes'));
  if (Array.isArray(d.summary)) emitters.push(strArrEmitter(d.summary, 'summary'));
  if (d.realWorldApplication) emitters.push((_o, emit) => emit('realWorldApplication', () => d.realWorldApplication, v => (d.realWorldApplication = v)));
  if (d.quantFinanceApplication) emitters.push((_o, emit) => emit('quantFinanceApplication', () => d.quantFinanceApplication, v => (d.quantFinanceApplication = v)));
  for (const key of ['guidedExercise', 'independentExercise']) {
    const ex = d[key];
    if (!ex) continue;
    emitters.push((_o, emit) => emit(`${key}.prompt`, () => ex.prompt, v => (ex.prompt = v)));
    if (Array.isArray(ex.hints)) emitters.push(strArrEmitter(ex.hints, `${key}.hints`));
  }
  emitters.push((_o, emit) => walkBlocks(d.blocks || [], emit, ''));
  (d.quiz || []).forEach((q, qi) => {
    emitters.push((_o, emit) => emit(`quiz[${qi}].prompt`, () => q.prompt, v => (q.prompt = v)));
    if (Array.isArray(q.options)) emitters.push((_o, emit) => q.options.forEach((o, oi) => emit(`quiz[${qi}].options[${oi}]`, () => o, v => (q.options[oi] = v))));
    emitters.push((_o, emit) => emit(`quiz[${qi}].explanation`, () => q.explanation, v => (q.explanation = v)));
  });
  (d.flashcards || []).forEach((c, ci) => {
    emitters.push((_o, emit) => emit(`flashcards[${ci}].front`, () => c.front, v => (c.front = v)));
    emitters.push((_o, emit) => emit(`flashcards[${ci}].back`, () => c.back, v => (c.back = v)));
  });
  return emitters.flatMap(fn => collect(d, fn));
}

function extractProblems(d) {
  const emitters = [];
  emitters.push((_o, emit) => walkBlocks(d.statement || [], emit, 'statement'));
  emitters.push((_o, emit) => emit('inputFormat', () => d.inputFormat, v => (d.inputFormat = v)));
  emitters.push((_o, emit) => emit('outputFormat', () => d.outputFormat, v => (d.outputFormat = v)));
  if (Array.isArray(d.constraints)) emitters.push(strArrEmitter(d.constraints, 'constraints'));
  if (Array.isArray(d.hints)) emitters.push(strArrEmitter(d.hints, 'hints'));
  if (Array.isArray(d.editorial)) emitters.push((_o, emit) => walkBlocks(d.editorial, emit, 'editorial'));
  return emitters.flatMap(fn => collect(d, fn));
}

function extractAssessments(d) {
  const emitters = [];
  emitters.push((_o, emit) => emit('description', () => d.description, v => (d.description = v)));
  (d.sections || []).forEach((s, si) => (s.questions || []).forEach((q, qi) => {
    emitters.push((_o, emit) => emit(`sections[${si}].questions[${qi}].prompt`, () => q.prompt, v => (q.prompt = v)));
    if (Array.isArray(q.options)) emitters.push((_o, emit) => q.options.forEach((o, oi) => emit(`sections[${si}].questions[${qi}].options[${oi}]`, () => o, v => (q.options[oi] = v))));
    emitters.push((_o, emit) => emit(`sections[${si}].questions[${qi}].explanation`, () => q.explanation, v => (q.explanation = v)));
  }));
  return emitters.flatMap(fn => collect(d, fn));
}

function extractProjects(d) {
  const emitters = [];
  for (const key of ['context', 'problem', 'designGuidance']) {
    if (typeof d[key] === 'string') emitters.push((_o, emit) => emit(key, () => d[key], v => (d[key] = v)));
  }
  for (const key of ['requirements', 'evaluationCriteria', 'documentationRequirements', 'extensionChallenges']) {
    if (Array.isArray(d[key])) {
      const isBlocks = d[key].some(x => x && typeof x === 'object');
      if (isBlocks) emitters.push((_o, emit) => walkBlocks(d[key], emit, key));
      else emitters.push(strArrEmitter(d[key], key));
    }
  }
  (d.milestones || []).forEach((m, mi) => {
    emitters.push((_o, emit) => emit(`milestones[${mi}].title`, () => m.title, v => (m.title = v)));
    emitters.push((_o, emit) => emit(`milestones[${mi}].detail`, () => m.detail, v => (m.detail = v)));
  });
  return emitters.flatMap(fn => collect(d, fn));
}

function extractCompanies(d) {
  const emitters = [];
  emitters.push((_o, emit) => emit('notes', () => d.notes, v => (d.notes = v)));
  (d.roles || []).forEach((r, ri) => {
    emitters.push((_o, emit) => emit(`roles[${ri}].notes`, () => r.notes, v => (r.notes = v)));
  });
  if (Array.isArray(d.competencyAreas)) emitters.push(strArrEmitter(d.competencyAreas, 'competencyAreas'));
  if (Array.isArray(d.publishedExpectations)) {
    // may be strings or objects with text fields
    d.publishedExpectations.forEach((e, ei) => {
      if (typeof e === 'string') emitters.push((_o, emit) => emit(`publishedExpectations[${ei}]`, () => e, v => (d.publishedExpectations[ei] = v)));
      else if (e && typeof e.note === 'string') emitters.push((_o, emit) => emit(`publishedExpectations[${ei}].note`, () => e.note, v => (e.note = v)));
    });
  }
  return emitters.flatMap(fn => collect(d, fn));
}

function extractMap(d) {
  const emitters = [];
  (d.phases || []).forEach((p, pi) => {
    emitters.push((_o, emit) => emit(`phases[${pi}].summary`, () => p.summary, v => (p.summary = v)));
    (p.modules || []).forEach((m, mi) => {
      emitters.push((_o, emit) => emit(`phases[${pi}].modules[${mi}].summary`, () => m.summary, v => (m.summary = v)));
    });
  });
  Object.entries(d.tracks || {}).forEach(([k, t]) => {
    emitters.push((_o, emit) => emit(`tracks.${k}.focus`, () => t.focus, v => (t.focus = v)));
    emitters.push((_o, emit) => emit(`tracks.${k}.employers`, () => t.employers, v => (t.employers = v)));
  });
  return emitters.flatMap(fn => collect(d, fn));
}

const SPECS = {
  lessons: { dir: 'content/lessons', glob: '**/*.json', extract: extractLessons },
  problems: { dir: 'content/problems', glob: '*.json', extract: extractProblems },
  assessments: { dir: 'content/assessments', glob: '*.json', extract: extractAssessments },
  projects: { dir: 'content/projects', glob: '*.json', extract: extractProjects },
  companies: { dir: 'content/companies', glob: '*.json', extract: extractCompanies },
  map: { dir: 'content/map', glob: '*.json', extract: extractMap },
};

function listFiles(dir, glob) {
  const out = [];
  const walk = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.json')) out.push(full);
    }
  };
  walk(path.join(ROOT, dir));
  return out.sort();
}

// ---------- shared text safety ----------
// Split a string into segments, protecting inline math ($...$) and code (`...`)
// from any transformation.
function protectSplit(t) {
  return t.split(/(\$[^$\n]*\$|`[^`\n]*`)/g);
}

const TITLE_PATH = /(\.title$|blocks\[\d+\]\.(h2|h3)$|flashcards\[\d+\]\.front$)/;

// Fix soft dashes " - " used as clause separators. Title-ish strings get a
// colon, prose gets a period (capital follows) or comma.
function polish(t, isTitle) {
  return protectSplit(t).map(seg => {
    if (seg.startsWith('$') || seg.startsWith('`')) return seg;
    let out = seg.split('\n').map(line => {
      if (/^\s*[-*+]\s/.test(line)) return line; // markdown list item
      if (isTitle) return line.replace(/(\S) - (\S)/g, '$1: $2');
      return line.replace(/(\S) - (\S)/g, (m, a, b) => (/[A-Z]/.test(b) ? `${a}. ${b}` : `${a}, ${b}`));
    }).join('\n');
    out = out.replace(/(\d) - (\d)/g, '$1 to $2');
    return out;
  }).join('');
}

// ---------- deterministic fallback ----------
const SWAPS = [
  [/\brobust\b/gi, 'solid'], [/\brobustly\b/gi, 'solidly'], [/\brobustness\b/gi, 'reliability'],
  [/\bleverage\b/gi, 'use'], [/\bleveraging\b/gi, 'using'],
  [/\bjourney\b/gi, 'path'], [/\bjourneys\b/gi, 'paths'],
  [/\bcrucial\b/gi, 'critical'], [/\bpivotal\b/gi, 'key'],
  [/\bseamless\b/gi, 'smooth'], [/\bseamlessly\b/gi, 'smoothly'],
  [/\bcomprehensive\b/gi, 'thorough'], [/\bdelve\b/gi, 'dig'], [/\bdelve into\b/gi, 'dig into'],
  [/\bmyriad\b/gi, 'countless'], [/\bplethora\b/gi, 'loads'],
  [/\barsenal\b/gi, 'toolkit'], [/\bunderscore\b/gi, 'show'],
  [/\bnotably\b/gi, 'in particular'], [/\barguably\b/gi, 'possibly'],
  [/\bempower\b/gi, 'enable'], [/\belevate\b/gi, 'raise'],
];
function detokOnce(seg) {
  let t = seg;
  // em-dash between spaces: pick comma or period based on what follows
  t = t.replace(/\s+—\s+/g, (m, off, str) => {
    const after = str.slice(off + m.length, off + m.length + 1);
    return /[A-Z]/.test(after) ? '. ' : ', ';
  });
  // em/en dash glued between words
  t = t.replace(/(\w)—(\w)/g, '$1, $2').replace(/(\w)–(\w)/g, '$1 to $2');
  // numeric ranges like 1–20
  t = t.replace(/(\d)\s*–\s*(\d)/g, '$1 to $2');
  // any leftovers
  t = t.replace(/[—]/g, ', ').replace(/–/g, ' ');
  // soft dashes used as clause separators (skip list items)
  t = t.split('\n').map(line => {
    if (/^\s*[-*+]\s/.test(line)) return line;
    return line.replace(/(\S) - (\S)/g, (m, a, b) => (/[A-Z]/.test(b) ? `${a}. ${b}` : `${a}, ${b}`));
  }).join('\n');
  for (const [re, rep] of SWAPS) t = t.replace(re, (m0) => m0[0] === m0[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep);
  t = t.replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ');
  return t;
}
function detok(s) {
  return protectSplit(s).map(seg => {
    if (seg.startsWith('$') || seg.startsWith('`')) return seg;
    return detokOnce(seg);
  }).join('');
}

// ---------- validation ----------
function validateOne(orig, out) {
  if (typeof out !== 'string') return 'not-string';
  if (!out.trim()) return 'empty';
  if (/[—–]/.test(out)) return 'dash';
  const dollars = (s) => (s.match(/\$/g) || []).length;
  if (dollars(orig) !== dollars(out)) return 'math';
  const ticks = (s) => (s.match(/`/g) || []).length;
  if (ticks(orig) !== ticks(out)) return 'code';
  const r = out.length / Math.max(orig.trim().length, 1);
  if (r < 0.45 || r > 2.4) return 'length';
  if (/```/.test(out) && !/```/.test(orig)) return 'fence';
  return null;
}

// ---------- LLM ----------
const SYSTEM = `You are a copy editor for a hands-on coding education platform. You rewrite stiff, AI-flavored teaching text so it reads like a sharp human mentor wrote it.

Hard rules:
1. NEVER output an em-dash (—) or en-dash (–). Use a comma, period, colon, or parentheses instead. For numeric ranges write "1 to 20".
1b. NEVER join clauses with " - " (space hyphen space). A hyphen is only for hyphenated words like "risk-free" or "long-horizon". To join clauses use a period, comma, colon, or parentheses.
2. Use plain words a real person says. Drop AI-flavored words: journey, leverage, robust, crucial, pivotal, comprehensive, seamless, empower, elevate, delve, myriad, plethora, arsenal, notably, underscore, arguably, landscape (as metaphor), tapestry, testament.
3. Keep the exact same meaning, facts, numbers, names, and claims. Add nothing, remove nothing.
4. Copy inline math between $...$ character for character. Copy code in backticks character for character. Keep markdown links intact.
5. Sound like a good teacher talking to one student: direct, warm, concrete. Contractions are fine. Mix short and medium sentences. No dramatic openings, no "In conclusion".
6. Keep each string close to its original length (within 25%).

Input is a JSON object: id -> original string. Output ONLY a JSON object with the exact same ids and the rewritten strings. No markdown fences, no commentary.`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// global request pacer: minimum gap between request starts
let lastReqAt = 0;
const MIN_GAP_MS = 2200;
async function pacedGate() {
  const now = Date.now();
  const wait = Math.max(0, lastReqAt + MIN_GAP_MS - now);
  if (wait > 0) await sleep(wait);
  lastReqAt = Date.now();
}

async function callLLM(zai, entries, signal) {
  const input = {};
  for (const e of entries) input[e.path] = e.getter();
  let lastErr = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      await pacedGate();
      const res = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: SYSTEM },
          { role: 'user', content: 'Rewrite every string per the rules. Input:\n' + JSON.stringify(input) },
        ],
        thinking: { type: 'disabled' },
      }, { signal });
      let txt = res.choices?.[0]?.message?.content || '';
      txt = txt.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      const start = txt.indexOf('{');
      const end = txt.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('no json');
      return JSON.parse(txt.slice(start, end + 1));
    } catch (e) {
      lastErr = e;
      const is429 = /429|Too many/i.test(String(e?.message || e));
      const backoff = is429 ? (12000 + attempt * 14000 + Math.random() * 4000) : (2500 + attempt * 3000);
      await sleep(backoff);
    }
  }
  throw lastErr || new Error('llm failed');
}

async function humanizeFile(zai, spec, file) {
  const rel = path.relative(path.join(ROOT, spec.dir), file);
  const stagePath = path.join(STAGE, specKey, rel);
  if (fs.existsSync(stagePath)) return { skipped: true };

  const raw = fs.readFileSync(file, 'utf8');
  const d = JSON.parse(raw);
  const entries = spec.extract(d);
  if (!entries.length) return { skipped: true };

  const stats = { llm: 0, det: 0 };
  // snapshot originals for integrity checks (quiz options must stay distinct)
  const originals = new Map(entries.map(e => [e.path, e.getter()]));
  // batch entries into chunks of ~12000 chars to keep prompts safe
  const batches = [];
  let cur = [];
  let size = 0;
  for (const e of entries) {
    const l = e.getter().length;
    if (size + l > 12000 && cur.length) { batches.push(cur); cur = []; size = 0; }
    cur.push(e); size += l;
  }
  if (cur.length) batches.push(cur);

  for (const batch of batches) {
    let out = null;
    try {
      out = await callLLM(zai, batch);
    } catch (e) {
      console.log(`    llm batch failed (${e.message}), using fallback`);
    }
    for (const e of batch) {
      const orig = e.getter();
      const cand = out?.[e.path];
      const isTitle = TITLE_PATH.test(e.path);
      const problem = validateOne(orig, cand);
      if (!problem) { e.setter(polish(cand.trim(), isTitle)); stats.llm++; }
      else { e.setter(detok(orig)); stats.det++; }
    }
  }
  // integrity: quiz/assessment options must remain distinct within a question
  const optGroups = new Map();
  for (const e of entries) {
    const m = e.path.match(/^(.*)\.options\[\d+\]$/);
    if (m) {
      if (!optGroups.has(m[1])) optGroups.set(m[1], []);
      optGroups.get(m[1]).push(e);
    }
  }
  for (const [, opts] of optGroups) {
    const vals = opts.map(o => o.getter());
    if (new Set(vals).size !== vals.length) {
      for (const o of opts) o.setter(detok(originals.get(o.path)));
      stats.det += opts.length;
    }
  }
  fs.mkdirSync(path.dirname(stagePath), { recursive: true });
  fs.writeFileSync(stagePath, JSON.stringify(d, null, 2) + '\n');
  fs.writeFileSync(stagePath + '.stats.json', JSON.stringify(stats));
  return stats;
}

// ---------- apply ----------
function structuralCheck(origPath, stagePath) {
  const a = JSON.parse(fs.readFileSync(origPath, 'utf8'));
  const b = JSON.parse(fs.readFileSync(stagePath, 'utf8'));
  const shape = (x, depth = 0) => {
    if (depth > 8 || x === null || typeof x !== 'object') return typeof x;
    if (Array.isArray(x)) return `[${x.map(i => shape(i, depth + 1)).join(',')}]`;
    const ks = Object.keys(x).sort();
    return `{${ks.map(k => k + ':' + shape(x[k], depth + 1)).join(',')}}`;
  };
  return shape(a) === shape(b);
}

// ---------- main ----------
let specKey = '';
async function main() {
  if (APPLY) {
    let n = 0, bad = 0;
    for (const type of Object.keys(SPECS)) {
      const spec = SPECS[type];
      const stageDir = path.join(STAGE, type);
      if (!fs.existsSync(stageDir)) continue;
      for (const f of listFiles(stageDir, '**/*.json')) {
        const rel = path.relative(stageDir, f);
        const orig = path.join(ROOT, spec.dir, rel);
        if (!structuralCheck(orig, f)) { console.log(`SHAPE MISMATCH: ${type}/${rel}`); bad++; continue; }
        fs.copyFileSync(f, orig);
        n++;
      }
    }
    console.log(`applied ${n} files, ${bad} shape mismatches skipped`);
    return;
  }

  const zai = await ZAI.create();
  const stats = { llm: 0, det: 0, skipped: 0, files: 0 };
  for (const type of TYPES) {
    specKey = type;
    const spec = SPECS[type];
    if (!spec) { console.log(`unknown type ${type}`); continue; }
    let files = listFiles(spec.dir, spec.glob);
    // filter out already-staged files (or low-quality ones when --redo)
    files = files.filter(f => {
      const rel = path.relative(path.join(ROOT, spec.dir), f);
      const staged = path.join(STAGE, type, rel);
      if (!fs.existsSync(staged)) return true;
      if (REDO) {
        const q = stagedQuality(type, rel);
        const total = q.llm + q.det;
        if (total > 0 && q.det / total > 0.2) {
          fs.rmSync(staged);
          fs.rmSync(staged + '.stats.json', { force: true });
          return true;
        }
      }
      return false;
    });
    if (LIMIT > 0) files = files.slice(0, LIMIT);
    console.log(`[${type}] ${files.length} files to process`);
    let idx = 0;
    async function worker(wid) {
      while (true) {
        const my = idx++;
        if (my >= files.length) return;
        const f = files[my];
        try {
          const r = await humanizeFile(zai, spec, f);
          if (r.skipped) { stats.skipped++; continue; }
          stats.llm += r.llm; stats.det += r.det; stats.files++;
          if (stats.files % 10 === 0) console.log(`  progress: ${stats.files}/${files.length} (llm ${stats.llm}, det ${stats.det})`);
        } catch (e) {
          console.log(`  ERROR ${path.basename(f)}: ${e.message}`);
        }
      }
    }
    await Promise.all(Array.from({ length: CONC }, (_, i) => worker(i)));
  }
  console.log(`DONE files=${stats.files} llm=${stats.llm} det=${stats.det} skipped=${stats.skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
