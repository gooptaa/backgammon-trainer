# Bar Entry Generation

Timestamp: 2026-07-30-1419

Previous worklog: docs/worklog/2026-07-30-1412-hit-generation.md

Goal:

Implement legality generation for entering checkers from the bar, reusing existing blocked-point and hit rules without mutating board state.

Files changed:

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/fixtures/boardFixtures.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-1419-bar-entry-generation.md

Architectural decisions:

- Added bar-entry destination mapping helper based on canonical board numbering.
- Reused shared destination classification via a single candidate-move constructor for ordinary and bar-entry generation.
- Represented entry moves through existing MoveStep with kind enter-from-bar and existing hit metadata.
- Kept legality and state mutation separated; move application remains out of scope.

Tests added:

- Legal entry onto empty point.
- Blocked entry excluded.
- Entry hit generated with hit metadata.
- Duplicate dice preserve die association for entry.
- Ordinary move generation unchanged without bar checkers.
- Mixed ordinary and entry opportunities generate expected combined candidates.
- Both dice producing different entry destinations.

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- None.

Follow-up suggestions:

- Add mandatory bar-entry gating in full turn legality milestone.
- Implement move application for bar entry and hit transfer to bar.
- Add turn sequencing and dice-usage constraints after application support exists.

Open questions:

- Should bar-entry destination mapping be centralized in the domain package once move-application logic is introduced?

Notes for future contributors:

- Keep destination legality (open, blocked, hit) shared across ordinary and entry moves to avoid drift.
- Preserve dieIndex and hit metadata on entry moves for later deterministic application.
