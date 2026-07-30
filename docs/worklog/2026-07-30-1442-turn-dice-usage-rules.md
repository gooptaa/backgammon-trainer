# Turn Dice-Usage Rules

Timestamp: 2026-07-30-1442

Previous worklog: docs/worklog/2026-07-30-1437-turn-candidate-expansion.md

Goal:

Filter expanded non-double turn candidates to enforce mandatory two-die usage when possible and larger-die preference when only one die can be used.

Files changed:

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/fixtures/boardFixtures.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-1442-turn-dice-usage-rules.md

Architectural decisions:

- Added a turn-policy filter stage after candidate expansion: filterTurnCandidatesByDiceUsage(...).
- Kept dice-usage policy separate from step legality, temporary move application, and turn assembly.
- Preserved doubles behavior by bypassing the new non-double filtering policy for equal dice.
- Preserved existing metadata and mandatory bar-entry behavior through filtering.

Tests added:

- Two-step candidates suppress one-step candidates when both dice can be used.
- Both die orders remain when each yields a complete legal turn.
- Larger-die selection when no complete two-step turn exists.
- Smaller-die selection when larger die is not playable.
- Larger-die preference when both dice are individually playable but cannot both be used.
- Hit metadata survives policy filtering.
- Bar-entry metadata and mandatory-entry behavior survive policy filtering.
- Doubles behavior remains unchanged.

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- None.

Follow-up suggestions:

- Add doubles turn expansion and doubles-specific usage policy.
- Add final turn-candidate legality filtering for complete supported-rule enforcement.
- Add optional deduplication only if/when result-contract requirements demand it.

Open questions:

- Whether future deterministic ordering should be guaranteed at the API boundary.

Notes for future contributors:

- Keep filterTurnCandidatesByDiceUsage(...) policy-focused and separate from generation primitives.
- Keep applyMoveStepTemporarily(...) internal until a full public move-application API is intentionally designed.
