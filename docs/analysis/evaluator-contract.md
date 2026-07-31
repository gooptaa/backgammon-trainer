# Evaluator Contract and Ranked Move Analysis

## Purpose

This document defines the provider-neutral evaluator boundary used after deterministic legal move outcome analysis.

Pipeline:

1. Position + player + dice
2. Complete legal moves from engine
3. Factual legal move outcomes
4. Evaluator adapter output
5. Normalized ranked analysis
6. Future pedagogy/coaching layers

This layer does not implement GNU Backgammon integration, heuristic scoring, recommendations, or coaching prose.

## Dependency Direction

- `@backgammon-trainer/backgammon-engine` owns legality and transitions.
- `@backgammon-trainer/backgammon-analysis` owns factual outcomes, evaluator contracts, validation, and ranking.
- Host layers (`apps/web`, future backend/services/adapters) depend on analysis.
- Engine does not depend on analysis.

## Asynchronous Evaluator Interface

`PositionEvaluator` is asynchronous:

- `evaluate(request): Promise<EvaluatePositionResult>`

Why async:

- future process-based providers
- worker-based providers
- network-backed providers

The analysis package itself does not include process, DOM, browser storage, or network dependencies.

## Evaluator Request Contract

`EvaluatePositionRequest` includes trusted deterministic values:

- `position`
- `player`
- `dice`
- `legalOutcomes` (complete canonical legal outcomes from analysis)
- optional `context`

Current context is intentionally minimal:

- `gameMode: "money"`

This represents cube-neutral checker-play analysis placeholder context only.

## Canonical Move Identity

Canonical identity uses deterministic fingerprinting of canonical `Move` metadata:

- move player
- ordered step sequence
- step kind
- from/to coordinates
- die value
- die index
- hit flags and hit payload

Function:

- `getMoveFingerprint(move)` in `@backgammon-trainer/backgammon-analysis`

The fingerprint is for stable joining and ordering only. Canonical `Move` remains authoritative.

## Normalized Score Direction

Normalized score direction is fixed:

- higher score is better for the player to move

Field:

- `normalizedScore`

Comparability note:

- scores are only guaranteed comparable within one evaluator result unless provider metadata says otherwise.

## Score Scale Variants

`EvaluationScoreScale` supports:

- `equity` with points unit
- `probability` with `[0, 1]` range
- `relative` for provider-relative synthetic/arbitrary scales

Fixture evaluator uses `relative`.

## Provenance

Successful evaluator results include `EvaluatorProvenance`:

- provider identifier
- provider version
- adapter version
- JSON-safe settings

Settings must not include credentials.

## Coverage and Failure Semantics

Evaluation success coverage:

- `complete`: every legal outcome scored
- `partial`: strict subset scored

Evaluation failure reasons:

- `unavailable`
- `unsupported-position`
- `timeout`
- `provider-failed`
- `invalid-provider-result`

Expected provider failures are returned as discriminated failures, not thrown.

## Provider Result Validation

Before ranking, analysis validates:

- recognized success shape
- finite scores
- valid score scale
- valid provenance and JSON-safe settings
- known move fingerprints only
- no duplicate move fingerprints
- complete coverage includes all legal moves
- partial coverage has scored rows (unless no legal moves)
- optional provider ranks are positive integers

Malformed successful output is downgraded to `invalid-provider-result`.

## Ranked Analysis API

`evaluateLegalMoves(request, evaluator)`:

1. runs factual `analyzeLegalMoveOutcomes(...)`
2. stops on factual failure
3. invokes evaluator with canonical legal outcomes
4. validates evaluator output
5. joins scores to canonical outcomes by fingerprint
6. ranks deterministically
7. computes `lossFromBest`
8. reports unevaluated legal outcomes explicitly

## Ranking and Tie Convention

Ranking uses deterministic dense ranking:

- higher `normalizedScore` first
- exact numeric ties share rank
- tied ordering resolved by canonical move fingerprint
- provider response order is non-authoritative

Example:

- scores `0.40, 0.40, 0.35` -> ranks `1, 1, 2`

## Loss Convention

`lossFromBest = bestScore - moveScore`

- best scored move has `0`
- ranked losses are non-negative
- values use the evaluator's declared score scale

This is not labeled equity loss unless the scale is explicitly equity.

## Empty Legal-Move Behavior

When legal outcomes are empty:

- ranked analysis succeeds
- coverage is `complete`
- ranked and unevaluated arrays are empty
- no fake pass move is created
- evaluator invocation is skipped
- evaluator provenance is omitted

## Fixture Evaluator

Fixture evaluator is intentionally synthetic and deterministic:

- `createFixturePositionEvaluator(...)`
- supports complete, partial, unavailable, failed, timeout, unsupported, and malformed modes
- asynchronous by contract
- no strategic computation

Fixture scores are for contract wiring/tests/sandbox inspection only.

## No Heuristic Evaluator

No strategy heuristic was introduced in this milestone.

Reasons:

- simplistic feature-weight scoring can confidently rank incorrectly
- trust model requires clear separation between factual outputs and authoritative evaluation

## Web Integration Scope

Web integration provides an `Evaluator Contract Preview` section.

Behavior:

- factual legal move outcomes remain available without evaluator
- evaluator section clearly reports unavailable/failure states
- fixture warning is explicit: development fixture scores are not strategic evaluation
- ranked rows reuse existing read-only move outcome preview mode

## Async Stale-Request Protection

Web evaluator requests use per-request identity and effect cleanup.

Stale responses are ignored after state changes such as:

- dice/turn changes
- new game
- import
- history inspection transitions
- unmount

## Persistence Exclusion

Evaluator and ranked results are transient in this milestone.

They are not stored in:

- `GameSnapshot`
- turn history
- local storage
- import/export payloads

## Future Adapter Boundary

A dedicated GNU Backgammon adapter spike now lives in `packages/backgammon-evaluator-gnubg`.

Current status of that package:

- Node-only runtime boundary
- capability detection and direct process-runner abstraction implemented
- position translation, move-notation parsing, canonical matching, and transcript parsing implemented
- transcript-driven tests cover normalized contract mapping without requiring GNU Backgammon installation
- live checker-play command invocation remains explicitly unverified in this repository milestone

The analysis package remains the sole owner of:

- canonical move fingerprints
- provider-result validation
- deterministic ranking
- loss-from-best calculation

Provider-specific raw data remains adapter-isolated.

## Future Coaching Boundary

Future coaching layers may consume ranked analysis and provenance, but they are separate from this evaluator contract and are not implemented in this milestone.
