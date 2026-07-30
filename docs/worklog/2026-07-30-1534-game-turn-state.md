# Game Turn State

Timestamp: 2026-07-30-1534

Previous worklog: docs/worklog/2026-07-30-1521-game-completion-detection.md

Goal:

Introduce a minimal public turn-state orchestration API that coordinates position, active player, dice, legal move lookup, move application, pass turns, and completed-game behavior by reusing existing engine APIs.

Files changed:

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/engine-api.md
- docs/worklog/2026-07-30-1534-game-turn-state.md

Architectural decisions:

- Added minimal public `GameState` shape:
- `position: BoardPosition`
- `activePlayer: Player`
- `dice: DiceRoll | null`
- Added public orchestration APIs: `createGameState(...)`, `setDice(...)`, `getLegalMovesForState(...)`, `applyGameMove(...)`, `passTurn(...)`.
- Added small non-throwing discriminated result types: `SetDiceResult`, `GetLegalMovesForStateResult`, `ApplyGameMoveResult`, `PassTurnResult`.
- Reused existing rule APIs without duplicating move rules: `getLegalMoves(...)`, `applyMove(...)`, `getGameStatus(...)`.
- Turn lifecycle:
- Dice must be explicitly set before legal move lookup or move application.
- Successful non-winning move updates position, switches active player, and clears dice.
- Successful winning move updates position, keeps active player as winner, and clears dice.
- No-legal-move turn handling is explicit with `passTurn(...)`; no auto-pass in `setDice(...)`.
- Completed-game behavior:
- Setting dice, applying moves, and passing are rejected after completion.
- Winner-retained active-player convention is used after a winning move.

Tests added:

- Added `game turn state public API` tests for:
- creation with no dice
- dice assignment and second-assignment rejection
- legal move lookup from state
- legal move application, active-player switching, and dice clearing
- second move rejection in same turn
- winning move application and completed status reporting
- rejection of dice, moves, and pass after completion
- rejection of move before dice are set
- illegal-move rejection without state mutation
- pass success only when no legal moves, and pass rejection when legal moves exist
- immutability on success and failure paths
- Existing engine tests remain passing.

Validation performed:

- pnpm --filter @backgammon-trainer/backgammon-engine test
- pnpm check
- git diff --check
- git status

Deviations from plan:

- `getLegalMovesForState(...)` returns an explicit discriminated failure result (`game-complete`, `dice-not-set`) instead of always returning `{ moves: [] }`.

Follow-up suggestions:

- Keep any future invalid-position reporting separate from this turn-state wrapper milestone.
- Add helper readiness APIs (for example, `canSetDice`) only when concrete consumer demand appears.

Open questions:

- Should externally supplied-position flows eventually expose explicit invalid-state results distinct from `in-progress`?

Notes for future contributors:

- Move-generation behavior was not intentionally changed in this milestone.
- Move-application behavior was not intentionally changed in this milestone.
- Turn-state APIs are orchestration wrappers over existing lower-level engine rules APIs.
