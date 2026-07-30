# Selection Breadcrumbs and Hover Preview

Timestamp: 2026-07-30-1718

Previous worklog: docs/worklog/2026-07-30-1704-interactive-move-selection.md

Goal:

Fix board rendering regression introduced during interactive move selection, then add breadcrumb and hover preview feedback for progressive move construction without changing engine move legality APIs.

Files changed:

- apps/web/src/App.tsx
- apps/web/src/App.module.css
- apps/web/src/App.test.tsx
- apps/web/src/features/board/BackgammonBoard.tsx
- apps/web/src/features/board/BackgammonBoard.module.css
- apps/web/src/features/board/BackgammonBoard.test.tsx
- apps/web/src/features/board/pointToVisual.test.ts
- apps/web/src/features/sandbox/moveSelection.ts
- apps/web/src/features/sandbox/moveSelection.test.ts
- apps/web/dev-dist/sw.js
- apps/web/dev-dist/workbox-7e5eb42b.js
- docs/worklog/2026-07-30-1718-selection-feedback.md

Root cause of rendering regression:

- Bottom-row point ordering was being transformed twice:
  - once by explicit bottom-row point index arrays in `pointToVisual.ts`
  - and again by CSS directional reversal (`direction: rtl`) in `BackgammonBoard.module.css`
- This duplicated coordinate translation path could drift visual placement from the engine index layout even when labels remained correct.

Fix and why it prevents future mapping regressions:

- Removed CSS row reversal for the bottom row so rendering uses one orientation path only.
- Kept engine point index arrays and mapping helper as the single translation source.
- Added stronger regression tests to lock fidelity:
  - every occupied point in `STANDARD_STARTING_POSITION` must render exact checker counts
  - every engine point index must appear exactly once
  - `pointToVisual` now asserts unique row/slot mapping for all 24 points
- This prevents future accidental dual-mapping by ensuring visual placement is validated against complete board coverage.

Breadcrumb implementation:

- Added selected-step formatting helpers in `moveSelection.ts`:
  - `formatSelectedStepsBreadcrumb(...)`
  - `formatSelectedStep(...)`
- Breadcrumb now renders in `App.tsx` as compact ordered chains such as:
  - `13 -> 8`
  - `13 -> 8 -> 6`
  - `Bar -> 22`
  - `6 -> Off`
- Breadcrumb clears automatically on:
  - move completion
  - pass turn
  - dice reset via Set Dice
  - explicit cancel selection

Hover preview implementation:

- Added hover destination state in `App.tsx` and hover callbacks in `BackgammonBoard.tsx`.
- Hovering a selectable destination:
  - computes candidate continuation moves by prefix filtering, without mutating selected state
  - highlights preview source/destination follow-up points on the board
  - shows concise status text for continuation count or unique next step
  - shows "Move will complete automatically" when hover determines unique completion
- Hover preview clears immediately on pointer leave.

Candidate status UX:

- Added interaction status text in `App.tsx` with concise states:
  - `Select a checker`
  - `Select a destination`
  - `N legal continuations remain`
  - `Move will complete automatically`

Engine API impact:

- No engine rules changed.
- No public engine API signatures changed.

Tests added/updated:

- `apps/web/src/features/board/BackgammonBoard.test.tsx`
  - full starting-position occupied-point checker-count regression coverage
  - one-to-one engine-point rendering coverage (no duplicate or skipped points)
- `apps/web/src/features/board/pointToVisual.test.ts`
  - unique row/slot mapping across all 24 engine points
- `apps/web/src/features/sandbox/moveSelection.test.ts`
  - breadcrumb and selected-step formatting helpers
- `apps/web/src/App.test.tsx`
  - breadcrumb updates after each selected step
  - breadcrumb clears after move completion
  - breadcrumb clears after cancellation
  - hover preview appears and disappears without mutating selection breadcrumb

Validation performed:

- CI=1 pnpm --filter @backgammon-trainer/web test
- CI=1 pnpm check
- git diff --check
- git status

Deviations from plan:

- Included `apps/web/dev-dist` artifact files per explicit user request and formatted them to satisfy repository format checks.

Notes for future contributors:

- Keep board orientation mapping in one place (`pointToVisual.ts`) and avoid CSS direction reversals that re-encode point order.
- Continue deriving interaction state from engine legal completed moves; do not duplicate move-rule logic in UI.
