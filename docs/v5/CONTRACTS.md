# v5 contracts (DRAFT 1, owner: engineering)

Status: draft for the content, problem and UX owners to review. Nothing here is implemented yet.
Legacy accounts and data are preserved. v5 content lives in a separate version namespace (`content-v5/`).

## 1. Content pack
- `manifest.json`: `{ schema: 5, contentVersion, packs: [{ id, kind, bytes, sha256, priority, deps[] }] }`
- Pack kinds: `lesson`, `itemBank`, `problem`, `assessment`, `revisionDeck`, `codeRuntime` (optional, large).
- Pack ids are stable. A changed pack gets a new sha256. Old attempts record the pack sha they were taken against.

## 2. Item (quiz, revision, assessment)
```ts
type Item = {
  id: string; packId: string; conceptIds: string[];   // concept map is owned by the curriculum owner
  stem: string; explanation: string;                  // explanation shown after the attempt
  kind: 'mcq' | 'numeric' | 'shortText' | 'ordered' | 'code';
  mcq?:     { options: { id: string; text: string; why: string }[]; correct: string[]; shuffle: true };
  numeric?: { answer: number; relTol?: number; absTol?: number; units?: string[] };
  shortText?: { accepted: { pattern: string; flags?: string; kind: 'exact'|'regex'|'numeric' }[];
                rejected?: { pattern: string; hint: string }[]; normalize: ('lower'|'trim'|'collapseWs'|'stripPunct')[] };
  ordered?: { steps: string[] };
  code?:    { problemId: string };
  difficulty: 1|2|3|4|5; tags: string[];
};
```
Validator rules (strict, no relaxation): every option has a `why`; correct position is balanced across a bank
(no more than 40% of keys in one slot per 10+ items); no correct option longer than all distractors in over 50%
of items; every shortText item has at least 3 accepted forms and 2 rejected examples.

## 3. Attempt event (client to server)
```ts
type AttemptEvent = {
  clientEventId: string;      // uuid, idempotency key
  itemId: string; packSha: string; contentVersion: string;
  answer: unknown;            // raw answer, same shape the grader takes
  clientVerdict: 'correct'|'incorrect'|'partial';   // advisory only
  startedAt: number; answeredAt: number; offline: boolean;
};
```
Server: validates, re-grades with the same engine (`src/lib/grade/`, pure and shared), stores the verdict as authority.
Verdict states shown by the UI: `instant` (client only), `verified` (server graded), `disputed` (client and server
differ; server wins, the learner is shown both). XP, mastery, retrievalDone and certificate eligibility derive ONLY from
`verified` events. The client never sends XP or progress totals.

## 4. Security statements the UI and docs must keep true
- Re-grading proves deterministic correctness of the stored answer. It does not prevent cheating when answer keys are on the device.
- Credential or certificate assessments must be server-delivered and server-graded. No offline credential path.
- Hidden code tests never ship to the client.
- No certificate phase mapping is active without an owner-configured mapping.

## 5. Offline contract (UI wording)
The manager shows "N of M packs stored", `complete` only when every manifest pack is verified by sha, otherwise
`incomplete` + Retry. The app requests persistent storage and shows whether it was granted. There is no guarantee against browser eviction.
