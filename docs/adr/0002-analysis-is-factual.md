# ADR 0002: Analysis Layer Is Factual, Not Prescriptive

- Status: Accepted

## Context

The project adds position/outcome analysis and evaluator-ranked results. Without clear constraints, factual analysis can drift into recommendation labels, coaching verdicts, or heuristic narratives that overstate authority.

## Decision

`@backgammon-trainer/backgammon-analysis` remains a factual deterministic layer.

- It computes position features and legal-move outcomes from engine-authoritative state.
- Evaluator contracts are provider-neutral and score-normalized but do not produce coaching prose.
- Strategic labels and pedagogical recommendations are out of scope for this package.

## Consequences

- Factual APIs stay reusable across fixtures, adapters, and future hosts.
- Evaluator failures do not invalidate legal-outcome analysis.
- Future coaching systems must build on explicit factual/evaluator provenance boundaries.

## Alternatives Considered

- Embedding recommendations directly in analysis package: rejected due to coupling and unverifiable semantics.
- Merging evaluator adapters into analysis core: rejected to preserve provider neutrality.
- Returning only notation text: rejected because canonical move identity would be weakened.
