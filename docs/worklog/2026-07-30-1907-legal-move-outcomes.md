# Legal Move Outcome Analysis and Comparison UI

Timestamp: 2026-07-30-1907

Previous worklog: docs/worklog/2026-07-30-1849-position-analysis.md

Goal:

Add deterministic analysis for every complete legal move outcome from a committed position/player/dice turn, then expose development-facing move-outcome inspection UI with read-only board preview while preserving engine authority and existing staged/history/persistence boundaries.

Files changed:

- apps/web/package.json
- apps/web/src/App.tsx
- apps/web/src/App.test.tsx
- apps/web/src/features/sandbox/EngineSandboxPanel.tsx
- apps/web/src/features/sandbox/LegalMoveOutcomesPanel.module.css
- apps/web/src/features/sandbox/LegalMoveOutcomesPanel.tsx
- apps/web/src/features/sandbox/moveFingerprint.ts
- apps/web/vite.config.ts
- apps/web/vitest.config.ts
- docs/analysis/legal-move-outcomes.md
- docs/architecture/overview.md
- docs/worklog/2026-07-30-1907-legal-move-outcomes.md
- packages/backgammon-analysis/README.md
- packages/backgammon-analysis/src/index.ts
- packages/backgammon-analysis/test/analysis.test.ts
- pnpm-lock.yaml

Public move-outcome analysis API:

- Added in `@backgammon-trainer/backgammon-analysis`:
  - `analyzeLegalMoveOutcomes(position, player, dice): AnalyzeLegalMoveOutcomesResult`

Result contract:

- Success:
  - `{ ok: true, analysis }`
  - `analysis` fields:
    - `player`
    - `dice`
    - `positionBefore` (PositionAnalysis)
    - `outcomes` (readonly LegalMoveOutcome[])
- Legal move outcome fields:
  - `move` (canonical engine Move)
  - `positionAfter` (engine-applied resulting position)
  - `analysisAfter` (PositionAnalysis)
  - `featureDelta` (PositionFeatureDelta)

Failure contract:

- Added explicit discriminated failure for engine invariant disagreement:
  - `{ ok: false, reason: "engine-transition-failed", message }`
- Trigger condition:
  - a move returned by `getLegalMoves(...)` fails when applied by `applyMove(...)`
- Behavior:
  - no legal outcome is silently dropped

Complete legal-move input boundary:

- Outcome analysis always starts from complete legal engine moves:
  - `getLegalMoves({ position, player, roll: dice })`
- No staged-prefix or partial-selection analysis is performed.

Engine move-application API used:

- Applied each legal move through existing engine API:
  - `applyMove(position, player, dice, move)`
- No custom checker-transition logic was added in analysis package.

Canonical move metadata behavior:

- Preserves canonical move metadata per outcome:
  - step order
  - step kind
  - `fromPoint` and `toPoint`
  - `dieValue`
  - `dieIndex`
  - `hitsBlot` and optional `hit` payload
- Moves are not reconstructed from notation.

Coordinate-equivalent move behavior:

- Distinct canonical moves remain separate outcomes.
- No deduplication by coordinates or resulting position was introduced.

Empty legal-move behavior:

- Returns `{ ok: true, analysis }` with `analysis.outcomes = []` when no legal checker move exists.
- No fake pass move is produced.

Result ordering policy:

- Preserves engine `getLegalMoves(...)` output order.
- Ordering is documented as non-strategic and not ranking.

Resulting-position behavior:

- `positionAfter` is copied from successful engine application output.
- `analysisAfter` and `featureDelta` are computed from that exact resulting position.
- Inputs are non-mutated.
- Outcome objects use structural cloning to avoid unintended shared mutable nested references.

Composition with existing factual analysis:

- Reuses existing factual APIs:
  - `analyzePosition(position)`
  - `comparePositions(before, after)` semantics via shared delta builder
- No evaluator/equity logic added.

Delta sign convention:

- All numeric deltas remain `after - before`.

Web panel behavior:

