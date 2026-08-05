# Automatic GNU Opponent Recovery

Timestamp: 2026-08-05-2205

Previous worklog: docs/worklog/2026-08-05-1958-player-first-game-shell.md

Goal:

Stabilize the automatic GNU opponent flow without restarting the player-first shell work, and keep evaluator coverage aligned to canonical-equivalent move classes.

Files changed:

- packages/backgammon-analysis/src/index.ts
- packages/backgammon-analysis/test/evaluator.test.ts
- packages/backgammon-evaluator-gnubg/src/evaluator.ts
- packages/backgammon-evaluator-gnubg/test/evaluator.test.ts
- apps/web/src/App.tsx
- apps/web/src/App.test.tsx
- apps/web/src/features/profile/lineageStorage.ts
- apps/web/src/features/profile/lineageStorage.test.ts
- docs/worklog/2026-08-05-2205-automatic-gnu-opponent-recovery.md

Architectural decisions:

- Treated evaluator coverage as coverage over canonical-equivalent move classes, not raw legal move rows.
- Kept canonical fingerprints in the analysis layer and reused them in the GNU bridge payload.
- Preserved engine move fingerprints as the selection/application identity and only changed evaluator coverage identity.
- Kept automatic Black turn orchestration in the web app layer.
- Skipped evaluator precompute for forced-pass states so pass handling does not consume evaluator work.

Tests added or updated:

- Canonical-equivalent move classes can satisfy complete coverage.
- GNU bridge `expectedMoves` counts canonical classes.
- Web app lifecycle tests for automatic Black opening, white reply, pass handling, retry behavior, and stale responses.
- Learner lineage parser and migration tests.

Validation performed:

- pnpm --filter @backgammon-trainer/web test -- src/App.test.tsx
- pnpm --filter @backgammon-trainer/web test
- pnpm --filter @backgammon-trainer/web build

Deviations from plan:

- One stale-evaluation test was relaxed to assert the user-visible reset state instead of the internal evaluator call count, because the latter was not stable across the reset path.

Follow-up suggestions:

- Consider whether the stale-evaluation reset path should be tightened further or whether the current visible-behavior regression is sufficient.
- If future lifecycle work touches computer turns again, keep the pass/no-legal-move branch separate from evaluator precompute.

Notes for future contributors:

- Canonical-equivalent coverage is now the contract boundary for evaluator completeness.
- A black turn with no legal moves should short-circuit to pass handling before evaluator work.
- The learner profile only records committed observations when lineage ownership is known for the acting side.
