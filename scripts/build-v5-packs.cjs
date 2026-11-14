#!/usr/bin/env node
/**
 * Builds v5 packs from content-v5/. Plain Node, no TS.
 *  public/v5/manifest.json              {schema, contentVersion, packs:[{id,kind,path,bytes,sha256}]}
 *  public/v5/packs/<kind>-<sha12>.json  immutable, content-addressed (a changed pack gets a new file)
 *  src/lib/v5/questions.generated.json  SERVER index {"<packSha>:<questionId>": Question}; imported by the server only
 * packSha = sha256 of the canonical (sorted-key) JSON of the pack body. Items pack: one pack holding all items.
 * Problems are not built here yet (no content). Hidden tests will never be written to public/.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = process.cwd(), src = path.join(root, 'content-v5');
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((kk) => [kk, x[kk]])) : x));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const readDir = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : []);
const outDir = path.join(root, 'public', 'v5'), packDir = path.join(outDir, 'packs');
fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(packDir, { recursive: true });
const packs = []; const serverIndex = {};
const emit = (id, kind, body) => {
  const text = canon(body), h = sha(text), file = `${kind}-${h.slice(0, 12)}.json`;
  fs.writeFileSync(path.join(packDir, file), text);
  packs.push({ id, kind, path: `/v5/packs/${file}`, bytes: Buffer.byteLength(text), sha256: h });
  return h;
};
const map = fs.existsSync(path.join(src, 'curriculum/map.json')) ? JSON.parse(fs.readFileSync(path.join(src, 'curriculum/map.json'), 'utf8')) : null;
if (map) emit('curriculum-map', 'map', map);
const items = readDir(path.join(src, 'items')).flatMap((b) => (Array.isArray(b) ? b : b.items ?? [b])).sort((a, b) => (a.id < b.id ? -1 : 1));
if (items.length) { const h = emit('items', 'items', items); for (const q of items) serverIndex[`${h}:${q.id}`] = q; }
for (const l of readDir(path.join(src, 'lessons'))) emit(l.id, 'lesson', l);
// Problems: public pack (client-safe, derived HERE from the authored source) + server-only record (tests, checker, limits).
const limits = fs.existsSync(path.join(src, '_build/limits.json')) ? JSON.parse(fs.readFileSync(path.join(src, '_build/limits.json'), 'utf8')) : { problems: {} };
const leakGuard = require('./lib/v5-leak-guard.cjs');
const serverProblems = {}; const leaks = []; const noLimits = [];
for (const a of readDir(path.join(src, 'problems-src'))) {
  const { tests, solutions, limitsOverride, editorial, ...rest } = a;
  const pub = { ...rest, visibleTests: tests.filter((t) => !t.hidden).map((t) => ({ input: t.input, expected: t.expected })) };
  for (const k of ['editorial', 'solutions', 'tests', 'limitsOverride', 'limits']) if (k in pub) leaks.push(`${a.id}: public pack contains forbidden field ${k}`);
  const text = JSON.stringify(pub);
  for (const l of leakGuard.leaks(pub, tests)) leaks.push(`${a.id}: ${l}`);
  for (const k of ['python', 'cpp']) if ((solutions[k] ?? '').length > 40 && text.includes(JSON.stringify(solutions[k]).slice(1, -1))) leaks.push(`${a.id}: ${k} solution present in public pack`);
  // The judge rejects stdin over its cap (mini-services/code-runner MAX_STDIN_BYTES = 4 MiB) instead of judging: a test over it can never pass. Fail the BUILD, never ship it.
  for (const [i, t] of tests.entries()) if (Buffer.byteLength(t.input ?? '', 'utf8') > 4 * 1024 * 1024) leaks.push(`${a.id}: test ${i} input is ${Buffer.byteLength(t.input, 'utf8')} bytes, over the judge's 4 MiB stdin cap`);
  const m = limits.problems[a.id];
  if (!m || !m.ok) noLimits.push(a.id);
  const sha12 = emit(a.id, 'problem', pub);
  serverProblems[a.id] = { id: a.id, editorial, publicSha: sha12, checker: a.checker, tests, limits: m ? { python: limitsOverride?.python ?? m.python, cpp: limitsOverride?.cpp ?? m.cpp, provisional: true, toolchain: limits.toolchain } : null };
}
if (leaks.length) { console.error('[v5-packs] LEAK: ' + leaks.join('; ')); process.exit(1); }
if (noLimits.length) console.warn(`[v5-packs] WARN: no verified measured limits for: ${noLimits.join(', ')} (run scripts/measure-v5-limits.cjs)`);
// One server-only file per problem (tests can total >100 MB): the route reads only the problem it needs. Generated at build, never committed, never in a client pack.
const srvDir = path.join(root, 'src/lib/v5/server-problems'); fs.rmSync(srvDir, { recursive: true, force: true }); fs.mkdirSync(srvDir, { recursive: true });
for (const [id, v] of Object.entries(serverProblems)) fs.writeFileSync(path.join(srvDir, id + '.json'), JSON.stringify(v));
fs.rmSync(path.join(root, 'src/lib/v5/problems.server.generated.json'), { force: true });
const contentVersion = sha(packs.map((p) => p.id + p.sha256).join('|')).slice(0, 16);
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ schema: 5, contentVersion, packs }, null, 1));
fs.writeFileSync(path.join(root, 'src/lib/v5/questions.generated.json'), JSON.stringify(serverIndex));
console.log(`[v5-packs] ${packs.length} packs, ${items.length} items, ${Object.keys(serverProblems).length} problems, contentVersion ${contentVersion}`);
