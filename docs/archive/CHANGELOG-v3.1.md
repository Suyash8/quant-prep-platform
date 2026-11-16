# CHANGELOG v3.1

Everything below is relative to the v3 baseline zip. Grouped per the master build prompt: Foundations, Pages, Premium, Engineering, Content, Docs.

## Foundations

- Design tokens: raised `--foreground-faint` for WCAG 4.5:1 (light `#667587`, dark `#8795a6`); darkened the light-mode chip-text tokens (`--accent-deep`, `--info-strong`, `--warning-strong`, `--danger-strong`, gold chip ink `#8f6b00`) so all chip text passes contrast; `.btn3d` fills now use `accent-strong` with `accent-deep` press edge; dark-mode filled buttons use dark ink on bright fills; `.btn3d-violet` dark variant passes 3:1. New `scripts/contrast-audit.mjs` parses `globals.css` and verifies 17 fg/bg pairs, all passing.
- New `--editor-*` token set (both themes) plus `.qf-editor*` classes: the code workspace is a designed dark surface, not a pasted-in black box.
- v3.1 additions in `globals.css`: `.qf-answer-tile` (+ states and `.qf-letter`), `.qf-segmented`, `.qf-ring`, `.qf-dropzone`, `.qf-callout-*`, `.qf-stepper`, `.qf-footer`, `.qf-mascot`, `.qf-confetti`, `.qf-field-label/-hint/-error`, `.qf-rail`, tap-target floor for `btn3d-sm` on coarse pointers.
- New shared components: `Mascot` (Siggy, an original sigma-creature with 7 poses, tokens only), `PageHero` / `SectionHead` / `StatTile` / `StatRow` / `ClosingCta` / `EmptyState` / `ProgressRing` (`ui/page-kit.tsx`), and `AnswerTile` / `QfSelect` / `QfSlider` / `QfCheck` / `QfDropzone` / `QfField` (`ui/qf-field.tsx`).
- Native-control sweep: all bare selects, textareas, ranges, checkboxes and the file input now use system classes or the shared components (verified by `scripts/scan-native-controls.mjs`, 0 hits; sr-only radio/checkbox inside answer tiles is the documented label/input pattern).
- Hardcoded-color sweep: 56 hex literals removed from tsx (confetti, terminal surface, lab SVG strokes, theme-color meta via rgb(), global-error via rgb()/keywords); only `learning-path.tsx` keeps its sanctioned `resolvePhaseColor` phase palette; `code-workspace.tsx` rewritten onto `--editor-*` tokens with a line-number gutter.
- App shell: rich desktop footer (brand block + Learn / Practice / Product link groups + Works-offline chip + version), skip link, `main#content` landmark; mobile tab labels raised to 12px minimum.
- Route states added: `loading.tsx`, `error.tsx`, `not-found.tsx` (with search and mascot), `global-error.tsx`, plus segment-level loading skeletons for `/learn/[lessonId]`, `/practice/[slug]`, `/career/[slug]`, `/projects/[slug]`.
- Service worker cache version bumped `qf3-v1` to `qf3-v2` (shell pages changed).

## Pages

