# v5 contracts, DRAFT 2 (engineering). Supersedes the Item/Attempt parts of draft 1; draft 1 sections 1, 4, 5 still hold.

## A. Ownership and paths
| Area | Owner | Paths |
|---|---|---|
| Grader, schema, sync, outbox, store, service worker, runner, validators | Engineering | `src/lib/grade5/`, `src/lib/v5/` (store, outbox, sync), `src/app/api/v5/`, `public/sw*`, `mini-services/`, `scripts/validate-v5.*` |
| Pure revision scheduler | Engineering, interface below. UX worker writes UI only | `src/lib/v5/schedule.ts` |
| Lesson, assessment, UX components and routes | UX worker | `src/components/v5/`, `src/app` |
| Curriculum, lessons, item banks | Content owner | `content-v5/curriculum/`, `content-v5/items/` |
| Problems | Problem worker | `content-v5/problems-src/<slug>.json` (one authored source) |
Nobody else edits another owner's paths. Patches go through main.

## B. Ids
- `conceptId`: stable skill id, e.g. `py.testing.fixtures`. Owned by the content owner's curriculum map. Items, lessons and problems all reference concept ids.
- `lessonId`: stable lesson id. Problems carry `lessons: lessonId[]` (canonical teaching refs) and `conceptIds`.
- All ids are lower-case, dot-separated, never reused. A rename needs an alias entry. The validator fails on any unresolved id.

## C. Question, grading and results (reconciled with the UX proposal)
```ts
type Question = {
  id: string; revision: number; conceptIds: string[]; kind: 'choice'|'multi'|'numeric'|'shortText'|'ordered'|'code'|'reflection';
  prompt: string; explanation: string; misconceptionFeedback?: { when: string; text: string }[]; teachingRefs: string[];
  // choice/multi: options[{id,text,why}], correct: optionId[], shuffle:true. Attempts send option ids, never positions.
  // numeric: {answer, relTol?, absTol?, units?: string[]}. Both tolerances finite and >= 0, validated.
  // shortText: {normalize[], accepted[{kind,pattern,flags?}], rejected[{pattern,hint}], acceptedFixtures[], rejectedFixtures[]}
  // reflection: {modelAnswer, criteria[]}  // never machine-graded
};
type GradeResult = {
  verdict: 'correct'|'incorrect'|'needs-review'|'not-assessed'|'invalid';
  score?: number; criterionResults?: { id: string; met: boolean }[]; feedback?: string;
  graderVersion: string; contentRevision: number;
};
```
- `invalid` (empty, NaN, unknown option id, duplicates) never counts as an attempt outcome and never becomes "wrong".
- `reflection` is always `not-assessed`. `needs-review` is returned when a pattern is invalid (grader fails closed) or a rule marks the answer as uncertain. Neither awards mastery.
- shortText is only for constrained answers. The fixtures are required: each accepted and rejected pattern must pass its own fixtures in the validator. There is no minimum count of accepted forms; the content owner chooses forms that fit the canonical term or number. Patterns are fully anchored, length-bounded, with nested quantifiers, back-references and lookaround rejected.
- The implemented engine is `src/lib/grade5/index.ts`. The `GradeResult` shape above is the target; the current code returns `{verdict, hint?}` and gets the extra fields in the next commit.

## D. Attempt, receipt, local progress
```ts
type AttemptEvent = { clientEventId: string; questionId: string; revision: number; packSha: string; answer: unknown;
  clientResult: GradeResult; startedAt: number; answeredAt: number; hintsUsed: number };
type Receipt = { clientEventId: string; state: 'local'|'syncing'|'verified'|'disputed'|'rejected'; serverResult?: GradeResult; receivedAt?: number };
```
- Local progress (provisional) is DERIVED on the device from the event log. It drives next-lesson unlocks, due reviews and streak display, and never blocks the next lesson because verification is pending. It is labelled "on this device".
- Canonical XP, mastery, credentials come only from server-verified events. A disputed result shows both and the server wins. Totals sent by a client are ignored.
- The server accepts events idempotently by clientEventId and rejects an unknown revision with `rejected`.

## E. Store adapter (UX worker codes against this; Engineering supplies a real one and a fixture stub)
```ts
interface V5Store {
  saveAttempt(e: AttemptEvent): Promise<Receipt>;
  getAttempts(q: { questionId?: string; conceptId?: string }): Promise<{ event: AttemptEvent; receipt: Receipt }[]>;
  subscribe(fn: (change: { kind: 'attempt'|'receipt'|'progress'|'packs' }) => void): () => void;
  reconcileStatus(): Promise<{ pending: number; lastSyncAt?: number; online: boolean }>;
  progress(): Promise<{ provisional: ProgressView; verified?: ProgressView }>;   // provisional is derived, verified comes from the server
  dueReviews(now: number): Promise<ReviewCard[]>;
  gradeLocal(q: Question, answer: unknown): GradeResult;
  packStatus(): Promise<{ stored: number; total: number; state: 'complete'|'incomplete'|'downloading'; persistent: boolean }>;
}
```
Location: `src/lib/v5/store.ts` (types, available in the next commit), `src/lib/v5/store.fixture.ts` (in-memory stub, labelled unimplemented).

## F. Revision scheduler (pure, Engineering)
`schedule(card: {id, interval, ease, due, lapses}, outcome: 'again'|'hard'|'good'|'easy', now) => card`. Deterministic, no I/O, versioned (`schedulerVersion` in the card). Unit tests in `scripts/`. Only questions graded `correct` or `incorrect` produce an outcome. `needs-review`, `not-assessed` and `invalid` never schedule.

## G. Problem pack (public vs server-only)
One authored source per problem: `content-v5/problems-src/<slug>.json`. The build splits it into two artefacts, each with a sha in its manifest:
- Public `problem` pack (client-safe): `id, slug, title, track, order, difficulty, estMinutes, conceptIds, lessons[], prerequisites[] (problem ids), statement[], inputFormat, outputFormat, constraints, examples[{input,output}], hints[], editorial, starter{python,cpp}, checker{kind}`.
- Server-only `tests` file (never in a manifest or a public pack): `tests[{input, expected, hidden}], checker{kind, absTol?, relTol?}, limits{python:{timeLimitMs,memoryLimitMb}, cpp:{...}}, solutions`. A build check fails if a public pack contains any hidden test, expected output of a hidden test, or solution.
- `checker.kind`: `exact` (trim trailing whitespace per line), `float_tol` (per-problem absTol and relTol chosen from the numeric scale; no global default; both finite and >= 0), `unordered_lines`.
- Tolerance policy: when a problem uses float_tol, the statement states the tolerance instead of a rounding rule. Existing 4-6 decimal outputs stay as they are until the worker decides per problem.
- Limits: Engineering measures from the oracle on the runner and sets budgets with a floor and a margin. The worker sends its timing table (py and cpp on the existing large inputs) as input.
- Migration of the 48: a script from scripts/problems into the schema once the schema is frozen; the same verification is re-run. The old ids stay as aliases.
- Counts: the inventory totals 20+32+20+25+20+8 = 125, not 117. Reconcile before any public count. This is a candidate list, not a promise.

## H. Still open
- Pack schema for lessons (content owner proposes the block types; Engineering validates).
- Concept map and canonical ids (content owner, through main).
- Exact scheduler constants (Engineering, from a measured fixture; SM-2 style as the baseline).
