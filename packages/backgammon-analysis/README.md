# Backgammon Analysis

Deterministic factual position-feature extraction for backgammon engine positions.

What this package does:

- computes structured, JSON-safe position facts
- compares two positions with factual `after - before` deltas
- classifies coarse contact status (`contact` or `race`)
- analyzes complete legal move outcomes for a position/player/dice turn

What this package does not do:

- move ranking or recommendation
- equity or rollout evaluation
- coaching prose or AI integration
- legality, move generation, or checker-transition rules

Dependency direction:

- depends on `@backgammon-trainer/backgammon-engine`
- no React, DOM, browser storage, or network dependencies

Minimal usage:

```ts
import {
  analyzeLegalMoveOutcomes,
  analyzePosition,
  comparePositions
} from "@backgammon-trainer/backgammon-analysis";

const analysis = analyzePosition(position);
const delta = comparePositions(beforePosition, afterPosition);

const outcomesResult = analyzeLegalMoveOutcomes(position, player, dice);

if (outcomesResult.ok) {
  for (const outcome of outcomesResult.analysis.outcomes) {
    // Canonical move from engine legal-move output.
    console.log(outcome.move);
    // Engine-applied resulting position.
    console.log(outcome.positionAfter);
    // Deterministic factual features and after-before deltas.
    console.log(outcome.analysisAfter, outcome.featureDelta);
  }
} else {
  // Indicates an engine invariant disagreement between getLegalMoves and applyMove.
  console.error(outcomesResult.message);
}
```

Results are deterministic factual features, not strategic judgments.
