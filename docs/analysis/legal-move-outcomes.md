# Deterministic Legal Move Outcomes

## Purpose

This document defines deterministic factual analysis of complete legal move outcomes.

Scope of this layer:

- start from one committed position, active player, and assigned turn dice
- enumerate complete legal moves from engine output
- apply each legal move through engine transition APIs
- analyze resulting positions with factual features
- compare before/after features with deterministic deltas
- expose stable structured results for UI and future evaluator consumers

Out of scope:

- move ranking
- best-move recommendation
- equity or rollout values
- mistake labeling or severity
- coaching prose or AI generation

## Package and dependency direction

Implementation package:

- packages/backgammon-analysis
- package name: @backgammon-trainer/backgammon-analysis

Dependency direction:

- @backgammon-trainer/backgammon-engine -> @backgammon-trainer/backgammon-analysis -> host layers
- analysis depends on engine-domain contracts
- engine does not depend on analysis

This package has no React, DOM, browser-storage, or network dependency.

## Public API

Primary legal-move outcome API:

```ts
analyzeLegalMoveOutcomes(
  position: Position,
  player: Player,
  dice: DiceRoll
): AnalyzeLegalMoveOutcomesResult;
```

Result contract:

```ts
type AnalyzeLegalMoveOutcomesResult =
  | {
      ok: true;
      analysis: LegalMoveOutcomeAnalysis;
    }
  | {
      ok: false;
      reason: "engine-transition-failed";
      message: string;
    };
```

Success payload:

```ts
type LegalMoveOutcomeAnalysis = {
  player: Player;
  dice: DiceRoll;
  positionBefore: PositionAnalysis;
  outcomes: readonly LegalMoveOutcome[];
};

type LegalMoveOutcome = {
  move: Move;
  positionAfter: Position;
  analysisAfter: PositionAnalysis;
  featureDelta: PositionFeatureDelta;
};
```

## Complete legal-move input boundary

Legal outcome analysis starts only from complete legal moves returned by:

- getLegalMoves(...)

This API does not analyze staged prefixes or partial UI selections.

## Engine move-application boundary

For each legal move, analysis calls engine move application:

- applyMove(position, player, dice, move)

Analysis does not reimplement:

- hit rules
- bar-entry rules
- bearing-off rules
- legality filtering
- checker-transition semantics

## Canonical move metadata preservation

Each outcome keeps the canonical engine Move exactly, including:

- step order
- step kind
- from/to locations
- dieValue
- dieIndex
- hitsBlot and hit metadata

No notation-based reconstruction is used.

## Resulting-position behavior

For each outcome:

- positionAfter is the engine-applied result for that exact move
- analysisAfter is analyzePosition(positionAfter)
- featureDelta is comparePositions(positionBefore, positionAfter)
- positionBefore input is not mutated
- dice input is not mutated

Outcome objects are structurally isolated so one outcome cannot mutate another by shared nested references.

## Empty legal-move behavior

When the engine reports no legal checker move:

- the API returns ok: true
- analysis.outcomes is an empty array

No fake pass move is created.

## Failure behavior

A legal-move/application disagreement is surfaced as:

- ok: false
- reason: engine-transition-failed
- message: invariant failure description

No legal move is silently dropped.

## Ordering policy

Outcome ordering preserves current engine getLegalMoves(...) output order.

Ordering is deterministic for identical input but has no strategic meaning. Consumers must not treat first outcome as best.

## Factual feature composition

Outcome analysis composes existing analysis contracts:

- PositionAnalysis for resulting factual features
- PositionFeatureDelta for factual after-before change

Delta sign convention remains:

- numeric delta = after - before

## Coordinate-equivalent canonical moves

If the engine returns distinct canonical moves that are coordinate-equivalent in display, analysis preserves each distinct canonical move as a separate outcome entry.

## Web preview behavior

The web sandbox exposes a Legal Move Outcomes panel for development inspection.

Behavior summary:

- requires opening roll resolved
- requires current turn dice assigned
- disabled during history inspection
- shows no-legal-move state without fake entries
- allows selecting one outcome to preview on the main board in read-only mode

Preview mode requirements:

- labeled Move Outcome Preview
- uses resulting position from selected outcome
- disables checker interaction and staged selection
- disables roll/pass/manual dice controls
- does not mutate committed game state
- does not append turn history
- does not persist preview selection as durable snapshot state

## Inspection-mode coordination

History inspection and move-outcome preview are mutually exclusive:

- entering outcome preview exits history inspection
- entering history inspection exits outcome preview
- Return to Current Game exits whichever read-only mode is active
- New Game clears read-only inspection modes
- successful import clears read-only inspection modes

## Staged-selection policy

Legal move outcome analysis always targets the committed position and current turn dice.

- staged prefix selection does not alter outcome analysis input
- entering move-outcome preview clears staged selection
- returning from preview restores committed game view (not prior staged prefix)

## Known limitations and future boundary

Known limits:

- no evaluator scores
- no strategic ranking
- no recommendation labels
- no mistake classification
- no coaching prose

Future boundary:

- evaluator layer may consume LegalMoveOutcomeAnalysis and add ranking/equity independently
- coaching layer may consume evaluator output without changing this factual layer
