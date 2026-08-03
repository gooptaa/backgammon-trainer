# Real GNU Evaluator Integration

Date: 2026-08-03 17:06 (local)
Milestone: Real GNU Evaluator Integration

## Scope and objective

- Integrate a real GNU Backgammon evaluator path through existing provider-neutral architecture.
- Keep recommendation authority in analysis/coach layers; evaluator remains factual scorer only.
- Keep browser runtime free of GNU adapter and server-only process/executable concerns.

## Prework closure reference

- Prework milestone commit already present before this work:
  - `89ac078e987b2855b01b6775ff3764b26b4bb947`
  - `chore: add local environment integration`
- Branch baseline before this milestone:
  - `89ac078e987b2855b01b6775ff3764b26b4bb947`

## Implementation summary

- GNU evaluator package:
  - Added default real invocation factory in evaluator adapter using a python bridge request path.
  - Added `pythonBridgeScriptPath` option and default bridge script resolution.
  - Added checker-play python bridge script at `packages/backgammon-evaluator-gnubg/scripts/gnubg_checkerplay_bridge.py`.
  - Extended move matching parser to support repeated-token notation like `(2)`.
  - Tightened capability detection to require `--python`, plus explicit `supportsPython` capability output.

- Server:
  - Added evaluator provider mode `gnubg` (alias `gnu`) in config normalization and validation.
  - Added GNU evaluator runtime branch in provider factory with `detectGnuBg(...)` status mapping.
  - Added GNUBG config keys:
    - `GNUBG_EXECUTABLE`
    - `GNUBG_TIMEOUT_MS`
    - `GNUBG_DETECTION_TIMEOUT_MS`
  - Added opt-in smoke route script `apps/server/scripts/gnubgSmoke.mjs`.

- Web:
  - Expanded evaluator status typing for GNU metadata.
  - Updated Legal Move Outcomes panel wording to neutral labels:
    - `Rank`
    - `Normalized score`
    - `Loss from best`
  - Preserved explicit fixture warning where appropriate.

## Docs and architecture updates

- Updated env/config and usage docs:
  - `.env.example`
  - `README.md`
  - `docs/local-development.md`
  - `apps/server/README.md`
  - `apps/web/README.md`
  - `docs/README.md`
- Updated analysis/architecture docs:
  - `docs/analysis/evaluator-contract.md`
  - `docs/analysis/gnubg-adapter.md`
  - `docs/architecture/overview.md`
  - `docs/architecture/dependency-guardrails.md`
- Added ADR:
  - `docs/adr/0011-real-evaluator-server-boundary.md`

## Test and validation matrix

- Focused package/app runs:
  - `CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test`
  - `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test`
  - `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test`
  - `CI=1 pnpm --filter @backgammon-trainer/ai-contracts test`
  - `CI=1 pnpm --filter @backgammon-trainer/backgammon-knowledge test`
  - `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check`
  - `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test`
  - `CI=1 pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg test`
  - `CI=1 pnpm --filter @backgammon-trainer/server test`
  - `CI=1 pnpm --filter @backgammon-trainer/web test`
  - `CI=1 pnpm --filter @backgammon-trainer/web build`
- Whole-repo gates:
  - `pnpm config:check`
  - `CI=1 pnpm check`
  - `CI=1 pnpm test`
  - `git diff --check`
- Safety/boundary checks:
  - `git check-ignore -v .env.local apps/server/.env.local apps/web/.env.local`
  - Browser artifact scan for server-only key leakage in `apps/web/dist` and `apps/web/dev-dist`.

Result summary:

- All required test/check/build gates passed after formatting and type/lint fixes.
- GNU smoke route integration executed against isolated gnubg-mode server and returned unavailable status because GNU Backgammon executable is not installed in this environment.

## Deviations from initial plan

- `pnpm smoke:gnubg` at root initially failed because the live server evaluator mode was `none`; smoke script expects `gnubg` mode.
- Smoke was then rerun against an isolated server started with `EVALUATOR_PROVIDER=gnubg` and confirmed environment-level unavailability of GNU executable.

## Limitations and unresolved items

- Real checker-play execution remains environment-dependent on local GNU Backgammon installation with python bridge support.
- In this environment, real GNU execution could not be completed end-to-end due to missing executable.

## Deferred capabilities

- Additional GNU analyzer tuning/profile flags and richer multi-ply controls were not introduced in this milestone.
- Optional stronger smoke automation that self-bootstraps server mode is deferred.

## Files touched for this milestone

- `apps/server/scripts/gnubgSmoke.mjs`
- `apps/server/src/config.ts`
- `apps/server/src/evaluatorProvider.ts`
- `apps/server/src/configCheck.ts`
- `apps/server/test/config.test.ts`
- `apps/server/test/server.test.ts`
- `apps/server/package.json`
- `apps/web/src/features/analysis-session/serverPositionEvaluator.ts`
- `apps/web/src/features/sandbox/LegalMoveOutcomesPanel.tsx`
- `apps/web/src/App.test.tsx`
- `packages/backgammon-evaluator-gnubg/src/evaluator.ts`
- `packages/backgammon-evaluator-gnubg/src/matching.ts`
- `packages/backgammon-evaluator-gnubg/src/capability.ts`
- `packages/backgammon-evaluator-gnubg/scripts/gnubg_checkerplay_bridge.py`
- `packages/backgammon-evaluator-gnubg/test/evaluator.test.ts`
- `packages/backgammon-evaluator-gnubg/test/matching.test.ts`
- `packages/backgammon-evaluator-gnubg/test/capability.test.ts`
- `packages/backgammon-evaluator-gnubg/test/smoke.test.ts`
- `.env.example`
- `README.md`
- `apps/server/README.md`
- `apps/web/README.md`
- `docs/README.md`
- `docs/local-development.md`
- `docs/analysis/evaluator-contract.md`
- `docs/analysis/gnubg-adapter.md`
- `docs/architecture/overview.md`
- `docs/architecture/dependency-guardrails.md`
- `docs/adr/0011-real-evaluator-server-boundary.md`
- `package.json`
- `pnpm-lock.yaml`
