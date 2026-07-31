import type { EvaluateLegalMovesRequest, Position } from "@backgammon-trainer/backgammon-analysis";

const createEmptyPoints = (): Position["points"] => ({
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

const SMOKE_POSITION: Position = {
  points: {
    ...createEmptyPoints(),
    8: { player: "white", checkerCount: 1 },
    6: { player: "white", checkerCount: 1 },
    24: { player: "black", checkerCount: 1 }
  },
  bar: {
    white: 0,
    black: 0
  },
  borneOff: {
    white: 13,
    black: 14
  }
};

export const GNU_BG_SMOKE_REQUEST: EvaluateLegalMovesRequest = {
  position: SMOKE_POSITION,
  player: "white",
  dice: {
    dice: [1, 2]
  },
  context: {
    gameMode: "money"
  }
};
