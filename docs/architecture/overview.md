# Architecture Overview

## System boundaries

Backgammon Trainer starts as a pnpm workspace with four major boundaries:

1. **Deterministic game domain** (`packages/backgammon-domain`)
2. **Presentation layer** (`apps/web`)
3. **Application/server orchestration layer** (`apps/server`, future app-layer modules)
4. **AI gateway contracts** (`packages/ai-contracts`, with server adapters)

A narrow `packages/shared` package holds only small cross-cutting transport types.

## Dependency direction

Intended dependency direction:

- `apps/web` -> `packages/backgammon-domain`, `packages/ai-contracts`, `packages/shared`
- `apps/server` -> `packages/ai-contracts`, `packages/shared`, optionally `packages/backgammon-domain`
- `packages/ai-contracts` -> `packages/backgammon-domain` (for typed board/move context)
- `packages/backgammon-domain` -> no app, UI, or provider code
- `packages/shared` -> no app, UI, or provider code

No package under `packages/` depends on React, Fastify, browser APIs, or vendor SDKs.

## Deterministic legal move requirement

Legal move evaluation must remain deterministic and testable. LLM output can be wrong, inconsistent, or drift over time. For training quality and trust, legality and board transitions must come from rules code with reproducible behavior, not generated text.

Dice randomness is intentionally kept in the web app layer (outside the rules engine) and passed into existing turn-state validation (`setDice(...)`). The UI roll helper supports random-source injection so tests can deterministically verify full game-loop behavior without introducing nondeterminism into engine rule logic.

## Why credentials require a server boundary

Any variable bundled by Vite into client code is public. Provider keys and model credentials must therefore remain server-only. The server mediates model calls, applies timeouts/retries later, and shields secrets from the browser.

## Why provider-neutral AI contracts

The app should not couple to OpenAI/Anthropic/Google/local-model payloads. Provider-neutral request and response contracts make adapters swappable, support feature disparity through capability flags, and preserve a stable app-facing coaching interface.

## Why SVG is the likely board technology

A backgammon board needs precise, individually addressable elements: points, checkers, dice, highlights, legal targets, and annotations. SVG is a strong fit for this because it preserves semantic shape-level control, scales cleanly, and is straightforward to test with accessibility queries.

## Future local-first considerations

This milestone does not implement storage. A likely path is IndexedDB for local training history and position replay, with optional server sync later. Offline support will be incremental:

- Installable shell + static asset caching now
- Local training state persistence later
- Online coaching remains network-dependent unless explicit offline models are added
