# Learning UX slice 3 (cumulative, supersedes slices 1/2)

New UI-only code. Primary-owned grade5/types/store.fixture/scheduler modules were imported for verification and are NOT in this patch. It needs the latest draft4 types plus recordReview exact identity update and grade5 bundle3.

## Components
- LearningWorkspace: shared lesson/review chrome with exact pack-count/status, no zero-total complete claim, provisional save status, retry sync.
- LessonExperience: step-based authored Lesson blocks and embedded QuestionPlayer; question dictionary must be resolved against exact content revision.
- QuestionPlayer: all six question kinds, stable option IDs/presentation, invalid format not wrong, needs-review/not-assessed/pending states, no fake code execution, locally saved attempt before Continue enables. Receipts refresh through adapter subscription; disputed result keeps original and server feedback with neutral wording.
- ReviewSession: exact resolved ReviewEntry identity, reveal then four self-ratings, saves to primary adapter, never awards machine mastery for self-ratings.
- Preview and AuthoredPreview use the supplied IN-MEMORY fixture adapter. Their banners MUST stay visible until replaced by a real durable store. Fixture receipt hooks are synthetic. Do not treat preview controls as a release feature.

## Preview routes
- /v5/preview: synthetic state exploration, not actual curriculum or account state.
- /v5/preview/lesson/<id>: real authored content from content-v5/lessons and items wrappers, but only synthetic in-memory learner state. Aggregate fixture hash is NOT a production manifest hash. Primary should replace composition with exact manifest pack hashes when wiring real store.

## Required integration
1. Primary owns actual /v5/learn, /v5/learn/[id], /v5/review and /v5/progress composition. Current nav links target these intended URLs; they are not created by this preview patch. Do not claim all navigation works before those routes are wired. Existing legacy routes are untouched.
2. Wire real V5Store, persist draft/lesson read location and sync receipts. This slice does not persist partially typed answers or reading position; adapter currently has no draft/read-location methods. Attempt events do save through submitAttempt. Reload persistence is not provided by fixture.
3. Lesson code blocks are reading examples, explicitly labelled. Runnable=true shows a visible integration gap, not a fake run button. Figure/interactive renderers are unimplemented and show explicit fallback notices. KaTeX inline/display rendering is wired with a protected pre-markdown math pass, literal currency/code preservation, accessible MathML and visible parse-error fallback. These are required next steps before a complete lesson experience.
4. Question optionOrder should come from primary build/session balanced seeded presentation, saved with attempt. Without a provided validated order the component uses authored order; it does not invent a second shuffler.
5. Teaching refs may be official HTTP(S) source URLs or canonical lesson ids. External links remain external with rel=noopener noreferrer; never prefix an external URL as a lesson id.
6. Review undo/snooze/retire and due-preview timing need explicit adapter operations; not faked. Scratch notes say they are not saved. Existing scheduler controls policy, not UI.
7. Credential/integrity conditions are unchanged: server checked practice is not cheating resistant when answers ship in client packs. No certificates/billing introduced.

## Checks actually run
- Browser synthetic checks with actual supplied grade5 bundle3 + fixture: 10 assertions, zero page errors: correct local-save/no-network, disputed evidence retention, invalid numeric, unknown shortText needs-review, reflection not-assessed, code pending, four revealed ratings, exact-card rating save, mobile390px no overflow on review/question.
- Real authored first lesson: first check answered correctly using actual item data; local feedback visible, no page errors, mobile390px overflow0. Content remains content worker's responsibility; no cloned content included in this patch.
- Desktop/light, mobile/light and mobile/dark/reduced-motion pixels inspected. Zero-total track and disputed selected-option styling fixed after first inspection and re-shot.
- Final scoped eslint clean and full-project npx tsc --noEmit passes after stopping the dev server and allowing a 1100MB heap. A prior 512MB-capped attempt ran out of heap and is not counted as a pass. No production build or integrated real server/IndexedDB/SW/offline reload has been claimed.

Test scripts assume localhost:3027 and write /downloads/qf-v5-ui-evidence. They launch only the local preview, no external accounts/providers. Run browser-check.mjs and authored-check.mjs after starting Next.

## Slice 2 changes and additional checks

- LessonMarkdown renders authored markdown with inline/display KaTeX, no raw HTML execution or arbitrary embedded images. Formula syntax is protected before markdown can consume underscores/backslashes. KaTeX trust=false; invalid formulas stay visible as fallback text. Code stays code. Four pure tokenisation tests pass. Nine additional browser assertions pass: valid math/MathML, literal currency, invalid formula fallback, code literals, inert raw HTML, mobile no overflow, number-key option selection, Enter check/focus change, actual external source links with distinct labels. Screenshots of renderer and source links inspected.
- External teaching references deduplicated; labels include hostname and last path segment so two Python sources differ.
- Question focus moves to prompt, then feedback. Number keys choose stable options, Enter checks/continues outside multiline/editable controls. Numeric single-line Enter checks. Native buttons retain normal keyboard behavior.
- Added /v5/preview/rendering, synthetic renderer-only route. It is not curriculum.
- Updated cumulative source has final tsc/eslint passes before renderer browser checks; no shared files/content included.

## Slice 3 authored flow and unavailable states

- Ten actually authored lessons traversed end to end through every block and42embedded checks using actual current item data/grade5bundle3, in-memory fixture store. All10 reached end-of-material, page errors0, mobile overflow0. First-feedback screenshots from all10 were visually inspected. This is not all-block pixel inspection or independent teaching/content proof.
- Explicit LessonUnavailable component covers planned, not-stored, missing-revision and unknown. Planned source map entries without lesson files show “still being written”, not fake material. An authored mapped entry with missing file is not called planned: it shows not-stored/unavailable. Both actual planned and unknown mobile route states checked with zero overflow and pixels inspected. Their current preview return URL is /v5/preview, not real path composition.
- Figure/lab renderers retain explicit unimplemented notices and meaningful alt/fallback text. No arbitrary external image or ignored lab parameters have been silently rendered.
- Final scoped lint and full-project tsc pass after these changes; development server stopped for type-check memory. No production build or real account/storage/network reconciliation claimed.
