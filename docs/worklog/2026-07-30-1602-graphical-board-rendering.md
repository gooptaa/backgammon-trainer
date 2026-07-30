# Graphical Board Rendering

Timestamp: 2026-07-30-1602

Previous worklog: docs/worklog/2026-07-30-1544-engine-game-sandbox.md

Goal:

Add a read-only graphical backgammon board driven directly by the existing engine `GameState.position`, with no checker interaction or move construction.

Files changed:

- apps/web/src/App.tsx
- apps/web/src/App.test.tsx
- apps/web/src/features/board/BackgammonBoard.tsx
- apps/web/src/features/board/BackgammonBoard.module.css
- apps/web/src/features/board/BackgammonBoard.test.tsx
- apps/web/src/features/board/pointToVisual.ts
- apps/web/src/features/board/pointToVisual.test.ts
- docs/worklog/2026-07-30-1602-graphical-board-rendering.md

Architectural decisions:

- Board state source:
  - `BackgammonBoard` reads only from `position` and `activePlayer` props.
  - `App` passes `gameState.position` and `gameState.activePlayer`; no second position state was introduced.
- Board orientation:
  - Fixed orientation is documented and rendered as white home board on the right.
  - Top row points: 13..24 (left to right in two halves).
  - Bottom row points: 12..1 (left to right in two halves).
- Engine-point-to-visual mapping:
  - Added `pointToVisual.ts` with named row/side groupings and `getVisualPointSlot(...)`.
  - Mapping helper is the single coordinate translation for point labels and placement semantics.
- Checker-stack behavior:
  - Point stacks render from board edge inward.
  - For large stacks, visible checkers are capped at 5 and an `xN` badge shows full count.
  - Actual checker totals are preserved in accessible point labels and badges.
- Accessibility:
  - Board exposed as a labeled `region`.
  - Each point exposed as a labeled `group` including point index, row/side, player, and checker count.
  - Bar and borne-off counts exposed via explicit labels.
  - Checkers include text glyphs (`W`/`B`) so distinction is not color-only.
- Integration:
  - Existing sandbox move/pass flow now updates board automatically via `gameState` transitions.
  - Structured position snapshot in sandbox was preserved for debugging.
- Reset:
  - No reset button was added in this milestone.
- Engine impact:
  - No engine rule or turn-state API changes were required.

Tests added:

- `apps/web/src/features/board/pointToVisual.test.ts`
  - fixed orientation grouping assertions
  - key point row/side mapping assertions
- `apps/web/src/features/board/BackgammonBoard.test.tsx` rewritten for read-only rendering:
  - all 24 points render
  - standard starting position counts render correctly
  - white/black checker distinction assertions
  - occupied and empty point semantics
  - bar and borne-off count rendering
  - large-stack count preservation behavior
  - active-player indication
  - completed-position rendering
- `apps/web/src/App.test.tsx` updated to assert board-state updates after applied moves and active-player updates after turn completion.
- Existing sandbox and formatter tests remain passing.

Validation performed:

- pnpm --filter @backgammon-trainer/web test
- pnpm check
- git diff --check
- git status

Deviations from plan:

- Reused and simplified the existing board feature path by converting `BackgammonBoard` to read-only rendering rather than introducing separate temporary board component names.

Follow-up suggestions:

- Next milestone can attach legal-move highlighting and selectable interactions on top of this renderer without changing the point-mapping contract.
- Consider extracting board constants into a dedicated theme file if visual variants are later needed.

Open questions:

- Whether future interactive milestones should preserve this fixed orientation or add a player-perspective toggle.

Notes for future contributors:

- This milestone intentionally excludes clicking, dragging, move construction, and animation.
- Graphical board data remains a direct view of engine state; keep rule logic in the engine APIs.
