# Turn Candidate Expansion

Timestamp: 2026-07-30-1437

Previous worklog: docs/worklog/2026-07-30-1426-turn-generation-pipeline.md

Goal:

Implement initial turn-candidate assembly by expanding single-step legality across both die orders with temporary immutable state transitions.

Files changed:

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/fixtures/boardFixtures.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-1437-turn-candidate-expansion.md

Architectural decisions:

- Renamed turn-level orchestrator to assembleTurnCandidates(...).
- Kept generateSingleDieMoves(...) as the step-level legality generator.
- Added internal applyMoveStepTemporarily(...) to support immutable intermediate position transitions.
- Added internal point add/remove helpers to keep temporary application logic narrow and explicit.
- Preserved one-step candidates when first steps have no second-step continuation.
- Kept doubles out of turn assembly scope by preserving existing independent single-step behavior when dice are equal.

Tests added:

- Two-step candidates assembled into one Move.
- Ordered die traversal and dieIndex preservation across both steps.
- Same-checker and different-checker two-step movement scenarios.
- First-step hit followed by second move using intermediate state.
- First-step bar entry followed by ordinary move using intermediate state.
- One die order with continuation while the opposite order preserves a one-step candidate.
- One-step preservation when no legal continuation exists.
- Input position immutability during expansion.

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- None.

Follow-up suggestions:

- Add turn-legality filtering for mandatory full-dice usage and larger-die preference.
- Add doubles expansion (up to four steps) after turn-legality policy is introduced.
- Add optional deduplication and deterministic ordering only when contract requirements are finalized.

Open questions:

- Whether incomplete one-step candidates should remain visible once mandatory full-turn usage rules are introduced.

Notes for future contributors:

- assembleTurnCandidates(...) is currently expansion-only and intentionally does not enforce turn-completion legality.
- applyMoveStepTemporarily(...) is internal and should remain decoupled from any future public move-application API.
