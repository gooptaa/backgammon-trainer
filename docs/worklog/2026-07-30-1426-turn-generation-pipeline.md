# Turn Generation Pipeline Refactor

Timestamp: 2026-07-30-1426

Previous worklog: docs/worklog/2026-07-30-1422-mandatory-bar-entry.md

Goal:

Separate single-step generation from turn-candidate orchestration while preserving current behavior and public API.

Files changed:

- packages/backgammon-engine/src/index.ts
- docs/worklog/2026-07-30-1426-turn-generation-pipeline.md

Architectural decisions:

- Introduced internal generateSingleDieMoves(...) to encapsulate one-die step generation.
- Introduced internal generateTurnCandidates(...) to orchestrate per-die candidate aggregation.
- Kept getLegalMoves(...) as the public API entry point and wired it to the new pipeline.
- Preserved mandatory bar-entry gating and existing blocked/hit destination handling.

Tests added:

- None. Existing tests already cover observable behavior and remained unchanged.

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- None.

Follow-up suggestions:

- Replace placeholder turn aggregation with true sequencing logic in a dedicated milestone.
- Add dice-usage and doubles policies inside generateTurnCandidates(...) once sequencing exists.
- Keep move-application concerns separate from legality orchestration.

Open questions:

- Whether future turn sequencing should emit deterministic ordering guarantees in the public contract.

Notes for future contributors:

- Treat generateSingleDieMoves(...) as step-level legality only.
- Treat generateTurnCandidates(...) as turn-level policy/orchestration boundary.
