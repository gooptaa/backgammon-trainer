# ADR 0006: Deterministic Snapshot State Versus Versioned Analysis Interpretation

- Status: Accepted

## Context

The system now persists deterministic game snapshots and separately constructs evaluator-attributed analysis sessions. Contributors need explicit language to avoid conflating these artifacts.

## Decision

Treat `GameSnapshot` and `AnalysisSession` as different artifact classes with different responsibilities.

- `GameSnapshot` captures deterministic state needed to resume play.
- `AnalysisSession` captures versioned interpretation linked to committed turns.
- Snapshot persistence may exist without analysis persistence.
- Analysis capture failures must never roll back deterministic committed gameplay.

## Consequences

- Persistence boundaries are explicit and easier to reason about.
- Replay/resume correctness is isolated from evaluator/version churn.
- Future migration plans can independently target snapshot and analysis schemas.

## Alternatives Considered

- Single envelope with mixed deterministic + interpretation concerns: rejected due to coupling and migration risk.
- Treating analysis as disposable UI state only: rejected because durable interpretation is a long-term goal.
- Persisting analysis first and deriving snapshots later: rejected because gameplay authority is deterministic state.
