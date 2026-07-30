# Engine-Backed Game Sandbox

Timestamp: 2026-07-30-1544

Previous worklog: docs/worklog/2026-07-30-1534-game-turn-state.md

Goal:

Add a minimal development sandbox in the existing web UI that exercises the engine-backed turn lifecycle end to end without duplicating move or turn rules.

Files changed:

- apps/web/package.json
- apps/web/vite.config.ts
- apps/web/vitest.config.ts
- apps/web/src/App.tsx
- apps/web/src/App.test.tsx
- apps/web/src/features/sandbox/EngineSandboxPanel.tsx
- apps/web/src/features/sandbox/EngineSandboxPanel.module.css
- apps/web/src/features/sandbox/formatMove.ts
- apps/web/src/features/sandbox/formatMove.test.ts
- pnpm-lock.yaml
- docs/worklog/2026-07-30-1544-engine-game-sandbox.md

Architectural decisions:

- `GameState` ownership is in `apps/web/src/App.tsx` as one coherent UI state value.
- Legal moves are derived from current `GameState` using `getLegalMovesForState(...)`; they are not stored as independent state.
- Engine APIs used directly by UI orchestration:
  - `createGameState(...)`
  - `setDice(...)`
  - `getLegalMovesForState(...)`
  - `applyGameMove(...)`
  - `passTurn(...)`
  - `getGameStatus(...)`
- Initial position is created via existing `STANDARD_STARTING_POSITION` from domain and wrapped with `createGameState(...)`.
- Move display formatting is handled in web-only helper `apps/web/src/features/sandbox/formatMove.ts`.
  - Preserves step order
  - Distinguishes bar entry and bearing off
  - Adds optional `(hit)` annotation
- Position visualization remains compact structured data (occupied points, bar, borne off) rather than graphical interaction.
- No engine API changes were required for this milestone.

Tests added:

- `apps/web/src/App.test.tsx` sandbox integration tests covering:
  1. initial render with no dice set
  2. active-player display
  3. dice assignment
  4. legal move rendering after dice set
  5. applying move updates position
  6. applying move switches active player
  7. dice and legal-move list clearing after turn completion
  8. pass availability only when no legal moves exist
  9. pass switching active player
  10. completed-game winner display and disabled controls
- `apps/web/src/features/sandbox/formatMove.test.ts` formatting tests covering:
  - ordinary movement
  - bar entry
  - hit annotation
  - bearing off
- Existing engine and application tests remain passing.

Validation performed:

- pnpm --filter @backgammon-trainer/web test
- pnpm check
- git diff --check
- git status

Deviations from plan:

- No route-level sandbox page was added; sandbox is integrated into existing `App` shell via a dedicated panel component.

Follow-up suggestions:

- Connect move selection to future graphical board interactions (point/click or drag workflows) while keeping engine as authority.
- Add a lightweight reset control for rapid sandbox iteration during development.

Open questions:

- Should sandbox controls eventually move to a dedicated dev route once the production-facing board interaction flow is introduced?

Notes for future contributors:

- Rule enforcement remains fully in the engine; UI layer only performs orchestration calls and renders results.
- Before graphical checker interaction, remaining work includes: selecting/checking specific move candidates from board interactions, mapping visual affordances to legal move list, and handling interactive move construction UX.
