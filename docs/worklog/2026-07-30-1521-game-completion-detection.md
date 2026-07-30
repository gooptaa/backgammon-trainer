# Game Completion Detection

Timestamp: 2026-07-30-1521

Previous worklog: docs/worklog/2026-07-30-1516-public-move-application.md

Goal:

Add a public API that reports whether a game is still in progress or has been won, using borne-off totals as the authoritative completion signal.

Files changed:

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/engine-api.md
- docs/worklog/2026-07-30-1521-game-completion-detection.md

Architectural decisions:

- Added public model:
  - `GameStatus`
- Added public API:
  - `getGameStatus(position): GameStatus`
- Authoritative completion condition:
  - exactly one player has `borneOff === 15`
- Handling of structurally impossible positions:
  - treated `Position` as trusted engine state
  - no new invalid-position reporting was introduced
  - if both players have `15`, status remains `in-progress` because completion requires exactly one winner
- Kept move application separate from status inspection:
  - `applyMove(...)` was not changed

Tests added:

- In-progress status for a normal position
- White completion detection
- Black completion detection
- Fourteen borne-off checkers remains in progress
- Successful final bearing-off move produces complete status and winner
- Non-winning applied move leaves status in progress
- Failed `applyMove(...)` leaves original status unchanged
- `getGameStatus(...)` does not mutate input positions

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- No move-generation or move-application behavior changes were required.

Follow-up suggestions:

- Add future status extensions only when gammon/backgammon or scoring rules are ready to be modeled explicitly.
- If invalid engine-state reporting becomes necessary, introduce it as a separate milestone rather than widening `GameStatus` implicitly.

Open questions:

- Whether future public status APIs should distinguish trusted-engine-state assumptions from externally supplied positions.

Notes for future contributors:

- `getGameStatus(...)` is intentionally minimal and borne-off-driven.
- `applyMove(...)` was not changed in this milestone.
- Observable move-generation behavior was not intentionally changed in this milestone.
