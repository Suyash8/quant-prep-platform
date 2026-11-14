/** v5 shared contract types (DRAFT 3). Pure types, no runtime. Owner: engineering. See docs/v5/CONTRACTS-v2.md and CHANGES-v3.md. */

export type ConceptId = string;
export type QuestionBase = {
  id: string; revision: number; conceptIds: ConceptId[]; prompt: string; explanation: string;
  teachingRefs: string[]; misconceptionFeedback?: { optionId?: string; when?: string; text: string }[];
};
export type Option = { id: string; text: string; why: string };

export type Question =
  | (QuestionBase & { kind: 'choice'; selectionMode: 'one' | 'many'; options: Option[]; correct: string[]; shuffle: true })
  | (QuestionBase & { kind: 'numeric'; answer: number; relTol?: number; absTol?: number; units?: string[]; unit?: string })
  | (QuestionBase & { kind: 'shortText'; normalize: ('lower' | 'trim' | 'collapseWs')[]; accepted: Matcher[]; rejected?: (Matcher & { hint: string })[]; fixtures: Fixture[] })
  | (QuestionBase & { kind: 'ordered'; steps: { id: string; text: string }[] })
  | (QuestionBase & { kind: 'code'; problemId: string })
  | (QuestionBase & { kind: 'reflection'; modelAnswer: string; criteria: { id: string; text: string }[] });

export type Matcher = { type: 'exact' | 'regex' | 'numeric'; pattern: string; flags?: string };
/** Fixtures are required: each is a response with the verdict the matcher set MUST produce. Validated at build time. */
export type Fixture = { response: string; expect: 'correct' | 'incorrect' | 'needs-review'; note?: string };

export type Verdict =
  | 'correct' | 'incorrect' | 'needs-review' | 'not-assessed' | 'invalid'
  | 'pending'              // code: queued
  | 'runtime-unavailable'; // code: no runner reachable, NOT incorrect

export type GradeResult = {
  verdict: Verdict; score?: number; feedback?: string; hint?: string;
  criterionResults?: { id: string; met: boolean }[]; graderVersion: string; contentRevision: number;
};

/** Raw response. Choice/ordered carry ids, never positions. Numeric keeps raw text and the chosen unit. */
export type Response =
  | { kind: 'choice'; selected: string[] }
  | { kind: 'numeric'; raw: string; unit?: string }
  | { kind: 'shortText'; text: string }
  | { kind: 'ordered'; stepIds: string[] }
  | { kind: 'code'; language: 'python' | 'cpp'; source: string }
  | { kind: 'reflection'; text: string; selfRating?: 1 | 2 | 3 | 4 | 5 };

export type AttemptEvent = {
  eventId: string;              // client uuid, idempotency key
  questionId: string; revision: number; packSha: string;
  response: Response;
  presentation?: { optionOrder?: string[]; seed?: string };   // what the learner actually saw
  clientResult: GradeResult;    // advisory
  hintsUsed: number; startedAt: number; answeredAt: number;   // client times are evidence only
};

export type ReceiptStatus =
  | 'local' | 'syncing' | 'verified' | 'disputed'
  | 'invalid-event' | 'version-unavailable' | 'retryable-error'
  | 'conflict';   // eventId already recorded with different content; the original record is kept and this answer is NOT graded
export type Receipt = {
  eventId: string; questionId: string; packSha: string; status: ReceiptStatus;
  serverVerdict?: GradeResult; graderVersion?: string; verifiedAt?: number; reason?: string; // server time, authoritative
  identity?: 'confirmed' | 'unconfirmed';   // 'unconfirmed' = HELD on this device, not uploaded: the signed-in identity could not be checked when it was saved. Distinct from a queued (confirmed, waiting-to-sync) row.
};

export type ProgressView = { xp: number; completedLessons: string[]; masteredConcepts: ConceptId[]; streakDays: number; asOf: number };
export type ReviewCard = { questionId: string; revision: number; packSha: string; due: number; interval: number; ease: number; lapses: number; schedulerVersion: number; identity?: 'confirmed' | 'unconfirmed'; retired?: boolean; snoozedUntil?: number; undo?: { due: number; interval: number; ease: number; lapses: number; schedulerVersion: number } };
/** Resolved review: the exact question revision the card was created against, never "latest". */
export type ReviewEntry = { card: ReviewCard; question: Question; packSha: string; sourceLessonId?: string };
export type StoreSnapshot = {
  online: boolean; pending: number; lastSyncAt?: number;
  localOnly?: boolean;             // signed-out device store: answers stay on this device, are never uploaded and never become 'pending'
  unconfirmed?: number;            // answers saved while the signed-in identity could not be checked (offline or slow server): held, NOT uploaded until the user confirms them
  receiptCounts?: { checked: number; correct: number; incorrect: number; queued: number; held: number; disputed: number; rejected: number };   // distinct counts from receipts: checked = verified by the server (correct + incorrect); queued = confirmed identity, waiting to sync; held = unconfirmed identity, not uploaded
  storageError?: 'quota' | 'unavailable';   // last write failed because device storage is full or unavailable. Nothing was saved for that write; never reported as saved.
  packsRemoved?: number;           // stale content packs removed after the last complete download (packs still referenced by saved answers/cards are kept)
  localOnlyCount?: number;         // answers saved on this device in a local-only store
  provisional: ProgressView;       // derived on this device from events; label "saved on this device"
  verified?: ProgressView;         // from server receipts only
  packs: { stored: number; total: number; state: 'complete' | 'incomplete' | 'downloading'; persistent: boolean };
};

