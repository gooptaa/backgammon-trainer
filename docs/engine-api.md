# Engine API

## GameState

`GameState` is a minimal turn-state wrapper around existing engine APIs:

- `position`: current board position
- `activePlayer`: player whose turn is active
- `dice`: current turn dice, or `null` before dice are assigned

Shape:

```ts
type GameState = {
  position: Position;
  activePlayer: Player;
  dice: DiceRoll | null;
};
```

Scope limits:

- No cube state
- No match score or points
- No player names
- No move history or UI state

## createGameState

`createGameState(position, activePlayer)` returns a new game state with:

- `position` as supplied
- `activePlayer` as supplied
- `dice: null`

## setDice

`setDice(state, dice)` assigns dice for the active turn.

Success:

- returns `{ ok: true, state }`
- preserves `position` and `activePlayer`
- sets `state.dice` to a copied dice value

Failure:

- `{ ok: false, reason: "game-complete" }` when the game is complete
- `{ ok: false, reason: "dice-already-set" }` when dice are already assigned

Notes:

- Does not auto-roll or auto-pass
- Does not mutate input state or supplied dice

## getLegalMovesForState

`getLegalMovesForState(state)` exposes legal moves for the active state.

Behavior:

- When game is complete: `{ ok: false, reason: "game-complete", moves: [] }`
- When dice are not set: `{ ok: false, reason: "dice-not-set", moves: [] }`
- Otherwise returns `{ ok: true, moves, warnings? }` from existing `getLegalMoves(...)`

Notes:

- Reuses existing move generation rules without duplication
- Returned move ordering remains intentionally unspecified

## applyGameMove

`applyGameMove(state, move)` applies one completed legal turn move.

Validation path:

- Uses existing `applyMove(...)` for legality and step-sequence validation
- Does not duplicate move-equivalence logic

Failure:

- `{ ok: false, reason: "game-complete" }`
- `{ ok: false, reason: "dice-not-set" }`
- `{ ok: false, reason: "illegal-move" }`
- `{ ok: false, reason: "invalid-step-sequence" }`

Success lifecycle:

- always updates to the returned next position
- always clears dice to `null`
- if status is `in-progress`:
  - switches active player to the opponent
- if status is `complete`:
  - keeps active player as the player who made the winning move

Completed-game behavior:

- winner determination is still from `getGameStatus(position)`
- this wrapper preserves the winning player as `activePlayer` after a winning move

## passTurn

`passTurn(state)` passes the turn only when no legal move exists.

Success requires all of:

- game is in progress
- dice are set
- existing `getLegalMoves(...)` returns zero moves

Success result:

- `{ ok: true, state }`
- switches active player to opponent
- clears dice to `null`
- preserves position

Failure:

- `{ ok: false, reason: "game-complete" }`
- `{ ok: false, reason: "dice-not-set" }`
- `{ ok: false, reason: "legal-moves-available" }`

## Turn Lifecycle Summary

1. Create state with `createGameState(...)`.
2. Assign dice with `setDice(...)`.
3. Read legal moves with `getLegalMovesForState(...)`.
4. Either:
   - apply one completed move with `applyGameMove(...)`, or
   - call `passTurn(...)` when no legal moves exist.
5. Next turn begins with `dice: null`.

No automatic pass is performed by `setDice(...)`.

## Immutability Guarantees

All game-state APIs are non-mutating:

- input `GameState` is not mutated
- nested `position` is not mutated in place
- supplied dice and moves are not mutated

Position transitions are delegated to existing immutable engine behavior.

## Lower-level APIs remain public

This wrapper does not replace:

- `getLegalMoves(...)`
- `applyMove(...)`
- `getGameStatus(...)`

These lower-level APIs remain public and documented.

## getGameStatus

`getGameStatus(position)` returns:

- `{ state: "in-progress" }` when the game is still active
- `{ state: "complete", winner }` when exactly one player has borne off all 15 checkers

Completion condition:

- The authoritative source is `position.borneOff`
- A game is complete only when exactly one player's borne-off total is `15`

Current winner model:

- `winner` is the player whose borne-off total reached `15`

Structurally impossible positions:

- The function treats engine positions as trusted state
- If both players have borne off `15`, or neither has, status remains `in-progress`
- This milestone does not add separate invalid-position reporting

Scope limits:

- Gammon and backgammon classification are not included yet
- No scoring, match state, or cube behavior is included
