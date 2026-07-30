# Backgammon Engine Package

Date: 2026-07-30

Branch: main

Starting commit: 8703f023008b4d9517c4b80ea9831af2ba81de13

Ending commit:

## Goal

Create an initial backgammon rules engine package boundary with a stubbed legal-move API and package-level tests.

## Files changed

- packages/backgammon-engine/package.json
- packages/backgammon-engine/tsconfig.json
- packages/backgammon-engine/tsconfig.build.json
- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-backgammon-engine-package.md

## Architectural decisions

- Added a new workspace package rather than extending UI or domain packages.
- Exposed a minimal getLegalMoves API with typed input and output contract.
- Kept implementation intentionally stubbed to return an empty list.
- Reused backgammon-domain types for position and player inputs.

## Tests added

- Export availability test for getLegalMoves.
- Type-shape usage test for input and output contracts.
- Stub behavior test asserting empty move list return.

## Validation performed

- pnpm check
- git diff --check
- git status

## Deviations from plan

- None.

## Follow-up suggestions

- Introduce legal move generation rules in the engine package incrementally.
- Add focused fixtures for specific move scenarios once legality logic exists.
- Add API-level tests for non-empty legal move outputs as rules are implemented.

## Open questions

- Whether the future API should include richer move metadata beyond origin and destination.

## Notes for future contributors

- Keep legality logic in the engine package as the source of truth.
- Keep UI interaction state separate from rule evaluation and move application.
