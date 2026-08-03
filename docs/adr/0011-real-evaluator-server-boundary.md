# ADR 0011: Real Evaluator Processes Run Behind Trusted Server Boundary

- Status: Accepted
- Date: 2026-08-03

## Context

Backgammon Trainer already separates deterministic engine legality from evaluator ranking and from coach-language generation.

The next step adds real GNU Backgammon checker-play evaluation. Without a strict boundary, browser code could gain process execution controls, command injection risk could increase, and evaluator-specific behavior could leak into provider-neutral recommendation and coaching layers.

## Decision

Real evaluator process execution stays in trusted Node/server composition.

- Browser code invokes provider-neutral evaluator routes only.
- Browser code cannot set executable paths or process flags.
- Engine-generated legal moves remain canonical inputs to evaluator scoring.
- GNU output is mapped back to canonical legal move fingerprints; unmatched output fails closed.
- Recommendation authority remains in coach-domain logic and stays evaluator-provider-neutral.

## Consequences

Positive:

- Engine remains authoritative for legality and transitions.
- Evaluator supplies position-specific scores but does not own game rules.
- Coach recommendation policy stays stable across evaluator providers.
- Browser/Node runtime separation is preserved.

Tradeoffs:

- Server must own availability detection, timeout bounds, and process-failure mapping.
- Real evaluator status can be configured but unavailable; UI must communicate this clearly.

## Rejected alternatives

### Browser-managed GNU execution

Rejected because browsers cannot safely host this process boundary and should not own executable configuration.

### GNU-specific recommendation path in coach layer

Rejected because recommendation authority must remain provider-neutral and based on evaluator contract semantics.

### Treat evaluator move text as legal authority

Rejected because legal move identity must remain engine-authoritative; evaluator moves are advisory until matched to canonical legal outcomes.

## Stability commitment

The following remain stable as additional real evaluators are added:

- provider-neutral evaluator contract in analysis package
- canonical legal-move fingerprint grounding
- coach recommendation-authority policy
- browser/Node separation and trusted server execution boundary
