# Legal-Move Output Contract Audit

Timestamp: 2026-07-30-1507

Previous worklog: docs/worklog/2026-07-30-1503-doubles-turn-expansion.md

Goal:

Audit and document the observable output contract of `getLegalMoves(...)`, including duplicate behavior, ordering behavior, and own-point stacking regression coverage, without changing legal-move behavior.

Files changed:

- packages/backgammon-engine/test/fixtures/boardFixtures.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/legal-move-output-contract.md
- docs/worklog/2026-07-30-1507-legal-move-contract-audit.md

Architectural decisions:

- Kept move-generation logic unchanged for this milestone; work focused on audit tests and documentation.
- Treated `dieIndex` as die-use execution metadata for audit analysis rather than checker-identity semantics.
- Added semantic-key test helpers that compare ordered step shape, origins/destinations, die values, and hit/bear-off effects.

Tests added:

- Duplicate audit checks in branching non-double and doubles scenarios.
- Determinism-in-practice check across repeated calls for identical input.
- Current die-order traversal observation check (`0->1` before `1->0` in non-double assembly).
- Own-point stacking regression checks:
  - ordinary move onto one own checker
  - ordinary move onto multiple own checkers
  - bar entry onto own occupied point
  - doubles sequencing through own occupied points
  - blocked opposing-point behavior remains enforced

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- No engine behavior changes were required; only fixtures/tests/docs were updated.

Follow-up suggestions:

- Add narrow unit tests around recursive candidate assembly internals to isolate traversal regressions faster.
- If consumers require stable list ordering, define and document an explicit ordering contract in a future milestone.

Open questions:

- Should move-array ordering become part of the public contract, or remain implementation-defined?

Notes for future contributors:

- Duplicates were not confirmed in audited scenarios.
- No concrete duplicate-producing scenario is currently confirmed.
- Output ordering is currently deterministic in practice but not guaranteed by the public API.
- No correctness defects were discovered in this audit.
- Observable legal-move behavior was not intentionally changed in this milestone.
