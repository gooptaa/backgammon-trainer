# Backgammon Analysis

Deterministic factual position-feature extraction for backgammon engine positions.

What this package does:

- computes structured, JSON-safe position facts
- compares two positions with factual `after - before` deltas
- classifies coarse contact status (`contact` or `race`)
- analyzes complete legal move outcomes for a position/player/dice turn
- defines provider-neutral evaluator request/result contracts
- validates evaluator output against canonical legal outcomes
- produces deterministic dense-ranked move analysis with loss-from-best
- provides canonical deterministic move fingerprinting

What this package does not do:

- strategic recommendation labels
- built-in production evaluator strategy
- GNU Backgammon process integration (provided separately by `@backgammon-trainer/backgammon-evaluator-gnubg`)
- coaching prose or AI integration
- legality, move generation, or checker-transition rules
- durable analysis session persistence modeling (provided by `@backgammon-trainer/backgammon-analysis-session`)

Dependency direction:

- depends on `@backgammon-trainer/backgammon-engine`
- no React, DOM, browser storage, or network dependencies

Persistence boundary:

- deterministic game snapshots remain owned by `@backgammon-trainer/backgammon-engine`
- versioned analysis sessions remain owned by `@backgammon-trainer/backgammon-analysis-session`

Minimal usage:

```ts
import {
  analyzeLegalMoveOutcomes,
  evaluateLegalMoves,
  getMoveFingerprint,
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

const ranked = await evaluateLegalMoves(
  {
    position,
    player,
    dice,
    context: { gameMode: "money" }
  },
  evaluator
);

if (ranked.ok && ranked.analysis.kind === "evaluated") {
  for (const row of ranked.analysis.rankedMoves) {
    console.log(
      row.rank,
      row.normalizedScore,
      row.lossFromBest,
      getMoveFingerprint(row.outcome.move)
    );
  }
}
```

Results are deterministic factual features, not strategic judgments.

Fixture helper for tests/development preview:

```ts
import { createFixturePositionEvaluator } from "@backgammon-trainer/backgammon-analysis/fixture";

const evaluator = createFixturePositionEvaluator({ mode: "complete" });
```

Fixture scores are synthetic contract data and are not strategic analysis.
