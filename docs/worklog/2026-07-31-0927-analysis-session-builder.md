# Analysis Session Builder and Committed-Turn Recording

Timestamp: 2026-07-31-0927

Previous worklog: docs/worklog/2026-07-31-0838-analysis-session.md

Goal:

Add a deterministic, fail-closed analysis-session orchestration layer for session creation, committed-turn record construction, immutable append, and reconciliation against committed game history snapshots.

Packages changed:

- packages/backgammon-analysis-session

Public APIs added:

- createAnalysisSession(...)
- createAnalysisRecord(...)
- appendAnalysisRecord(...)
- reconcileAnalysisSession(...)
- getAnalysisSessionGameReference(...)
- getDecisionPositionFingerprint(...)

Existing APIs retained and compatible:

- ANALYSIS_SESSION_FORMAT
- ANALYSIS_SESSION_VERSION
- serializeAnalysisSession(...)
- parseAnalysisSession(...)
- encodeAnalysisSession(...)
- decodeAnalysisSession(...)
- summarizeAnalysisSession(...)

Session creation contract:

- explicit sessionId input is required
- explicit createdAt input is required
- metadata is strictly validated
- game snapshot is validated through engine snapshot parse boundary
- game reference is deterministic and explicit in session.gameSnapshotReference
- createdAt and updatedAt are initialized to the same value
- created session is immediately parse-valid

Game identity strategy:

- Added deterministic game reference helper: getAnalysisSessionGameReference(...)
- Supports explicit caller-supplied gameReference override
- Default derivation uses a stable canonical origin payload (origin position + origin active player)
- Stored in session.gameSnapshotReference.gameReference
- Stable across later snapshots from the same committed game lineage

Known game-identity limitation:

- Without an engine-level persistent game ID, distinct games with identical origin payload can collide
- This milestone intentionally does not modify engine snapshot schema

Position identity strategy:

- Added getDecisionPositionFingerprint(...) with algorithm label decision-position-v1
- Includes points, bar, borne-off, player on roll, and exact dice tuple
- Excludes UI state, orientation, and evaluator output
- Deterministic canonical JSON structural encoding is used

Analysis-record construction contract:

- createAnalysisRecord(...) consumes session + snapshotBeforeTurn + snapshotAfterTurn + committedTurn + rankedAnalysis
- validates snapshot-to-session game-reference match
- validates committed turn membership in snapshotAfterTurn history
- validates pre-turn and post-turn position consistency
- validates ranked analysis player/dice/positionBefore coherence
- validates chosen move canonical fingerprint linkage to committed turn
- validates resulting position linkage using factual outcomes
- validates evaluator consistency against session metadata
- validates annotations/tags (trim, reject empty, dedupe, preserve first-seen order)

Committed-turn linking strategy:

- Chosen move is derived from committed TurnRecord canonical move
- Matching uses shared getMoveFingerprint(...)
- Provider notation/rank ordering is never trusted for identity

Chosen-move validation:

- move turns require evaluated ranked analysis and non-null chosenMove
- pass turns require no-legal-moves ranked analysis and null chosenMove
- chosen move must exist in factual outcomes
- chosen move may be scored or explicitly unevaluated in partial coverage

Resulting-position validation:

- For move turns, chosen factual outcome positionAfter must match committed turn positionAfter
- For pass turns, no fake move is created and canonical pass transition is preserved

Evaluated chosen-move behavior:

- If chosen move appears in rankedMoves, evaluated status is preserved
- rank/normalizedScore/lossFromBest values from ranked analysis remain unchanged

Unevaluated chosen-move behavior:

- partial coverage allows chosen move to appear in unevaluatedMoves
- score/rank values are not synthesized

Complete/partial coverage behavior:

- parser integrity checks retained for complete and partial semantics
- complete coverage must cover all factual outcomes
- partial coverage must include at least one scored move when factual outcomes exist

Evaluator consistency policy:

- Session metadata provider/version/scoreScale must match record values
- Evaluated records within one session must share compatible provenance
- Provenance structural settings comparison is deterministic and key-order independent

Turn numbering policy:

- Changed from contiguous 1..N requirement to sparse ascending unique turn numbers
- Missing turns are now allowed intentionally
- Out-of-order or duplicate turn numbers remain invalid

