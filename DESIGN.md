# QuantFoundry Design Bible (v2)

Every page must look like it belongs to a polished, playful learning product that competes with Duolingo. This document is the single source of truth. **Read `src/app/globals.css` for the full class inventory.**

## The 10 Golden Rules (violations = rejection)

1. **No dead zones.** A page must never end in a big empty area. Fill with content (stats, next steps, tips, related links). If content is genuinely short, center it vertically in a card with `bg-dots` texture behind, or add a meaningful closing CTA section.
2. **Every primary action is a `.btn3d` button.** Never a bare text link, never a flat pastel button. Variants: `btn3d` (green), `btn3d-blue`, `btn3d-gold`, `btn3d-violet`, `btn3d-danger`, `btn3d-ghost` (secondary), sizes `btn3d-sm` / `btn3d-lg`. Links that look like buttons must be `<Link className="btn3d ...">`.
3. **No native-looking form controls.** Inputs → `.qf-input`, textareas → `.qf-textarea`, selects → `.qf-select` (or `.qf-select-sm`), sliders → `.qf-range`, checkboxes → `.qf-check`. Never bare `<input>`, `<select>`, `<textarea>` without these classes.
4. **Cards are `.qf-card`** (border 2px `--border-strong` + hard offset shadow `0 4px 0 var(--shadow-hard)`, the chunky Duolingo edge) or `.qf-card-flat` (no shadow, for nested). Never `border` + no radius + no shadow divs. Nested cards inside cards use `.qf-card-flat` or plain rounded divs on `surface-2`. Stat tiles use the softer `--shadow-card` (hard shadows read as artifacts on small tiles).
5. **Every list row is interactive.** Use `.row-card` with an `.icon-tile` (colored) or status icon on the left, title + meta in the middle, right-side action (chip, chevron, or btn3d-sm). Rows lift on hover.
6. **Icons everywhere.** Import from `lucide-react`. Every card, every section header, every stat gets an icon. Icon colors come from `.icon-tile-*` tiles. Never a text-only card.
7. **Metadata as chips, never gray text.** Use `.chip` + `.chip-accent/-info/-warning/-danger/-success` for difficulty, time estimates, status, tags. Time → `chip` with `Clock` icon; questions → `chip` with `ListChecks`; XP → `chip-warning` with `Zap`.
8. **Empty states are friendly, not broken.** Use `.qf-empty` with a big emoji (`.empty-emoji`), one encouraging sentence, and a `.btn3d` CTA. Never a bare gray box with one line.
9. **Color hierarchy: one primary action per view.** Green (`btn3d`) is THE action. Blue is informational/secondary. Gold = XP/rewards only. Danger only for destructive. Don't put 3 competing colored CTAs side by side.
10. **Motion is subtle but present.** Cards/lists enter with `anim-slide-up` (stagger via inline `animationDelay`), key numbers `anim-pop-in`, hover states transform, `.press` on clickable tiles. Respect reduced-motion (already global).

## Page skeleton (standard for every feature page)

```
<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
  <header className="page-hero">
    <span className="icon-tile icon-tile-accent"><Target/></span>
    <div>
      <h1>Page title</h1>
      <p className="page-sub">One-line description with a useful stat.</p>
    </div>
    (optional right side: primary btn3d action)
  </header>
  ...sections, each introduced by .section-head (icon-tile-sm + h2)
</div>
```

- Container: `mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8` (wider pages: `max-w-7xl`).
- Stat rows: grid of `.stat-tile` with `.icon-tile-sm` + `.stat-value` + `.stat-label`, each tile gets its accent color; values `anim-pop-in`.
- Progress: `.prog-track` + `.prog-fill` (+ `-info/-gold/-danger/-violet` variants).
- Tables: `.qf-table` inside a `.qf-card` with `p-2 sm:p-4`. Row hover is automatic.
- Loading: `.skeleton` blocks (h-4/h-24 rounded), never spinner-only pages.

## Color semantics (use Tailwind classes mapped to tokens)

| Purpose | Class / token |
|---|---|
| Action, success, progress | `text-accent-deep`, `bg-accent-soft`, `chip-success` |
| Info, blue links | `text-info-strong`, `bg-info-soft`, `chip-info` |
| Warning, time, XP | `text-warning-strong`, `bg-warning-soft`, `chip-warning` |
| Danger, errors | `chip-danger`, `text-danger` |
| Gold, rewards, streak | `text-gold`, `bg-gold-soft` |
| Violet (variety accents) | `icon-tile-violet`, `prog-fill-violet` |

Soft backgrounds only inside cards or as tile/chip fills, never whole page sections.

## Dark mode

Everything must use CSS vars (they flip automatically). Test classes don't hardcode hex. Only `#fff` on `btn3d` text and `#4a3800` on `btn3d-gold` text are allowed literals (already in CSS).

## Anti-patterns (instant fail)

