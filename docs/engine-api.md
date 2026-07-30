# Engine API

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
