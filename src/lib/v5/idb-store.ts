/**
 * Real V5Store on IndexedDB (browser only). Local-first: submitAttempt resolves after the local write; sync is background.
 * Packs are immutable and keyed by sha256; a manifest pointer is swapped only after EVERY pack verified, so a failed update
 * leaves the previous complete set usable. Eviction by the browser cannot be prevented: packStatus reports what is actually stored.
 */
import { grade } from '../grade5';
import { newCard, schedule, outcomeFromVerdict, SCHEDULER_VERSION } from './schedule';
import type { V5Store, Question, AttemptEvent, Receipt, ReviewCard, ReviewEntry, StoreSnapshot, GradeResult, Response, Lesson, ProgressView } from './types';

type Manifest = { schema: number; contentVersion: string; packs: { id: string; kind: string; path: string; bytes: number; sha256: string }[] };
const DB_NAME = 'qf-v5'; const DB_VERSION = 1;
const S = { packs: 'packs', attempts: 'attempts', cards: 'cards', meta: 'meta' } as const;

const req = <T,>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = (tx: IDBTransaction) => new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
async function sha256Hex(text: string) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join(''); }

export type StoredContent = { contentVersion: string; lessons: Lesson[]; map: { modules: { id: string; title: string; order: number; lessonIds: string[] }[]; lessons: { id: string; title: string; moduleId: string; order: number; status: string }[] } | undefined; itemsSha: string; partial?: boolean; questions: Record<string, Question>; problems: import('./types').ProblemPublic[]; missing: string[] };
const codeDraftOrder = new Map<string, Promise<void>>(); const codeDraftQueue = new Map<string, Promise<void>>(); let codeDraftSeq = 0;
export type V5ContentStore = V5Store & { downloadPacks(): Promise<void>; sync(): Promise<void>; close(): void; getContent(): Promise<StoredContent | undefined>; getUnavailableReviews(at: number): Promise<{ card: ReviewCard; reason: 'version-unavailable' }[]>; confirmUnconfirmed(expectedAccountId: string, eventIds: string[]): Promise<number>; getRetiredReviews(): Promise<{ card: ReviewCard; question?: Question; reason?: 'version-unavailable'; packSha: string }[]>; undoReview(id: Pick<ReviewCard, 'questionId' | 'revision' | 'packSha'>): Promise<ReviewCard>; snoozeReview(id: Pick<ReviewCard, 'questionId' | 'revision' | 'packSha'>, until: number): Promise<ReviewCard>; retireReview(id: Pick<ReviewCard, 'questionId' | 'revision' | 'packSha'>, retired: boolean): Promise<ReviewCard>; saveCodeDraft(problemId: string, language: 'python' | 'cpp', starter: string, source: string, at: number, boundSha?: string): Promise<{ ok: true; held: boolean } | { ok: false; reason: 'identity' | 'quota' | 'unavailable' | 'too-large' | 'unknown-problem' }>; getCodeDraft(problemId: string, language: 'python' | 'cpp', starter: string, boundSha?: string): Promise<{ source: string; savedAt: number; held: boolean } | null>; findOlderCodeDrafts(problemId: string, language: 'python' | 'cpp', starter: string, boundSha?: string): Promise<{ source: string; savedAt: number }[]>; clearCodeDraft(problemId: string, language: 'python' | 'cpp', starter: string, boundSha?: string): Promise<boolean>; saveDraft(packSha: string, questionId: string, revision: number, response: Response, at: number): Promise<false | true | 'held'>; getDraft(packSha: string, questionId: string, revision: number): Promise<{ response: Response; savedAt: number; held: boolean } | null>; clearDraft(packSha: string, questionId: string, revision: number): Promise<void>; setPosition(lessonId: string, blockIndex: number, contentVersion: string, at: number): Promise<boolean>; getPosition(lessonId: string, contentVersion: string): Promise<{ blockIndex: number; contentVersion: string; savedAt: number } | null>; identityCheck(): Promise<{ storeAccountId: string | null; sessionAccountId: string | null; sessionLabel: string | null; matches: boolean; reachable: boolean }>; getUnconfirmedSummary(): Promise<{ count: number; reviewRatings: number; earliest: number | null; latest: number | null; answers: { eventId: string; questionId: string; packSha: string; revision: number; prompt: string | null; responseText: string; answeredAt: number; response: unknown; clientVerdict: string }[] }> };
export async function openV5Store(opts: { userId?: string | null; identityConfirmedAt?: number; onAccountMismatch?: () => void; baseUrl?: string; fetchImpl?: typeof fetch; now?: () => number } = {}): Promise<V5ContentStore> {
  const base = opts.baseUrl ?? ''; const f = opts.fetchImpl ?? fetch.bind(globalThis); const now = opts.now ?? Date.now;
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const o = indexedDB.open(`${DB_NAME}:${opts.userId ?? 'anon'}`, DB_VERSION);   // one database per account: attempts, reviews and packs are never shared across accounts
    o.onupgradeneeded = () => { const d = o.result; d.createObjectStore(S.packs, { keyPath: 'sha' }); const a = d.createObjectStore(S.attempts, { keyPath: 'event.eventId' }); a.createIndex('q', 'event.questionId'); d.createObjectStore(S.cards, { keyPath: 'key' }); d.createObjectStore(S.meta, { keyPath: 'k' }); };
    o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error);
  });
  const subs = new Set<() => void>(); const notify = () => subs.forEach((fn) => fn());
  let snap: StoreSnapshot = { online: typeof navigator === 'undefined' ? true : navigator.onLine, pending: 0, provisional: emptyView(now()), packs: { stored: 0, total: 0, state: 'incomplete', persistent: false } };
  let manifest: Manifest | undefined; let partial: Manifest | undefined; let downloading = false; let syncing = false;
  function emptyView(asOf: number): ProgressView { return { xp: 0, completedLessons: [], masteredConcepts: [], streakDays: 0, asOf }; }

  /** Pre-action identity guard. Before a NEW private write, ask the server who is signed in (bounded wait, only when online).
   *  A different or missing account means this store is stale: reject the write (nothing is stored) and ask the caller to rebind.
   *  Offline, or if the server cannot be reached in time, the write goes to the bound namespace: a cached identity limit, not a guarantee. */
  async function assertAccount(): Promise<'confirmed' | 'unconfirmed'> {
    if (closed) throw Object.assign(new Error('store closed'), { name: 'StoreClosed' });
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'unconfirmed';
    let sessionId: string | null | undefined;
    try { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 1200); const r = await f(`${base}/api/auth/me`, { credentials: 'same-origin', cache: 'no-store', signal: ac.signal }); clearTimeout(t); sessionId = r.status === 401 ? null : r.ok ? ((await r.json()) as { user?: { id?: string } }).user?.id ?? null : undefined; } catch { sessionId = undefined; }
    if (sessionId === undefined) return 'unconfirmed';   // unreachable: cannot tell who is signed in
    const ok = (sessionId ?? null) === (opts.userId ?? null);
    if (!ok) { opts.onAccountMismatch?.(); throw Object.assign(new Error('account changed: this answer was NOT saved'), { name: 'AccountChanged' }); }
    noteBinding();
    return 'confirmed';
  }
  /** Device-only drafts and positions live in THIS account's own per-account database. When identity cannot be checked (offline, server unreachable) they are HELD, allowed only if this database was BOUND by an earlier
   *  server-confirmed identity: the binding record ({ userId, confirmedAt }) is written by a live confirmation (assertAccount 'confirmed', or the provider opening the store right after a live /api/auth/me).
   *  No binding (never confirmed), or a binding for a different userId, means refuse. A positive mismatch (server says another account/none) or a closed store always refuses.
   *  Signed-out (anon) namespace: no account to bind, allowed. Held records carry held:true; they are never uploaded, never an attempt, never auto-promoted, and are never visible to another account (separate database). */
  let lastBindingWrite = 0;
  function noteBinding() { const t = now(); if (t - lastBindingWrite < 30000 || opts.userId == null) return; lastBindingWrite = t; void put(S.meta, { k: 'binding', v: { userId: opts.userId, confirmedAt: t } }).catch(() => { /* best effort */ }); }
  async function ownerState(): Promise<'confirmed' | 'held' | 'no'> {
    let r: 'confirmed' | 'unconfirmed'; try { r = await assertAccount(); } catch { return 'no'; }
    if (r === 'confirmed') return 'confirmed';
    if (opts.userId == null) return 'held';
    const b = await get<{ v: { userId: string | null; confirmedAt: number } }>(S.meta, 'binding').catch(() => undefined);
    return b && b.v.userId === opts.userId && b.v.confirmedAt > 0 ? 'held' : 'no';
  }
  async function ownerOk(): Promise<boolean> { return (await ownerState()) !== 'no'; }
  let closed = false;   // after close() background work stops quietly; writes throw (never a silent drop), reads return nothing
  const parsedPacks = new Map<string, unknown>();   // sha256 -> parsed pack body (packs are content-addressed, so an entry never goes stale)
  const get = async <T,>(store: string, key: IDBValidKey) => closed ? undefined : (await req(db.transaction(store).objectStore(store).get(key))) as T | undefined;
  const all = async <T,>(store: string) => closed ? ([] as T[]) : (await req(db.transaction(store).objectStore(store).getAll())) as T[];
  const isQuota = (e: unknown) => { const n = (e as { name?: string })?.name; return n === 'QuotaExceededError' || n === 'NS_ERROR_DOM_QUOTA_REACHED'; };
  const storageFail = (e: unknown): never => { snap = { ...snap, storageError: isQuota(e) ? 'quota' : 'unavailable' }; notify(); throw Object.assign(new Error(isQuota(e) ? 'Device storage is full. Nothing was saved. Free up space and try again.' : 'Device storage is unavailable. Nothing was saved.'), { name: 'StorageFull', cause: e }); };
  const cardFor = async (id: { questionId: string; revision: number; packSha: string }) => {
    if ((await assertAccount()) === 'unconfirmed') throw Object.assign(new Error('signed-in identity could not be checked; not changed, try again when online'), { name: 'IdentityUnconfirmed', retryable: true });
    const c = await get<ReviewCard & { key: string }>(S.cards, `${id.packSha}:${id.questionId}`); if (!c || c.revision !== id.revision) throw new Error('no such card (questionId, revision, packSha)'); return c;
  };
  const put = async (store: string, v: unknown) => { if (closed) throw new Error('store closed'); try { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(v); await done(tx); } catch (e) { return storageFail(e); } };
  if (opts.identityConfirmedAt && opts.userId != null) { lastBindingWrite = now(); void put(S.meta, { k: 'binding', v: { userId: opts.userId, confirmedAt: opts.identityConfirmedAt } }).catch(() => { /* best effort */ }); }   // the provider opened this store right after a LIVE /api/auth/me

  async function loadQuestionsIndex() {
    const m = (await get<{ k: string; v: Manifest }>(S.meta, 'manifest'))?.v; manifest = m; const idx = new Map<string, Question>();
    // Index EVERY stored items pack, not only the current manifest's: cards and attempts keep the exact packSha they were made against.
    for (const rec of await all<{ sha: string; kind: string; body: string }>(S.packs)) { if (rec.kind !== 'items') continue; for (const q of JSON.parse(rec.body) as Question[]) idx.set(`${rec.sha}:${q.id}`, q); }
    return idx;
  }
  async function recompute() {
    if (closed) return;
    const rows = await all<{ key: string; event: AttemptEvent; receipt: Receipt }>(S.attempts);
    const correctQ = new Set(rows.filter((r) => r.event.clientResult.verdict === 'correct').map((r) => r.event.questionId));
    const verifiedQ = new Set(rows.filter((r) => r.receipt.status === 'verified' && r.receipt.serverVerdict?.verdict === 'correct').map((r) => r.event.questionId));
    const lessonsDone = async (set: Set<string>) => { const out: string[] = []; for (const p of eff()?.packs.filter((x) => x.kind === 'lesson') ?? []) { const rec = await get<{ body: string }>(S.packs, p.sha256); if (!rec) continue; const L = JSON.parse(rec.body) as Lesson; const checks = L.blocks.filter((b) => b.type === 'check').map((b) => (b as { questionId: string }).questionId); if (checks.length && checks.every((c) => set.has(c))) out.push(L.id); } return out; };
    const view = async (set: Set<string>): Promise<ProgressView> => ({ xp: set.size * 10, completedLessons: await lessonsDone(set), masteredConcepts: [], streakDays: 0, asOf: now() });
    const unconfirmed = (rows as { identity?: string }[]).filter((r) => r.identity === 'unconfirmed' && (r as unknown as { receipt: Receipt }).receipt.status === 'local').length; const unsent = rows.filter((r) => ['local', 'syncing', 'retryable-error'].includes(r.receipt.status)).length; const localOnly = !opts.userId;   // signed-out store never uploads
    const pending = localOnly ? 0 : unsent;
    const stored = await storedCount();
    const rc = { checked: 0, correct: 0, incorrect: 0, queued: 0, held: 0, disputed: 0, rejected: 0 };
    for (const r of rows as unknown as { receipt: Receipt; identity?: string }[]) { const st = r.receipt.status; if (st === 'verified') { rc.checked++; if (r.receipt.serverVerdict?.verdict === 'correct') rc.correct++; else rc.incorrect++; } else if (st === 'disputed') rc.disputed++; else if (st === 'invalid-event' || st === 'version-unavailable' || st === 'conflict') rc.rejected++; else if (r.identity === 'unconfirmed') rc.held++; else if (!localOnly) rc.queued++; }
    snap = { ...snap, receiptCounts: rc, pending, unconfirmed, localOnly, localOnlyCount: localOnly ? rows.length : 0, provisional: await view(correctQ), verified: verifiedQ.size ? await view(verifiedQ) : undefined, packs: stored };
    notify();
  }
  /** The manifest the learner can read from right now: the committed one, or (first visit only) the STAGED one whose packs are read only if each is stored and sha-verified. Never mixed: a committed manifest always wins. */
  const eff = () => manifest ?? partial;
  async function problemPack(id: string) { const p = eff()?.packs.find((x) => x.kind === 'problem' && x.id === id); if (p && !manifest && !(await get(S.packs, p.sha256))) return undefined; return p; }
  async function storedCount(): Promise<StoreSnapshot['packs']> {
    const persistent = typeof navigator !== 'undefined' && navigator.storage?.persisted ? await navigator.storage.persisted().catch(() => false) : false;
    const em = eff(); if (!em) return { stored: 0, total: 0, state: downloading ? 'downloading' : 'incomplete', persistent };
    let stored = 0; for (const p of em.packs) if (await get(S.packs, p.sha256)) stored++;
    // 'complete' only for a COMMITTED manifest with every pack stored; a staged (partial) manifest is never complete.
    return { stored, total: em.packs.length, state: downloading ? 'downloading' : manifest && stored === em.packs.length ? 'complete' : 'incomplete', persistent };
  }
  manifest = (await get<{ v: Manifest }>(S.meta, 'manifest'))?.v;
  if (!manifest) partial = (await get<{ v: { manifest: Manifest } }>(S.meta, 'staged'))?.v?.manifest;   // a download that was interrupted: what verified so far stays usable and honest
  let qIndex = await loadQuestionsIndex();
  await recompute();
  const onOnline = () => { snap = { ...snap, online: true }; notify(); void api.sync(); };
  const onOffline = () => { snap = { ...snap, online: false }; notify(); };
  if (typeof window !== 'undefined') { window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline); }

  const api = {
    getSnapshot: () => snap,
    subscribeState(fn: () => void) { subs.add(fn); return () => subs.delete(fn); },
    async getItem(packSha: string, id: string) { return qIndex.get(`${packSha}:${id}`); },
    /** Stored content for the learner routes, read only from verified local packs. Undefined until the manifest pointer exists. */
    async getContent(): Promise<StoredContent | undefined> {
      const em = eff(); if (!em) return undefined; if (manifest && !(await get(S.meta, 'manifest'))) return undefined;
      const lessons: Lesson[] = []; let map: unknown; let itemsSha = ''; const questions: Record<string, Question> = {}; const problems: import('./types').ProblemPublic[] = []; const missing: string[] = [];
      for (const p of em.packs) {
        // Parsed packs are cached by content hash (immutable): getContent runs after every progress step, and re-parsing the ~1 MB items pack each time starved the main thread on slow CPUs (first lesson ~4x later).
        let parsed = parsedPacks.get(p.sha256);
        if (parsed === undefined) { const rec = await get<{ body: string }>(S.packs, p.sha256); if (!rec) { if (p.kind === 'lesson' || p.kind === 'items' || p.kind === 'problem') missing.push(p.id); continue; } parsed = JSON.parse(rec.body); parsedPacks.set(p.sha256, parsed); }
        if (p.kind === 'problem') { problems.push({ ...(parsed as object), packSha: p.sha256 } as import('./types').ProblemPublic); continue; }
        if (p.kind === 'lesson') lessons.push(parsed as Lesson);
        else if (p.kind === 'map') map = parsed;
        else if (p.kind === 'items') { itemsSha = p.sha256; for (const q of parsed as Question[]) questions[q.id] = q; }
      }
      return { contentVersion: em.contentVersion, lessons, map: map as StoredContent['map'], itemsSha, questions, problems, missing, partial: !manifest };
    },
    gradeLocal: (q: Question, r: Response): GradeResult => grade(q, r),
    async submitAttempt(e: AttemptEvent): Promise<Receipt> {
      const identity = await assertAccount();
      const key = e.eventId; const existing = await get<{ receipt: Receipt }>(S.attempts, key); if (existing) return existing.receipt;
      const receipt: Receipt = { eventId: e.eventId, questionId: e.questionId, packSha: e.packSha, status: 'local' };
      try {
      const tx = db.transaction([S.attempts, S.cards], 'readwrite');
      tx.objectStore(S.attempts).put({ key, event: e, receipt, identity });
      const o = outcomeFromVerdict(e.clientResult.verdict);
      if (o) { const ck = `${e.packSha}:${e.questionId}`; const prev = (await req(tx.objectStore(S.cards).get(ck))) as (ReviewCard & { key: string }) | undefined; const s = schedule(prev ?? newCard(now()), o, now()); tx.objectStore(S.cards).put({ ...(prev ?? {}), undo: undefined, key: ck, questionId: e.questionId, revision: e.revision, packSha: e.packSha, due: s.due, interval: s.interval, ease: s.ease, lapses: s.lapses, schedulerVersion: SCHEDULER_VERSION, identity: (prev?.identity === 'unconfirmed' || identity === 'unconfirmed') ? 'unconfirmed' : 'confirmed' }); }
      await done(tx);
      } catch (err) { return storageFail(err); }
      if (snap.storageError) { snap = { ...snap, storageError: undefined }; }
      void api.clearDraft(e.packSha, e.questionId, e.revision);
      await recompute(); void api.sync(); return receipt;
    },
    /** Unsubmitted work-in-progress. Device-only: never uploaded, never counted. Keyed by exact packSha + question + revision.
     *  IDENTITY-GUARDED: persisted/read/cleared only when the signed-in account is CONFIRMED to be this store's account. If identity is
     *  uncertain (offline, timeout) or different, nothing is written or returned (false/null). Best effort: false means NOT saved. */
    async saveDraft(packSha: string, questionId: string, revision: number, response: Response, at: number): Promise<false | true | 'held'> {
      try { const st = await ownerState(); if (st === 'no') return false; await put(S.meta, { k: `draft:${packSha}:${questionId}:${revision}`, v: { packSha, questionId, revision, response, savedAt: at, held: st === 'held' } }); return st === 'held' ? 'held' : true; } catch { return false; }
    },
    async getDraft(packSha: string, questionId: string, revision: number): Promise<{ response: Response; savedAt: number; held: boolean } | null> {
      try { if (!(await ownerOk())) return null; } catch { return null; }
      const r = await get<{ v: { response: Response; savedAt: number; held?: boolean } }>(S.meta, `draft:${packSha}:${questionId}:${revision}`);
      try { if (!(await ownerOk())) return null; } catch { return null; }   // re-check after the read: if the account changed meanwhile, discard
      return r ? { response: r.v.response, savedAt: r.v.savedAt, held: !!r.v.held } : null;
    },
    async clearDraft(packSha: string, questionId: string, revision: number): Promise<void> { try { if (!(await ownerOk())) return; const tx = db.transaction(S.meta, 'readwrite'); tx.objectStore(S.meta).delete(`draft:${packSha}:${questionId}:${revision}`); await done(tx); } catch { /* best effort */ } },
    /** ---- Code drafts (device-only practice source). Key = problemId + language + problem PACK sha (taken from the verified manifest, never from the caller) + starter hash.
     *  Same identity guard as lesson drafts: only when the signed-in account is CONFIRMED to be this store's account. Source only; never uploaded, never an attempt. ---- */
    /** Call-order serialisation: the queue slot is taken SYNCHRONOUSLY at call time (per problem+language), before any await. Previously the pack read, identity check and hashing ran first, so two concurrent saves could enqueue in a different order than they were called and an older value could land last. */
    saveCodeDraft(problemId: string, language: 'python' | 'cpp', starter: string, source: string, at: number, boundSha?: string): ReturnType<typeof api.saveCodeDraftNow> {
      const qk = `${problemId}:${language}`; const prior = codeDraftOrder.get(qk) ?? Promise.resolve();
      const run = prior.then(() => api.saveCodeDraftNow(problemId, language, starter, source, at, boundSha));
      codeDraftOrder.set(qk, run.then(() => undefined, () => undefined)); return run;
    },
    async saveCodeDraftNow(problemId: string, language: 'python' | 'cpp', starter: string, source: string, at: number, boundSha?: string): Promise<{ ok: true; held: boolean } | { ok: false; reason: 'identity' | 'quota' | 'unavailable' | 'too-large' | 'unknown-problem' }> {
      if (source.length > 131072) return { ok: false, reason: 'too-large' };
      const pack = await problemPack(problemId); if (!pack) return { ok: false, reason: 'unknown-problem' };
      let pre: 'confirmed' | 'held' | 'no'; try { pre = await ownerState(); } catch { pre = 'no'; } if (pre === 'no') return { ok: false, reason: 'identity' };
      const sh = await sha256Hex(starter); const psha = boundSha ?? pack.sha256;   // boundSha: the pack revision the editor was loaded against; a pack swap mid-edit must never relabel old code as the new revision
      const key = `cdraft:${problemId}:${language}:${psha}:${sh}`;
      // Per-key serial queue inside the store: every writer (panel chain, unmount flush, anything else) goes through it, so two saves for one draft can never interleave.
      const prior = codeDraftQueue.get(key) ?? Promise.resolve();
      const run = prior.then(async (): Promise<{ ok: true; held: boolean } | { ok: false; reason: 'identity' | 'quota' | 'unavailable' }> => {
        try { const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${(codeDraftSeq++).toString(36)}`;
          const prev = await get<{ k: string; v: unknown }>(S.meta, key); await put(S.meta, { k: key, v: { problemId, language, problemSha: psha, starterSha: sh, source, savedAt: at, token, held: pre === 'held' } });
          let still = false; still = await ownerOk();
          if (!still) { try { // compare-and-restore: only undo OUR exact write (token), in one transaction; a newer write by anyone else is never touched
              const tx = db.transaction(S.meta, 'readwrite'); const os = tx.objectStore(S.meta); const cur = await new Promise<{ v?: { token?: string } } | undefined>((res, rej) => { const rq = os.get(key); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
              if (cur?.v?.token === token) { if (prev) os.put(prev); else os.delete(key); } await done(tx); } catch { /* best effort */ } return { ok: false, reason: 'identity' }; }
          return { ok: true, held: pre === 'held' }; }
        catch (e) { return { ok: false, reason: snap.storageError === 'quota' || isQuota((e as { cause?: unknown }).cause) ? 'quota' : 'unavailable' }; }
      });
      codeDraftQueue.set(key, run.then(() => undefined, () => undefined));
      return run;
    },
    /** Exact match only (same problem pack, language and starter). null otherwise or when identity is not confirmed. */
    async getCodeDraft(problemId: string, language: 'python' | 'cpp', starter: string, boundSha?: string): Promise<{ source: string; savedAt: number; held: boolean } | null> {
      const pack = await problemPack(problemId); if (!pack) return null;
      try { if (!(await ownerOk())) return null; } catch { return null; }
      const r = await get<{ v: { source: string; savedAt: number; held?: boolean } }>(S.meta, `cdraft:${problemId}:${language}:${boundSha ?? pack.sha256}:${await sha256Hex(starter)}`);
      try { if (!(await ownerOk())) return null; } catch { return null; }
      return r ? { source: r.v.source, savedAt: r.v.savedAt, held: !!r.v.held } : null;
    },
    /** Saved code for the same problem+language written against a DIFFERENT problem revision or starter. Returned for the learner to inspect; never applied automatically. */
    async findOlderCodeDrafts(problemId: string, language: 'python' | 'cpp', starter: string, boundSha?: string): Promise<{ source: string; savedAt: number }[]> {
      const pack = await problemPack(problemId); if (!pack) return [];
      try { if (!(await ownerOk())) return []; } catch { return []; }
      const sh = await sha256Hex(starter); const rows = await all<{ k: string; v: { problemId: string; language: string; problemSha: string; starterSha: string; source: string; savedAt: number } }>(S.meta);
      try { if (!(await ownerOk())) return []; } catch { return []; }
      return rows.filter((r) => typeof r.k === 'string' && r.k.startsWith('cdraft:') && r.v.problemId === problemId && r.v.language === language && !(r.v.problemSha === (boundSha ?? pack.sha256) && r.v.starterSha === sh)).map((r) => ({ source: r.v.source, savedAt: r.v.savedAt })).sort((a, b) => b.savedAt - a.savedAt);
    },
    async clearCodeDraft(problemId: string, language: 'python' | 'cpp', starter: string, boundSha?: string): Promise<boolean> {
      const pack = await problemPack(problemId); if (!pack) return false;
      try { if (!(await ownerOk())) return false; const tx = db.transaction(S.meta, 'readwrite'); tx.objectStore(S.meta).delete(`cdraft:${problemId}:${language}:${boundSha ?? pack.sha256}:${await sha256Hex(starter)}`); await done(tx); return true; } catch { return false; }
    },
    async setPosition(lessonId: string, blockIndex: number, contentVersion: string, at: number): Promise<boolean> {
      try { if (!(await ownerOk())) return false; await put(S.meta, { k: `pos:${lessonId}`, v: { blockIndex, contentVersion, savedAt: at } }); return true; } catch { return false; }
    },
    async getPosition(lessonId: string, contentVersion: string): Promise<{ blockIndex: number; contentVersion: string; savedAt: number } | null> {
      try { if (!(await ownerOk())) return null; } catch { return null; }
      const r = await get<{ v: { blockIndex: number; contentVersion: string; savedAt: number } }>(S.meta, `pos:${lessonId}`);
      try { if (!(await ownerOk())) return null; } catch { return null; }
      return r && r.v.contentVersion === contentVersion ? r.v : null;   // a position saved against another content version is not returned
    },
    async getReceipts(q: { questionId?: string; conceptId?: string }) {
      const rows = await all<{ event: AttemptEvent; receipt: Receipt }>(S.attempts);
      return rows.filter((r) => (!q.questionId || r.event.questionId === q.questionId)).sort((a, b) => a.event.answeredAt - b.event.answeredAt).map((r) => ({ event: r.event, receipt: { ...r.receipt, identity: ((r as { identity?: string }).identity === 'unconfirmed' ? 'unconfirmed' : 'confirmed') as 'confirmed' | 'unconfirmed' } }));
    },
    async retryReconciliation() { await api.sync(); },
    /** Review controls. All identity-guarded like recordReview: if identity can't be confirmed they throw IdentityUnconfirmed and change nothing. Device-only; never uploaded. */
    async undoReview(id: Pick<ReviewCard, 'questionId' | 'revision' | 'packSha'>): Promise<ReviewCard> {
      const c = await cardFor(id); if (!c.undo) throw Object.assign(new Error('nothing to undo'), { name: 'NothingToUndo' });
      const n = { ...c, ...c.undo, undo: undefined }; await put(S.cards, n); await recompute(); return n;
    },
    async snoozeReview(id: Pick<ReviewCard, 'questionId' | 'revision' | 'packSha'>, until: number): Promise<ReviewCard> {
      const c = await cardFor(id); const n = { ...c, snoozedUntil: until }; await put(S.cards, n); await recompute(); return n;
    },
    async retireReview(id: Pick<ReviewCard, 'questionId' | 'revision' | 'packSha'>, retired: boolean): Promise<ReviewCard> {
      const c = await cardFor(id); const n = { ...c, retired }; await put(S.cards, n); await recompute(); return n;
    },
    /** Retired cards (any due date) so the user can find and unretire them. Includes cards whose exact version is not stored (prompt null). */
    async getRetiredReviews(): Promise<{ card: ReviewCard; question?: Question; reason?: 'version-unavailable'; packSha: string }[]> {
      if ((await assertAccount()) === 'unconfirmed') throw Object.assign(new Error('signed-in identity could not be checked; retired list not shown'), { name: 'IdentityUnconfirmed', retryable: true });
      return (await all<ReviewCard & { key: string }>(S.cards)).filter((c) => c.retired).map((c) => { const q = qIndex.get(`${c.packSha}:${c.questionId}`); return q && q.revision === c.revision ? { card: c, question: q, packSha: c.packSha } : { card: c, reason: 'version-unavailable' as const, packSha: c.packSha }; });   // never substitutes the latest revision
    },
    async getDueReviews(at: number): Promise<ReviewEntry[]> {
      const out: ReviewEntry[] = [];
      for (const c of await all<ReviewCard & { key: string }>(S.cards)) { if (c.due > at || c.retired || (c.snoozedUntil ?? 0) > at) continue; const question = qIndex.get(`${c.packSha}:${c.questionId}`); if (question && question.revision === c.revision) out.push({ card: c, question, packSha: c.packSha }); }
      return out;
    },
    /** Due cards whose exact (packSha, revision) is not stored on this device. Never silently dropped and never swapped to the latest revision. */
    /** The signed-in user confirms answers saved while identity could not be checked are theirs. Only works if the live session matches this store's account. */
    /** Live identity report for the confirm dialog. Never confirms anything. */
    async identityCheck(): Promise<{ storeAccountId: string | null; sessionAccountId: string | null; sessionLabel: string | null; matches: boolean; reachable: boolean }> {
      try { const r = await f(`${base}/api/auth/me`, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(4000) });
        if (!r.ok) return { storeAccountId: opts.userId ?? null, sessionAccountId: null, sessionLabel: null, matches: false, reachable: r.status === 401 };
        const u = ((await r.json()) as { user?: { id?: string; name?: string; email?: string } }).user;
        return { storeAccountId: opts.userId ?? null, sessionAccountId: u?.id ?? null, sessionLabel: u?.email ?? u?.name ?? null, matches: !!u?.id && u.id === opts.userId, reachable: true };
      } catch { return { storeAccountId: opts.userId ?? null, sessionAccountId: null, sessionLabel: null, matches: false, reachable: false }; }
    },
    /** What would be confirmed: per-answer list with the exact question version, prompt and the response in human words. */
    async getUnconfirmedSummary() {
      const rows = (await all<{ event: AttemptEvent; receipt: Receipt; identity?: string }>(S.attempts)).filter((x) => x.identity === 'unconfirmed' && x.receipt.status === 'local').sort((a, b) => a.event.answeredAt - b.event.answeredAt);
      const cards = (await all<ReviewCard & { key: string }>(S.cards)).filter((c) => c.identity === 'unconfirmed').length;
      const human = (q: Question | undefined, r: Response): string => {
        const x = r as Response & { selected?: string[]; raw?: string; unit?: string; text?: string; stepIds?: string[]; source?: string };
        if (x.kind === 'choice') return (x.selected ?? []).map((id) => (q && q.kind === 'choice' ? q.options.find((o) => o.id === id)?.text : undefined) ?? `(option ${id})`).join('; ') || '(nothing selected)';
        if (x.kind === 'numeric') return `${x.raw ?? ''}${x.unit ? ' ' + x.unit : ''}`;
        if (x.kind === 'ordered') return (x.stepIds ?? []).map((id, i) => `${i + 1}. ${(q && q.kind === 'ordered' ? q.steps.find((st) => st.id === id)?.text : undefined) ?? id}`).join(' / ');
        if (x.kind === 'code') return `${x.language} code (${(x.source ?? '').length} characters)`;
        return x.text ?? '';
      };
      return { count: rows.length, reviewRatings: cards, earliest: rows[0]?.event.answeredAt ?? null, latest: rows.at(-1)?.event.answeredAt ?? null,
        answers: rows.map((x) => { const q = qIndex.get(`${x.event.packSha}:${x.event.questionId}`) as Question | undefined; return { eventId: x.event.eventId, questionId: x.event.questionId, packSha: x.event.packSha, revision: x.event.revision, prompt: q && q.revision === x.event.revision ? q.prompt : null, responseText: human(q && q.revision === x.event.revision ? q : undefined, x.event.response), answeredAt: x.event.answeredAt, response: x.event.response, clientVerdict: x.event.clientResult.verdict }; }) };
    },
    /** The user confirms the listed unconfirmed answers (and review ratings) are theirs. The caller must pass the account id it showed
     *  the user; works only if that equals both this store's account and the live session. Never automatic. */
    async confirmUnconfirmed(expectedAccountId: string, eventIds: string[]): Promise<number> {
      if (!opts.userId) throw Object.assign(new Error('local-only store'), { name: 'LocalOnly' });
      const idc = await api.identityCheck();
      if (!idc.reachable) throw Object.assign(new Error('could not check the signed-in account right now; try again'), { name: 'IdentityUnreachable', retryable: true });
      if (!idc.matches || expectedAccountId !== opts.userId || idc.sessionAccountId !== expectedAccountId) { opts.onAccountMismatch?.(); throw Object.assign(new Error('session does not match this account'), { name: 'AccountChanged' }); }
      const want = new Set(eventIds);   // ONLY the reviewed rows; an answer saved after the list was shown stays held
      const rows = (await all<{ key: string; event: AttemptEvent; receipt: Receipt; identity?: string }>(S.attempts)).filter((x) => x.identity === 'unconfirmed' && want.has(x.event.eventId));
      for (const x of rows) await put(S.attempts, { ...x, identity: 'confirmed' });
      const stillHeld = new Set((await all<{ event: AttemptEvent; identity?: string }>(S.attempts)).filter((x) => x.identity === 'unconfirmed').map((x) => `${x.event.packSha}:${x.event.questionId}`));
      for (const c of (await all<ReviewCard & { key: string }>(S.cards)).filter((c) => c.identity === 'unconfirmed' && !stillHeld.has(`${c.packSha}:${c.questionId}`))) await put(S.cards, { ...c, identity: 'confirmed' });
      await recompute(); await api.sync(); return rows.length;
    },
    async getUnavailableReviews(at: number): Promise<{ card: ReviewCard; reason: 'version-unavailable' }[]> {
      const out: { card: ReviewCard; reason: 'version-unavailable' }[] = [];
      for (const c of await all<ReviewCard & { key: string }>(S.cards)) { if (c.due > at || c.retired || (c.snoozedUntil ?? 0) > at) continue; const q = qIndex.get(`${c.packSha}:${c.questionId}`); if (!q || q.revision !== c.revision) out.push({ card: c, reason: 'version-unavailable' }); }
      return out;
    },
    async recordReview(id: Pick<ReviewCard, 'questionId' | 'revision' | 'packSha'>, outcome: 'again' | 'hard' | 'good' | 'easy', at: number) {
      const idn = await assertAccount();
      if (idn === 'unconfirmed') throw Object.assign(new Error('signed-in identity could not be checked; rating not saved, try again when online'), { name: 'IdentityUnconfirmed', retryable: true });
      const ck = `${id.packSha}:${id.questionId}`; const c = await get<ReviewCard & { key: string }>(S.cards, ck);
      if (!c || c.revision !== id.revision) throw new Error('no such card (questionId, revision, packSha)');
      const s = schedule(c, outcome, at); const n = { ...c, ...s, snoozedUntil: undefined, undo: { due: c.due, interval: c.interval, ease: c.ease, lapses: c.lapses, schedulerVersion: c.schedulerVersion }, identity: idn }; await put(S.cards, n); await recompute(); return n;
    },
    getDownloadStatus: () => snap.packs,

    /** Fetch the manifest and every pack, verify each sha256, then swap the manifest pointer. Old packs stay readable. */
    async downloadPacks() {
      if (closed || downloading) return; downloading = true; snap = { ...snap, packs: { ...snap.packs, state: 'downloading' } }; notify();
      try {
        let m: Manifest; try { const mr = await f(`${base}/v5/manifest.json`, { cache: 'no-store' }); if (!mr.ok) return; m = (await mr.json()) as Manifest; } catch { return; }   // offline: keep what is stored, report real counts
        let failed = 0;
        // First visit (no committed manifest): STAGE this manifest so each pack becomes usable as soon as it is verified. Survives reload and offline; a committed manifest always wins and is never replaced until every pack has verified.
        if (!manifest) { partial = m; try { await put(S.meta, { k: 'staged', v: { manifest: m } }); } catch { /* staging is best effort: usability just waits for the commit */ } }
        // Priority order for progressive availability: map, lessons (the reading is useful alone; items are ~1 MB and would delay the first lesson on a slow link), items (checks), problems, anything else; the learner can start before the whole library arrives.
        const rank = (k: string) => (k === 'map' ? 0 : k === 'lesson' ? 1 : k === 'items' ? 2 : k === 'problem' ? 3 : 4);
        // The lesson the learner opened (or landed on) goes first: opened cold on a slow link, it must not queue behind lessons they did not ask for.
        const want = typeof location !== 'undefined' ? /^\/v5\/learn\/([^/?#]+)/.exec(location.pathname)?.[1] : undefined;
        const first = (x: { kind: string; id: string }) => (want && x.kind === 'lesson' && x.id === want ? -1 : 0);
        const order = [...m.packs].sort((a, b) => (first(a) - first(b)) || (rank(a.kind) - rank(b.kind)));
        let sinceNotify = 0; let notifyTimer: ReturnType<typeof setTimeout> | undefined; let needIndex = false;
        const progress = (kind: string) => { if (manifest || closed) return; if (kind === 'items') needIndex = true; sinceNotify++; if (notifyTimer) return; notifyTimer = setTimeout(async () => { notifyTimer = undefined; if (closed) return; if (needIndex) { needIndex = false; qIndex = await loadQuestionsIndex(); } await recompute(); }, 400); };
        // Bounded parallel download (6 at a time): a serial loop costs one round trip per pack, which made the first lesson wait ~30 s on a slow link. Every pack is still sha256-verified before it is stored; a quota/storage failure stops the pool.
        let next = 0; let stop = false;
        const worker = async () => {
          while (!stop) {
            const p = order[next++]; if (!p) return;
            if (await get(S.packs, p.sha256)) continue;
            try { const text = await (await f(base + p.path)).text(); if ((await sha256Hex(text)) !== p.sha256) { failed++; continue; } await put(S.packs, { sha: p.sha256, id: p.id, kind: p.kind, body: text }); progress(p.kind); }
            catch (e) { failed++; if ((e as { name?: string }).name === 'StorageFull') { snap = { ...snap, storageError: (e as { cause?: unknown }).cause && isQuota((e as { cause?: unknown }).cause) ? 'quota' : 'unavailable' }; stop = true; } }
          }
        };
        await Promise.all(Array.from({ length: 6 }, worker));
        if (failed === 0) {
          // Commit only when the manifest is DURABLY readable back. A failed or silently dropped write (quota, storage error) leaves the staged pointer and the in-memory state untouched: nothing claims "complete" that a reload would not find.
          let committed = false;
          try { await put(S.meta, { k: 'manifest', v: m }); const back = await get<{ v: Manifest }>(S.meta, 'manifest'); committed = back?.v?.contentVersion === m.contentVersion && back.v.packs.length === m.packs.length; } catch { /* storageFail already recorded the storage error */ }
          if (!committed) { if (!snap.storageError) snap = { ...snap, storageError: 'unavailable' }; notify(); return; }
          manifest = m; partial = undefined; try { const dtx = db.transaction(S.meta, 'readwrite'); dtx.objectStore(S.meta).delete('staged'); await done(dtx); } catch { /* the committed manifest wins over a leftover staged record on the next open */ } qIndex = await loadQuestionsIndex();
          // GC: drop packs no longer in the manifest, unless a saved answer or review card still points at that exact pack (needed to show its exact version).
          // Single readwrite transaction over packs+attempts+cards: the reference check and the delete are atomic, so an attempt written meanwhile cannot lose its pack.
          const gtx = db.transaction([S.packs, S.attempts, S.cards], 'readwrite');
          const [att, crd, pks] = await Promise.all([req(gtx.objectStore(S.attempts).getAll()), req(gtx.objectStore(S.cards).getAll()), req(gtx.objectStore(S.packs).getAll())]) as [{ event: AttemptEvent }[], ReviewCard[], { sha: string }[]];
          const keep = new Set<string>(m.packs.map((x) => x.sha256)); for (const r of att) keep.add(r.event.packSha); for (const c of crd) keep.add(c.packSha);
          const stale = pks.filter((x) => !keep.has(x.sha)); for (const x of stale) gtx.objectStore(S.packs).delete(x.sha);
          await done(gtx); if (stale.length) qIndex = await loadQuestionsIndex();
          snap = { ...snap, packsRemoved: stale.length };
        }
        // first load incomplete: the staged manifest stays (verified packs remain usable, counts stay honest, retry on the next online load)
        if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
      } finally { downloading = false; await recompute(); }
    },
    /** Upload pending events in batches of 50; apply receipts. Never blocks the UI; failures leave events pending. */
    async sync() {
      if (closed || syncing || !snap.online) return; syncing = true;
      try {
        if (!opts.userId) return;   // anonymous namespace never uploads
        const rows = (await all<{ key: string; event: AttemptEvent; receipt: Receipt; identity?: string }>(S.attempts)).filter((r) => r.identity !== 'unconfirmed' && ['local', 'retryable-error'].includes(r.receipt.status)).slice(0, 50);
        if (!rows.length) return;
        const r = await f(`${base}/api/v5/attempts`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-qf-account': opts.userId }, credentials: 'same-origin', body: JSON.stringify({ events: rows.map((x) => x.event) }) });
        if (r.status === 409) { opts.onAccountMismatch?.(); return; }   // session is another account: caller rebinds
        if (!r.ok) return;   // 401 (signed out), 409 (session is another account), 429, 5xx: stay local, retry later
        const { receipts } = (await r.json()) as { receipts: Receipt[] };
        const tx = db.transaction(S.attempts, 'readwrite');
        for (const rc of receipts) { const row = rows.find((x) => x.event.eventId === rc.eventId); if (row) tx.objectStore(S.attempts).put({ ...row, receipt: rc }); }
        await done(tx);
      } catch { /* offline or network error: remain local */ } finally { syncing = false; await recompute(); }
    },
    close() { closed = true; if (typeof window !== 'undefined') { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); } db.close(); },
  };
  return api as V5ContentStore;
}
