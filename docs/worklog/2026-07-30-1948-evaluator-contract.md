# Evaluator Contract and Ranked Move Analysis Foundation

Timestamp: 2026-07-30-1948

Previous worklog: docs/worklog/2026-07-30-1907-legal-move-outcomes.md

Goal:

Add a provider-neutral asynchronous evaluator contract and deterministic ranked legal-move analysis pipeline, with development fixture preview wiring in the web sandbox while preserving engine authority, factual analysis authority, and persistence boundaries.

Files changed:

- apps/web/src/App.tsx
- apps/web/src/App.test.tsx
- apps/web/src/features/sandbox/LegalMoveOutcomesPanel.module.css
- apps/web/src/features/sandbox/LegalMoveOutcomesPanel.tsx
- apps/web/src/features/sandbox/moveFingerprint.ts
- apps/web/src/main.tsx
- apps/web/vite.config.ts
- apps/web/vitest.config.ts
- docs/analysis/evaluator-contract.md
- docs/analysis/legal-move-outcomes.md
- docs/architecture/overview.md
- docs/worklog/2026-07-30-1948-evaluator-contract.md
- packages/backgammon-analysis/README.md
- packages/backgammon-analysis/package.json
- packages/backgammon-analysis/src/fixture.ts
- packages/backgammon-analysis/src/index.ts
- packages/backgammon-analysis/test/evaluator.test.ts
- packages/backgammon-analysis/test/moveFingerprint.test.ts

Package placement:

- Evaluator contracts, normalization, validation, ranking, and canonical move fingerprints were added in `@backgammon-trainer/backgammon-analysis`.
- No evaluator concepts were added to `@backgammon-trainer/backgammon-engine`.
- Fixture evaluator support was isolated in `@backgammon-trainer/backgammon-analysis/fixture`.

Evaluator interface:

- Added asynchronous provider-neutral interface:
  - `PositionEvaluator.evaluate(request): Promise<EvaluatePositionResult>`

Request contract:

- Added `EvaluatePositionRequest` with:
  - `position`
  - `player`
  - `dice`
  - `legalOutcomes` (canonical complete legal outcomes)
  - optional `context` (`{ gameMode: "money" }`)

Result contract:

- Added discriminated `EvaluatePositionResult` with:
  - success: `ok: true`, `coverage`, `scores`, `scoreScale`, `provenance`, `warnings`
  - failure: `ok: false`, `reason`, `message`, optional `provenance`
- Failure reasons:
  - `unavailable`
  - `unsupported-position`
  - `timeout`
  - `provider-failed`
  - `invalid-provider-result`

Canonical move identity strategy:

- Added reusable deterministic fingerprint helper:
  - `getMoveFingerprint(move)`
- Identity includes canonical player + ordered step metadata:
  - step kind
  - from/to
  - die value
  - die index
  - hit flag and hit payload
- Web now reuses shared helper via `apps/web/src/features/sandbox/moveFingerprint.ts` re-export.

Score direction:

- Normalized score direction is explicit:
  - higher `normalizedScore` is better for the player making the move.

Score scales:

- Added `EvaluationScoreScale` variants:
  - `equity` (`points`)
  - `probability` (`[0, 1]`)
  - `relative`
- Fixture evaluator uses `relative`.

Evaluator provenance:

- Added `EvaluatorProvenance` with:
  - `provider`
  - `providerVersion`
  - `adapterVersion`
  - JSON-safe `settings`

Coverage semantics:

- Supports `complete` and `partial` scored coverage.
- Complete coverage requires every legal move to be scored.
- Partial coverage requires at least one scored move when legal outcomes exist.

Provider-result validation:

- Added strict validation before ranking:
  - score scale validity
  - provenance presence/shape
  - JSON-safe settings
  - finite scores
  - known fingerprint mapping
  - no duplicate fingerprints
  - coverage consistency
  - provider rank positive integer when present
- Invalid successful payloads are surfaced as `invalid-provider-result`.

Ranked-analysis API:

- Added `evaluateLegalMoves(request, evaluator)`.
- Pipeline:
  - factual outcome analysis
  - evaluator invocation
  - validation
  - score-to-outcome join
  - deterministic ranking
  - loss-from-best calculation
  - explicit unevaluated move reporting

