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

/**
 * White has one checker on the bar and can enter to an empty point.
 */
export const WHITE_BAR_SINGLE_CHECKER_FIXTURE: BoardPosition = createPosition({
  bar: {
    white: 1
  },
  borneOff: {
    white: 14,
    black: 15
  }
});

/**
 * White bar entry to point 24 (die 1) is blocked by two black checkers.
 */
export const WHITE_BAR_BLOCKED_ENTRY_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "black", checkerCount: 2 }
  },
  bar: {
    white: 1
  },
  borneOff: {
    white: 14,
    black: 13
  }
});

/**
 * White bar entry to point 24 (die 1) hits a single black checker.
 */
export const WHITE_BAR_HIT_ENTRY_FIXTURE: BoardPosition = createPosition({
  points: {
    24: { player: "black", checkerCount: 1 }
  },
  bar: {
    white: 1
  },
  borneOff: {
    white: 14,
    black: 14
  }
});

/**
 * White bar entry has two different legal destinations from dice 1 and 2.
 */
export const WHITE_BAR_TWO_DICE_DIFFERENT_DESTINATIONS_FIXTURE: BoardPosition = createPosition({
  bar: {
    white: 1
  },
  borneOff: {
    white: 14,
    black: 15
  }
});

/**
 * White duplicate dice should generate separate entry moves with die association.
 */
export const WHITE_BAR_DUPLICATE_DICE_FIXTURE: BoardPosition = createPosition({
  bar: {
    white: 1
  },
  borneOff: {
    white: 14,
    black: 15
  }
});

/**
 * White has both bar-entry opportunities and ordinary point-to-point opportunities.
 */
export const WHITE_BAR_AND_ORDINARY_MIXED_FIXTURE: BoardPosition = createPosition({
  points: {
    13: { player: "white", checkerCount: 1 }
  },
  bar: {
    white: 1
  },
  borneOff: {
    white: 13,
    black: 15
  }
});

/**
 * White has ordinary point-to-point opportunities with no bar checkers.
 */
export const WHITE_ORDINARY_ONLY_MANDATORY_ENTRY_FIXTURE: BoardPosition = createPosition({
  points: {
    13: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 15
  }
});

/**
 * White has bar checkers with blocked entry points while an ordinary move exists.
 */
export const WHITE_BLOCKED_BAR_WITH_ORDINARY_OPPORTUNITY_FIXTURE: BoardPosition = createPosition({
  points: {
    13: { player: "white", checkerCount: 1 },
    24: { player: "black", checkerCount: 2 },
    23: { player: "black", checkerCount: 2 }
  },
  bar: {
    white: 1
  },
  borneOff: {
    white: 13,
    black: 11
  }
});

/**
 * White can move the same checker with both dice in sequence.
 */
export const WHITE_TWO_DICE_SAME_CHECKER_SEQUENCE_FIXTURE: BoardPosition = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 15
  }
});

/**
 * White can move different checkers across two ordered steps.
 */
export const WHITE_TWO_DICE_DIFFERENT_CHECKERS_SEQUENCE_FIXTURE: BoardPosition = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 },
    13: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 13,
    black: 15
  }
});

/**
 * White can hit first and then continue with the second die.
 */
export const WHITE_HIT_THEN_SECOND_MOVE_FIXTURE: BoardPosition = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 },
    7: { player: "black", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 14
  }
});

/**
 * White can enter from bar first and then make an ordinary second move.
 */
export const WHITE_BAR_ENTRY_THEN_ORDINARY_MOVE_FIXTURE: BoardPosition = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 }
  },
  bar: {
    white: 1
  },
  borneOff: {
    white: 13,
    black: 15
  }
});

/**
 * One die order has a legal continuation while the opposite order does not.
 */
export const WHITE_ONE_ORDER_CONTINUES_OTHER_STOPS_FIXTURE: BoardPosition = createPosition({
  points: {
    13: { player: "white", checkerCount: 1 },
    12: { player: "black", checkerCount: 2 },
    22: { player: "black", checkerCount: 2 }
  },
  bar: {
    white: 1
  },
  borneOff: {
    white: 13,
    black: 11
  }
});

/**
 * White has a valid first step but no legal second step.
 */
export const WHITE_NO_SECOND_STEP_AFTER_VALID_FIRST_FIXTURE: BoardPosition = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 },
    2: { player: "white", checkerCount: 1 },
    7: { player: "black", checkerCount: 2 },
    6: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 13,
    black: 11
  }
});

/**
 * Both dice can be used, but only one die order yields a complete two-step turn.
 */
export const WHITE_BOTH_DICE_ONE_ORDER_SEQUENCE_FIXTURE: BoardPosition = createPosition({
  points: {
    23: { player: "black", checkerCount: 2 }
  },
  bar: {
    white: 1
  },
  borneOff: {
    white: 14,
    black: 13
  }
});

/**
 * Both die orders can produce complete two-step turns.
 */
export const WHITE_BOTH_DICE_BOTH_ORDERS_SEQUENCE_FIXTURE: BoardPosition = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 15
  }
});

/**
 * Only the larger die is playable for a one-step turn.
 */
export const WHITE_ONLY_LARGER_DIE_PLAYABLE_FIXTURE: BoardPosition = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 },
    24: { player: "white", checkerCount: 1 },
    5: { player: "black", checkerCount: 2 },
    21: { player: "black", checkerCount: 2 },
    18: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 13,
    black: 9
  }
});

/**
 * Only the smaller die is playable for a one-step turn.
 */
