import {
  analyzePosition,
  comparePositions,
  type LegalMoveOutcome,
  type Position
} from "@backgammon-trainer/backgammon-analysis";
import type { Move } from "@backgammon-trainer/backgammon-engine";

export const createEmptyPoints = (): Position["points"] => ({
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
  7: null,
  8: null,
  9: null,
  10: null,
  11: null,
  12: null,
  13: null,
  14: null,
  15: null,
  16: null,
  17: null,
  18: null,
  19: null,
  20: null,
  21: null,
  22: null,
  23: null,
  24: null
});

export const createPosition = (input?: {
  points?: Partial<Position["points"]>;
  bar?: Partial<Position["bar"]>;
  borneOff?: Partial<Position["borneOff"]>;
}): Position => ({
  points: {
    ...createEmptyPoints(),
    ...(input?.points ?? {})
  },
  bar: {
    white: 0,
    black: 0,
    ...(input?.bar ?? {})
  },
  borneOff: {
    white: 0,
    black: 0,
    ...(input?.borneOff ?? {})
  }
});

export const STARTING_POSITION = createPosition({
  points: {
    24: { player: "white", checkerCount: 2 },
    13: { player: "white", checkerCount: 5 },
    8: { player: "white", checkerCount: 3 },
    6: { player: "white", checkerCount: 5 },
    1: { player: "black", checkerCount: 2 },
    12: { player: "black", checkerCount: 5 },
    17: { player: "black", checkerCount: 3 },
    19: { player: "black", checkerCount: 5 }
  }
});

// Two checkers, each with exactly one intermediate waypoint blocked by an opposing
// point, so each checker has exactly one legal way to play both dice. This yields
// exactly two legal moves with no raw-path duplicates within a canonical move class
// (a single checker with two different-valued dice and both waypoints open would
// otherwise reach the same destination via two paths, which is one real move, not two).
export const WHITE_SIMPLE_POSITION = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 },
    20: { player: "white", checkerCount: 1 },
    7: { player: "black", checkerCount: 2 },
    19: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 13,
    black: 11
  }
});

export const BLACK_SIMPLE_POSITION = createPosition({
  points: {
    1: { player: "black", checkerCount: 1 },
    13: { player: "black", checkerCount: 1 },
    2: { player: "white", checkerCount: 2 },
    14: { player: "white", checkerCount: 2 }
  },
  borneOff: {
    white: 11,
    black: 13
  }
});

export const WHITE_BAR_POSITION = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 },
    22: { player: "black", checkerCount: 1 }
  },
  bar: {
    white: 1
  },
  borneOff: {
    white: 13,
    black: 14
  }
});

export const BLACK_BAR_POSITION = createPosition({
  points: {
    1: { player: "black", checkerCount: 1 },
    3: { player: "white", checkerCount: 1 }
  },
  bar: {
    black: 1
  },
  borneOff: {
    white: 14,
    black: 13
  }
});

export const WHITE_BEAR_OFF_POSITION = createPosition({
  points: {
    2: { player: "white", checkerCount: 1 },
    1: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 13,
    black: 15
  }
});

export const BLACK_BEAR_OFF_POSITION = createPosition({
  points: {
    23: { player: "black", checkerCount: 1 },
    24: { player: "black", checkerCount: 1 }
  },
  borneOff: {
    white: 15,
    black: 13
  }
});

export const NEUTRAL_ANALYSIS_POSITION = createPosition({
  borneOff: {
    white: 15,
    black: 15
  }
});

export const DICE = {
  dice: [1, 2] as const
};

export const DOUBLES = {
  dice: [1, 1] as const
};

export const createOutcome = (move: Move): LegalMoveOutcome => {
  return {
    move,
    positionAfter: NEUTRAL_ANALYSIS_POSITION,
    analysisAfter: analyzePosition(NEUTRAL_ANALYSIS_POSITION),
    featureDelta: comparePositions(NEUTRAL_ANALYSIS_POSITION, NEUTRAL_ANALYSIS_POSITION)
  };
};

