# Backgammon Analysis

## Purpose

Provide deterministic factual analysis over engine-authoritative legal moves and position state, plus a provider-neutral evaluator contract for ranked move interpretation.

## Responsibilities

- Compute factual position features and deltas.
- Analyze complete legal move outcomes for a specific player/dice decision.
- Define and validate provider-neutral evaluator request/response contracts.
- Produce deterministic ranked legal-move analysis from validated evaluator data.
- Provide canonical move fingerprinting for cross-layer identity matching.

## Allowed Dependencies

- `@backgammon-trainer/backgammon-domain`
- `@backgammon-trainer/backgammon-engine`

## Forbidden Dependencies

- `@backgammon-trainer/web`
- `@backgammon-trainer/backgammon-analysis-session`
- React, DOM/browser APIs, storage adapters, and Node process adapters

## Public API

- Root export (`@backgammon-trainer/backgammon-analysis`): factual analysis, evaluator contracts, ranking APIs, and canonical move fingerprinting.
- Fixture subpath (`@backgammon-trainer/backgammon-analysis/fixture`): deterministic synthetic evaluator for tests and development-only preview.

Why these exports are public:

- Root APIs are the stable factual/evaluator boundary consumed by web and adapter layers.
- Fixture APIs are explicitly public to enable deterministic testing without leaking production evaluator assumptions.

## Non-goals

- Legality or move-application authority (owned by engine).
- Strategic labels, coaching prose, or lesson generation.
- GNU process execution (owned by GNU adapter package).
- Analysis session persistence modeling (owned by analysis-session package).

## Future Roadmap

- Additional evaluator adapters behind the same contract.
- Broader score-scale and coverage diagnostics where justified.
- Richer factual feature sets that remain deterministic and non-prescriptive.

## Current-position coaching boundary

This package does not decide coaching recommendation claims.

- It provides deterministic legal-move outcomes and evaluator-attributed ranking data.
- Recommendation-support decisions remain in `@backgammon-trainer/backgammon-coach` so this package stays factual and provider-neutral.
- Pedagogical move-quality labels (for example `mistake` or `major mistake`) remain in coach-domain policy, not evaluator facts.
