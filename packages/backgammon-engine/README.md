# Backgammon Engine

## Purpose

Provide deterministic rule authority for legal move generation, move application, turn progression, and snapshot-safe game state transitions.

## Responsibilities

- Generate complete legal moves for a player and dice roll.
- Apply legal moves and validate illegal/invalid sequences.
- Enforce pass legality and game-completion detection.
- Provide staged prefix projection for UI preview without commit.
- Define canonical turn-record and game-snapshot contracts.

## Allowed Dependencies

- `@backgammon-trainer/backgammon-domain`

## Forbidden Dependencies

- `@backgammon-trainer/backgammon-analysis-session`
- `@backgammon-trainer/web`
- `@backgammon-trainer/backgammon-evaluator-gnubg`
- Browser frameworks, persistence adapters, and provider integrations

## Public API

- Rule APIs (`getLegalMoves`, `applyMove`, `applyGameMove`, `passTurn`, `previewMovePrefix`).
- Game-state and turn-state contracts (`GameState`, `TurnRecord`, related result types).
- Snapshot envelope and parse/serialize helpers.

Why these exports are public:

- They are the canonical deterministic interfaces required by web and analysis layers.

## Non-goals

- Strategic ranking or evaluator integration.
- Coaching output generation.
- UI rendering/state ownership.
- Node process orchestration for evaluators.

## Future Roadmap

- Continue extending deterministic rules while preserving existing contract invariants.
- Maintain backward-compatible snapshot parsing where feasible.
- Keep staged preview and committed-state semantics explicit.
