# Analysis Foundation and Deterministic Position Features

Timestamp: 2026-07-30-1849

Previous worklog: docs/worklog/2026-07-30-1835-game-serialization.md

Goal:

Add a reusable deterministic position-analysis package that computes factual position features and before/after feature deltas without changing engine legality or adding strategic ranking/coaching behavior.

Files changed:

- apps/web/src/App.tsx
- apps/web/src/App.test.tsx
- docs/analysis/position-features.md
- docs/architecture/overview.md
- docs/worklog/2026-07-30-1849-position-analysis.md
- packages/backgammon-analysis/README.md
- packages/backgammon-analysis/package.json
- packages/backgammon-analysis/src/index.ts
- packages/backgammon-analysis/test/analysis.test.ts
- packages/backgammon-analysis/tsconfig.build.json
- packages/backgammon-analysis/tsconfig.json
- pnpm-lock.yaml

New package name and location:

- Package directory: `packages/backgammon-analysis`
- Package name: `@backgammon-trainer/backgammon-analysis`

Dependency direction:

- `@backgammon-trainer/backgammon-engine` -> `@backgammon-trainer/backgammon-analysis` -> host apps/services
- The engine does not depend on analysis.
- Analysis package has no React, DOM, browser-storage, or network dependency.

Public APIs:

- `analyzePosition(position): PositionAnalysis`
- `comparePositions(before, after): PositionFeatureDelta`

Position-analysis result shape:

- Player feature blocks (`white`, `black`) with:
  - checker accounting (`onBoard`, `onBar`, `borneOff`, `totalCheckersAccountedFor`)
  - `pipCount`
  - blot metrics (`blotCount`, `blotPoints`)
  - made-point metrics (`madePointCount`, `madePoints`)
  - home-board made-point metrics (`madeHomeBoardPointCount`, `madeHomeBoardPoints`)
  - occupied-point metrics (`occupiedPointCount`, `occupiedPoints`)
  - home-board distribution (`checkersInHomeBoard`, `checkersOutsideHomeBoard`)
- Relationship block with:
  - `pipCountDifferenceWhiteMinusBlack`
  - `absolutePipCountDifference`
  - `pipCountLeader`
  - `contactStatus`

Feature-delta result shape:

- `comparePositions` returns numeric deltas for each player:
  - `pipCountDelta`
  - `blotCountDelta`
  - `madePointCountDelta`
  - `madeHomeBoardPointCountDelta`
  - `barCountDelta`
  - `borneOffCountDelta`
  - `occupiedPointCountDelta`
- Relationship transition fields:
  - `pipCountDifferenceWhiteMinusBlackDelta`
  - `contactStatusBefore` and `contactStatusAfter`
  - `pipCountLeaderBefore` and `pipCountLeaderAfter`

Engine point-index and movement conventions used:

- Point indexing is absolute `1..24`.
- White direction is `24 -> 1 -> off`.
- Black direction is `1 -> 24 -> off`.
- White home board is points `1..6`.
- Black home board is points `19..24`.

Pip-count implementation:

- White checker at point `p` contributes `p` pips.
- Black checker at point `p` contributes `25 - p` pips.
- Bar checkers contribute `25` pips each.
- Borne-off checkers contribute `0`.

Checker accounting:

- Reports board/bar/bear-off counts separately and total accounted checkers.
- Analysis does not normalize malformed totals.
- Input is treated as trusted engine-domain data.

Blot detection:

- Blot = point with exactly one checker.
- Bar is excluded from blot-point sets.
- Point identifiers are deterministic ascending canonical point indexes.

Made-point detection:

- Made point = point with two or more same-player checkers.
- Stack size above two still counts as one made point.

Occupied-point detection:

- Occupied point = point with one or more same-player checkers.
- Returned in deterministic ascending canonical point order.

Contact/race definition:

- If either player has one or more bar checkers, status is `contact`.
- Otherwise compare checker-frontier relation:
  - compute White max occupied point index
  - compute Black min occupied point index
  - if `whiteMax > blackMin`, status is `contact`
  - else status is `race`

Pip-count leader convention:

- Lower pip count leads.
- `pipCountLeader` is one of `white`, `black`, or `tied`.

Pip-count difference sign convention:

- `pipCountDifferenceWhiteMinusBlack = whitePipCount - blackPipCount`
- negative: White pip lead
- positive: Black pip lead

Delta sign convention:

- All numeric deltas use `after - before`.

Input mutation behavior:

- Analysis APIs are read-only and non-mutating.
- No input-position cloning is required for analysis calculations.

Optional web-panel behavior:

- Deferred in this milestone to keep scope focused on reusable package + tests.
- No analysis UI panel was added yet.

Prior New Game persistence verification/correction:

- Verification found New Game persistence depended on post-render persistence effect.
- Correction made: `onNewGame` now writes a fresh snapshot to storage immediately within the same user action path.
- Added focused regression test to assert saved snapshot is replaced with fresh waiting-state data.

Engine API impact:

- None for this milestone.
- No new engine exports were added.

Move-legality impact:

- None.
- No changes to legal-move generation, move application, turn-state progression, or prefix projection semantics.

Tests added/updated:

- New package tests:
  - `packages/backgammon-analysis/test/analysis.test.ts`
  - starting-position accounting, pip totals, tie detection, and contact classification
  - bar-pip treatment for both players
  - borne-off pip contribution behavior
  - blot/made/home-made/occupied point detection and deterministic ordering
  - home-board and outside-home-board checker counting
  - pip-leader detection and signed pip-difference convention
  - race/contact classification (including bar-driven contact and mirrored race cases)
  - deterministic repeatability and non-mutation behavior
  - mirrored fixture parity checks
  - delta sign convention and per-feature delta checks
  - contact-to-race transition reporting
- Web regression test update:
  - `apps/web/src/App.test.tsx`
  - new test verifies New Game replaces previously saved snapshot with fresh state

Validation performed:

- CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test
- CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test
- CI=1 pnpm --filter @backgammon-trainer/web test
- CI=1 pnpm --filter @backgammon-trainer/web build
- CI=1 pnpm check
- git diff --check
- git status

Deviations from plan:

- Root `tsconfig.json` does not exist in this repository; repository-correct equivalents were used (`tsconfig.base.json` and package-level tsconfig files).
- Optional web analysis panel was intentionally deferred.

Intentionally deferred analysis capabilities:

- move ranking
- evaluator/equity integration
- mistake classification
- best-move recommendations
- coaching prose
- any AI-provider integration
