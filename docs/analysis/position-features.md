# Deterministic Position Features

## Purpose

This document defines the initial deterministic position-feature analysis layer used by Backgammon Trainer.

Scope of this layer:

- compute factual, structured, JSON-safe position features
- compare before/after positions with factual deltas
- provide stable machine-readable inputs for future evaluators and coaching systems

Out of scope for this layer:

- move ranking
- equity or rollout evaluation
- strategic correctness claims
- coaching prose
- AI-provider integration

## Package location and dependency direction

Implementation package:

- `packages/backgammon-analysis`
- npm package name: `@backgammon-trainer/backgammon-analysis`

Dependency direction:

- `@backgammon-trainer/backgammon-engine` -> `@backgammon-trainer/backgammon-analysis` -> host apps/services
- analysis depends on engine-domain position types
- engine does not depend on analysis

The package has no React, DOM, browser-storage, or network dependencies.

## Public APIs

Primary APIs:

- `analyzePosition(position)` -> `PositionAnalysis`
- `comparePositions(before, after)` -> `PositionFeatureDelta`

Both APIs are synchronous, deterministic, and non-mutating.

## Canonical point and movement conventions

This analysis uses the engine/domain canonical board convention:

- points are absolute `1..24`
- White moves from `24` toward `1`, then bears off
- Black moves from `1` toward `24`, then bears off

Home-board ranges:

- White home board: points `1..6`
- Black home board: points `19..24`

Distance-to-bear-off convention:

- White checker at point `p` contributes `p` pips
- Black checker at point `p` contributes `25 - p` pips
- Bar checker contributes `25` pips for either player
- Borne-off checker contributes `0` pips

## Feature definitions

For each player, `analyzePosition(...)` returns factual features including:

- checker accounting:
  - `checkersOnBoard`
  - `checkersOnBar`
  - `checkersBorneOff`
  - `totalCheckersAccountedFor`
- race distance:
  - `pipCount`
- board-shape facts:
  - `occupiedPointCount`
  - `occupiedPoints`
  - `blotCount`
  - `blotPoints`
  - `madePointCount`
  - `madePoints`
  - `madeHomeBoardPointCount`
  - `madeHomeBoardPoints`
  - `checkersInHomeBoard`
  - `checkersOutsideHomeBoard`

Definitions:

- blot: exactly one checker on a point
- made point: two or more checkers on a point
- occupied point: any point with one or more checkers

Returned point identifiers preserve canonical engine indexing.

## Relationship features

Relationship features include:

- `pipCountDifferenceWhiteMinusBlack`
- `absolutePipCountDifference`
- `pipCountLeader` (`white`, `black`, or `tied`)
- `contactStatus` (`contact` or `race`)

Pip-difference sign convention is explicit:

- `pipCountDifferenceWhiteMinusBlack = whitePipCount - blackPipCount`
- negative value means White is ahead on pip count
- positive value means Black is ahead on pip count

## Contact and race definition

Initial deterministic contact classifier:

- if either player has one or more checkers on the bar, status is `contact`
- otherwise:
  - find White's farthest checker point (`max white point`)
  - find Black's rearmost checker point (`min black point`)
  - if `maxWhitePoint > minBlackPoint`, status is `contact`
  - else status is `race`

This is a coarse structural classifier only. It is not a full strategic game-plan classifier.

## Position delta convention

`comparePositions(before, after)` returns factual deltas using a strict sign convention:

- every numeric delta is `after - before`

Included deltas include:

- pip-count deltas
- blot-count deltas
- made-point deltas
- made-home-board-point deltas
- bar-count deltas
- borne-off-count deltas
- occupied-point-count deltas
- relationship transition fields (`contactStatusBefore/After`, leader before/after)

No delta is labeled as good or bad in this milestone.

## Facts versus judgments

This analysis layer only provides deterministic facts.

It does not claim:

- best move
- mistake severity
- win probability
- equity change

Strategic judgments are intentionally deferred to future layers that combine:

- legal-move generation
- resulting positions
- deterministic features
- evaluator or heuristic outputs

## Known limits of this milestone

Current limits:

- no move ranking or recommendation APIs
- no evaluator integration
- no rollout statistics
- no coaching-language generation

This foundation exists to make those later layers grounded and testable while keeping deterministic responsibility separate from UI and AI text generation.