export const WHITE_ONLY_SMALLER_DIE_PLAYABLE_FIXTURE: BoardPosition = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 },
    24: { player: "white", checkerCount: 1 },
    2: { player: "black", checkerCount: 2 },
    21: { player: "black", checkerCount: 2 },
    18: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 13,
    black: 9
  }
});

/**
 * Both dice are individually playable, but no complete two-step turn is possible.
 */
export const WHITE_BOTH_DICE_INDIVIDUAL_ONLY_FIXTURE: BoardPosition = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 },
    24: { player: "white", checkerCount: 1 },
    21: { player: "black", checkerCount: 2 },
    18: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 13,
    black: 11
  }
});

/**
 * Bar-entry sequence where both dice can be used in a completed turn.
 */
export const WHITE_BAR_BOTH_DICE_SEQUENCE_FIXTURE: BoardPosition = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 }
  },
  bar: {
    white: 1
  },
  borneOff: {
    white: 13,
    black: 15
  }
});

/**
 * Bar-entry position where only one die is playable.
 */
export const WHITE_BAR_ONLY_ONE_DIE_PLAYABLE_FIXTURE: BoardPosition = createPosition({
  points: {
    23: { player: "black", checkerCount: 2 },
    22: { player: "black", checkerCount: 2 }
  },
  bar: {
    white: 1
  },
  borneOff: {
    white: 14,
    black: 11
  }
});

/**
 * White has all active checkers in home board.
 */
export const WHITE_BEAR_OFF_ALL_HOME_FIXTURE: BoardPosition = createPosition({
  points: {
    6: { player: "white", checkerCount: 2 },
    3: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 12,
    black: 15
  }
});

/**
 * White has a checker outside home board, so bearing off is not allowed.
 */
export const WHITE_BEAR_OFF_OUTSIDE_HOME_FIXTURE: BoardPosition = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 },
    3: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 13,
    black: 15
  }
});

/**
 * White has a checker on the bar, so bearing off is not allowed.
 */
export const WHITE_BEAR_OFF_BAR_PRESENT_FIXTURE: BoardPosition = createPosition({
  points: {
    6: { player: "white", checkerCount: 1 },
    3: { player: "white", checkerCount: 1 }
  },
  bar: {
    white: 1
  },
  borneOff: {
    white: 12,
    black: 15
  }
});

/**
 * White has an exact bearing-off move from point 6 with die 6.
 */
export const WHITE_BEAR_OFF_EXACT_FIXTURE: BoardPosition = createPosition({
  points: {
    6: { player: "white", checkerCount: 1 },
    5: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 14,
    black: 13
  }
});

/**
 * White can use an oversized die to bear off from point 5.
 */
export const WHITE_BEAR_OFF_OVERSIZED_ALLOWED_FIXTURE: BoardPosition = createPosition({
  points: {
    5: { player: "white", checkerCount: 1 },
    4: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 14,
    black: 13
  }
});

/**
 * White oversized bear off is blocked by a checker on a higher point.
 */
export const WHITE_BEAR_OFF_OVERSIZED_BLOCKED_FIXTURE: BoardPosition = createPosition({
  points: {
    5: { player: "white", checkerCount: 1 },
    3: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 13,
    black: 15
  }
});

/**
 * White oversized die may bear off only the farthest eligible point.
 */
export const WHITE_BEAR_OFF_FARTHEST_ONLY_FIXTURE: BoardPosition = createPosition({
  points: {
    5: { player: "white", checkerCount: 1 },
    4: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 13,
    black: 15
  }
});

/**
 * White first bear-off step can change second-step legality.
 */
export const WHITE_BEAR_OFF_SEQUENCE_LEGALITY_SHIFT_FIXTURE: BoardPosition = createPosition({
  points: {
    3: { player: "white", checkerCount: 1 },
    1: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 13,
    black: 15
  }
});

/**
 * White bearing-off position where only one die is playable.
 */
export const WHITE_BEAR_OFF_ONLY_ONE_DIE_PLAYABLE_FIXTURE: BoardPosition = createPosition({
  points: {
    1: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 15
  }
});

/**
 * Black has an exact bearing-off move from point 19 with die 6.
 */
export const BLACK_BEAR_OFF_EXACT_FIXTURE: BoardPosition = createPosition({
  points: {
    19: { player: "black", checkerCount: 1 },
    20: { player: "white", checkerCount: 2 }
  },
  borneOff: {
    white: 13,
    black: 14
  }
});

/**
 * Black can use an oversized die to bear off from point 20.
 */
export const BLACK_BEAR_OFF_OVERSIZED_ALLOWED_FIXTURE: BoardPosition = createPosition({
  points: {
    20: { player: "black", checkerCount: 1 },
    21: { player: "white", checkerCount: 2 }
  },
  borneOff: {
    white: 13,
    black: 14
  }
});

/**
 * Black oversized bear off is blocked by a checker on a higher point.
 */
export const BLACK_BEAR_OFF_OVERSIZED_BLOCKED_FIXTURE: BoardPosition = createPosition({
  points: {
    22: { player: "black", checkerCount: 1 },
    20: { player: "black", checkerCount: 1 }
  },
  borneOff: {
    white: 15,
    black: 13
  }
});

/**
 * Black first bear-off step can change second-step legality.
 */
export const BLACK_BEAR_OFF_SEQUENCE_LEGALITY_SHIFT_FIXTURE: BoardPosition = createPosition({
  points: {
    22: { player: "black", checkerCount: 1 },
    24: { player: "black", checkerCount: 1 }
  },
  borneOff: {
    white: 15,
    black: 13
  }
});
