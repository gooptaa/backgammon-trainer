export type Player = "white" | "black";

export type PlayerColor = Player;

export type PointIndex =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24;

export const POINT_INDEXES: readonly PointIndex[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24
];

export interface PointLocation {
  kind: "point";
  point: PointIndex;
}

export interface BarLocation {
  kind: "bar";
}

export interface BearOffLocation {
  kind: "bearOff";
}

export type CheckerLocation = PointLocation | BarLocation | BearOffLocation;

export interface PointOccupancy {
  readonly player: Player;
  readonly checkerCount: number;
}

export interface CheckerStack {
  owner: Player;
  count: number;
}

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface DiceRoll {
  dice: readonly [DieValue, DieValue];
  isDouble: boolean;
}

export interface BoardPosition {
  readonly points: Readonly<Record<PointIndex, PointOccupancy | null>>;
  readonly bar: Readonly<Record<Player, number>>;
  readonly borneOff: Readonly<Record<Player, number>>;
}

export interface Move {
  player: Player;
  from: CheckerLocation;
  to: CheckerLocation;
  distance: number;
  hitsBlot: boolean;
}

export interface MoveSequence {
  player: Player;
  roll: DiceRoll;
  moves: readonly Move[];
}

export type CubeOwner = Player | "center";

export interface CubeState {
  value: 1 | 2 | 4 | 8 | 16 | 32 | 64;
  owner: CubeOwner;
  canDouble: Record<Player, boolean>;
}

export interface GameState {
  playerToMove: Player;
  board: BoardPosition;
  cube: CubeState;
  currentRoll?: DiceRoll;
  matchLength?: number;
  score?: Record<Player, number>;
}

export type PositionValidationErrorCode =
  | "INVALID_POSITION_SHAPE"
  | "INVALID_POINTS_SHAPE"
  | "MISSING_POINT"
  | "INVALID_POINT_INDEX"
  | "INVALID_POINT_OCCUPANCY"
  | "INVALID_POINT_OWNER"
  | "INVALID_POINT_CHECKER_COUNT"
  | "INVALID_BAR_COUNT"
  | "INVALID_BORNE_OFF_COUNT"
  | "INVALID_PLAYER_CHECKER_TOTAL";

export interface PositionValidationError {
  readonly code: PositionValidationErrorCode;
  readonly message: string;
  readonly path: string;
}

export type PositionValidationResult =
  | { valid: true }
  | {
      valid: false;
      errors: readonly PositionValidationError[];
    };

/**
 * Absolute point numbering (never rotated):
 * - Points are always 1..24.
 * - White moves 24 -> 1 then bears off.
 * - Black moves 1 -> 24 then bears off.
 */