export const WHITE_ORDINARY_MOVE: Move = {
  player: "white",
  steps: [
    {
      kind: "point-to-point",
      fromPoint: 8,
      toPoint: 7,
      dieValue: 1,
      dieIndex: 0,
      hitsBlot: false
    },
    {
      kind: "point-to-point",
      fromPoint: 7,
      toPoint: 5,
      dieValue: 2,
      dieIndex: 1,
      hitsBlot: false
    }
  ]
};

export const WHITE_REVERSED_ORDINARY_MOVE: Move = {
  player: "white",
  steps: [
    {
      kind: "point-to-point",
      fromPoint: 8,
      toPoint: 6,
      dieValue: 2,
      dieIndex: 1,
      hitsBlot: false
    },
    {
      kind: "point-to-point",
      fromPoint: 6,
      toPoint: 5,
      dieValue: 1,
      dieIndex: 0,
      hitsBlot: false
    }
  ]
};

export const WHITE_HIT_MOVE: Move = {
  player: "white",
  steps: [
    {
      kind: "point-to-point",
      fromPoint: 8,
      toPoint: 7,
      dieValue: 1,
      dieIndex: 0,
      hitsBlot: true,
      hit: {
        player: "black",
        point: 7
      }
    },
    {
      kind: "point-to-point",
      fromPoint: 7,
      toPoint: 5,
      dieValue: 2,
      dieIndex: 1,
      hitsBlot: false
    }
  ]
};

export const WHITE_BAR_ENTRY_MOVE: Move = {
  player: "white",
  steps: [
    {
      kind: "enter-from-bar",
      fromPoint: "bar",
      toPoint: 24,
      dieValue: 1,
      dieIndex: 0,
      hitsBlot: false
    },
    {
      kind: "point-to-point",
      fromPoint: 24,
      toPoint: 22,
      dieValue: 2,
      dieIndex: 1,
      hitsBlot: false
    }
  ]
};

export const WHITE_BEAR_OFF_MOVE: Move = {
  player: "white",
  steps: [
    {
      kind: "bear-off",
      fromPoint: 2,
      toPoint: "off",
      dieValue: 2,
      dieIndex: 1,
      hitsBlot: false
    },
    {
      kind: "bear-off",
      fromPoint: 1,
      toPoint: "off",
      dieValue: 1,
      dieIndex: 0,
      hitsBlot: false
    }
  ]
};

export const WHITE_DOUBLES_MOVE: Move = {
  player: "white",
  steps: [
    {
      kind: "point-to-point",
      fromPoint: 8,
      toPoint: 7,
      dieValue: 1,
      dieIndex: 0,
      hitsBlot: false
    },
    {
      kind: "point-to-point",
      fromPoint: 7,
      toPoint: 6,
      dieValue: 1,
      dieIndex: 1,
      hitsBlot: false
    },
    {
      kind: "point-to-point",
      fromPoint: 6,
      toPoint: 5,
      dieValue: 1,
      dieIndex: 2,
      hitsBlot: false
    },
    {
      kind: "point-to-point",
      fromPoint: 5,
      toPoint: 4,
      dieValue: 1,
      dieIndex: 3,
      hitsBlot: false
    }
  ]
};

export const AMBIGUOUS_COORDINATE_MOVE_A: Move = {
  player: "white",
  steps: [
    {
      kind: "point-to-point",
      fromPoint: 8,
      toPoint: 7,
      dieValue: 1,
      dieIndex: 0,
      hitsBlot: false
    },
    {
      kind: "point-to-point",
      fromPoint: 7,
      toPoint: 6,
      dieValue: 1,
      dieIndex: 1,
      hitsBlot: false
    }
  ]
};

export const AMBIGUOUS_COORDINATE_MOVE_B: Move = {
  player: "white",
  steps: [
    {
      kind: "point-to-point",
      fromPoint: 8,
      toPoint: 7,
      dieValue: 1,
      dieIndex: 2,
      hitsBlot: false
    },
    {
      kind: "point-to-point",
      fromPoint: 7,
      toPoint: 6,
      dieValue: 1,
      dieIndex: 3,
      hitsBlot: false
    }
  ]
};
