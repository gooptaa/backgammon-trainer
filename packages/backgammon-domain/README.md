# Backgammon Domain

## Purpose

Define canonical, deterministic backgammon domain types and validation primitives shared across engine and analysis layers.

## Responsibilities

- Provide canonical board-point and player type contracts.
- Define deterministic starting-position constants.
- Validate board-position invariants.
- Provide small pure helpers for point occupancy and checker totals.

## Allowed Dependencies

- No workspace package dependencies.

## Forbidden Dependencies

- `@backgammon-trainer/web`
- `@backgammon-trainer/backgammon-analysis`
- `@backgammon-trainer/backgammon-analysis-session`
- `@backgammon-trainer/backgammon-evaluator-gnubg`
- Runtime frameworks, process adapters, and persistence adapters

## Public API

- Domain type contracts (`Player`, `PointIndex`, `BoardPosition`, and related structural types).
- Canonical constants (`POINT_INDEXES`, `STANDARD_STARTING_POSITION`).
- Validation and helper functions (`validateBoardPosition`, `getPointOccupancy`, `countPlayerCheckers`).

Why these exports are public:

- They are the shared deterministic vocabulary required by engine and analysis packages.

## Non-goals

- Move legality and move application logic.
- Turn orchestration and snapshot persistence envelopes.
- Any UI, evaluator, or transport concerns.

## Future Roadmap

- Extend domain-level validation helpers as needed by deterministic rule evolution.
- Keep the canonical representation stable while adding compatibility helpers where required.
