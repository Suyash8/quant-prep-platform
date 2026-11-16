# Scripts Directory

## Supported Operational & CI Scripts

- `build-content-packs.cjs` — Generates tier-1 client JSON packs under `public/packs/v3/` (stripping answer keys, explanations, editorials, solutions, and provenance).
- `validate-content.mjs` — Validates all curriculum maps, lessons, problems, assessments, projects, and company profiles against schema & math balance rules (`--registry` regenerates `content/registry.json`).
- `content-lint.mjs` — Enforces QA prose isolation, hash leak prevention, deduplication, MCQ option length balance (<= 35% longest-correct), <= 30 min duration limits, and public pack leak checks.
- `clean-content.mjs` — Deterministic cleaner that maintains content hygiene rules checked by `content-lint.mjs`.
- `unit-tests.mjs` — Core unit tests (grading, SM-2 mastery, XP ledger caps, placement, entitlements, webhook/auth security regressions).
- `preflight.cjs` / `post-build.cjs` — Startup environment and post-build standalone verification hooks.
- `admin-grant.mjs` — CLI script to promote a verified user account to `admin`.
- `check-*.mjs`, `content-times.mjs`, `content-truth.mjs`, `spell-check.mjs` — Domain-specific mathematical and link verification utilities.
