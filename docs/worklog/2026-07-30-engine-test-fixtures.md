# Engine Test Fixtures

Date: 2026-07-30

Branch: main

Starting commit: 288eefd6514b02b3b6136f93b48c044f33bc4bc8

Ending commit:

## Goal

Introduce reusable named engine fixtures for common board-position scenarios without adding move-generation logic.

## Files changed

- packages/backgammon-engine/test/fixtures/boardFixtures.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-engine-test-fixtures.md

## Architectural decisions

- Added a dedicated fixture module under engine tests instead of inline board construction.
- Added fixture helpers to keep point-map and position construction consistent.
- Kept fixtures valid against current domain position constraints.
- Kept fixture naming scenario-oriented for readability and reuse.

## Tests added

- Updated getLegalMoves stub test to consume shared fixtures.
- Added fixture tests for named fixture availability and helper structural output.
- Added fixture validation checks using domain position validation.

## Validation performed

- pnpm check
- git diff --check
- git status

## Deviations from plan

- None.

## Follow-up suggestions

- Add additional named fixtures for specific hit and re-entry edge cases once legal-move logic begins.
- Add fixture composition helpers for doubles and multi-step turn scenarios.
- Consider splitting fixtures by category if fixture count grows significantly.

## Open questions

- Whether future fixture modules should include deterministic dice context alongside board positions.

## Notes for future contributors

- Prefer extending shared fixtures over embedding board construction directly in tests.
- Keep fixture semantics explicit so future legality tests remain easy to read.
