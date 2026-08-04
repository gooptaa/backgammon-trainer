# ADR 0012: Move-Quality Labels Are Assigned by Versioned Deterministic Coaching Policy

- Status: Accepted
- Date: 2026-08-03

## Context

The coaching experience now supports historical move-review and full-game review over committed turns with evaluator-ranked evidence. Users ask outcome-oriented questions such as:

- Was that a mistake?
- How bad was that move?
- Which were my biggest mistakes?

Without an explicit authority boundary, move-quality labels could be inferred inconsistently by evaluator adapters or language-model prose, causing drift and unverifiable claims.

## Decision

Move-quality labels are assigned in coach-domain orchestration by a centralized deterministic policy, not by evaluator adapters and not by language-model output.

Policy commitments:

- Policy identity and version are explicit in evidence.
- Classification uses normalized `lossFromBest` from ranked evaluator analysis.
- Supported labels are currently:
  - `best`
  - `reasonable`
  - `mistake`
  - `major mistake`
- Unclassifiable decisions are represented as `unclassified` with deterministic reasons.
- Current-position recommendations do not receive move-quality labels because no committed move exists yet.

Eligibility commitments:

- Classification applies only to committed checker-play decisions.
- Classification requires complete, trustworthy, non-fixture evaluator coverage.
- Played move must be evaluator-covered and score semantics must be valid for the active policy.
- Partial coverage, fixture provenance, missing/failed/unavailable analysis, unsupported turn kinds, and invalid score semantics fail closed to `unclassified`.

Authority commitments:

- Engine remains legal-move and turn-authority source.
- Analysis and evaluator layers remain factual scorers.
- Coach policy converts factual ranked evidence into pedagogical labels.
- The model explains labels and limitations but does not strengthen, weaken, replace, or invent labels.

## Consequences

- Move-quality labels become auditable and reproducible for a committed turn.
- Product behavior remains deterministic across providers and prompt variants.
- Future threshold/policy changes can be versioned without rewriting historical factual evidence.
- Full-game review can aggregate bounded classification counts while preserving ownership and evidence limits.

## Rejected alternatives

### Evaluator adapters emit mistake labels directly

Rejected because evaluator output should remain factual and provider-neutral, not product-policy semantics.

### Language model decides move-quality labels from evidence

Rejected because model inference can drift and cannot enforce deterministic boundary conditions.

### Persist classification labels into analysis-session records

Rejected for now because analysis-session should remain raw evaluator-linked evidence. Coach can derive labels deterministically at request time with explicit policy version.

## Stability commitment

This boundary is expected to remain stable across:

- evaluator provider changes
- model provider changes
- retrieval implementation changes

Threshold values and label taxonomy may evolve in future policy versions while preserving explicit version identity and fail-closed eligibility behavior.
