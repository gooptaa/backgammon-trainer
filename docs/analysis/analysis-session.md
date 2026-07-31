# Analysis Session Model

## Purpose

`AnalysisSession` is the durable interpretation layer for committed checker-play decisions.

It intentionally separates:

- deterministic rules state and turn history (`GameSnapshot`)
- evaluator-attributed analysis records (`AnalysisSession`)

The session package is domain-only orchestration and validation. It does not evaluate moves and it does not persist data to storage.

## Decision-Before-Move Semantics

One `AnalysisRecord` models one committed checker-play decision:

- ranked analysis describes the pre-move decision context
- committed turn history proves what was actually played
- chosen move is linked to canonical engine move identity

The package does not infer decisions from UI staging or notation text.

## Public APIs

Serialization and parse:

- `serializeAnalysisSession(...)`
- `parseAnalysisSession(...)`
- `encodeAnalysisSession(...)`
- `decodeAnalysisSession(...)`
- `summarizeAnalysisSession(...)`

Builder/orchestration:

- `createAnalysisSession(...)`
- `createAnalysisRecord(...)`
- `appendAnalysisRecord(...)`
- `reconcileAnalysisSession(...)`

Deterministic identities:

- `getAnalysisSessionGameReference(...)`
- `getDecisionPositionFingerprint(...)`

## Session Creation Contract

`createAnalysisSession(...)` creates an empty immutable session bound to one game reference.

Requirements enforced:

- explicit `sessionId`
- explicit timestamp input (no implicit wall-clock inside core logic)
- strict metadata validation
- strict game snapshot validation
- deterministic game reference derivation or explicit caller-supplied reference
- `createdAt === updatedAt`

Created sessions are immediately parse-valid under `parseAnalysisSession(...)`.

## Game Identity Strategy

Current v1 strategy is a deterministic game reference string:

- optional explicit external `gameReference` is accepted
- otherwise derive from a canonical game-origin payload
- origin payload includes deterministic origin position and origin active player

This is stable across later snapshots from the same committed game lineage.

Known limitation:

- two unrelated games that share the same origin payload can collide

Future persistent game IDs can remove this ambiguity without changing engine rules semantics.

## Position Identity Strategy

Decision position identity is deterministic and versioned:

- `decision-position-v1` algorithm label
- includes all points, bar counts, borne-off counts
- includes player on roll
- includes exact decision dice tuple order
- excludes UI orientation, evaluator output, and presentation state

The implementation calls this a `fingerprint` rather than a security hash.

## Record Construction Contract

`createAnalysisRecord(...)` consumes trusted artifacts:

- session
- snapshot before turn
- snapshot after turn
- committed canonical `TurnRecord`
- completed ranked analysis payload

It validates:

- session validity
- game-reference consistency across session and snapshots
- committed turn presence in snapshot history
- pre-turn and post-turn position consistency
- player and dice consistency
- ranked analysis integrity and factual pre-turn position match
- chosen move legality and canonical fingerprint match
- chosen outcome resulting position match
- evaluator metadata and score-scale compatibility

## Pass and No-Legal-Move Semantics

Pass records are supported when a canonical `TurnRecord` has `outcome.kind = "pass"`.

Rules:

- ranked analysis must be `kind: "no-legal-moves"`
- chosen move must be `null`
- no fake move is created
- pre/post state transition remains validated

A move-turn paired with no-legal-moves analysis, or a pass paired with evaluated-move analysis, is rejected.

## Evaluated vs Unevaluated Chosen Moves

For evaluated records:

- chosen move may appear in scored ranked rows
- chosen move may appear in explicit unevaluated rows for partial coverage

Missing score is preserved as missing. It is never coerced to zero or synthetic rank values.

## Evaluator Consistency Policy (v1)

Within one session, evaluated records must remain compatible with session metadata and with each other:

- provider
- provider version
- adapter version
- score-scale kind/unit
- deterministic structural settings equality

The package compares settings by canonical JSON structure, not object identity.

## Turn Numbering Policy

v1 now uses a sparse session policy:

- record turn numbers must be strictly ascending
- duplicates are not allowed
- missing turns are allowed

