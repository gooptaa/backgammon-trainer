# Backgammon Trainer

Backgammon Trainer is a mobile-first progressive web app project focused on helping players improve, not just play. This repository currently provides a clean monorepo foundation, strict tooling, and a minimal runnable shell.

## Repository status

Milestone: **Local environment loading and live integration**

Implemented now:

- deterministic gameplay foundation (engine authority, legal moves, committed turn history, snapshot versioning)
- factual analysis and evaluator-attributed ranked move evidence
- analysis-session capture and reconciliation boundaries
- text-first coach conversation orchestration with evidence version `2`
- recommendation-support authority resolved before model generation for current-position coaching
- curated project-authored knowledge retrieval and bounded evidence disclosure
- provider-neutral chat model contracts in `@backgammon-trainer/ai-contracts`
- trusted server-side coach provider execution with:
  - fixture mode
  - no-provider mode
  - OpenAI-compatible chat-completions adapter mode
- trusted server-side evaluator execution with:
  - fixture mode
  - no-provider mode
  - real GNU Backgammon mode (server-hosted)
  - provider-neutral evaluator status and evaluate-position routes
- web coach integration that preserves request snapshots, stale-response protection, and gameplay independence while requests are pending
- root `.env.local` local configuration convention with explicit server and browser boundaries
- predictable server local env loading and explicit Vite root env loading for browser-safe values
- opt-in live provider smoke command through provider-neutral server routes

Not implemented yet:

- streaming/tool-calling/multimodal provider features
- browser credential entry or per-user credential storage
- provider comparison/fallback routing
- semantic retrieval/embeddings/vector search
- conversation persistence and cross-game learner modeling

## Prerequisites

- Node.js `20.11.1` (see `.nvmrc`)
- pnpm `9.15.4`

## Installation

```bash
pnpm install
```

## Development

Run web + server together:

```bash
pnpm dev
```

Web app only:

```bash
pnpm --filter @backgammon-trainer/web dev
```

Server only:

```bash
pnpm --filter @backgammon-trainer/server dev
```

Check local configuration (non-secret summary + validation):

```bash
pnpm config:check
```

Run explicit opt-in live provider smoke check (server must already be running):

````bash
ALLOW_LIVE_PROVIDER_SMOKE=true pnpm smoke:live-provider

Run explicit opt-in GNU evaluator smoke check (server must already be running):

```bash
ALLOW_GNUBG_SMOKE=true pnpm smoke:gnubg
````

````

## Validation commands

```bash
pnpm knowledge:check
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @backgammon-trainer/web test:e2e
pnpm build
pnpm check
````

## Repository map

- `packages/backgammon-knowledge`: curated browser-safe teaching content, taxonomy, and deterministic retrieval helpers
- `packages/backgammon-coach`: text-first coaching conversation/domain orchestration
- `docs/coach`: text coach conversation foundation and boundaries
- `docs/knowledge`: curated knowledge architecture and authoring guides

## Turn flow and staged interaction

- The board interaction model only uses complete legal moves returned by the engine.
- While the player is selecting a multi-step move, the UI renders a derived staged position from the selected legal prefix.
- The committed `GameState.position` is not mutated until a full legal move is applied through `applyGameMove(...)`.
- Staged rendering supports same-checker-twice turns, hits, bar entry, and bearing off because prefix projection reuses engine transition logic.

## Opening roll and dice behavior

- New games start in an explicit opening-roll phase.
- `Roll for Opening` rolls one die for White and one die for Black.
- Ties are shown and must be rerolled by the user.
- The higher die determines the starting player.
- The two opening dice become the starting player's first turn dice without requiring a separate `Roll Dice` click.
- After the opening turn is applied or passed, ordinary two-die `Roll Dice` continues for the rest of the game.
- Dice randomness remains in `apps/web` and uses injectable random sources for deterministic tests.

## Environment setup

1. Copy `.env.example` to repository root `.env.local`.
2. Put server-private values (for example provider API keys) only in server variables.
3. Keep browser values limited to intentional public `VITE_*` variables.

```bash
cp .env.example .env.local
```

Current local run can use fixture mode without real provider credentials.

To run with a real provider, configure server-side values from `.env.example` and set browser mode to `VITE_COACH_MODEL_MODE=server`.

Detailed local setup, mode behavior, smoke verification, and troubleshooting:

- `docs/local-development.md`

## PWA testing instructions

Installability and shell caching can be tested locally:

1. Build and preview the web app:
   ```bash
   pnpm --filter @backgammon-trainer/web build
   pnpm --filter @backgammon-trainer/web preview
   ```
2. Open the preview URL in Chrome.
3. Use DevTools Application tab to inspect manifest and service worker.
4. Trigger "Install app" from browser UI to verify install prompt behavior.

Production-like preview method:

- `pnpm --filter @backgammon-trainer/web build`
- `pnpm --filter @backgammon-trainer/web preview`

Generated artifact policy:

- `apps/web/dist/` and `apps/web/dev-dist/` are generated build/runtime artifacts and must not be committed.
- Build outputs should be regenerated locally or in CI from source as needed.

Offline scope disclaimer:

- Implemented now: installable manifest + cached application shell assets
- Not implemented now: offline AI coaching or offline training history
- Future consideration: local-first training data storage (likely IndexedDB)

## Suggested next milestone

Define a canonical board-position model in `packages/backgammon-domain` and render a static SVG board in `apps/web` from one hard-coded position. Exclude drag-and-drop, complete move rules, and real AI integration in that milestone.
