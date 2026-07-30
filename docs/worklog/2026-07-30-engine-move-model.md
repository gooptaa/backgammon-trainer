# Engine Move Model

Date: 2026-07-30

Branch: main

Starting commit: 1f47422c81929e8faebfe9552d0f60e623ba9a4f

Ending commit:

## Goal

Define stable public engine types for legal move representation while keeping move generation stubbed.

## Files changed

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-engine-move-model.md

## Architectural decisions

- Replaced the prior flat move type with composable move-model types.
- Introduced MoveStep and Move to support multi-step turns.
- Added MoveStepKind variants to cover ordinary movement, bar entry, and bearing off.
- Added LegalMoveResult as the API return container.
- Kept getLegalMoves implementation as a stub returning an empty move collection.

## Tests added

- Type coverage test for MoveStep, Move, and LegalMoveResult shapes.
- API shape test for getLegalMoves function availability.
- Stub-compatibility test asserting getLegalMoves returns an empty moves collection.

## Validation performed

- pnpm check
- git diff --check
- git status

## Deviations from plan

- None.

## Follow-up suggestions

- Add rule-driven generation for MoveStep sequences.
- Add scenario fixtures for hits, bar entry, bearing off, and doubles.
- Introduce structured warning/error result fields if diagnostics need machine-readable codes.

## Open questions

- Whether LegalMoveResult should later include mandatory metadata like dice usage summary per candidate move.

## Notes for future contributors

- Keep move-model types engine-owned and UI-agnostic.
- Preserve stub behavior until legal move generation is implemented in a dedicated milestone.