This intentionally supports partial selective analysis coverage.

## Append Semantics and Idempotency

`appendAnalysisRecord(...)` is immutable and fail-closed.

Behavior:

- validates session and record
- enforces same-game and evaluator compatibility
- requires strictly increasing turn order
- preserves `sessionId` and `createdAt`
- updates `updatedAt`

Idempotency policy:

- appending an exactly identical existing turn record returns successful no-op (`idempotent: true`)
- appending a different record for an already-recorded turn fails with `conflicting-record`

## Reconciliation Contract

`reconcileAnalysisSession(...)` validates session content against a supplied deterministic snapshot without mutation.

It reports:

- `current` when analyzed-turn count equals committed-turn count
- `game-advanced` when session remains valid but snapshot has additional committed turns

Failure reasons include game mismatch and record-to-history inconsistencies (missing turn, committed move mismatch, pre/post position mismatch, invalid turn fields).

## Annotation and Tag Policy

Builder and parser enforce canonical string metadata policy:

- trim values
- reject empty values
- deduplicate exact duplicates (first-seen order preserved)

No coaching prose or strategic labels are inferred.

## Immutability and Determinism

All public APIs are non-mutating and return detached values.

Given identical inputs, output is structurally deterministic:

- no random IDs
- no hidden wall-clock reads
- no locale-dependent formatting
- stable canonical ordering for structural comparisons

## Versioning and Compatibility

`AnalysisSession` versioning remains independent of `GameSnapshot` versioning.

Current envelope:

- `format: backgammon-trainer-analysis-session`
- `version: 1`

Round-trip compatibility is maintained through:

- `encodeAnalysisSession(...)`
- `decodeAnalysisSession(...)`

## Boundaries

In scope:

- deterministic builder and validation logic
- immutable session updates
- reconciliation checks

Out of scope:

- evaluator invocation or orchestration
- browser storage/local storage/IndexedDB
- backend persistence adapters
- coaching prose, mistake labels, or lesson generation

## Next Integration Step

Host layers can now safely orchestrate:

1. factual + ranked analysis generation
2. committed turn capture
3. `createAnalysisRecord(...)`
4. `appendAnalysisRecord(...)`
5. durable storage in a future persistence boundary

without manually assembling nested session records.

## Web In-Memory Capture (Current Milestone)

The web sandbox now orchestrates an in-memory `AnalysisSession` lifecycle for development fixture analysis.

Lifecycle summary:

1. derive a deterministic decision key for the live committed pre-turn state
2. request fixture-ranked analysis for that exact live decision
3. retain completed ranked analysis as pending decision state
4. wait for canonical committed `TurnRecord` from engine-authoritative commit paths
5. build record through `createAnalysisRecord(...)`
6. append through `appendAnalysisRecord(...)`
7. expose factual read-only inspection through the Analysis Session panel

Race policy (current):

- capture only when analysis completed before the turn was committed
- if commit happens first, gameplay continues and no late capture is appended
- no historical retry is started for prior turns in this milestone

Stale-result protection:

- evaluator responses are accepted only when request identity and live decision key still match
- stale responses are ignored and cannot create analysis records

Session lifecycle in web:

- one in-memory session per active game lineage
- new lineage (new game or imported different snapshot) creates a new empty session
- restored startup snapshots create a new empty in-memory session referencing restored lineage
- restored historical committed turns are not backfilled as analyzed records
- sparse record turn numbers are expected and valid

Pass and final-turn behavior:

- canonical pass records are captured only when pending analysis kind is `no-legal-moves`
- terminal winning turns are captured with pre-terminal and terminal snapshots when pending analysis exists

Fixture provenance and UI language:

- fixture provider metadata remains explicit in session metadata and records
- UI labels remain factual (`Fixture Rank`, `Fixture Score`, `Fixture Loss`)
- fixture warning is explicit: `Development fixture scores - not strategic evaluation.`

Persistence boundary:

- analysis sessions remain memory-only in this milestone
- sessions are not added to `GameSnapshot`, local storage, import/export payloads, or startup restore payloads
- pending decision state, evaluator status, and capture failures are transient and not serialized
