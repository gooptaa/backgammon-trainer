# 0014: Deterministic Learner Pattern Policy Boundary

Date: 2026-08-04
Status: Accepted

## Context

The product now persists learner-owned committed move observations and deterministic move-quality classifications. The next step is recurring-skill pattern detection (for example, recurring blot exposure) without violating existing authority boundaries:

- engine owns legal moves and committed-turn identity
- analysis owns factual outcomes
- evaluator owns scored evidence and provenance
- classification policy owns move-quality labels
- language model explains evidence but must not invent facts

If recurring patterns are inferred by the model, product behavior becomes non-deterministic, non-auditable, and potentially contradictory across reloads or providers.

## Decision

Recurring learner patterns are assigned by versioned deterministic coaching detectors grounded in committed factual move comparisons, not by the evaluator or language model.

The deterministic pattern policy lives in `@backgammon-trainer/backgammon-coach` and defines:

- policy id/version
- detector ids and detector versions
- eligibility gates for committed learner decisions
- detector match criteria from factual played-vs-stronger evidence
- aggregation rules for full profile and recent windows
- main-pattern support rules
- explicit tie and insufficient-evidence behavior

Learner-profile observations may include bounded per-decision pattern signals and policy identity so incompatible policy versions remain distinguishable during aggregation.

## Consequences

Positive:

- recurring pattern attribution is deterministic, auditable, and replayable
- model output is constrained to explaining supported pattern evidence
- detector revisions are explicit through policy versioning
- ties and insufficient evidence are represented honestly

Negative:

- detector scope is limited by available factual features
- early taxonomy is intentionally narrow and conservative
- policy changes require explicit versioned evolution and compatibility handling

## Non-goals

This ADR does not introduce:

- personalized lesson generation
- generated practice positions
- ratings or mastery benchmarks
- cube or match-equity pattern attribution
- cloud profile sync or telemetry
