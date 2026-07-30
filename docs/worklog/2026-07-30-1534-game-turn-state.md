# Game Turn State

Date: 2026-07-30

Branch: main

Starting commit: b4d8e65ddbbc97ccbbe345387d8fde6309556e64

Ending commit: (pending)

## Goal

Introduce a public game-state orchestration layer that coordinates current position, active player, turn dice, legal move lookup, move application, passing on no-legal-move turns, and completed-game behavior by reusing existing engine APIs.

## Files changed

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/engine-api.md
- docs/worklog/2026-07-30-1534-game-turn-state.md

## Architectural decisions

- Added minimal public `GameState` shape:
  - `position: BoardPosition`
  - `activePlayer: Player`
  - `dice: DiceRoll | null`
- Added public orchestration APIs:
  - `createGameState(position, activePlayer)`
  - `setDice(state, dice)`
  - `getLegalMovesForState(state)`
  - `applyGameMove(state, move)`
  - `passTurn(state)`
- Added small discriminated result types for non-throwing transition failures:
  - `SetDiceResult`
  - `GetLegalMovesForStateResult`
  - `ApplyGameMoveResult`
  - `PassTurnResult`
- Reused existing rules APIs instead of duplicating logic:
  - `getLegalMoves(...)` for move generation
  - `applyMove(...)` for move legality and step validation
  - `getGameStatus(...)` for completion/winner detection
- Turn lifecycle behavior:
  - Dice must be explicitly set before move lookup or move application.
  - Successful non-winning move switches active player and clears dice.
  - Successful winning move keeps active player as the winner and clears dice.
  - No-legal-move pass is explicit via `passTurn(...)`; no auto-pass in `setDice(...)`.
- Completed-game behavior:
  - Setting dice, applying moves, and passing are rejected once complete.
  - Completed active player convention is winner-retained after winning move.

## Tests added

Added `game turn state public API` tests covering:

1. Creating a game state with no dice.
2. Setting dice immutably.
3. Rejecting second dice assignment in same turn.
4. Retrieving legal moves from state.
5. Applying a legal move.
6. Switching active player after successful non-winning move.
7. Clearing dice after successful move.
8. Rejecting a second move in the same turn after dice clear.
9. Applying a winning move.
10. Reporting completed status after a winning move.
11. Rejecting dice rolls after completion.
12. Rejecting moves after completion.
13. Rejecting move application before dice are set.
14. Rejecting illegal move without changing state.
15. Passing when no legal move exists.
16. Switching player and clearing dice after legal pass.
17. Rejecting pass when legal moves exist.
18. Rejecting pass before dice are set.
19. Preserving input state on successful transitions.
20. Preserving input state on failed transitions.

## Validation performed

- pnpm --filter @backgammon-trainer/backgammon-engine test
- pnpm check
- git diff --check
- git status

## Deviations from plan

- `getLegalMovesForState(...)` returns a small discriminated result with explicit failure reasons (`game-complete`, `dice-not-set`) rather than always returning `{ moves: [] }`. This keeps no-dice and complete-state handling explicit for UI consumers while preserving non-throwing behavior.

## Follow-up suggestions

- If future state validation is introduced, keep it separate from turn orchestration and avoid widening the base `GameState` shape.
- Consider adding optional helper APIs for turn readiness (for example, `canSetDice`) only when concrete consumer needs appear.

## Open questions

- Whether future externally supplied position paths should include explicit invalid-state results (distinct from `in-progress`) without widening current `GameStatus` semantics.

## Notes for future contributors

- Move-generation behavior was not intentionally changed in this milestone.
- Move-application behavior was not intentionally changed in this milestone.
- Turn-state APIs are wrappers around existing lower-level rules APIs; keep rule logic centralized in lower-level engine functions.
