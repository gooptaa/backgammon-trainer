# ADR 0004: Evaluator Contract Is Provider-Neutral and Fail-Closed

- Status: Accepted

## Context

Evaluation providers differ in score scales, move notation, availability, and runtime behavior. The project needs a stable integration contract that can normalize multiple sources without granting unchecked authority.

## Decision

Evaluator integration uses the provider-neutral `PositionEvaluator` contract in `@backgammon-trainer/backgammon-analysis`.

- Requests include canonical legal outcomes with deterministic move fingerprints.
- Results are validated for coverage, score scale, provenance, and move identity.
- Invalid successful payloads are converted to `invalid-provider-result` failures.
- Ranking is deterministic (score descending, dense tie ranks, fingerprint tie-break).

## Consequences

- New adapters can be added without changing app-facing analysis orchestration.
- Failure reasons remain explicit (`unavailable`, `timeout`, `provider-failed`, etc.).
- Evaluator output cannot silently override deterministic legality or move identity.

## Alternatives Considered

- Provider-specific schemas in app/UI code: rejected due to lock-in and branching complexity.
- Blindly trusting evaluator ordering/ranks: rejected due to non-determinism and ambiguity.
- Heuristic fallback scoring in core: deferred to future, explicit milestone decisions.
