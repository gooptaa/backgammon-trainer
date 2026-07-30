# Hit Generation

Timestamp: 2026-07-30-1412

Previous worklog: docs/worklog/2026-07-30-1405-blocked-point-rule.md

Goal:

Generate legal point-to-point hit moves when the destination has exactly one opposing checker, while preserving blocked-point exclusions.

Files changed:

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/fixtures/boardFixtures.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-1412-hit-generation.md

Architectural decisions:

- Extended MoveStep with optional hit metadata containing opposing player and hit point.
- Kept hit generation in legality code only and did not mutate board state.
- Preserved blocked-point filtering and reused existing per-die independent move generation.
- Preserved dieIndex on hit steps for duplicate-die disambiguation.

Tests added:

- Ordinary move remains legal.
- Hit generated against a single opposing checker.
- Blocked destination still excluded when mixed with hit opportunities.
- Hit metadata present on generated move.
- Duplicate dice preserve die association for hit moves.
- Multiple independent hit scenarios, including both dice producing independent hits.

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- None.

Follow-up suggestions:

- Implement move application that transfers hit checkers to the bar based on hit metadata.
- Add bar-entry generation and application using existing blocked-point logic.
- Introduce turn sequencing over both dice in a separate milestone.

Open questions:

- Should hit metadata remain optional on MoveStep long-term, or be modeled as a discriminated union for step variants?

Notes for future contributors:

- Keep legality and state mutation separate: hit generation marks intent only.
- Maintain explicit hit metadata to avoid board re-analysis during move application.
