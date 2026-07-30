# Staged Move Preview and Backgammon Opening Roll

Timestamp: 2026-07-30-1745

Previous worklog: docs/worklog/2026-07-30-1730-dice-rolling-game-reset.md

Goal:

Fix progressive multi-step interaction rendering so staged checker transitions are visible before full move commit, then implement standard backgammon opening-roll flow with tie rerolls and deterministic integration boundaries.

Files changed:

- apps/web/src/App.tsx
- apps/web/src/App.test.tsx
- apps/web/src/features/board/BackgammonBoard.tsx
- apps/web/src/features/sandbox/EngineSandboxPanel.tsx
- apps/web/src/features/sandbox/rollOpeningDice.ts
- apps/web/src/features/sandbox/rollOpeningDice.test.ts
- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/engine.test.ts
- README.md
- docs/architecture/overview.md
- docs/engine-api.md
- docs/worklog/2026-07-30-1745-staged-moves-opening-roll.md

Root cause of same-checker-twice interaction defect:

- The UI filtered legal candidates by selected prefix but still rendered the committed `GameState.position`.
- After selecting a valid first step, the tentative checker destination was not reflected on the board.
- This made legal second-step source selection ambiguous or impossible in same-checker-twice sequences.

Committed-position versus staged-position model:

- Added explicit staged rendering semantics in `App.tsx`.
- Board rendering source is now:
  - committed position when no selected prefix exists
  - staged projected position when selected prefix exists and validates
- Staged position is derived, immutable, and transient.
- Committed `GameState.position` remains unchanged until `applyGameMove(...)` succeeds.

Staged-prefix validation and projection implementation location:

- Added public engine API `previewMovePrefix(...)` in `packages/backgammon-engine/src/index.ts`.
- Validation path:
  1. Generate complete legal moves with existing `getLegalMoves(...)`.
  2. Match selected from/to prefix against complete move prefixes.
  3. Preserve all complete legal candidate moves matching the selected coordinate prefix.
  4. Project staged position by applying canonical `MoveStep` values (including metadata) from matching candidates.
  5. If projected staged positions diverge across matching candidates, fail with explicit ambiguity instead of selecting an unsafe projection.
  6. Return staged position plus remaining matching complete candidates when projection is unambiguous.
- Failure contract:
  - `illegal-prefix`
  - `invalid-step-sequence`
  - `ambiguous-prefix`

Board source/destination input to canonical engine steps:

- UI selection state continues to capture coordinate-only steps (`fromPoint`, `toPoint`).
- Engine prefix projection maps those coordinates to canonical legal `MoveStep` values from `getLegalMoves(...)`.
- Canonical fields (`dieValue`, `dieIndex`, `kind`, hit metadata) are sourced from legal candidates, not fabricated in UI code.
- Coordinate-equivalent prefix candidates are preserved in `candidateMoves`; staged projection proceeds only when all candidates yield the same staged board.

Hit, bar-entry, and bear-off staged preview behavior:

- Prefix projection reuses existing engine step application (`applyMoveStepUnchecked`) and therefore preserves existing rule semantics for:
  - ordinary movement
  - hits and bar updates
  - enter-from-bar transitions
  - bearing off (exact and oversized legality as already encoded by legal move generation)
  - black-direction movement

Cancellation and reset behavior:

- Cancel selection clears:
  - selected source
  - selected prefix steps
  - hover destination
  - staged rendering
- New turn transitions (apply/pass), dice changes, and New Game all clear transient selection and staged projection inputs.
- Invalid staged prefixes are safely cleared without mutating committed game state.

Opening-roll state model:

- Added discriminated UI state in `App.tsx`:
  - `waiting`
  - `tied` (white die + black die)
  - `resolved` (white die + black die + starting player)
- Opening turn pending state is tracked separately to gate transition to ordinary rolling after the opening turn completes.

Opening-roll utility and tie behavior:

- Added `rollOpeningDice(random?: RandomSource)` in `apps/web/src/features/sandbox/rollOpeningDice.ts`.
- Utility behavior:
  - rolls one independent white die and one independent black die
  - returns `tie` outcomes explicitly (no silent reroll)
  - returns `resolved` with starting player and first-turn dice when non-tied
  - clamps random values to valid die outputs 1..6

Starting-player resolution and opening-dice transfer into GameState:

- Higher die resolves starting player.
- First engine turn is created by:
  1. creating a fresh game state at standard starting position for resolved starter
  2. assigning opening dice through existing `setDice(...)`
- Dice ordering convention is explicit: opening dice are passed as `[whiteDie, blackDie]` and are not sorted by winner.

Transition to normal rolling:

- Before opening resolves:
  - ordinary `Roll Dice` is disabled
  - move interaction is unavailable
  - pass is unavailable
  - manual turn-dice assignment is disabled
- After opening resolves:
  - first playable turn is immediately active with opening dice
- After opening move application or legal pass:
  - dice clear through existing turn lifecycle
  - opening turn pending clears
  - ordinary `Roll Dice` becomes available
  - opening phase does not repeat for that game

Manual development controls behavior:

- Manual dice controls are preserved for development use.
- Manual turn-dice assignment is blocked until opening resolves.
- Optional test-only initialization props are used by tests to simulate opening edge states without exposing a normal-user bypass path.

Public engine API changes:

- Added `previewMovePrefix(...)` and associated result/failure types.
- Existing `applyMove(...)`, `getLegalMoves(...)`, and game-state wrappers are unchanged in behavior.
- `applyMove(...)` exact move equivalence remains strict, including exact `dieIndex` matching.

Legal move generation impact:

- No legal move generation rules changed.
- No checker transition rules changed.
- UI staged rendering now consumes projected prefixes of existing complete legal move outputs.

Tests added/updated:

- Engine:
  - `packages/backgammon-engine/test/engine.test.ts`
    - `previewMovePrefix` coverage for same-checker sequencing, staged hits, staged bar entry, staged bearing off, black-direction projection, and illegal prefix rejection
- Web:
  - `apps/web/src/features/sandbox/rollOpeningDice.test.ts`
    - tie, white-start, black-start, bounds/clamping tests
  - `apps/web/src/App.test.tsx`
    - opening-roll lifecycle and tie reroll flow
    - opening resolution to immediate playable turn
    - staged first-step rendering and committed-state separation
    - same-checker continuation interaction
    - staged hit/bar-entry/bear-off/black-direction rendering
    - hover/staged separation
    - opening-turn pass transition and New Game reset

Validation performed:

- CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test
- CI=1 pnpm --filter @backgammon-trainer/web test
- CI=1 pnpm --filter @backgammon-trainer/web build
- CI=1 pnpm check
- git diff --check
- git status

Deviations from plan:

- Added test-only App initialization props for opening-phase state injection to cover opening-turn pass edge behavior deterministically.
- Added explicit ambiguity failure handling in `previewMovePrefix(...)` after final semantics review to prevent unsafe first-candidate projection in future rule expansions.

Notes for future contributors:

- Keep partial interaction projection delegated to engine helper APIs; do not duplicate checker transition rules in React handlers.
- Keep opening randomness orchestration in UI/application layer and inject deterministic sources in tests.
- Do not interpret `previewMovePrefix(...)` as partial-move generation; it validates and projects only prefixes of complete legal moves.