/** Adapter the UI codes against (reconciled with the UX worker's proposal). */
export interface V5Store {
  getSnapshot(): StoreSnapshot;
  subscribeState(fn: () => void): () => void;
  getItem(packSha: string, id: string): Promise<Question | undefined>;
  gradeLocal(q: Question, r: Response): GradeResult;
  submitAttempt(e: AttemptEvent): Promise<Receipt>;     // resolves after the local write, never waits for the network
  getReceipts(q: { questionId?: string; conceptId?: ConceptId }): Promise<{ event: AttemptEvent; receipt: Receipt }[]>;
  retryReconciliation(): Promise<void>;
  getDueReviews(now: number): Promise<ReviewEntry[]>;   // resolved by (packSha, questionId); a missing old pack yields an entry-less card state 'version-unavailable' handled by the store, never a silent swap to latest
  recordReview(card: Pick<ReviewCard, 'questionId' | 'revision' | 'packSha'>, outcome: 'again' | 'hard' | 'good' | 'easy', now: number): Promise<ReviewCard>;   // exact identity, never questionId alone
  getDownloadStatus(): StoreSnapshot['packs'];
}

/** ---- Ids (validator-enforced) ----
 * LessonId:  /^qf5-[a-z0-9]+(-[a-z0-9]+)+$/   e.g. qf5-python-values-units. Never reused; renames need an alias entry.
 * ConceptId: /^qf5-[a-z0-9-]+\.[a-z0-9-]+(\.[a-z0-9-]+)*$/   "<lessonId>.<skill>". A lesson may declare SEVERAL concepts, one per separately assessable skill.
 * ProblemId: /^qfp-[a-z0-9-]+$/.  Every id referenced anywhere must resolve against content-v5/curriculum/map.json or the validator fails. */

/** ---- Lesson (minimal block contract; authored as content-v5/lessons/<lessonId>.json) ---- */
export type LessonBlock =
  | { type: 'text'; id: string; markdown: string }                                   // prose, KaTeX allowed ($...$)
  | { type: 'worked'; id: string; title: string; steps: { text: string; code?: string }[] }
  | { type: 'code'; id: string; language: 'python' | 'cpp' | 'text'; source: string; caption?: string; runnable?: boolean }
  | { type: 'check'; id: string; questionId: string }                                // inline practice, resolves to an Item in content-v5/items
  | { type: 'callout'; id: string; tone: 'note' | 'warning' | 'misconception'; markdown: string }
  | { type: 'figure'; id: string; alt: string; src: string }                         // alt text required
  | { type: 'interactive'; id: string; lab: string; params: Record<string, unknown>; fallbackText: string }; // lab must be in the v5 lab registry; unknown params are a validator error
export type Lesson = {
  id: string; revision: number; title: string; module: string; order: number; estMinutes: number;
  objectives: { conceptId: ConceptId; text: string }[];        // observable, each assessable concept listed
  prerequisites: string[];                                      // lesson ids (DAG, no cycles)
  blocks: LessonBlock[];
  practice: { problemIds: string[] };                           // 0..n, resolve against problems
  summary: string;
};

/** ---- Problems: one authored source, split at build time into a public pack and a server-only tests file ---- */
export type CheckerSpec =
  | { kind: 'exact' }                                   // compare after trimming trailing whitespace per line
  | { kind: 'unordered_lines' }
  | { kind: 'float_tol'; absTol: number; relTol: number }; // chosen per problem from the numeric scale; finite, >= 0; no global default
export type Limits = { timeLimitMs: number; memoryLimitMb: number };   // measured by engineering, set per language

export type ProblemAuthored = {
  id: string; slug: string; title: string;   // id follows ProblemId
  track: 'T1-core' | 'T2-dsa' | 'T3-quant-math' | 'T4-finance' | 'T5-systems' | 'T6-capstone';
  order: number; difficulty: 1 | 2 | 3 | 4 | 5; estMinutes: number;
  conceptIds: ConceptId[]; lessons: string[]; prerequisites: string[];  // problem ids
  aliases?: string[];                                                    // old ids/slugs of migrated problems
  statement: unknown[]; inputFormat: string; outputFormat: string; constraints: string[];
  examples: { input: string; output: string }[]; hints: string[];
  starter: { python: string; cpp: string };
  checker: CheckerSpec;
  tests: { input: string; expected: string; hidden: boolean }[];        // hidden=false tests may be public
  solutions: { python: string; cpp: string };                            // oracle solutions, server/build only
  limitsOverride?: { python?: Limits; cpp?: Limits };                    // normally derived by measurement
};
/** Public pack: derived. Contains NO tests with hidden=true, no solutions, no expected output of hidden tests. */
export type ProblemPublic = Omit<ProblemAuthored, 'tests' | 'solutions' | 'limitsOverride'> & { visibleTests: { input: string; expected: string }[]; packSha?: string };   // packSha: the content hash of the exact public pack the learner is looking at (added by the device store, not part of the pack)
/** Server-only artefact: never referenced by the client manifest. */
/** The server file is derived from the SAME authored source; solutions live only in the authored source and build tooling, not in this artefact. */
export type ProblemServer = { id: string; sha: string; checker: CheckerSpec; tests: ProblemAuthored['tests']; limits: { python: Limits; cpp: Limits } };
