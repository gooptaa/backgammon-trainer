# Bearing-Off Move Generation

Timestamp: 2026-07-30-1455

Previous worklog: docs/worklog/2026-07-30-1442-turn-dice-usage-rules.md

Goal:

Add deterministic bearing-off move generation to the legal-move pipeline, including exact and oversized die handling, farthest-point constraint, and immutable temporary application support for multi-step turn assembly.

Files changed:

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/fixtures/boardFixtures.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-1455-bearing-off-generation.md

Architectural decisions:

- Added bearing-off helpers for home-board detection and die-distance evaluation.
- Integrated bearing-off into single-die generation as a distinct move-step kind.
- Kept bearing-off legality behind deterministic preconditions: no checker on bar, all active checkers in home board, exact-match priority, and farthest-only oversized usage.
- Extended temporary move application to remove checkers and increment borne-off totals for bear-off steps.
- Kept dice-usage policy and turn assembly flow unchanged except for consuming newly generated bearing-off candidates.

Tests added:

- Exact bearing-off generation when eligible.
- Bearing-off prohibition when checkers remain outside home board.
- Bearing-off prohibition while bar entry is required.
- Oversized die allowance and prohibition cases.
- Farthest-point-only oversized bear-off behavior.
- Die value and die index preservation on bearing-off steps.
- Direction parity checks for white and black bearing-off generation.
- Sequence legality shifts caused by temporary bearing-off application.
- Dice-usage behavior preservation in bearing-off contexts.

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- Updated several existing test fixtures to prevent newly legal bearing-off continuations from unintentionally changing pre-existing dice-usage scenario semantics.

Follow-up suggestions:

- Add dedicated doubles expansion and bearing-off interactions once doubles turn assembly is implemented.
- Add focused unit tests for helper-level bearing-off origin selection to isolate rule regressions quickly.

Open questions:

- Whether future API consumers need deterministic ordering guarantees for equally legal bearing-off alternatives.

Notes for future contributors:

- Keep bearing-off rule checks centralized in helper functions to avoid divergent legality logic across generation paths.
- Maintain immutable transition semantics in temporary application; future step kinds should follow the same pattern.
