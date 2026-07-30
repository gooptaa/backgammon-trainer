# Interactive Move Selection

Timestamp: 2026-07-30-1704

Previous worklog: docs/worklog/2026-07-30-1602-graphical-board-rendering.md

Goal:

Replace text-based legal move Apply buttons with board-driven interactive move selection that progressively filters the existing legal completed move list from the engine.

Files changed:

- apps/web/src/App.tsx
- apps/web/src/App.test.tsx
- apps/web/src/features/board/BackgammonBoard.tsx
- apps/web/src/features/board/BackgammonBoard.module.css
- apps/web/src/features/board/BackgammonBoard.test.tsx
- apps/web/src/features/sandbox/EngineSandboxPanel.tsx
- apps/web/src/features/sandbox/moveSelection.ts
- apps/web/src/features/sandbox/moveSelection.test.ts
- docs/worklog/2026-07-30-1704-interactive-move-selection.md

Architectural decisions:

- Engine authority preserved:
  - No new engine-side partial move generation was introduced.
  - UI interaction state is derived from and constrained by `getLegalMovesForState(...)` completed move outputs.
- Prefix-filtering model:
  - Added a pure helper module that matches selected step prefixes against legal completed moves.
  - Source and destination clickability are derived from candidate moves that remain after prefix filtering.
- Progressive board interaction:
  - User selects source first, then destination.
  - Each selected step extends the prefix and further narrows candidates.
  - Move is auto-applied only when exactly one completed move is selected and no longer continuation candidate remains.
- Interaction reset behavior:
  - Selection state resets after dice set, move apply, and pass turn transitions.
  - Selection state is also reset if legal options change and current prefix is no longer valid.
- Accessibility and UX:
  - Added keyboard-focusable point overlay buttons for selectable sources and destinations.
  - Added explicit bar source and off destination controls when those options are legal.
  - Added visual highlight styles for selectable and selected interaction states.
  - Added cancel-selection control when there is active interaction state.
- Sandbox panel simplification:
  - Removed text Apply buttons from the sandbox panel.
  - Kept legal move count/status text so users still see engine output context.

Notable bug fix discovered during validation:

- Initial implementation had an effect path that repeatedly set empty selection arrays in a no-legal-move scenario, causing test hangs.
- Fixed by guarding resets so state updates occur only when there is actual selection state to clear.

Tests added/updated:

- apps/web/src/features/sandbox/moveSelection.test.ts
  - prefix matching behavior
  - candidate filtering behavior
  - selectable source derivation
  - selectable destination derivation
  - unique completed move resolution behavior
  - protection against premature completion when longer candidates remain
- apps/web/src/features/board/BackgammonBoard.test.tsx
  - selectable source callback behavior
  - selectable destination callback behavior
  - bar-source and off-destination interactions
  - cancel-selection control behavior
- apps/web/src/App.test.tsx
  - updated move application flow to use board source/destination selection instead of Apply buttons
  - retained pass-turn/no-legal-move coverage under interactive model

Validation performed:

- CI=1 pnpm --filter @backgammon-trainer/web test
- CI=1 pnpm check
- git diff --check

Deviations from plan:

- None. The milestone stayed within UI integration boundaries and did not alter engine move-generation contracts.

Follow-up suggestions:

- Add explicit UI breadcrumb for currently selected prefix steps to improve player clarity during multi-step turns.
- Consider adding optional destination hover previews based on current candidate set.

Notes for future contributors:

- Keep all legality derivation tied to engine move outputs; do not duplicate backgammon rules in UI event handlers.
- `moveSelection.ts` is the intended extension point for future interaction refinements.
