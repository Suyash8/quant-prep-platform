/** Server-side attempt processing for v5. Pure over injected deps so it is unit-testable without a database. */
import { grade, GRADER_VERSION } from '../grade5';
import type { AttemptEvent, Question, Receipt, GradeResult } from './types';

export type AttemptRow = { status: Receipt['status']; serverResult?: GradeResult; reason?: string; payload?: { questionId: string; revision: number; packSha: string; response: unknown } };
const canon = (v: unknown): string => Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(',')}}` : JSON.stringify(v) ?? 'null';
export type Deps = {
  findExisting(userId: string, eventId: string): Promise<AttemptRow | null>;
  resolveQuestion(packSha: string, questionId: string): Promise<Question | undefined>;   // exact revision for packSha, else undefined
  save(userId: string, e: AttemptEvent, row: AttemptRow & { serverVerdict?: string }): Promise<void>;
};
const MAX_BYTES = 20_000;

export function validateEvent(e: any): string | null {
  if (!e || typeof e !== 'object') return 'not an object';
  for (const k of ['eventId', 'questionId', 'packSha']) if (typeof e[k] !== 'string' || !e[k] || e[k].length > 200) return `bad ${k}`;
  if (!Number.isInteger(e.revision) || e.revision < 0) return 'bad revision';
  if (!e.response || typeof e.response.kind !== 'string') return 'bad response';
  if (JSON.stringify(e.response).length > MAX_BYTES) return 'response too large';
  if (!e.clientResult || typeof e.clientResult.verdict !== 'string') return 'bad clientResult';
  return null;
}

/** Client totals, XP and progress are never read from the event. The server regrades from the raw response. */
export async function processAttempt(deps: Deps, userId: string, e: AttemptEvent): Promise<Receipt> {
  const base = { eventId: e?.eventId, questionId: e?.questionId, packSha: e?.packSha } as Receipt;
  const bad = validateEvent(e);
  if (bad) return { ...base, status: 'invalid-event', reason: bad };   // not stored: nothing trustworthy to key on
  const prior = await deps.findExisting(userId, e.eventId);
  if (prior) {
    // Only semantically unordered fields are normalised (selected ids of a choose-many question); ordered fields are compared as sent.
    const pq = await deps.resolveQuestion(e.packSha, e.questionId);
    const norm = (r: unknown) => { const x = r as { kind?: string; selected?: unknown } | null; return pq && (pq as { kind?: string; selectionMode?: string }).kind === 'choice' && (pq as { selectionMode?: string }).selectionMode === 'many' && x?.kind === 'choice' && Array.isArray(x.selected) ? { ...x, selected: [...(x.selected as string[])].sort() } : r; };
    if (prior.payload && canon({ ...prior.payload, response: norm(prior.payload.response) }) !== canon({ questionId: e.questionId, revision: e.revision, packSha: e.packSha, response: norm(e.response) })) return { ...base, status: 'conflict', reason: 'eventId already used with different content; original record kept' };
    return { ...base, status: prior.status, serverVerdict: prior.serverResult, graderVersion: prior.serverResult?.graderVersion, reason: prior.reason };
  }
  const q = await deps.resolveQuestion(e.packSha, e.questionId);
  if (!q || q.revision !== e.revision) {
    const row: AttemptRow = { status: 'version-unavailable', reason: 'server has no content for this packSha/revision' };
    await deps.save(userId, e, row); return { ...base, ...row, verifiedAt: Date.now() };
  }
  const result = grade(q, e.response);
  const status: Receipt['status'] = result.verdict === e.clientResult.verdict ? 'verified' : 'disputed';
  const row = { status, serverResult: result, serverVerdict: result.verdict };
  await deps.save(userId, e, row);
  return { ...base, status, serverVerdict: result, graderVersion: GRADER_VERSION, verifiedAt: Date.now() };
}