- Native `<select>` / `<input type=range>` chrome
- A CTA that is `text-sm text-blue-600 underline` or a flat `rounded-lg bg-green-100` button
- A page that ends after one short card (dead footer zone)
- Wall of paragraph text with no icon, chip, card, or color for 3+ paragraphs
- Gray-on-gray low contrast meta text (`text-gray-400` style), use `text-muted`/`text-faint` tokens
- Emoji mixed with lucide icons for the same purpose (pick lucide for UI, emoji only in `.empty-emoji` and celebratory moments)
- Inconsistent border radius (stick to the system radii: 12/16/18/20px classes provided)

## Verification before you claim done

1. `bunx tsc --noEmit`, zero errors in YOUR files (ignore `examples/`, `skills/`, and files outside your assignment)
2. Page renders at 1280×900 and 390×844 without horizontal scroll
3. Check yourself against every Golden Rule, one by one

## v3.1 additions

New system classes, added in the "v3.1 ADDITIONS" section of `src/app/globals.css`. All use tokens and have dark-mode coverage via CSS variables.

| Class | Purpose | Example |
|---|---|---|
| `.qf-answer-tile` (+ `.qf-selected`, `.qf-correct`, `.qf-wrong`, `.qf-letter`) | 3D selectable quiz option tile with letter badge. Selected is green with offset shadow, correct green, wrong red with shake. | `<label className="qf-answer-tile qf-selected"><input type="radio" className="sr-only" /><span className="qf-letter">B</span>…</label>` |
| `.qf-segmented` | Segmented control for small exclusive choices. Buttons toggle `aria-pressed`. | `<div className="qf-segmented"><button aria-pressed>7d</button><button>30d</button></div>` |
| `.qf-ring` (+ `.qf-ring-label`) | SVG progress ring wrapper, label centered in the grid. | `<span className="qf-ring"><svg>…</svg><span className="qf-ring-label">50%</span></span>` |
| `.qf-dropzone` (+ `.qf-drag`) | Styled file dropzone replacing a bare input (hidden input inside). | `<div className="qf-dropzone">Drop a JSON file here</div>` |
| `.qf-callout-info/-tip/-warn` | Inline callout blocks for notes, tips and cautions. | `<div className="qf-callout qf-callout-warn">…</div>` |
| `.qf-stepper` (+ `.qf-stepper-row`) | Vertical stepper for milestones and interview processes, connector line included. | `<div className="qf-stepper"><div className="qf-stepper-row">…</div></div>` |
| `.qf-footer` (+ `h3`, `a`) | Rich app footer grid: brand block plus three link groups, 4 columns at lg. | see `src/components/app-shell.tsx` |
| `.qf-mascot` | Frame around the mascot SVG, token drop shadow. | `<Mascot pose="cheer" />` (auto-applied) |
| `.qf-confetti` | Full-viewport slot for the confetti overlay, pointer-events none. | `<div className="qf-confetti">…</div>` |
| `.qf-field-label/-hint/-error` | Form micro system: label, helper and error text rows. | `<span className="qf-field-label">Email</span>` |
| `.qf-rail` | Sticky side rail (`position: sticky; top: 5.5rem`) for companion columns. | `<aside className="qf-rail">…</aside>` |
| `.qf-editor`, `.qf-editor-header`, `.qf-editor-input`, `.qf-editor-gutter`, `.qf-editor-text/-muted/-accent/-well` | Dark code-editor surfaces driven by `--editor-*` tokens (both themes), so the code workspace reads as designed, not pasted in. | see `src/components/code-workspace.tsx` |
| `--editor-*` tokens | `--editor-bg`, `--editor-surface`, `--editor-border`, `--editor-divider`, `--editor-well`, `--editor-text`, `--editor-muted`, `--editor-accent` for both `:root` and `.dark`. | `color: var(--editor-text)` |

New shared React components:

| Component | File | Purpose |
|---|---|---|
| `Mascot` | `src/components/brand/mascot.tsx` | Siggy, the original sigma-creature mascot. Poses: wave, think, cheer, sleep, lost, offline, celebrate. Token colors only, aria-hidden. |
| `PageHero`, `SectionHead`, `StatTile`, `StatRow`, `ClosingCta`, `EmptyState`, `ProgressRing` | `src/components/ui/page-kit.tsx` | The page primitives every feature page is built from. ClosingCta is the anti-dead-zone closing block. |
| `AnswerTile`, `QfSelect`, `QfSlider`, `QfCheck`, `QfDropzone`, `QfField` | `src/components/ui/qf-field.tsx` | System form controls, one source of truth. QfSlider sets the `--fill` CSS variable. |

Token changes in v3.1: `--foreground-faint` raised for 4.5:1 contrast (light `#667587`, dark `#8795a6`); the light-mode `-strong` text tokens darkened so chip text passes contrast (`--accent-deep #1a7c38`, `--info-strong #1273a1`, `--warning-strong #926700`, `--danger-strong #be3d41`, gold chip ink `#8f6b00`); `.btn3d` fills use `accent-strong` with `accent-deep` press, and dark-mode filled buttons use dark ink. `scripts/contrast-audit.mjs` verifies every pair.
