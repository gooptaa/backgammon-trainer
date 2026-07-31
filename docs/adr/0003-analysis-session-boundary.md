# ADR 0003: Analysis Session Is a Separate Versioned Boundary

- Status: Accepted

## Context

Deterministic game snapshots and evaluator-attributed interpretation evolve at different rates. Coupling them would make rule-state persistence brittle and force snapshot migrations for interpretation-only changes.

## Decision

`@backgammon-trainer/backgammon-analysis-session` is a separate domain boundary with independent format/versioning.

- `GameSnapshot` remains deterministic committed game state and turn history.
- `AnalysisSession` stores versioned interpretation linked to committed turns.
- Builders (`createAnalysisSession`, `createAnalysisRecord`, `appendAnalysisRecord`, `reconcileAnalysisSession`) enforce immutable fail-closed validation.
- Web capture in current milestones remains in-memory only; no persistence schema merge was introduced.

## Consequences

- Interpretation schema can evolve without changing deterministic snapshot contracts.
- Sparse analyzed-turn coverage is supported without affecting gameplay persistence.
- Hosts must explicitly orchestrate capture and persistence decisions.

## Alternatives Considered

- Embedding analysis records directly in `GameSnapshot`: rejected due to coupling and migration complexity.
- Allowing ad-hoc session assembly in app code: rejected due to consistency and validation risk.
- Auto-backfilling historical turns on restore: deferred to future persistence/orchestration milestones.
