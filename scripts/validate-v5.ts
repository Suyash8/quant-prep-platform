/**
 * v5 content validator. Run: bun scripts/validate-v5.ts [contentDir]   (default content-v5). Exit 1 on any error.
 * Reads the content owner's curriculum map (curriculum/map.json: {modules:[{id,order,prerequisiteModuleIds,lessons:[{id,order,prerequisiteLessonIds,conceptIds}]}]}).
 * It never invents ids: unresolved references are errors. Strict, no relaxation flags.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { validateShortText } from '../src/lib/grade5';

const LESSON = /^qf5-[a-z0-9]+(-[a-z0-9]+)+$/;
const CONCEPT = /^qf5-[a-z0-9-]+\.[a-z0-9-]+(\.[a-z0-9-]+)*$/;
const PROBLEM = /^qfp-[a-z0-9-]+$/;
export type Report = { errors: string[]; warnings: string[]; stats: Record<string, number> };

const readJson = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
const listJson = (d: string) => (existsSync(d) ? readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => path.join(d, f)) : []);

export function validate(dir: string): Report {
  const errors: string[] = [], warnings: string[] = [], stats: Record<string, number> = {};
  const mapFile = path.join(dir, 'curriculum/map.json');
  if (!existsSync(mapFile)) return { errors: [`missing ${mapFile}`], warnings, stats };
  const map = readJson(mapFile);
  const lessons = new Map<string, { deps: string[]; concepts: string[] }>();
  const concepts = new Set<string>();
  const status = new Map<string, string>();
  // Map shape A (current): top-level lessons[{id,prerequisites,conceptIds,status}] and concepts[{id,lessonId}]. Shape B (older proposal): modules[].lessons[].
  const flat: any[] = Array.isArray(map.lessons) ? map.lessons : (map.modules ?? []).flatMap((m: any) => (m.lessons ?? []).map((l: any) => ({ ...l, prerequisites: l.prerequisiteLessonIds })));
  for (const l of flat) {
    if (!LESSON.test(l.id)) errors.push(`lesson id invalid: ${l.id}`);
    if (lessons.has(l.id)) errors.push(`duplicate lesson id: ${l.id}`);
    lessons.set(l.id, { deps: l.prerequisites ?? [], concepts: l.conceptIds ?? [] });
    status.set(l.id, l.status ?? 'unknown');
    for (const c of l.conceptIds ?? []) {
      if (!CONCEPT.test(c)) errors.push(`concept id invalid: ${c}`);
      else if (!c.startsWith(l.id + '.')) errors.push(`concept ${c} must start with its lesson id ${l.id}.`);
      if (concepts.has(c)) errors.push(`duplicate concept id: ${c}`);
      concepts.add(c);
    }
    if ((l.conceptIds ?? []).length === 0) errors.push(`lesson ${l.id} declares no concepts`);
  }
  for (const c of Array.isArray(map.concepts) ? map.concepts : []) {
    if (!concepts.has(c.id)) errors.push(`concepts[] entry ${c.id} not declared by any lesson`);
    else if (!lessons.has(c.lessonId) || !c.id.startsWith(c.lessonId + '.')) errors.push(`concepts[] entry ${c.id} has bad lessonId ${c.lessonId}`);
  }
  for (const m of map.modules ?? []) for (const id of m.lessonIds ?? []) if (!lessons.has(id)) errors.push(`module ${m.id}: unknown lesson ${id}`);
  for (const [id, l] of lessons) for (const d of l.deps) if (!lessons.has(d)) errors.push(`lesson ${id}: unresolved prerequisite ${d}`);
  // cycle check
  const state = new Map<string, number>();
  const visit = (id: string, stack: string[]) => {
    if (state.get(id) === 2) return; if (state.get(id) === 1) { errors.push(`prerequisite cycle: ${[...stack, id].join(' > ')}`); return; }
    state.set(id, 1); for (const d of lessons.get(id)?.deps ?? []) if (lessons.has(d)) visit(d, [...stack, id]); state.set(id, 2);
  };
  for (const id of lessons.keys()) visit(id, []);
  stats.lessonsInMap = lessons.size; stats.conceptsInMap = concepts.size;

  // items
  const items = new Map<string, any>();
  for (const f of listJson(path.join(dir, 'items'))) {
    const bank = readJson(f); const qs: any[] = Array.isArray(bank) ? bank : bank.items ?? (bank.id && bank.kind ? [bank] : []);
    for (const q of qs) {
      if (items.has(q.id)) errors.push(`duplicate question id ${q.id} (${f})`);
      items.set(q.id, q);
      for (const c of q.conceptIds ?? []) if (!concepts.has(c)) errors.push(`question ${q.id}: unresolved concept ${c}`);
      if (!(q.conceptIds ?? []).length) errors.push(`question ${q.id}: no conceptIds`);
      if (q.kind === 'choice') {
        const ids = (q.options ?? []).map((o: any) => o.id);
        if (new Set(ids).size !== ids.length) errors.push(`question ${q.id}: duplicate option ids`);
        for (const o of q.options ?? []) if (!o.why) errors.push(`question ${q.id}: option ${o.id} has no 'why'`);
        for (const c of q.correct ?? []) if (!ids.includes(c)) errors.push(`question ${q.id}: correct id ${c} not an option`);
        if (q.selectionMode === 'one' && (q.correct ?? []).length !== 1) errors.push(`question ${q.id}: 'one' needs exactly 1 correct`);
      } else if (q.kind === 'numeric') {
        for (const k of ['answer', 'relTol', 'absTol']) if (q[k] !== undefined && !Number.isFinite(q[k])) errors.push(`question ${q.id}: ${k} not finite`);
        if ((q.relTol ?? 0) < 0 || (q.absTol ?? 0) < 0) errors.push(`question ${q.id}: negative tolerance`);
        if (q.relTol === undefined && q.absTol === undefined) warnings.push(`question ${q.id}: exact numeric match (no tolerance); confirm intended`);
      } else if (q.kind === 'shortText') errors.push(...validateShortText(q));
    }
  }
  stats.items = items.size;
  // MCQ balance per bank-wide set of 4-option single-answer questions
  const four = [...items.values()].filter((q) => q.kind === 'choice' && q.selectionMode === 'one' && q.options?.length === 4);
  if (four.length >= 20) {
    const slot = [0, 0, 0, 0]; four.forEach((q) => slot[q.options.findIndex((o: any) => o.id === q.correct[0])]++);
    slot.forEach((n, i) => { const pct = (100 * n) / four.length; if (pct < 22 || pct > 28) errors.push(`4-choice balance: authored slot ${i + 1} holds ${pct.toFixed(1)}% of ${four.length} (need 22-28%)`); });
  } else if (four.length) warnings.push(`4-choice bank has ${four.length} items (<20): global 22-28% balance is checked only from 20`);
  const longest = four.filter((q) => { const L = q.options.map((o: any) => o.text.length); const c = q.options.find((o: any) => o.id === q.correct[0]).text.length; return c === Math.max(...L) && c > 1.5 * (L.reduce((a: number, b: number) => a + b, 0) - c) / 3; });
  if (longest.length) warnings.push(`${longest.length} item(s) where the correct option is the longest by 50%+ (editorial review, do not pad): ${longest.slice(0, 5).map((q) => q.id).join(', ')}`);

  // lessons
  let nLessons = 0; const authored = new Set<string>();
  for (const f of listJson(path.join(dir, 'lessons'))) {
    const L = readJson(f); nLessons++;
    if (!lessons.has(L.id)) errors.push(`lesson file ${f}: id ${L.id} not in map`);
    else if (status.get(L.id) !== 'authored') errors.push(`lesson ${L.id} has a file but map status is '${status.get(L.id)}' (planned lessons must not ship as authored)`);
    authored.add(L.id);
    for (const o of L.objectives ?? []) if (!concepts.has(o.conceptId)) errors.push(`lesson ${L.id}: unresolved objective concept ${o.conceptId}`);
    const bids = new Set<string>();
    for (const b of L.blocks ?? []) {
      if (bids.has(b.id)) errors.push(`lesson ${L.id}: duplicate block id ${b.id}`); bids.add(b.id);
      if (b.type === 'check' && !items.has(b.questionId)) errors.push(`lesson ${L.id}: block ${b.id} references unknown question ${b.questionId}`);
      if (b.type === 'figure' && !b.alt) errors.push(`lesson ${L.id}: figure ${b.id} has no alt text`);
      if (b.type === 'interactive' && !b.fallbackText) errors.push(`lesson ${L.id}: interactive ${b.id} has no fallbackText`);
    }
    const covered = new Set((L.blocks ?? []).filter((b: any) => b.type === 'check').flatMap((b: any) => items.get(b.questionId)?.conceptIds ?? []));
    for (const o of L.objectives ?? []) if (!covered.has(o.conceptId)) warnings.push(`lesson ${L.id}: objective ${o.conceptId} has no inline check`);
  }
  stats.lessonFiles = nLessons;
  for (const [id, st] of status) if (st === 'authored' && !authored.has(id)) errors.push(`lesson ${id} is marked authored in the map but has no lesson file`);

  // problems: authored source and public/server split
  const pdir = path.join(dir, 'problems-src'); let np = 0;
  for (const f of listJson(pdir)) {
    const p = readJson(f); np++;
    if (!PROBLEM.test(p.id)) errors.push(`problem id invalid: ${p.id}`);
    for (const l of p.lessons ?? []) if (!lessons.has(l)) errors.push(`problem ${p.id}: unresolved lesson ${l}`);
    for (const c of p.conceptIds ?? []) if (!concepts.has(c)) errors.push(`problem ${p.id}: unresolved concept ${c}`);
    const ck = p.checker; if (!ck || !['exact', 'unordered_lines', 'float_tol'].includes(ck.kind)) errors.push(`problem ${p.id}: bad checker`);
    if (ck?.kind === 'float_tol') for (const k of ['absTol', 'relTol']) if (!Number.isFinite(ck[k]) || ck[k] < 0) errors.push(`problem ${p.id}: ${k} must be finite >= 0`);
    if (!(p.conceptIds ?? []).length || !(p.lessons ?? []).length) warnings.push(`problem ${p.id}: no taught concept/lesson link (coverage gap; keep off the learner path until a lesson teaches it)`);
    if (!(p.tests ?? []).some((t: any) => !t.hidden)) errors.push(`problem ${p.id}: no visible test`);
    if (!(p.tests ?? []).some((t: any) => t.hidden)) warnings.push(`problem ${p.id}: no hidden tests`);
    if (!p.starter?.python || !p.starter?.cpp) errors.push(`problem ${p.id}: missing starter`);
  }
  stats.problems = np;
  return { errors, warnings, stats };
}

/** Public-pack leak check: a built public problem must contain no hidden test content or solution text. */
export function publicLeaks(authored: any, publicPack: any): string[] {
  const s = JSON.stringify(publicPack); const out: string[] = [];
  for (const t of authored.tests ?? []) if (t.hidden && ((t.input.length > 3 && s.includes(JSON.stringify(t.input).slice(1, -1))) || (t.expected.length > 3 && s.includes(JSON.stringify(t.expected).slice(1, -1))))) out.push('hidden test content present');
  for (const k of ['python', 'cpp']) if ((authored.solutions?.[k] ?? '').length > 20 && s.includes(JSON.stringify(authored.solutions[k]).slice(1, -1))) out.push(`solution.${k} present`);
  if ('solutions' in publicPack || 'tests' in publicPack) out.push('forbidden key in public pack');
  return out;
}

if (import.meta.main) {
  const dir = process.argv[2] ?? 'content-v5';
  const r = validate(dir);
  console.log(JSON.stringify({ dir, ...r.stats, errors: r.errors.length, warnings: r.warnings.length }));
  r.errors.slice(0, 60).forEach((e) => console.log('ERROR', e)); r.warnings.slice(0, 30).forEach((w) => console.log('WARN', w));
  process.exit(r.errors.length ? 1 : 0);
}
