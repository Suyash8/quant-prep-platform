# QuantFoundry, v3.2 visual refinement pass

This pass takes the v3.1 baseline through a full third polish loop: a fresh
single-page vision-model audit of all 25 routes, a systemic fix pass driven by
that audit, and a re-run of every static gate.

## Design system (globals.css)

- **Stat tiles rebuilt as horizontal KPI layout**: `icon-tile-sm` left, a
  `.stat-body` column (`.stat-value` / `.stat-label` / `.stat-sub`) centre,
  optional `.stat-side` right slot. Kills the dead-middle, floating-icon
  treatment the audit flagged on a dozen pages. A new
  `icon-tile-neutral` tone demotes secondary and zero-value stats.
- **Chip hierarchy**: `chip-strong` (accent-filled) added; ghost chips stay for
  metadata. Pages now use at most two accent hues per stat row.
- **Reading contrast**: light-theme `--foreground-muted` / `--foreground-faint`
  darkened to comfortable ratios on white; `.prose-qf` gained
  `overflow-wrap: break-word` so long inline math/code cannot shove the page
  sideways on 390px screens.
- **Phase palette (curriculum path) retuned to jewel tones**, same playful
  identity, comfortably readable white text on every banner.

## Curriculum path (learning-path.tsx)

- Phase icons now key off the semantic phase *colour* (orientation → Compass,
  math → Sigma … systems → Database); before, the regexes matched phase ids
  `ph0..ph10` so every phase rendered the same Layers glyph.
- Phase banner restructured: gradient now runs deep→full for depth, the ghost
  watermark icon was removed (it read as a crop), and the progress block is
  one bordered lockup (big %, count, bar) instead of floating parts.
- Locked-phase preview cards show their own first modules and hours :
  no more eleven rows of identical "unlocks as you clear…" copy.
- Trail spacing tightened (node gaps, band padding); the sticky rail gains a
  "Next up" card for the recommended lesson; pluralisation helper added.

## Practice

- Pack builder now ships `xp` (30/50/80 by difficulty) and a one-line
  statement summary per problem, the list middle column is no longer empty,
  and the reward system reads as real data instead of a flat "30 XP" on all
  28 rows.
- Rows carry status colouring: solved rows tint + accent edge, attempted rows
  gold edge, untried plain. Difficulty keeps the tone chip; category/time are
  demoted to plain text (one metadata system).
- Stat tiles converted to the canonical layout; group headers gained category
  icons, counts and stronger contrast; "Surprise me" demoted to the primary
  green.

## Auth (login + register)

- The page is now a full-height column with an anchored footer bar, the
  "About · Methodology · Peek at the curriculum" links no longer float
  mid-page over a dead right channel.
- Register's password strength meter is a labelled 4-segment meter with
  Weak/Fair/Good/Strong states (the old single gray pill read as broken).
- Both columns stretch to equal height; the pitch-card mini stats use the
  canonical stat-tile markup; the mascot sits inside the card bounds.

## Page-level polish (from the 25-page audit)

- **projects**: status edges + milestone micro-row on every in-progress card;
  card CTAs demoted to ghost so the closing CTA holds the only solid green.
- **about**: even 3+3 stat grid, matched callout pair, 2-hue icon discipline,
  5th engineering note spans full width, attribution split into paragraphs.
- **revision**: columns stretch, flashcard stage shows a card counter,
  secondary progress bars demoted from green, Reveal is ghost.
- **dashboard**: stat tones unified (zero-value = neutral "not started"),
  quests restructured, activity rows compressed with a date column, revision
  urgency badged in "More to do".
- **career + detail**: requirement matrix cells render as the legend's colour
  chips, jargon expanded (C++/DSA/Frequent), firm rows track-tinted and
  differentiated, notes cards carry source/date headers, competencies grouped
  into labeled clusters.
- **assessments + detail**: per-card descriptions from real content, one
  metadata line per card, zero-progress bars replaced by "Not started",
  uniform "Best N%" badge, attempts capped and compact, "Also available"
  sibling strip.
- **methodology / analytics / planner / settings / drills**: canonical stat
  tiles, balanced columns, unified chip semantics, fixed-width right slots on
  planner day cards, honest left-panel plan summary, definition-grid privacy
  rows, score-linked drill bars, lucide icon instead of the stray emoji.
- **lab / admin / diagnostic / landing / problem / lesson**: ghost Launch
  buttons, section-accented tags, auto-fill grids, admin hierarchy +
  status strip, centred diagnostic hero with a single accent element, landing
  carousel fade affordance + canonical stat strip, problem editor auto-height
  with one-row toolbar (Submit is the only solid action), lesson briefing
  filled with an "Inside this lesson" module.

## Content

- **45 lessons re-embedded with tailored interactive blocks** (TerminalSteps
  sessions, LatencyBudget stacks, JoinVisual, OrderBookVisual, …), taking the
  content validator from 47 warnings to **0**.
- Two short lessons (coordinate geometry, drawdown hedging) deepened past the
  250-word body floor with topical paragraphs.

## Native control scan: 18 → 0

Every quiz option is now a 3D `qf-answer-tile` with `sr-only` input and a
letter badge; numeric/short/code-output answers use `qf-input` /
`qf-textarea`; drill and lesson-player inputs, lab sliders and checkboxes,
the code-workspace editor/select, and the admin dropzone picker all carry the
system classes (`qf-check`, `qf-range`, `qf-select`, `qf-editor-input`,
`sr-only`).

## Gates (all green)

| gate | result |
| --- | --- |
| tsc | 0 errors |
| eslint | 0 new (6 pre-existing baseline) |
| content validator | 0 warnings (was 47) |
| native control scan | 0 hits (was 18) |
| contrast audit | all pairs pass |
| unit tests | 25/25 |
| smoke | 32/32 |
| offline gate | 6/6 |
| desktop overflow (25 routes) | 0 |
| mobile overflow 390×844 (25 routes) | 0 |
