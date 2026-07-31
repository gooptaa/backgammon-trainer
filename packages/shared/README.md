# Shared

## Purpose

Hold minimal cross-cutting transport envelope types that are safe to share across apps without importing domain or runtime-specific logic.

## Responsibilities

- Define generic API envelope/result contracts.
- Keep shared types lightweight and dependency-free.

## Allowed Dependencies

- No workspace package dependencies.

## Forbidden Dependencies

- `@backgammon-trainer/web`
- `@backgammon-trainer/server`
- Domain logic, engine rules, analysis logic, or evaluator adapters

## Public API

- `ApiEnvelope`, `ApiErrorEnvelope`, and `ApiResult`.

Why these exports are public:

- They are the minimal app-to-app transport contracts intended for broad reuse.

## Non-goals

- Business logic.
- Runtime orchestration.
- Persistence or serialization policy.

## Future Roadmap

- Keep the package intentionally small.
- Add shared types only when multiple packages genuinely need the same contract.
