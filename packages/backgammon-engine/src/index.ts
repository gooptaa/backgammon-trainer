import {
  POINT_INDEXES,
  type BoardPosition,
  type DieValue,
  type Player,
  type PointIndex,
  type PointOccupancy
} from "@backgammon-trainer/backgammon-domain";

/**
 * High-level category for an individual move step.
 * These variants allow ordinary moves, hits, bar entry, and bearing off.
 */
export type MoveStepKind = "point-to-point" | "enter-from-bar" | "bear-off";

/**
 * Atomic movement within a turn.
 * Future legality logic will emit one or more steps to describe full turns.
 */
export interface MoveStep {
  readonly kind: MoveStepKind;
  readonly fromPoint: PointIndex | "bar";
  readonly toPoint: PointIndex | "off";
  readonly dieValue: DieValue;
  readonly dieIndex: 0 | 1;
  readonly hitsBlot: boolean;
  readonly hit?: {
    readonly player: Player;
    readonly point: PointIndex;
  };
}

/**
 * A complete candidate turn for a player.
 * Doubles and multi-step turns are represented as multiple ordered steps.
 */
export interface Move {
  readonly player: Player;
  readonly steps: readonly MoveStep[];
}

/**
 * Result container returned by the legal-move engine API.
 * Includes candidate turn list and optional non-fatal diagnostics.
 */
export interface LegalMoveResult {
  readonly moves: readonly Move[];
  readonly warnings?: readonly string[];
}

export interface GetLegalMovesInput {
  readonly position: BoardPosition;
  readonly player: Player;
  readonly roll: DiceRoll;
}

/**
 * Dice roll input consumed by move generation.
 *
 * For now, both dice are evaluated independently and not combined into turn sequences.
 */
export interface DiceRoll {
  readonly dice: readonly [DieValue, DieValue];
}

const isPointIndex = (value: number): value is PointIndex => {
  return Number.isInteger(value) && value >= 1 && value <= 24;
};

const getForwardDirection = (player: Player): 1 | -1 => {
  return player === "white" ? -1 : 1;
};

const getOpponent = (player: Player): Player => {
  return player === "white" ? "black" : "white";
};

const getSimpleDestinationPoint = (
  fromPoint: PointIndex,
  dieValue: DieValue,
  player: Player
): PointIndex | null => {
  const direction = getForwardDirection(player);
  const destination = fromPoint + direction * dieValue;

  if (!isPointIndex(destination)) {
    return null;
  }

  return destination;
};

const getEntryDestinationPoint = (dieValue: DieValue, player: Player): PointIndex => {
  const destination = player === "white" ? 25 - dieValue : dieValue;

  if (!isPointIndex(destination)) {
    throw new Error("Invalid bar entry destination");
  }

  return destination;
};

const requiresBarEntry = (position: BoardPosition, player: Player): boolean => {
  return position.bar[player] > 0;
};

const canGenerateSimpleMoves = (position: BoardPosition, player: Player): boolean => {
  return !requiresBarEntry(position, player);
};

const getPlayerOccupiedPoints = (
  position: BoardPosition,
  player: Player
): readonly PointIndex[] => {
  return POINT_INDEXES.filter((pointIndex) => position.points[pointIndex]?.player === player);
};

const isBlocked = (occupancy: PointOccupancy, player: Player): boolean => {
  return occupancy.player === getOpponent(player) && occupancy.checkerCount >= 2;
};

const isSingleOpponentChecker = (occupancy: PointOccupancy, player: Player): boolean => {
  return occupancy.player === getOpponent(player) && occupancy.checkerCount === 1;
};

interface CandidateMoveInput {
  readonly player: Player;
  readonly kind: MoveStepKind;
  readonly fromPoint: PointIndex | "bar";
  readonly toPoint: PointIndex;
  readonly dieValue: DieValue;
  readonly dieIndex: 0 | 1;
  readonly destinationOccupancy: PointOccupancy | null;
}

const createCandidateMove = (input: CandidateMoveInput): Move | null => {
  if (input.destinationOccupancy === null) {
    return {
      player: input.player,
      steps: [
        {
          kind: input.kind,
          fromPoint: input.fromPoint,
          toPoint: input.toPoint,
          dieValue: input.dieValue,
          dieIndex: input.dieIndex,
          hitsBlot: false
        }
      ]
    };
  }

  if (isBlocked(input.destinationOccupancy, input.player)) {
    return null;
  }

  if (isSingleOpponentChecker(input.destinationOccupancy, input.player)) {
    return {
      player: input.player,
      steps: [
        {
          kind: input.kind,
          fromPoint: input.fromPoint,
          toPoint: input.toPoint,
          dieValue: input.dieValue,
          dieIndex: input.dieIndex,
          hitsBlot: true,
          hit: {
            player: input.destinationOccupancy.player,
            point: input.toPoint
          }
        }
      ]
    };
  }

  return null;
};

interface SingleDieGenerationInput {
  readonly position: BoardPosition;
  readonly player: Player;
  readonly dieValue: DieValue;
  readonly dieIndex: 0 | 1;
}

const generateSingleDieMoves = (input: SingleDieGenerationInput): readonly Move[] => {
  const moves: Move[] = [];
  const mustEnterFromBar = requiresBarEntry(input.position, input.player);

  if (!mustEnterFromBar && canGenerateSimpleMoves(input.position, input.player)) {
    const fromPoints = getPlayerOccupiedPoints(input.position, input.player);

    for (const fromPoint of fromPoints) {
      const destinationPoint = getSimpleDestinationPoint(fromPoint, input.dieValue, input.player);
      if (destinationPoint === null) {
        continue;
      }

      const move = createCandidateMove({
        player: input.player,
        kind: "point-to-point",
        fromPoint,
        toPoint: destinationPoint,
        dieValue: input.dieValue,
        dieIndex: input.dieIndex,
        destinationOccupancy: input.position.points[destinationPoint]
      });

      if (move !== null) {
        moves.push(move);
      }
    }
  }

  if (mustEnterFromBar) {
    const destinationPoint = getEntryDestinationPoint(input.dieValue, input.player);

    const move = createCandidateMove({
      player: input.player,
      kind: "enter-from-bar",
      fromPoint: "bar",
      toPoint: destinationPoint,
      dieValue: input.dieValue,
      dieIndex: input.dieIndex,
      destinationOccupancy: input.position.points[destinationPoint]
    });

    if (move !== null) {
      moves.push(move);
    }
  }

  return moves;
};

const generateTurnCandidates = (input: GetLegalMovesInput): readonly Move[] => {
  return input.roll.dice.flatMap((dieValue, dieIndex) =>
    generateSingleDieMoves({
      position: input.position,
      player: input.player,
      dieValue,
      dieIndex: dieIndex as 0 | 1
    })
  );
};

/**
 * Returns legal checker moves for a player from a board position.
 *
 * This milestone supports only basic forward one-step generation rules:
 * - one die at a time
 * - forward movement only
 * - empty destinations and single-opponent hits
 *
 * Unsupported rule situations are intentionally omitted for now.
 */
export const getLegalMoves = (input: GetLegalMovesInput): LegalMoveResult => {
  return {
    moves: generateTurnCandidates(input)
  };
};
