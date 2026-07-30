# Backgammon Analysis

Deterministic factual position-feature extraction for backgammon engine positions.

What this package does:

- computes structured, JSON-safe position facts
- compares two positions with factual `after - before` deltas
- classifies coarse contact status (`contact` or `race`)

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
import { analyzePosition, comparePositions } from "@backgammon-trainer/backgammon-analysis";

const analysis = analyzePosition(position);
const delta = comparePositions(beforePosition, afterPosition);
```

Results are deterministic factual features, not strategic judgments.
