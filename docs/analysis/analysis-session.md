# Analysis Session Model

## Motivation

Evaluator outputs are not deterministic game state. They depend on:

- evaluator provider/version
- adapter behavior
- score-scale semantics
- analysis settings and future algorithms

To preserve trust boundaries, committed gameplay state and interpreted analysis state are versioned separately.

## GameSnapshot Separation

Canonical distinction:

- `GameSnapshot` = deterministic state
- `AnalysisSession` = versioned interpretation

`GameSnapshot` remains authoritative for:

- committed board state
- turn history
- opening flow state

`AnalysisSession` remains authoritative for:

- evaluator-attributed ranked move analysis records
- analysis metadata/versioning
- chosen-move context and future annotations

## Session Lifecycle

Initial lifecycle for this milestone:

1. Build analysis records for committed positions from a known game snapshot reference.
2. Validate and serialize immutable analysis-session payloads.
3. Decode/parse and validate analysis-session payloads on load.

Out of scope in this milestone:

- browser persistence wiring
- backend persistence services
- import/export UI

## Public Model

Primary contracts:

- `AnalysisSession`
- `AnalysisRecord`
- `AnalysisMetadata`
- `AnalysisSummary`

Each `AnalysisRecord` represents exactly one committed position analysis and includes:

- turn number
- player
- position hash (future-friendly)
- snapshot reference
- evaluator provenance
- ranked move analysis
- chosen move
- optional annotations and tags

## Versioning

Analysis-session serialization is versioned independently from game snapshots.

Current envelope constants:

- format: `backgammon-trainer-analysis-session`
- version: `1`

Serialization APIs:

- `serializeAnalysisSession(...)`
- `parseAnalysisSession(...)`
- `encodeAnalysisSession(...)`
- `decodeAnalysisSession(...)`

## Validation Rules

Parsing rejects malformed input and does not repair payloads.

Validation includes:

- envelope format/version
- metadata fields and timestamp shape
- evaluator provenance structure
- ordered records with contiguous turn numbering
- duplicate and out-of-order turn rejection
- ranked analysis integrity (canonical move mapping, ranking/loss conventions, coverage semantics)
- chosen-move consistency with canonical factual outcomes

## Evaluator Provenance

Records preserve evaluator provenance explicitly:

- provider
- providerVersion
- adapterVersion
- JSON-safe settings

Metadata also records evaluator provider/version and score scale to ensure stable interpretation across session reload.

## Future AI Usage

This model intentionally stores machine-readable analysis records without prose so future AI layers can consume durable, versioned facts.

Planned future consumers include:

- explanation generation
- strategic pattern extraction
- personalized lesson derivation

## Future Lesson Generation

Future lesson generation can read analysis sessions without mutating deterministic game snapshots.

Potential lesson inputs from this model:

- ranked move losses from best
- repeated tagged motifs
- turn-indexed chosen-move decisions

## Future Mistake Tracking

Mistake classification is deferred, but the model is prepared for it through:

- stable record identity (turn + position hash)
- preserved ranked outcomes and coverage
- optional tags and annotations

No mistake labels are produced in this milestone.