Ranking convention:

- Higher score first.
- Dense tie ranking.
- Deterministic tie ordering by canonical move fingerprint.
- Provider response order is non-authoritative.

Loss-from-best convention:

- `lossFromBest = bestScore - moveScore`.
- Best scored move loss is `0`.
- Ranked loss values are non-negative.

Empty legal-move behavior:

- Returns successful ranked analysis kind `no-legal-moves`.
- Coverage is `complete`, with empty ranked/unevaluated arrays.
- Evaluator invocation is skipped.
- No fake pass move is created.

Fixture evaluator behavior:

- Added `createFixturePositionEvaluator(...)`.
- Async, deterministic, synthetic scoring keyed by canonical fingerprints.
- Supports modes:
  - `complete`
  - `partial`
  - `unavailable`
  - `provider-failed`
  - `timeout`
  - `unsupported-position`
  - `malformed`
- Fixture provenance identifies itself as fixture data.

Why no heuristic evaluator was added:

- No pip/blot/point/bar feature-weight strategy was introduced.
- This milestone intentionally avoids pretending strategic authority.

Web integration:

- Added `Evaluator Contract Preview` section in legal outcomes panel.
- Factual legal outcome list remains available independently.
- No evaluator configured state displays:
  - `No move evaluator configured.`
- Fixture preview labels are non-prescriptive:
  - `Fixture Rank`
  - `Fixture Score`
  - `Fixture Loss`
- Required warning shown for fixture provenance:
  - `Development fixture scores - not strategic evaluation.`

Evaluator unavailable/failure behavior in UI:

- Concise evaluator-status messaging for unavailable/failed/timeout/invalid data.
- Factual legal outcomes remain usable when evaluator fails.

Async stale-result protection:

- Added request-id and effect-cleanup based stale response protection in `App.tsx`.
- Stale asynchronous evaluator responses are ignored after newer turn context requests.
- Promise rejection path is handled without unhandled rejections.

Preview integration:

- Ranked move rows reuse existing canonical outcome preview selection path.
- No second preview mode was introduced.
- Existing read-only preview/history mutual exclusion remains intact.

Persistence impact:

- Evaluator and ranked results are transient only.
- No changes to `GameSnapshot`, turn history, or import/export payload.

Engine API impact:

- None.

Move-legality impact:

- None.
- `getLegalMoves(...)`, `applyMove(...)`, `applyGameMove(...)`, `passTurn(...)`, and `previewMovePrefix(...)` semantics unchanged.

Tests added:

- `packages/backgammon-analysis/test/moveFingerprint.test.ts`
  - deterministic identity and metadata-distinguishing coverage
  - non-mutation guarantee checks
- `packages/backgammon-analysis/test/evaluator.test.ts`
  - evaluator request passthrough checks
  - factual-failure short-circuit checks
  - complete/partial coverage behavior
  - validation failure coverage (unknown/duplicate/missing/non-finite/scale/provenance/provider-rank)
  - deterministic ranking, ties, dense ranking, loss-from-best checks
  - no-legal-move skip behavior
  - fixture evaluator async/deterministic/mode behavior
- `apps/web/src/App.test.tsx`
  - no evaluator configured messaging
  - fixture preview rendering and non-strategic language checks
  - partial/unevaluated rendering
  - tied rank rendering
  - ranked-row preview integration
  - evaluator failure/unavailable/invalid messaging while factual outcomes stay visible
  - no-invocation guard states
  - stale async result ignore behavior

Validation performed:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test`
- `CI=1 pnpm --filter @backgammon-trainer/web test`
- `CI=1 pnpm --filter @backgammon-trainer/web build`
- `CI=1 pnpm check`
- `git diff --check`
- `git status`

Deviations from plan:

- Added fixture evaluator as explicit subpath export (`@backgammon-trainer/backgammon-analysis/fixture`) to keep synthetic evaluator usage unmistakable and avoid default production inference.
- Kept factual legal-outcome API and evaluator/ranked API both available to preserve existing factual consumers while enabling async ranking.

Capabilities intentionally deferred:

- GNU Backgammon integration
- external process/service evaluators
- heuristic strategic scoring
- move recommendation labels
- mistake classification
- coaching prose
- AI provider integration
- durable analysis record model
