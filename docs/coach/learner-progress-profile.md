# Learner Progress Profile (Local, Deterministic)

## Scope

This profile provides deterministic cross-game progress evidence for conversation questions such as:

- How am I doing?
- Show my recent progress.
- How many mistakes have I made lately?
- Am I improving?

It does not provide strategic habit diagnosis, skill ratings, or personalized lesson generation.

## Ownership authority

Learner ownership is explicit per lineage and separate from checker-side semantics:

- `white`
- `black`
- `both`
- `unknown`

Only `white` and `black` allow learner attribution.

`unknown` and `both` prevent learner observation ingestion.

Changing ownership does not relabel previously ingested observations.

## Observation eligibility

A learner observation is eligible only when all are true:

- committed turn outcome is checker-play `move`
- lineage identity is present
- ownership is authoritative (`white` or `black`)
- acting side matches learner ownership
- canonical played move fingerprint is available

Excluded from learner observations:

- opponent turns
- non-checker actions (`pass`)
- staged/uncommitted selections
- fixture demonstrations
- model-generated judgments

## Observation identity and reconciliation

Canonical identity (v1) uses:

- lineage id
- turn number
- acting side
- played move fingerprint
- classification policy id/version

Reconciliation behavior:

- repeated ingestion is idempotent
- duplicate identity does not increase counts
- compatible supersession can replace an earlier unclassified observation with classified evidence
- different lineage ids remain distinct even for identical board positions

## Classification policy compatibility

Current policy:

- id: `deterministic-loss-from-best`
- version: `1.0.0`

Aggregation mode in this milestone:

- `current-policy-only`

Incompatible policy observations are preserved in storage and excluded from active aggregates.

## Aggregation

The profile exposes deterministic aggregates for:

- full compatible profile
- recent rolling window (20 eligible learner observations)

Counts include:

- `best`
- `reasonable`
- `mistake`
- `major mistake`
- `unclassified`
- total eligible
- total classified
- best+reasonable combined
- games represented
- classified coverage ratios

## Trend behavior

Trend evidence is conservative and deterministic.

Trend status is `supported` only when:

- recent and preceding windows are non-overlapping
- policy semantics are compatible
- each window has sufficient classified evidence

Otherwise trend is `insufficient-evidence` with explicit reason.

No ratings, causal claims, or strategic diagnoses are produced.

## Persistence and recovery

Storage is local-first browser storage in this milestone.

- schema is explicitly versioned
- reads validate untrusted data
- malformed profile data fails safe to fresh profile state
- unsupported future profile versions are not rewritten
- gameplay remains available if storage fails

## Clear and privacy

Profile clear is explicit (`Clear Learner Profile`).

Privacy notes:

- profile data is local-only in this milestone
- profile data is not sent to evaluator routes
- profile data is included in model requests only for explicit progress-profile questions
- profile data is not an authentication mechanism
