# ADR 0010: Recommendation Authority Is Determined Before Language Generation

- Status: Accepted
- Date: 2026-08-03

## Context

Current-position coaching questions require a clear boundary between:

- deterministic legal-move facts from engine/analysis
- evaluator-attributed ranking evidence
- language-model explanation

If the model chooses moves independently, it can overstate certainty, invent unsupported rankings, or treat synthetic fixture output as authoritative strategy.

## Decision

Determine recommendation support in coach-domain orchestration before model generation.

- `@backgammon-trainer/backgammon-coach` computes `recommendationSupport` in evidence for current-position requests.
- Recommendation support can be:
  - supported from complete trustworthy evaluator coverage (`authoritative`)
  - supported as strongest-evaluated only when evaluator coverage is partial
  - not supported for fixture evaluator provenance
  - not supported when evaluator evidence is missing
  - not supported for non-decision and no-legal-move states
- Any supported recommendation must map to canonical legal moves from engine-derived legal outcomes.
- Prompt construction must include recommendation-support state and explicit constraints that evaluator ranking authority comes from supplied evidence, not model inference.

## Consequences

- The model explains supplied recommendation authority instead of inventing it.
- Complete, partial, fixture, and missing evaluator states remain distinct in user-visible behavior.
- Fixture ranking can still support development inspection while being blocked from authoritative move claims.
- Provider changes do not alter recommendation authority rules because they are resolved before provider-specific completion.

## Rejected alternatives

### Let the model infer the strongest move directly from factual outcomes

Rejected because it weakens grounding and can produce unsupported strategic claims.

### Treat fixture evaluator ranking as authoritative in production wording

Rejected because fixture output is synthetic and unsuitable for expert move claims.

### Move recommendation-support logic into engine or analysis packages

Rejected because recommendation authority is a coaching-domain interpretation rule; engine remains legal authority and analysis remains factual.

## Stability commitment

This boundary should remain stable across:

- model provider changes
- evaluator provider additions
- future extension to last-move review and full-game review

Implementation details (selection heuristics, UI wording, retrieval strategy) may evolve without changing the core authority rule.
