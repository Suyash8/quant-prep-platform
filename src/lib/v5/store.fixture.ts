/**
 * IN-MEMORY FIXTURE STORE. UNIMPLEMENTED: no persistence, no network, no server. It exists so UI can be built and tested against V5Store.
 * Behaviour: grades locally with grade5, records receipts as 'local', and never produces 'verified' unless a test calls fixtureVerify().
 */
import { grade } from '../grade5';
import { newCard, schedule, outcomeFromVerdict, SCHEDULER_VERSION } from './schedule';
import type { V5Store, Question, AttemptEvent, Receipt, ReviewCard, ReviewEntry, StoreSnapshot, GradeResult, Response } from './types';

export function createFixtureStore(questions: { packSha: string; q: Question }[], opts: { online?: boolean; now?: () => number } = {}): V5Store & { fixtureVerify(eventId: string, r: GradeResult): void; fixtureSetOnline(b: boolean): void } {
  const now = opts.now ?? Date.now;
  let online = opts.online ?? false;
  const subs = new Set<() => void>();
  const notify = () => subs.forEach((f) => f());
  const events: { event: AttemptEvent; receipt: Receipt }[] = [];
  const cards = new Map<string, ReviewCard>();
  const find = (packSha: string, id: string) => questions.find((x) => x.packSha === packSha && x.q.id === id)?.q;
  const key = (packSha: string, id: string) => `${packSha}:${id}`;
  const snap = (): StoreSnapshot => {
    const local = events.filter((e) => e.receipt.status === 'local' || e.receipt.status === 'syncing');
    const verified = events.filter((e) => e.receipt.status === 'verified');
    const view = (xs: typeof events) => ({ xp: xs.filter((e) => (e.receipt.serverVerdict ?? e.event.clientResult).verdict === 'correct').length * 10, completedLessons: [], masteredConcepts: [], streakDays: 0, asOf: now() });
    return { online, pending: local.length, provisional: view(events), verified: verified.length ? view(verified) : undefined, packs: { stored: 0, total: 0, state: 'incomplete', persistent: false } };
  };
  let cached = snap();
  const refresh = () => { cached = snap(); notify(); };
  return {
    getSnapshot: () => cached,
    subscribeState(fn) { subs.add(fn); return () => subs.delete(fn); },
    async getItem(packSha, id) { return find(packSha, id); },
    gradeLocal: (q: Question, r: Response) => grade(q, r),
    async submitAttempt(e) {
      const existing = events.find((x) => x.event.eventId === e.eventId);
      if (existing) return existing.receipt;            // idempotent
      const receipt: Receipt = { eventId: e.eventId, questionId: e.questionId, packSha: e.packSha, status: 'local' };
      events.push({ event: e, receipt });
      const o = outcomeFromVerdict(e.clientResult.verdict);
      if (o) { const k = key(e.packSha, e.questionId); const c = cards.get(k); const s = schedule(c ?? { ...newCard(now()) }, o, now()); cards.set(k, { questionId: e.questionId, revision: e.revision, packSha: e.packSha, due: s.due, interval: s.interval, ease: s.ease, lapses: s.lapses, schedulerVersion: SCHEDULER_VERSION }); }
      refresh(); return receipt;
    },
    async getReceipts(q) { return events.filter((x) => (!q.questionId || x.event.questionId === q.questionId)); },
    async retryReconciliation() { /* fixture: nothing to reconcile */ },
    async getDueReviews(at) {
      const out: ReviewEntry[] = [];
      for (const c of cards.values()) { if (c.due > at) continue; const q = find(c.packSha, c.questionId); if (q) out.push({ card: c, question: q, packSha: c.packSha }); }
      return out;
    },
    async recordReview(id, outcome, at) {
      const c = cards.get(key(id.packSha, id.questionId)); if (!c || c.revision !== id.revision) throw new Error('no such card (questionId, revision, packSha)');
      const s = schedule(c, outcome, at); const n = { ...c, ...s }; cards.set(key(c.packSha, c.questionId), n); refresh(); return n;
    },
    getDownloadStatus: () => cached.packs,
    fixtureVerify(eventId, r) { const x = events.find((e) => e.event.eventId === eventId); if (!x) return; x.receipt = { ...x.receipt, status: r.verdict === x.event.clientResult.verdict ? 'verified' : 'disputed', serverVerdict: r, graderVersion: r.graderVersion, verifiedAt: now() }; refresh(); },
    fixtureSetOnline(b) { online = b; refresh(); },
  };
}