export const STANDARD_STARTING_POSITION: BoardPosition = {
  points: {
    1: { player: "black", checkerCount: 2 },
    2: null,
    3: null,
    4: null,
    5: null,
    6: { player: "white", checkerCount: 5 },
    7: null,
    8: { player: "white", checkerCount: 3 },
    9: null,
    10: null,
    11: null,
    12: { player: "black", checkerCount: 5 },
    13: { player: "white", checkerCount: 5 },
    14: null,
    15: null,
    16: null,
    17: { player: "black", checkerCount: 3 },
    18: null,
    19: { player: "black", checkerCount: 5 },
    20: null,
    21: null,
    22: null,
    23: null,
    24: { player: "white", checkerCount: 2 }
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

export const getPointOccupancy = (
  position: BoardPosition,
  point: PointIndex
): PointOccupancy | null => position.points[point];

export const countPlayerCheckers = (position: BoardPosition, player: Player): number => {
  let total = position.bar[player] + position.borneOff[player];

  for (const point of POINT_INDEXES) {
    const occupancy = position.points[point];
    if (occupancy && occupancy.player === player) {
      total += occupancy.checkerCount;
    }
  }

  return total;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isPlayer = (value: unknown): value is Player => {
  return value === "white" || value === "black";
};

const isInteger = (value: unknown): value is number => {
  return typeof value === "number" && Number.isInteger(value);
};

const isNonNegativeInteger = (value: unknown): value is number => {
  return isInteger(value) && value >= 0;
};

const isPositiveInteger = (value: unknown): value is number => {
  return isInteger(value) && value > 0;
};

const asPointIndex = (key: string): PointIndex | null => {
  const parsed = Number.parseInt(key, 10);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  if (!POINT_INDEXES.includes(parsed as PointIndex)) {
    return null;
  }

  return parsed as PointIndex;
};

export const validateBoardPosition = (input: unknown): PositionValidationResult => {
  const errors: PositionValidationError[] = [];

  if (!isRecord(input)) {
    return {
      valid: false,
      errors: [
        {
          code: "INVALID_POSITION_SHAPE",
          path: "position",
          message: "Position must be an object."
        }
      ]
    };
  }

  const pointsValue = input.points;
  const barValue = input.bar;
  const borneOffValue = input.borneOff;

  let whiteTotal = 0;
  let blackTotal = 0;
  let canValidateWhiteTotal = true;
  let canValidateBlackTotal = true;

  if (!isRecord(pointsValue)) {
    errors.push({
      code: "INVALID_POINTS_SHAPE",
      path: "points",
      message: "Points must be an object keyed by point index."
    });
    canValidateWhiteTotal = false;
    canValidateBlackTotal = false;
  } else {
    for (const key of Object.keys(pointsValue)) {
      if (asPointIndex(key) === null) {
        errors.push({
          code: "INVALID_POINT_INDEX",
          path: `points.${key}`,
          message: "Point index must be within 1..24."
        });
      }
    }

    for (const point of POINT_INDEXES) {
      const key = String(point);
      if (!(key in pointsValue)) {
        errors.push({
          code: "MISSING_POINT",
          path: `points.${point}`,
          message: "All 24 points must be present."
        });
        canValidateWhiteTotal = false;
        canValidateBlackTotal = false;
        continue;
      }

      const occupancyValue = pointsValue[key];

      if (occupancyValue === null) {
        continue;
      }

      if (!isRecord(occupancyValue)) {
        errors.push({
          code: "INVALID_POINT_OCCUPANCY",
          path: `points.${point}`,
          message: "Point occupancy must be null or an object."
        });
        canValidateWhiteTotal = false;
        canValidateBlackTotal = false;
        continue;
      }

      const playerValue = occupancyValue.player;
      const checkerCountValue = occupancyValue.checkerCount;

      if (!isPlayer(playerValue)) {
        errors.push({
          code: "INVALID_POINT_OWNER",
          path: `points.${point}.player`,
          message: "Occupied point must belong to white or black."
        });
        canValidateWhiteTotal = false;
        canValidateBlackTotal = false;
      }

      if (!isPositiveInteger(checkerCountValue)) {
        errors.push({
          code: "INVALID_POINT_CHECKER_COUNT",
          path: `points.${point}.checkerCount`,
          message: "Checker count must be a positive integer."
        });
        canValidateWhiteTotal = false;
        canValidateBlackTotal = false;
      }

      if (isPlayer(playerValue) && isPositiveInteger(checkerCountValue)) {
        if (playerValue === "white") {
          whiteTotal += checkerCountValue;
        } else {
          blackTotal += checkerCountValue;
        }
      }
    }
  }

  const validatePlayerCountGroup = (
    value: unknown,
    groupPath: "bar" | "borneOff",
    code: "INVALID_BAR_COUNT" | "INVALID_BORNE_OFF_COUNT"
  ): void => {
    if (!isRecord(value)) {
      errors.push({
        code,
        path: groupPath,
        message: `${groupPath} must be an object with white and black counts.`
      });
      canValidateWhiteTotal = false;
      canValidateBlackTotal = false;
      return;
    }

    const whiteValue = value.white;
    const blackValue = value.black;

    if (!isNonNegativeInteger(whiteValue)) {
      errors.push({
        code,
        path: `${groupPath}.white`,
        message: "Count must be a non-negative integer."
      });
      canValidateWhiteTotal = false;
    } else {
      whiteTotal += whiteValue;
    }

    if (!isNonNegativeInteger(blackValue)) {
      errors.push({
        code,
        path: `${groupPath}.black`,
        message: "Count must be a non-negative integer."
      });
      canValidateBlackTotal = false;
    } else {
      blackTotal += blackValue;
    }
  };

  validatePlayerCountGroup(barValue, "bar", "INVALID_BAR_COUNT");
  validatePlayerCountGroup(borneOffValue, "borneOff", "INVALID_BORNE_OFF_COUNT");

  if (canValidateWhiteTotal && whiteTotal !== 15) {
    errors.push({
      code: "INVALID_PLAYER_CHECKER_TOTAL",
      path: "totals.white",
      message: "White must have exactly 15 checkers."
    });
  }

  if (canValidateBlackTotal && blackTotal !== 15) {
    errors.push({
      code: "INVALID_PLAYER_CHECKER_TOTAL",
      path: "totals.black",
      message: "Black must have exactly 15 checkers."
    });
  }

  if (errors.length === 0) {
    return { valid: true };
  }

  return {
    valid: false,
    errors
  };
};

export const createInitialCubeState = (): CubeState => ({
  value: 1,
  owner: "center",
  canDouble: {
    white: true,
    black: true
  }
});