Sparse vs contiguous decision:

- Chosen: sparse sessions
- Reason: supports selective analysis, evaluator unavailability, and future partial lesson workflows
- Versioning: kept as analysis-session format version 1 in this repository milestone (no released durable external compatibility constraint in this branch workflow)

Append contract:

- appendAnalysisRecord(...) validates session and record
- enforces strict increasing append order
- preserves sessionId and createdAt
- updates updatedAt
- returns new detached session
- original session and record are not mutated

Idempotency behavior:

- exact duplicate record append for existing turn => ok true, idempotent true, no session mutation
- different record for existing turn => conflicting-record failure
- no silent replacement

Reconciliation contract:

- reconcileAnalysisSession(...) validates stored records against supplied GameSnapshot
- success returns:
  - current or game-advanced
  - analyzedTurnCount
  - committedTurnCount
- failures include:
  - invalid-session
  - invalid-game-snapshot
  - game-mismatch
  - missing-committed-turn
  - committed-move-mismatch
  - pre-turn-position-mismatch
  - post-turn-position-mismatch
  - record-turn-invalid
- reconciliation is read-only and does not repair data

No-legal-move behavior:

- canonical pass + no-legal-moves analysis is supported
- chosenMove must be null
- pass + evaluated analysis is rejected
- move + no-legal-moves analysis is rejected

Final-turn behavior:

- final committed move records are supported by the same pre-turn/committed/outcome linkage checks
- reconciliation does not require nonexistent future turns

Annotation/tag behavior:

- trim whitespace
- reject empty entries
- dedupe exact duplicates while preserving first-seen order
- no strategic interpretation is added

Immutability guarantees:

- input snapshots/session/record artifacts are not mutated
- outputs are detached via structured cloning/canonical reconstruction

Determinism guarantees:

- no random ID generation inside builders
- no hidden Date.now() usage inside orchestration APIs
- canonical structural JSON ordering is used where equality/fingerprint comparison is required

Serialization compatibility:

- builder-created sessions parse through parseAnalysisSession(...)
- encode/decode round-trip remains valid and deterministic
- strict parse validation remains fail-closed

Engine API impact:

- none
- no engine legality, move application, turn-record shape, snapshot schema, or pass behavior changes

Shared analysis API impact:

- none
- no ranking or evaluator contract behavior changes in @backgammon-trainer/backgammon-analysis

GNU adapter impact:

- none

Web impact:

- none
- no UI wiring or persistence behavior changes

Persistence impact:

- none
- no browser/local/backend storage adapters added

Files changed:

- packages/backgammon-analysis-session/src/index.ts
- packages/backgammon-analysis-session/test/analysisSession.test.ts
- packages/backgammon-analysis-session/README.md
- docs/analysis/analysis-session.md
- docs/architecture/overview.md
- docs/worklog/2026-07-31-0927-analysis-session-builder.md

Tests added/updated:

- createAnalysisSession contract and determinism tests
- decision position fingerprint determinism and variance tests
- analysis record construction and mismatch failure tests
- partial coverage chosen-unevaluated behavior test
- pass/no-legal-move mapping tests
- append immutability, idempotency, and ordering tests
- reconciliation status and failure-contract tests
- parser compatibility and sparse ordering tests
- summary factual aggregation tests

Validation performed:

- CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test

Validation pending for full milestone matrix (to be executed after final documentation/update pass):

- CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test
- CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test
- CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test
- CI=1 pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg test
- CI=1 pnpm --filter @backgammon-trainer/web test
- CI=1 pnpm --filter @backgammon-trainer/web build
- CI=1 pnpm check
- git diff --check
- git status

Deviations from plan:

- Session-game reference derivation cannot be globally unique without engine-level persistent game IDs; deterministic origin-based reference is used with documented limitation

Unresolved limitations:

- global uniqueness of game identity without external game ID
- no migration infrastructure introduced because version remained 1 in this milestone

Capabilities intentionally deferred:

- evaluator invocation orchestration
- browser or backend persistence adapters
- coaching/mistake labels/lesson generation
- import/export UI
- GNU live execution flow changes
