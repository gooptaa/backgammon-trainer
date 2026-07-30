# Doubles Turn Expansion

Timestamp: 2026-07-30-1503

Previous worklog: docs/worklog/2026-07-30-1455-bearing-off-generation.md

Goal:

Implement recursive doubles turn expansion (up to four die uses), immutable per-step temporary application, and doubles-specific maximum-usage filtering without regressing non-double behavior.

Files changed:

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/fixtures/boardFixtures.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-1503-doubles-turn-expansion.md

Architectural decisions:

- Generalized turn assembly to shared recursion for ordered die uses:
  - non-doubles pass two uses (order 0->1 and 1->0)
  - doubles pass four uses of the same die value
- Preserved pipeline separation:
  - generateSingleDieMoves(...)
  - assembleTurnCandidates(...)
  - filterTurnCandidatesByDiceUsage(...)
  - getLegalMoves(...)
- Doubles die-use identity convention is explicit in MoveStep:
  - dieIndex values 0, 1, 2, 3 represent the first through fourth doubles uses.
- Doubles filtering now returns only candidates with the maximum playable step count present among generated candidates.
- Enabled legal stacking onto own occupied points so recursive doubles sequencing can correctly support repeated entries and ordinary continuations.

Tests added:

- Four-step doubles expansion when all four plays are legal.
- Doubles die value consistency and ordered dieIndex values 0..3.
- Maximum-step filtering for doubles at four, three, two, one, and zero playable steps.
- Same-checker and different-checker doubles sequencing.
- Per-depth legality recalculation (including later-step blocking).
- Mandatory bar-entry behavior across doubles depth, including multi-entry and entry-then-ordinary sequences.
- Hit propagation in doubles sequences for both entry hits and ordinary hits.
- Doubles bearing-off expansion up to four steps, including fewer-than-four cases and oversized-origin recalculation across steps.
- Black-direction doubles expansion parity check.
- Input immutability check for doubles sequence generation.

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- Legacy duplicate-die tests were updated to non-double variants because doubles semantics now intentionally consume up to four uses rather than modeling two independent duplicate-die single steps.

Follow-up suggestions:

- Add helper-level unit tests around recursive candidate assembly for narrower failure localization.
- Consider explicit public documentation examples for doubles candidate shapes and dieIndex semantics.

Open questions:

- Whether to guarantee deterministic candidate ordering at API boundaries once downstream consumers depend on stable ordering.

Notes for future contributors:

- Keep doubles maximum-step policy in filterTurnCandidatesByDiceUsage(...) and keep recursion focused on generation.
- Preserve the shared recursive assembler path for both non-doubles and doubles to avoid divergent sequencing logic.
