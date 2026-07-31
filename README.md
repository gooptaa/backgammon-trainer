# Backgammon Trainer

Backgammon Trainer is a mobile-first progressive web app project focused on helping players improve, not just play. This repository currently provides a clean monorepo foundation, strict tooling, and a minimal runnable shell.

## Repository status

Milestone: **Foundation only**

Implemented now:

- pnpm workspace monorepo with strict TypeScript
- minimal React + Vite PWA shell
- small Fastify server with mock coaching endpoint
- provider-neutral AI contracts package
- deterministic domain types package (no game engine yet)
- baseline unit/component/server/e2e tests
- lint/format/typecheck/build validation and CI

Not implemented yet:

- complete board rendering
- legal move generation/validation
- checker movement and animations
- game replay workflows
- real LLM adapters
- authentication/persistence/production integrations

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

## Validation commands

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @backgammon-trainer/web test:e2e
pnpm build
pnpm check
```

## Repository map

- `apps/web`: PWA shell, React UI, Vitest/RTL tests, Playwright smoke test
- `apps/server`: Fastify server, health + mock coaching endpoints
- `packages/backgammon-domain`: deterministic domain types and small pure helper
- `packages/backgammon-evaluator-gnubg`: Node-only GNU Backgammon adapter spike, capability detection, transcript parsing, smoke command
- `packages/ai-contracts`: provider-neutral coaching and adapter interfaces
- `packages/shared`: narrowly scoped shared envelope/result types
- `docs/architecture`: architecture overview + ADRs
- `docs/roadmap.md`: ordered milestones

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

1. Copy `.env.example` values into your local environment (or `.env.local` for your shell tooling).
2. Keep server secrets server-side only.
3. Any `VITE_*` variable is bundled into browser code and should be treated as public.

Current local run does **not** require real provider credentials.

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
