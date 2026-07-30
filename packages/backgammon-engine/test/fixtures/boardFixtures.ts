import {
  POINT_INDEXES,
  STANDARD_STARTING_POSITION,
  type BoardPosition,
  type Player,
  type PointIndex,
  type PointOccupancy
} from "@backgammon-trainer/backgammon-domain";

interface PositionSeed {
  readonly points?: Partial<Record<PointIndex, PointOccupancy | null>>;
  readonly bar?: Partial<Record<Player, number>>;
  readonly borneOff?: Partial<Record<Player, number>>;
}

/**
 * Creates a full 24-point map initialized with null occupancies.
 */
export const createEmptyPoints = (): Readonly<Record<PointIndex, PointOccupancy | null>> => {
  const points = {} as Record<PointIndex, PointOccupancy | null>;

  for (const pointIndex of POINT_INDEXES) {
    points[pointIndex] = null;
  }

  return points;
};

/**
 * Builds a board position from a minimal seed while preserving all required keys.
 */
export const createPosition = (seed: PositionSeed): BoardPosition => {
  return {
    points: {
      ...createEmptyPoints(),
      ...(seed.points ?? {})
    },
    bar: {
      white: 0,
      black: 0,
      ...(seed.bar ?? {})
    },
    borneOff: {
      white: 0,
      black: 0,
      ...(seed.borneOff ?? {})
    }
  };
};

/**
 * Canonical starting position fixture from domain package.
 */
export const INITIAL_POSITION_FIXTURE: BoardPosition = STANDARD_STARTING_POSITION;

/**
 * Board with no checkers on points or bar and all checkers borne off.
 */
export const EMPTY_BOARD_FIXTURE: BoardPosition = createPosition({
  borneOff: {
    white: 15,
    black: 15
  }
});

/**
 * Position with one white checker on board and the rest borne off.
 */
export const SINGLE_CHECKER_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 15
  }
});

/**
 * Position with most white checkers borne off and remaining in home board.
 */
export const BEARING_OFF_EXAMPLE_FIXTURE: BoardPosition = createPosition({
  points: {
    1: { player: "white", checkerCount: 2 },
    2: { player: "white", checkerCount: 2 },
    3: { player: "white", checkerCount: 1 },
    24: { player: "black", checkerCount: 1 }
  },
  borneOff: {
    white: 10,
    black: 14
  }
});

/**
 * Position with white checkers waiting on the bar to enter.
 */
export const BAR_ENTRY_EXAMPLE_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 5 },
    13: { player: "white", checkerCount: 5 },
    6: { player: "white", checkerCount: 3 },
    1: { player: "black", checkerCount: 2 },
    12: { player: "black", checkerCount: 5 },
    17: { player: "black", checkerCount: 3 },
    19: { player: "black", checkerCount: 5 }
  },
  bar: {
    white: 2,
    black: 0
  },
  borneOff: {
    white: 0,
    black: 0
  }
});

/**
 * White has one checker with exactly one empty forward destination (to point 18).
 */
export const WHITE_ONE_DESTINATION_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 },
    23: { player: "black", checkerCount: 3 },
    22: { player: "black", checkerCount: 3 },
    21: { player: "black", checkerCount: 3 },
    20: { player: "black", checkerCount: 3 },
    19: { player: "black", checkerCount: 3 }
  },
  borneOff: {
    white: 14,
    black: 0
  }
});

/**
 * White has multiple independent starting points with empty forward destinations.
 */
export const WHITE_MULTIPLE_MOVES_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 },
    13: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 13,
    black: 15
  }
});

/**
 * Black has one checker with basic forward destinations into empty points.
 */
export const BLACK_FORWARD_FIXTURE: BoardPosition = createPosition({
  points: {
    1: { player: "black", checkerCount: 1 }
  },
  borneOff: {
    white: 15,
    black: 14
  }
});

/**
 * White has one checker with both 1-pip and 2-pip forward destinations open.
 */
export const WHITE_TWO_DICE_INDEPENDENT_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 15
  }
});

/**
 * White can move 1 pip to an open point (23).
 */
export const WHITE_OPEN_DESTINATION_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 15
  }
});

/**
 * White 1-pip destination (23) is blocked by two black checkers.
 */
export const WHITE_BLOCKED_DESTINATION_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 },
    23: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 14,
    black: 13
  }
});

/**
 * White 1-pip destination (23) has one black checker (future hit scenario).
 */
export const WHITE_SINGLE_OPPONENT_DESTINATION_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 },
    23: { player: "black", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 14
  }
});

/**
 * White has both 1-pip and 2-pip destinations blocked.
 */
export const WHITE_MULTIPLE_BLOCKED_DESTINATIONS_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 },
    23: { player: "black", checkerCount: 2 },
    22: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 14,
    black: 11
  }
});

/**
 * White can hit a single black checker on point 23 with die 1.
 */
export const WHITE_SINGLE_HIT_DESTINATION_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 },
    23: { player: "black", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 14
  }
});

/**
 * White has two separate hit opportunities from one checker using either die.
 */
export const WHITE_MULTIPLE_HIT_OPPORTUNITIES_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 },
    23: { player: "black", checkerCount: 1 },
    22: { player: "black", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 13
  }
});

/**
 * White can hit on point 23 while point 22 is blocked.
 */
export const WHITE_HIT_AND_BLOCKED_DESTINATIONS_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 },
    23: { player: "black", checkerCount: 1 },
    22: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 14,
    black: 12
  }
});

/**
 * White has two checkers and both dice produce independent hit moves.
 */
export const WHITE_TWO_DICE_INDEPENDENT_HITS_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "white", checkerCount: 1 },
    13: { player: "white", checkerCount: 1 },
    23: { player: "black", checkerCount: 1 },
    22: { player: "black", checkerCount: 2 },
    12: { player: "black", checkerCount: 2 },
    11: { player: "black", checkerCount: 1 }
  },
  borneOff: {
    white: 13,
    black: 9
  }
});