- Added sandbox panel: `Legal Move Outcomes`.
- Visibility states:
  - opening unresolved: explanatory unavailable message
  - game complete: no further analysis message
  - dice not assigned: roll/assign prompt
  - no legal move: `No legal checker move.`
- Outcome rows include:
  - readable move label (shared formatter)
  - canonical step count
  - concise factual deltas
  - contact/race transition summary
- One outcome can be selected for expanded detail:
  - canonical step metadata
  - resulting relationship and player factual features
  - factual deltas
  - resulting position snapshot summary

Outcome preview behavior:

- Selected outcome activates read-only main-board preview mode.
- Banner label: `Move Outcome Preview`.
- While preview is active:
  - checker interaction disabled
  - staged selection disabled
  - roll/pass/manual dice controls disabled
- Preview does not:
  - mutate committed `GameState`
  - append turn history
  - persist preview state in durable snapshot
- `Return to Current Game` exits preview and returns to committed board context.

History/outcome inspection coordination:

- Read-only modes are mutually exclusive.
- Entering outcome preview exits history inspection.
- Entering history inspection exits outcome preview.
- New Game clears both.
- Successful import clears both.
- Existing history behavior remains otherwise unchanged.

Staged-selection policy:

- Outcome analysis always uses committed position + current turn dice.
- Staged prefix selection does not alter legal outcome analysis input.
- Entering outcome preview clears staged selection.
- Returning from preview restores committed game state and does not restore prior staged prefix.

Persistence impact:

- Durable snapshot format and schema unchanged.
- Preview/selection UI state remains transient and excluded from persistence payload.

Engine API impact:

- None.
- No engine public APIs or legality semantics were changed.

Move-legality impact:

- None.
- `getLegalMoves(...)`, `applyMove(...)`, `applyGameMove(...)`, `passTurn(...)`, and `previewMovePrefix(...)` semantics unchanged.

Tests added/updated:

- Analysis package (`packages/backgammon-analysis/test/analysis.test.ts`):
  - legal outcome count matches `getLegalMoves(...)`
  - empty legal-move state returns empty outcomes
  - non-mutation for input position and dice
  - canonical move metadata and die-index preservation
  - distinct canonical-move preservation
  - direct parity checks:
    - `positionAfter` vs direct `applyMove(...)`
    - `analysisAfter` vs direct `analyzePosition(...)`
    - `featureDelta` vs direct `comparePositions(...)`
  - hit/bar delta verification
  - point-making and blot delta checks
  - bar-entry, bearing-off, same-checker-twice, black-direction coverage
  - relationship transition coverage
  - repeatability and cross-outcome reference-isolation check
  - invariant-failure contract exposure check
- Web app (`apps/web/src/App.test.tsx`):
  - pre-dice panel state
  - opening unresolved/tie panel state
  - opening and ordinary-turn outcome row presence
  - outcome row count parity with complete legal move count
  - no-legal-move state messaging
  - readable outcome labels and factual deltas
  - no strategic labels in outcomes panel
  - selectable outcome details rendering
  - preview label and lock behavior
  - preview non-mutation and return behavior
  - preview/history mutual exclusion
  - history-disabled outcomes message
  - New Game/import clearing preview
  - completed-game panel behavior

Validation performed:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test`
- `CI=1 pnpm --filter @backgammon-trainer/web test`
- `CI=1 pnpm --filter @backgammon-trainer/web build`
- `CI=1 pnpm check`
- `git diff --check`
- `git status`

Deviations from plan:

- Added Vite/Vitest aliases for `@backgammon-trainer/backgammon-analysis` to source entry to match existing in-repo package alias style used for domain/engine and avoid stale dist import behavior during app tests/dev.
- Added a local deterministic move fingerprint helper in web layer for stable selection keys; canonical `Move` remains authoritative.

Capabilities intentionally deferred:

- move ranking
- evaluator/equity integration
- best-move recommendations
- mistake classification
- coaching prose
- AI provider integration
