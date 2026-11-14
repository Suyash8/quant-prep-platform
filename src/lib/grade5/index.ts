/**
 * v5 pure grading engine. Only imports types. Same file runs in the browser (instant) and on the server (authoritative).
 * Contract: src/lib/v5/types.ts.
 */
import type { Question, Response, GradeResult, Verdict, Matcher, Fixture } from '../v5/types';

export const GRADER_VERSION = 'grade5.1';
export const LIMITS = { maxInput: 500, maxPattern: 200 };

/** Heuristic ReDoS guard (not a proof): bounded grammar only. */
export function patternProblem(p: string): string | null {
  if (p.length > LIMITS.maxPattern) return 'pattern too long';
  if (/\\[1-9]/.test(p)) return 'back-references not allowed';
  if (/\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)[+*{]/.test(p)) return 'nested quantifier';
  if (/\(\?[=!<]/.test(p)) return 'lookaround not allowed';
  try { new RegExp(`^(?:${p})$`); } catch { return 'invalid regex'; }
  return null;
}

/** Normalisation never strips signs, decimal separators, operators or negation. */
export function normalizeText(s: string, ops: ('lower' | 'trim' | 'collapseWs')[]): string {
  let t = s.normalize('NFKC');
  for (const op of ops) {
    if (op === 'lower') t = t.toLowerCase();
    else if (op === 'trim') t = t.trim();
    else t = t.replace(/\s+/g, ' ');
  }
  return t;
}

export function numericClose(got: number, want: number, relTol = 0, absTol = 0): boolean {
  if (!Number.isFinite(got) || !Number.isFinite(want)) return false;
  return Math.abs(got - want) <= Math.max(absTol, relTol * Math.abs(want));
}
/** Strict decimal grammar. Commas are accepted ONLY as well-formed thousands separators (1,234 or 1,234,567.5), so "6,21" and "1,2,3" are rejected, not read as 621 or 123. Decimal comma is not supported. */
export function parseNumber(s: string): number {
  const t = s.trim();
  const plain = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;
  const grouped = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/;
  if (grouped.test(t)) return Number(t.replace(/,/g, ''));
  if (plain.test(t)) return Number(t);
  return NaN;
}

const res = (q: Question, verdict: Verdict, extra: Partial<GradeResult> = {}): GradeResult =>
  ({ verdict, graderVersion: GRADER_VERSION, contentRevision: q.revision, ...extra });

function matches(m: Matcher, t: string, ops: ('lower' | 'trim' | 'collapseWs')[]): boolean | 'bad' {
  if (m.type === 'exact') return t === normalizeText(m.pattern, ops);
  if (m.type === 'numeric') return numericClose(parseNumber(t), Number(m.pattern), 1e-9, 0);
  if (patternProblem(m.pattern)) return 'bad';
  return new RegExp(`^(?:${m.pattern})$`, (m.flags ?? '').replace(/[^imsu]/g, '')).test(t);
}

export function grade(q: Question, r: Response): GradeResult {
  if (q.kind !== r.kind) return res(q, 'invalid', { feedback: 'Response type does not match the question.' });
  switch (q.kind) {
    case 'choice': {
      const sel = (r as Extract<Response, { kind: 'choice' }>).selected;
      if (!Array.isArray(sel) || sel.some((a) => typeof a !== 'string') || new Set(sel).size !== sel.length) return res(q, 'invalid');
      const valid = new Set(q.options.map((o) => o.id));
      if (sel.length === 0 || sel.some((a) => !valid.has(a))) return res(q, 'invalid');
      if (q.selectionMode === 'one' && sel.length !== 1) return res(q, 'invalid');
      const want = new Set(q.correct);
      const ok = sel.length === want.size && sel.every((a) => want.has(a));
      const fb = ok ? undefined : q.misconceptionFeedback?.find((m) => m.optionId && sel.includes(m.optionId))?.text;
      return res(q, ok ? 'correct' : 'incorrect', fb ? { feedback: fb } : {});
    }
    case 'numeric': {
      const { raw, unit } = r as Extract<Response, { kind: 'numeric' }>;
      const n = typeof raw === 'string' ? parseNumber(raw) : NaN;
      if (!Number.isFinite(n)) return res(q, 'invalid');
      if (q.units && q.units.length && (!unit || !q.units.includes(unit))) return res(q, 'invalid', { feedback: 'Check the unit.' });   // a unit outside the question contract is not a wrong number: no penalty, no review card
      return res(q, numericClose(n, q.answer, q.relTol, q.absTol) ? 'correct' : 'incorrect');
    }
    case 'shortText': {
      const text = (r as Extract<Response, { kind: 'shortText' }>).text;
      if (typeof text !== 'string' || text.trim().length === 0 || text.length > LIMITS.maxInput) return res(q, 'invalid');
      const t = normalizeText(text, q.normalize);
      for (const m of q.rejected ?? []) {
        const hit = matches(m, t, q.normalize);
        if (hit === 'bad') return res(q, 'needs-review');
        if (hit) return res(q, 'incorrect', { hint: m.hint });
      }
      for (const m of q.accepted) {
        const hit = matches(m, t, q.normalize);
        if (hit === 'bad') return res(q, 'needs-review');   // fail closed: a broken rule never decides
        if (hit) return res(q, 'correct');
      }
      // Not matching any accepted form is NOT proof the idea is wrong: only an explicit rejected rule can say 'incorrect'.
      return res(q, 'needs-review', { feedback: 'Not recognised as one of the accepted forms. This is not marked wrong; compare with the model answer.' });
    }
    case 'ordered': {
      const ids = (r as Extract<Response, { kind: 'ordered' }>).stepIds;
      const want = q.steps.map((s) => s.id);
      if (!Array.isArray(ids) || ids.length !== want.length || new Set(ids).size !== ids.length || ids.some((i) => !want.includes(i))) return res(q, 'invalid');
      return res(q, ids.every((a, i) => a === want[i]) ? 'correct' : 'incorrect');
    }
    case 'reflection': return res(q, 'not-assessed');
    case 'code': return res(q, 'pending');   // graded by the runner, never here
  }
}

/** Build-time validation: every fixture must produce its expected verdict, and every pattern must pass the guard. */
export function validateShortText(q: Extract<Question, { kind: 'shortText' }>): string[] {
  const errs: string[] = [];
  for (const m of [...q.accepted, ...(q.rejected ?? [])]) if (m.type === 'regex') { const p = patternProblem(m.pattern); if (p) errs.push(`${q.id}: ${p}: ${m.pattern}`); }
  if (!q.fixtures.some((f) => f.expect === 'correct')) errs.push(`${q.id}: needs at least one correct fixture`);
  if (!q.fixtures.some((f) => f.expect === 'incorrect' || f.expect === 'needs-review')) errs.push(`${q.id}: needs at least one negative fixture (incorrect via a rejected rule, or needs-review)`);
  for (const f of q.fixtures as Fixture[]) {
    const got = grade(q, { kind: 'shortText', text: f.response }).verdict;
    if (got !== f.expect) errs.push(`${q.id}: fixture "${f.response}" expected ${f.expect}, got ${got}`);
  }
  return errs;
}

/** Deterministic per-attempt shuffle so client and server agree on option order (also stored as presentation). */
export function shuffleIds(ids: string[], seed: string): string[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
