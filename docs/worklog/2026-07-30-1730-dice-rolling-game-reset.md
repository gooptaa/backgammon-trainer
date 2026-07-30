# Dice Rolling and Game Reset

Timestamp: 2026-07-30-1730

Previous worklog: docs/worklog/2026-07-30-1718-selection-feedback.md

Goal:

Add a complete turn-start and restart loop in the web app by introducing random dice rolling and game reset controls, while keeping all move legality and turn-state rules inside the engine.

Files changed:

- .gitignore
- README.md
- apps/web/src/App.tsx
- apps/web/src/App.test.tsx
- apps/web/src/features/sandbox/EngineSandboxPanel.tsx
- apps/web/src/features/sandbox/EngineSandboxPanel.module.css
- apps/web/src/features/sandbox/DiceDisplay.tsx
- apps/web/src/features/sandbox/DiceDisplay.module.css
- apps/web/src/features/sandbox/rollDice.ts
- apps/web/src/features/sandbox/rollDice.test.ts
- docs/architecture/overview.md
- docs/knowledge/deep-research-report.md
- apps/web/dev-dist/suppress-warnings.js (removed from tracking)
- apps/web/dev-dist/sw.js (removed from tracking)
- apps/web/dev-dist/workbox-7e5eb42b.js (removed from tracking)
- docs/worklog/2026-07-30-1730-dice-rolling-game-reset.md

Dice generation API:

- Added `rollDice(random?: RandomSource): DiceRoll` in `apps/web/src/features/sandbox/rollDice.ts`.
- `RandomSource` is a function type `() => number`, defaulting to `Math.random`.
- Output is normalized to valid die faces 1..6, including edge-value clamping for non-finite or out-of-range random inputs.

Random-source injection and production roll path:

- `App` now accepts optional `randomSource` via `AppProps` for deterministic tests.
- Production path uses default randomness by calling `rollDice()` with no injected argument.
- `onRollDice` is wired through `EngineSandboxPanel` to `setDice` via engine APIs.

Manual controls policy decision:

- Manual dice controls remain available for development and testing but are moved under a collapsible "Development controls" section.
- Manual controls are disabled when dice are already set for the turn.
- "Set Dice" action label was clarified to "Set Dice Manually".
- Random and manual assignment paths are mutually exclusive within a turn.

New Game reset semantics:

- New Game reinitializes board state using `createInitialGameState`.
- New Game clears turn dice and all transient interaction state:
  - selected source
  - selected destination steps
  - hover destination
- Turn status after reset requires an explicit new roll ("Roll dice to start turn").

Starting-player convention:

- New Game preserves the existing initial game-state convention currently encoded in `createInitialGameState` and does not introduce separate coin-flip/opening-roll logic in the UI.

Engine API and rules impact:

- No move-generation rules changed.
- No move-application rules changed.
- No engine package public API changes were made.
- UI continues to consume engine transitions (`setDice`, `applyGameMove`, `passTurn`, legality queries) without duplicating legality logic.

Generated PWA artifact decision:

- `apps/web/dev-dist` was treated as generated output and removed from version control.
- Added ignore rule for `/apps/web/dev-dist/` in `.gitignore`.
- Explicit production build validation confirms generated SW assets are emitted in `apps/web/dist`.

Tests added/updated:

- Added `apps/web/src/features/sandbox/rollDice.test.ts`:
  - deterministic injection test
  - bounds/normalization behavior test
  - independent die generation and call-count test
- Updated `apps/web/src/App.test.tsx` with roll/reset scenarios:
  - roll button enable/disable behavior
  - deterministic random-source wiring
  - dice clearing after move completion and pass turn
  - New Game reset behavior
  - manual controls availability and exclusivity with random rolling
  - retained selection breadcrumb and hover preview regression checks

Validation performed:

- CI=1 pnpm --filter @backgammon-trainer/web test
- CI=1 pnpm --filter @backgammon-trainer/web build
- CI=1 pnpm check
- git diff --check
- git status

Deviations from plan:

- Repository-level format gate initially failed on a pre-existing tracked file (`docs/knowledge/deep-research-report.md`), so it was formatted to restore a green baseline.

Notes for future contributors:

- Keep randomness at the UI orchestration boundary and inject random sources in tests.
- Keep engine deterministic; do not move randomness or UI-only concerns into engine packages.
- Preserve the manual-controls separation for debugging while keeping primary gameplay flow on "Roll Dice" + board interaction.
