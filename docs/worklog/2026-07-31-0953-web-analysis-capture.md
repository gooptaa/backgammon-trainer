# Web Analysis Capture Orchestration

Timestamp: 2026-07-31-0953

Previous worklog: docs/worklog/2026-07-31-0927-analysis-session-builder.md

Goal:

Add development-only web orchestration that links completed fixture-ranked live-decision analysis to the next canonical committed turn and appends immutable records into an in-memory `AnalysisSession`, with factual read-only inspection and no persistence changes.

## Previous-milestone closure

Closure gate status before this implementation:

- previous worklog read and audited
- full validation matrix executed successfully
- prior `validation pending` wording removed from prior worklog

Matrix completed at closure:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg test`
- `CI=1 pnpm --filter @backgammon-trainer/web test`
- `CI=1 pnpm --filter @backgammon-trainer/web build`
- `CI=1 pnpm check`
- `git diff --check`
- `git status`

## Files changed

- apps/web/src/App.tsx
- apps/web/src/main.tsx
- apps/web/src/App.test.tsx
- apps/web/src/features/analysis-session/analysisCapture.ts
- apps/web/src/features/analysis-session/analysisCapture.test.ts
- apps/web/src/features/analysis-session/AnalysisSessionPanel.tsx
- apps/web/src/features/analysis-session/AnalysisSessionPanel.module.css
- apps/web/package.json
- apps/web/vite.config.ts
- apps/web/vitest.config.ts
- apps/web/README.md
- docs/analysis/analysis-session.md
- docs/architecture/overview.md
- docs/knowledge/architecture.md
- docs/worklog/2026-07-31-0927-analysis-session-builder.md
- docs/worklog/2026-07-31-0953-web-analysis-capture.md

## Web orchestration location

Primary orchestration and testable helpers:

- `apps/web/src/features/analysis-session/analysisCapture.ts`
- `apps/web/src/features/analysis-session/analysisCapture.test.ts`

Read-only inspection UI:

- `apps/web/src/features/analysis-session/AnalysisSessionPanel.tsx`
- `apps/web/src/features/analysis-session/AnalysisSessionPanel.module.css`

App wiring:

- `apps/web/src/App.tsx`
- `apps/web/src/main.tsx`

## Runtime ID/time injection

Added explicit runtime boundary:

- `createSessionId()`
- `now()`

Behavior:

- browser wiring uses `crypto.randomUUID()` and ISO timestamps at app boundary
- tests inject deterministic runtime values
- no hidden clock/random usage inside analysis-session package

## Session creation policy

Current policy:

- create a fresh in-memory session when analysis capture is enabled and opening is resolved for the active game lineage
- keep one session per lineage
- normal turn progression appends to existing session
- new lineage (new game/imported different game) starts a fresh empty session

## Session metadata construction

Added helper:

- `createFixtureAnalysisSessionMetadata(...)`

Behavior:

- metadata is derived from explicit fixture configuration
- provider/version/scale remain explicit and consistent with fixture-ranked records

## Game reference and decision key strategy

- game lineage uses deterministic `getAnalysisSessionGameReference(...)`
- live decision identity uses `getAnalysisDecisionKey(...)`
- decision key includes game reference, expected turn number, player, dice, and decision-position fingerprint
- UI-only selection/hover/history states do not affect decision key

## Pending analysis contract

`PendingDecisionAnalysis` tracks:

- decision key
- game reference
- expected committed turn number
- exact pre-turn snapshot
- player and dice
- decision-position fingerprint
- ranked analysis payload
- evaluator request id

Pending state is transient only and never serialized.

## Evaluator lifecycle and stale-result protection

- evaluator requests keep per-request identity
- stale responses are ignored when request id no longer matches
- completed success stores pending decision analysis only for the current live decision
- failure/unavailable/invalid states do not create pending records

## Commit-before-analysis race policy

Implemented policy:

- commits are never blocked
- if commit happens before analysis completion, no record is captured
- late result is ignored for capture purposes
- no historical retry is started in this milestone

## Analysis-before-commit flow

- successful completed ranked analysis is retained as pending
- record creation waits for canonical committed `TurnRecord`
- on commit, app calls `createAnalysisRecord(...)` and `appendAnalysisRecord(...)`
- pending analysis clears after capture attempt

## Snapshot-before / snapshot-after capture

Capture path now uses:

- pre-commit canonical game snapshot
- post-commit canonical game snapshot with committed turn history
- canonical committed `TurnRecord`

No staged-preview reconstruction is used.

## Committed-turn linkage and chosen-move authority

- records are created from canonical committed turn data
- chosen move is always derived from committed turn outcome
- preview selection never determines chosen move

## Append/idempotency behavior

- append uses package idempotent API
- exact duplicate append remains safe no-op
- conflicting duplicate for same turn remains rejected

## Failure behavior

Capture failures:

- never roll back committed game moves
- never block gameplay
- never replace valid session with invalid data
- are surfaced as concise bounded diagnostics in the Analysis Session panel

## New game / restore / import behavior

- new game: pending capture and evaluator transient state cleared; new lineage gets fresh empty session
- restore on startup: fresh empty in-memory session for restored lineage; old committed turns are not auto-analyzed
- import: pending capture and evaluator transient state cleared; imported lineage gets fresh empty session; no historical backfill

## Pass behavior

- orchestration supports canonical pass capture contract in helper layer
- no pass-legality behavior changed
- no fake pass move is generated

## Final-turn behavior

- final committed move capture uses same commit-linked snapshot + turn-record flow
- no post-completion evaluator restart is introduced by capture flow

## Inspection panel behavior

Added read-only `Analysis Session` panel with factual fields:

- session status
- fixture warning
- session id and game reference
- record count and analyzed turn numbers
- complete/partial counts
- evaluated/unevaluated chosen-move counts
- evaluator status
- concise last capture failure
- per-record committed move/pass and fixture fields

Strategic recommendation labels are intentionally not shown.

## Persistence exclusion

No persistence changes for analysis sessions:

- no `GameSnapshot` schema changes
- no analysis session local-storage key
- no import/export/session restore payload changes

## Engine / analysis / analysis-session / GNU impacts

- engine API impact: none
- shared analysis API impact: none
- analysis-session package API impact: none
- GNU adapter impact: none
- web package impact: added orchestration, panel, tests, and config wiring only
- move-legality impact: none

## Tests added

- `apps/web/src/features/analysis-session/analysisCapture.test.ts`
  - decision-key determinism and variance
  - no-pending sparse no-op
  - successful capture
  - stale-decision rejection
  - game-reference mismatch rejection
  - idempotent duplicate append behavior
  - encode/decode round trip of captured session
- `apps/web/src/App.test.tsx`
  - analysis-session panel render and fixture warning
  - deterministic runtime session id in panel
  - no-evaluator sparse/usable behavior
  - analysis-before-commit capture path
  - commit-before-analysis late-result omission

## Documentation updated

- `docs/analysis/analysis-session.md`
- `docs/architecture/overview.md`
- `docs/knowledge/architecture.md`
- `apps/web/README.md`

## Validation performed in this milestone

- `CI=1 pnpm --filter @backgammon-trainer/web test`
- `CI=1 pnpm --filter @backgammon-trainer/web build`

Full repository matrix is executed at milestone completion.

## Deviations from plan

- pass-flow capture remains covered at helper contract level; broad UI pass-capture race scenarios were not fully expanded in component tests in this milestone
- session creation is gated to resolved opening state to avoid pre-opening lineage churn from starting-player resolution

## Unresolved limitations

- no durable analysis-session persistence yet
- no historical background analysis retry
- deterministic game reference remains origin-payload based and may collide for distinct games with identical origin payloads

## Capabilities intentionally deferred

- analysis-session local storage
- import/export of analysis sessions
- backend persistence
- live GNU execution in browser
- strategic labels/recommendations/coaching
- historical background evaluator retries