- Landing: hero CTAs are real `btn3d-lg` (the old `!`-prefixed utilities silently did nothing in Tailwind 4); trust chips; live product mock with quiz answer tile, progress ring and contained mascot; stat strip as `stat-tile`s; new "How a lesson feels" steps; 11-phase path strip; six-tile feature grid with chips; track cards on token colors; offline/PWA band with download mock; FAQ accordion (restyled triggers); final CTA band with mascot; four-column footer. All hex removed.
- Login / Register: labeled `qf-input`s with leading icons, password show/hide (type="button", defaults to password), register password-strength meter and "first 5 minutes" list, mascot in brand panel, floating math symbols, honest local-first note, page footer with links. Login selectors contract preserved.
- Dashboard: HUD stat row (XP / level / streak / goal) with `anim-pop-in`; continue card with mascot; quests as `row-card`s with `prog-track` bars and chest chip; metrics as `StatTile`s; section titles converted from gray uppercase text to `SectionHead`; learning path framed in a `qf-card bg-dots`; weekly activity chart with real `minutesByDay` (now synced from the server); next-milestone `ClosingCta`.
- Lesson player: three-zone stage (left lesson map rail at lg, centered `qf-card` on `bg-dots`, rewards + tips rail at xl), vertically centered card, `Enter` kbd hint, HUD counter as a pill, quiz options as `qf-answer-tile`s, objectives with icon ticks, mascot on the intro card.
- Practice: fixed search icon overlap (CSS custom padding), Solve ghost button no longer relies on broken `!text-xs`, XP chip shown as "+30 XP" only on unsolved rows, recommended-next card, language-support card, closing CTA.
- Problem: header row (back link + title + chips), statement card with test-count chip, hints and editorial side by side, related-problems rows, closing CTA; workspace on editor tokens with line gutter.
- Assessments list: per-assessment descriptions instead of repeated kind boilerplate, no dead 0% bars on unstarted cards (replaced with an honest baseline line), closing CTA.
- Assessment detail: what-to-expect section breakdown, rules checklist, best-score ring, compact start card as the single green CTA, tips callout, closing CTA.
- Curriculum: PageHero, stat tiles, segmented view toggle, horizontal progress + phase-jump strip replacing the screenshot-dead right rail, phase-specific locked-phase copy, closing CTA.
- Learn library: `/learn` is now its own page (was a redirect to /curriculum): PageHero, stat row, filter bar with segmented difficulty control, collapsible module groups with per-phase tone variety, closing CTA.
- Revision: lesson titles resolved from packs (no raw slugs), honest "Not enough reviews" chip instead of an en-dash, SM-2 explainer timeline, mascot in the caught-up state, closing CTA.
- Labs: featured live lab (order book) hero, ragged-row fill so grids never end ragged, "Open lab" ghost buttons (one green CTA per view), closing CTA.
- Analytics: period selector (7/14/30/all, real data slicing), 12px minimum chart labels, bars with baseline, not-started weak skills as chips with bars, page-sub with real numbers, chart takeaways.
- Diagnostic: two-column hero with the seven area tiles, single green start (the compact player directly under the hero).
- Drills: stat row, trainer anchored for the closing CTA, closing CTA.
- Planner: full-height plan (no more 640px scroll box that clipped in full-page captures), "If you fall behind" and "Plan export" cards.
- Methodology: container widened to max-w-5xl.

## Premium layer

Not built in this pass (pricing, achievements, certificates, onboarding). The v3.1 scope prioritized the visual and engineering gates for the 25 audited routes; each premium route would be added to the end of the audit list per the master prompt. The mascot and closing-CTA system introduced here are the shared foundations those routes will use.

## Engineering

- Study minutes now sync: `buildSnapshot` includes `minutesByDay` from server learning sessions and `applySnapshot` merges per day (max wins), so a fresh browser charts real history.
- New tooling: `scripts/shot.mjs` (portable 25-route Playwright harness), `scripts/shot-one.mjs`, `scripts/scan-native-controls.mjs`, `scripts/contrast-audit.mjs`, `scripts/pg-embedded.sh` / `scripts/pg-embedded.mjs` (portable embedded Postgres), `scripts/add-interactive-blocks{,-2,-3}.mjs`.
- `listAssessments` now returns the description so cards carry real copy.
- Offline engine, sync event protocol, SW message names and login-selector contracts unchanged and re-verified.

## Content

- 45 lessons gained a registered interactive block (three batches), each matched to the closest existing lab. The validator now reports 0 errors and 0 warnings (baseline: 47 warnings, 19+ "no interactive block").
- Body text expanded for `geo-coordinate-geometry` and `risk-drawdown-hedging` (both previously under the 250-word floor).
- Banned-word cleanup in content and comments ("crucially", "journey", "robustness" and family) while keeping legitimate technical finance terms (leveraged investors, underscore syntax).

## Docs

- `SETUP.md`: PostgreSQL (not SQLite) with three start options, cache name corrected to `qf3-v2`.
- `DESIGN.md`: v3.1 additions section (new classes, components, token changes).
- All em/en dashes removed from `content/README.md`, `docs/ARCHITECTURE.md`, `DESIGN.md`, `SETUP.md`, `VERCEL_DEPLOY.md`, `README.md` (31 hits, now 0).
- This changelog and `AUDIT.md` (final scores).
