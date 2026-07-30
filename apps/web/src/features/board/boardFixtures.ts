import {
  STANDARD_STARTING_POSITION,
  type BoardPosition,
  type PointIndex,
  type PointOccupancy
} from "@backgammon-trainer/backgammon-domain";

const EMPTY_POINTS: Readonly<Record<PointIndex, PointOccupancy | null>> = {
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
};

export { STANDARD_STARTING_POSITION };

export const BAR_CHECKERS_FIXTURE: BoardPosition = {
  points: {
    ...STANDARD_STARTING_POSITION.points,
    24: { player: "white", checkerCount: 1 },
    1: { player: "black", checkerCount: 1 }
  },
  bar: {
    white: 1,
    black: 1
  },
  borneOff: {
    white: 0,
    black: 0
  }
};

export const NEARLY_BEAR_OFF_FIXTURE: BoardPosition = {
  points: {
    ...EMPTY_POINTS,
    1: { player: "white", checkerCount: 2 },
    24: { player: "black", checkerCount: 3 }
  },
  bar: {
    white: 0,
    black: 0
  },
  borneOff: {
    white: 13,
    black: 12
  }
};

export const EIGHT_STACK_FIXTURE: BoardPosition = {
  points: {
    ...STANDARD_STARTING_POSITION.points,
    6: { player: "white", checkerCount: 8 },
    8: null
  },
  bar: {
    white: 0,
    black: 0
  },
  borneOff: {
    white: 0,
    black: 0
  }
};

/**
 * Rendering-only fixture for empty geometry states.
 * This intentionally violates the 15-checker-per-player invariant.
 */
export const EMPTY_BOARD_GEOMETRY_FIXTURE: BoardPosition = {
  points: {
    ...EMPTY_POINTS
  },
  bar: {
    white: 0,
    black: 0
  },
  borneOff: {
    white: 0,
    black: 0
  }
};
