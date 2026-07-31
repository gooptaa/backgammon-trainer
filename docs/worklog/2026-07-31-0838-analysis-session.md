# Analysis Session Model and Persistence Foundation

Timestamp: 2026-07-31-0838

Previous worklog: docs/worklog/2026-07-31-0714-gnubg-adapter.md

Goal:

Introduce a first-class, versioned analysis-session domain model that is independent from deterministic game snapshots, with strict serialization/parse APIs and fail-closed validation.

Package created:

- package directory: `packages/backgammon-analysis-session`
- package name: `@backgammon-trainer/backgammon-analysis-session`

Dependency direction:

- `@backgammon-trainer/backgammon-engine` -> `@backgammon-trainer/backgammon-analysis` -> `@backgammon-trainer/backgammon-analysis-session` -> future backend persistence -> future web persistence
- engine has no dependency on analysis-session

Public APIs:

- `ANALYSIS_SESSION_FORMAT`
- `ANALYSIS_SESSION_VERSION`
- `serializeAnalysisSession(session)`
- `parseAnalysisSession(input)`
- `encodeAnalysisSession(session)`
- `decodeAnalysisSession(text)`
- `summarizeAnalysisSession(session)`

Public model contracts:

- `AnalysisSession`
- `AnalysisRecord`
- `AnalysisMetadata`
- `AnalysisSummary`
- `ParseAnalysisSessionResult`
- `SerializedAnalysisSessionV1`

Serialization and parsing:

- Added versioned envelope:
  - `format: backgammon-trainer-analysis-session`
  - `version: 1`
- Added deterministic JSON encode/decode entry points.
- Added strict parse failure reasons:
  - `invalid-json`
  - `wrong-format`
  - `unsupported-version`
  - `invalid-structure`
  - `invalid-domain-state`

Validation rules implemented:

- envelope format/version checks
- timestamp validity and monotonicity (`updatedAt >= createdAt`)
- metadata required fields and score-scale validity
- game snapshot reference required fields
- evaluator provenance shape and JSON-safe settings
- evaluator provenance provider/version consistency against metadata
- record ordering with contiguous turn numbering from `1`
- duplicate/out-of-order turn rejection
- ranked-analysis integrity checks including:
  - canonical move fingerprint consistency
  - ranked/unevaluated moves must come from factual outcomes
  - no duplicate ranked or unevaluated fingerprints
  - complete-coverage must score all factual outcomes
  - partial-coverage must score at least one move when factual outcomes exist
  - deterministic score-descending then fingerprint ordering
  - dense ranking validity
  - `lossFromBest` integrity (`0` for best, exact `best - score` for each row)
- chosen-move validity:
  - must be null for `no-legal-moves`
  - must be present and part of factual outcomes for `evaluated`
- optional annotations/tags must be non-empty string arrays

Versioning:

- analysis-session versioning is independent from game snapshot versioning
- no reuse of `GameSnapshot` format/version identifiers

Relationship to `GameSnapshot`:

- `GameSnapshot` remains deterministic committed state and history
- `AnalysisSession` is a versioned interpretation with evaluator provenance and ranked outcomes
- analysis-session references game snapshot metadata and turn-position references; it does not replace or mutate snapshot semantics

Documentation updates:

- Added `docs/analysis/analysis-session.md` with motivation, lifecycle, versioning, evaluator provenance, future AI/lesson/mistake-tracking boundaries.
- Updated `docs/architecture/overview.md`:
  - added analysis-session boundary
  - added dependency direction and snapshot-vs-analysis separation
- Updated `packages/backgammon-analysis/README.md`:
  - clarified that durable analysis persistence modeling belongs to analysis-session package

Engine impact:

- none
- no engine exports or legality/transition semantics changed

Analysis impact:

- existing analysis package contracts unchanged
- analysis-session package consumes ranked-analysis and provenance as immutable inputs

Web impact:

- none
- no persistence UI, no save/load dialogs, no local storage integration, no automatic analysis invocation changes

Tests added:

- `packages/backgammon-analysis-session/test/analysisSession.test.ts`
- coverage includes:
  - round-trip serialization and decode/encode
  - version validation
  - malformed envelope rejection
  - duplicate turn rejection
  - out-of-order turn rejection
  - metadata validation
  - ranked-analysis integrity rejection
  - evaluator provenance preservation
  - evaluator output preservation
  - immutability/reference detachment
  - deterministic serialization
  - invalid JSON decode rejection
  - summary aggregation behavior

Deferred capabilities (intentionally out of scope):

- local storage integration
- backend/database/cloud persistence
- import/export UI
- evaluator invocation orchestration
- GNU integration changes
- AI prose/coaching
- lesson generation
- mistake classification
- user profiles
- spaced repetition

Validation performed:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test`
- `CI=1 pnpm --filter @backgammon-trainer/web test`
- `CI=1 pnpm --filter @backgammon-trainer/web build`
- `CI=1 pnpm check`
- `git diff --check`
- `git status --short`

Result:

- all listed validation commands passed for this milestone before commit
