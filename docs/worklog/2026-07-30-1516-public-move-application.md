# Public Move Application

Timestamp: 2026-07-30-1516

Previous worklog: docs/worklog/2026-07-30-1507-legal-move-contract-audit.md

Goal:

Add a public API to apply one completed legal move to a position with legality validation, immutable state transition, and explicit invalid-move failure handling.

Files changed:

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/legal-move-output-contract.md
- docs/worklog/2026-07-30-1516-public-move-application.md

Architectural decisions:

- Added public API:
  - `applyMove(position, player, dice, move): ApplyMoveResult`
- Added public result/failure types:
  - `ApplyMoveResult`
  - `ApplyMoveFailureReason` (`illegal-move`, `invalid-step-sequence`)
- Added explicit move-equivalence helper:
  - `areMovesEquivalent(expected, supplied)`
- `dieIndex` validation decision:
  - Exact `dieIndex` matching is required when validating supplied moves against current legal moves.
- Internal reuse:
  - Refactored low-level transition helper to `applyMoveStepUnchecked(...)` and reused it for both recursive candidate assembly and public move application.
- Kept public validation separate from low-level transition:
  - `applyMove(...)` validates membership in current legal move set first, then applies ordered steps.

Tests added:

- New `applyMove public API` suite with success and rejection behavior.
- Success coverage includes:
  - ordinary movement
  - stacking on own points
  - multi-step non-double turns
  - both legal non-double die orders
  - ordinary hits and entry hits
  - bar entry
  - exact and oversized bearing off
  - four-step doubles and shorter mandatory doubles
  - black-direction movement
  - input immutability on success
- Rejection coverage includes:
  - fabricated illegal moves
  - moves from different positions
  - wrong dice
  - wrong player
  - reordered/truncated steps
  - smaller-die violation when larger-die rule applies
  - short doubles move when longer is mandatory
  - ordinary move while bar entry is mandatory
  - fabricated hit metadata
  - fabricated bear-off step
  - malformed step sequence
  - input immutability on failure
  - exact dieIndex matching enforcement

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- No move-generation policy changes were required.
- Added one extra rejection test for malformed step sequences to exercise `invalid-step-sequence`.

Follow-up suggestions:

- Add focused unit tests for `areMovesEquivalent(...)` and malformed-step validation helper behavior in isolation.
- If future model fields are added to `MoveStep`, update equivalence checks and application tests in the same change.

Open questions:

- Whether future API versions should expose richer failure diagnostics while preserving the current small failure surface.

Notes for future contributors:

- Invalid-move failure behavior is non-throwing for ordinary invalid input (`ok: false` with reason).
- Observable move-generation behavior was not intentionally changed in this milestone.
- Public apply behavior is strictly legality-gated against current `getLegalMoves(...)` output.
