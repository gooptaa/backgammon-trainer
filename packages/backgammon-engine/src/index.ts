import {
  POINT_INDEXES,
  type BoardPosition,
  type DieValue,
  type Player,
  type PointIndex
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

const canGenerateSimpleMoves = (position: BoardPosition, player: Player): boolean => {
  return position.bar[player] === 0;
};

const getPlayerOccupiedPoints = (
  position: BoardPosition,
  player: Player
): readonly PointIndex[] => {
  return POINT_INDEXES.filter((pointIndex) => position.points[pointIndex]?.player === player);
};

/**
 * Returns legal checker moves for a player from a board position.
 *
 * This milestone supports only basic forward one-step generation rules:
 * - one die at a time
 * - forward movement only
 * - empty destination points only
 *
 * Unsupported rule situations are intentionally omitted for now.
 */
export const getLegalMoves = (input: GetLegalMovesInput): LegalMoveResult => {
  if (!canGenerateSimpleMoves(input.position, input.player)) {
    return { moves: [] };
  }

  const moves: Move[] = [];
  const fromPoints = getPlayerOccupiedPoints(input.position, input.player);
  const diceWithIndexes = input.roll.dice.map((dieValue, dieIndex) => ({
    dieValue,
    dieIndex: dieIndex as 0 | 1
  }));

  for (const fromPoint of fromPoints) {
    for (const { dieValue, dieIndex } of diceWithIndexes) {
      const destinationPoint = getSimpleDestinationPoint(fromPoint, dieValue, input.player);
      if (destinationPoint === null) {
        continue;
      }

      if (input.position.points[destinationPoint] !== null) {
        continue;
      }

      moves.push({
        player: input.player,
        steps: [
          {
            kind: "point-to-point",
            fromPoint,
            toPoint: destinationPoint,
            dieValue,
            dieIndex,
            hitsBlot: false
          }
        ]
      });
    }
  }

  return {
    moves
  };
};
