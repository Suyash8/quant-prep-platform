import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, rateLimit } from '@/lib/auth';
import { processAttempt, type Deps } from '@/lib/v5/server-attempt';
import index from '@/lib/v5/questions.generated.json';
import type { Question, AttemptEvent, Receipt } from '@/lib/v5/types';

export const dynamic = 'force-dynamic';
const questions = index as unknown as Record<string, Question>;
const MAX_BATCH = 50;

const deps: Deps = {
  async findExisting(userId, eventId) {
    const r = await db.v5Attempt.findUnique({ where: { userId_eventId: { userId, eventId } } });
    return r ? { status: r.status as never, serverResult: (r.serverResult ?? undefined) as never, reason: r.reason ?? undefined, payload: { questionId: r.questionId, revision: r.revision, packSha: r.packSha, response: r.response } } : null;
  },
  async resolveQuestion(packSha, questionId) { return questions[`${packSha}:${questionId}`]; },
  async save(userId, e: AttemptEvent, row) {
    await db.v5Attempt.create({ data: {
      userId, eventId: e.eventId, questionId: e.questionId, revision: e.revision, packSha: e.packSha,
      response: e.response as never, presentation: (e.presentation ?? undefined) as never,
      clientVerdict: e.clientResult.verdict, serverVerdict: row.serverVerdict, serverResult: (row.serverResult ?? undefined) as never,
      graderVersion: row.serverResult?.graderVersion, status: row.status, reason: row.reason,
      hintsUsed: Number.isFinite(e.hintsUsed) ? Math.max(0, Math.trunc(e.hintsUsed)) : 0,
      clientAnsweredAt: BigInt(Number.isFinite(e.answeredAt) ? Math.trunc(e.answeredAt) : 0),
    } });
  },
};

/** POST { events: AttemptEvent[] } -> { receipts: Receipt[] }. Account-scoped, idempotent by eventId. Client totals/XP are ignored. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to sync.' }, { status: 401 });
  // The client names the account whose outbox it is sending; checked here, in the same request as the session, so a session switch mid-sync cannot misattribute events.
  const claimed = req.headers.get('x-qf-account');
  if (!claimed) return NextResponse.json({ error: 'Missing account header.' }, { status: 400 });
  if (claimed !== user.id) return NextResponse.json({ error: 'account-mismatch' }, { status: 409 });
  if (!rateLimit(`v5attempts:${user.id}`, 30, 1)) return NextResponse.json({ error: 'Slow down.' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const events = body?.events;
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_BATCH) return NextResponse.json({ error: `Send 1-${MAX_BATCH} events.` }, { status: 400 });
  const receipts: Receipt[] = [];
  for (const e of events) {
    try { receipts.push(await processAttempt(deps, user.id, e)); }
    catch { receipts.push({ eventId: e?.eventId, questionId: e?.questionId, packSha: e?.packSha, status: 'retryable-error' } as Receipt); }
  }
  return NextResponse.json({ receipts }, { headers: { 'Cache-Control': 'no-store' } });
}
