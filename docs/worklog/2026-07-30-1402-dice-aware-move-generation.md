# Dice-Aware Move Generation

Timestamp: 2026-07-30-1402

Date: 2026-07-30

Branch: main

Starting commit: 135f6fc1751a7a4ed24180899089aae91c4a672d

Ending commit:

## Goal

Update legal move generation to take an actual two-die roll and produce basic independent one-die candidate moves.

## Files changed

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/fixtures/boardFixtures.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-1402-dice-aware-move-generation.md

## Architectural decisions

- Added an engine DiceRoll input type to GetLegalMovesInput.
- Preserved existing Move and MoveStep model and extended MoveStep with dieIndex for die association.
- Evaluated each die independently and merged resulting single-step candidates into one LegalMoveResult.
- Treated duplicate dice as separate sources by preserving index positions.
- Kept unsupported rule areas omitted for now.

## Tests added

- One die producing moves while the other produces none.
- Both dice producing independent moves.
- Duplicate die values preserving die source index.
- Empty result scenarios.
- Die association checks on generated moves.

## Validation performed

- pnpm check
- git diff --check
- git status

## Deviations from plan

- None.

## Follow-up suggestions

- Introduce blocked-point and hit support.
- Add bar-entry and bearing-off generation.
- Add turn-level sequencing across both dice in a dedicated milestone.

## Open questions

- Whether future sequencing should preserve current move ordering semantics or define a new deterministic contract.

## Notes for future contributors

- Keep per-die independent generation behavior explicit until turn-sequencing logic is introduced.
- Preserve dieIndex association because duplicate dice values require source disambiguation.
