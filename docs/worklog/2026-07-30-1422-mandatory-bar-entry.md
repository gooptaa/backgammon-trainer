# Mandatory Bar Entry

Timestamp: 2026-07-30-1422

Previous worklog: docs/worklog/2026-07-30-1419-bar-entry-generation.md

Goal:

Enforce mandatory bar entry so legal move generation returns only bar-entry moves while the active player still has checkers on the bar.

Files changed:

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/fixtures/boardFixtures.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-1422-mandatory-bar-entry.md

Architectural decisions:

- Added a top-level requiresBarEntry legality helper to gate ordinary generation.
- Kept ordinary and bar-entry move construction shared through existing candidate generation helpers.
- Applied mandatory-entry behavior as high-level flow control instead of embedding checks in low-level destination logic.
- Preserved blocked-point and hit behavior for entry destinations.

Tests added:

- Ordinary moves generated when bar is empty.
- Ordinary moves suppressed when bar contains checkers.
- Only entry moves returned while on the bar.
- Blocked entry returns no moves even when ordinary moves would otherwise exist.
- Entry hits still generated correctly.
- Mixed ordinary and bar-entry positions return only entry moves.

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- None.

Follow-up suggestions:

- Add turn-level sequencing and mandatory dice-usage constraints.
- Implement move application for entry and hit transfer to bar.
- Introduce doubles handling after turn sequencing is available.

Open questions:

- Should mandatory-entry gating emit warnings when ordinary candidates are intentionally suppressed?

Notes for future contributors:

- Keep mandatory-entry gating in high-level legality orchestration to avoid duplication across move generators.
- Reuse shared destination classification for both entry and ordinary move kinds to preserve consistent blocked/hit behavior.
