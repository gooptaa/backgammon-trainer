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

const isHomeBoardPoint = (point: PointIndex, player: Player): boolean => {
  return player === "white" ? point >= 1 && point <= 6 : point >= 19 && point <= 24;
};

const getBearOffDistance = (point: PointIndex, player: Player): DieValue => {
  return (player === "white" ? point : 25 - point) as DieValue;
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

const canBearOff = (position: BoardPosition, player: Player): boolean => {
  if (position.bar[player] > 0) {
    return false;
  }

  const occupiedPoints = getPlayerOccupiedPoints(position, player);
  return occupiedPoints.every((point) => isHomeBoardPoint(point, player));
};

const getBearOffOriginPoint = (
  position: BoardPosition,
  player: Player,
  dieValue: DieValue
): PointIndex | null => {
  if (!canBearOff(position, player)) {
    return null;
  }

  const occupiedPoints = getPlayerOccupiedPoints(position, player);
  if (occupiedPoints.length === 0) {
    return null;
  }

  const pointsWithDistance = occupiedPoints.map((point) => ({
    point,
    distance: getBearOffDistance(point, player)
  }));

  const exactPoint = pointsWithDistance.find(({ distance }) => distance === dieValue);
  if (exactPoint !== undefined) {
    return exactPoint.point;
  }

  const belowDiePoints = pointsWithDistance.filter(({ distance }) => distance < dieValue);
  if (belowDiePoints.length === 0) {
    return null;
  }

  const farthestBelowDie = belowDiePoints.reduce((current, candidate) =>
    candidate.distance > current.distance ? candidate : current
  );
  const farthestOccupied = pointsWithDistance.reduce((current, candidate) =>
    candidate.distance > current.distance ? candidate : current
  );

  if (farthestOccupied.distance !== farthestBelowDie.distance) {
    return null;
  }

  return farthestBelowDie.point;
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

    const bearOffOriginPoint = getBearOffOriginPoint(input.position, input.player, input.dieValue);
    if (bearOffOriginPoint !== null) {
      moves.push({
        player: input.player,
        steps: [
          {
            kind: "bear-off",
            fromPoint: bearOffOriginPoint,
            toPoint: "off",
            dieValue: input.dieValue,
            dieIndex: input.dieIndex,
            hitsBlot: false
          }
        ]
      });
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

const removeCheckerFromPoint = (
  points: Record<PointIndex, PointOccupancy | null>,
  point: PointIndex,
  player: Player
): void => {
  const occupancy = points[point];
  if (occupancy === null || occupancy.player !== player) {
    throw new Error("Invalid move origin point occupancy");
  }

  if (occupancy.checkerCount === 1) {
    points[point] = null;
    return;
  }

  points[point] = {
    player,
    checkerCount: occupancy.checkerCount - 1
  };
};

const addCheckerToPoint = (
  points: Record<PointIndex, PointOccupancy | null>,
  point: PointIndex,
  player: Player
): void => {
  const occupancy = points[point];
  if (occupancy === null) {
    points[point] = {
      player,
      checkerCount: 1
    };
    return;
  }

  if (occupancy.player !== player) {
    throw new Error("Invalid move destination occupancy");
  }

  points[point] = {
    player,
    checkerCount: occupancy.checkerCount + 1
  };
};

const applyMoveStepTemporarily = (
  position: BoardPosition,
  player: Player,
  step: MoveStep
): BoardPosition => {
  const nextPoints: Record<PointIndex, PointOccupancy | null> = { ...position.points };
  const nextBar = { ...position.bar };
  const nextBorneOff = { ...position.borneOff };

  if (step.kind === "point-to-point") {
    if (step.fromPoint === "bar" || step.toPoint === "off") {
      throw new Error("Invalid point-to-point step shape");
    }

    removeCheckerFromPoint(nextPoints, step.fromPoint, player);
  } else if (step.kind === "enter-from-bar") {
    if (step.fromPoint !== "bar" || step.toPoint === "off") {
      throw new Error("Invalid enter-from-bar step shape");
    }

    if (nextBar[player] <= 0) {
      throw new Error("No checker available on bar");
    }

    nextBar[player] -= 1;
  } else if (step.kind === "bear-off") {
    if (step.fromPoint === "bar" || step.toPoint !== "off") {
      throw new Error("Invalid bear-off step shape");
    }

    removeCheckerFromPoint(nextPoints, step.fromPoint, player);
    nextBorneOff[player] += 1;
  } else {
    throw new Error("Unsupported step kind for temporary application");
  }

  if (step.hitsBlot && step.hit !== undefined) {
    const target = nextPoints[step.hit.point];
    if (target === null || target.player !== step.hit.player || target.checkerCount !== 1) {
      throw new Error("Invalid hit target occupancy");
    }

    nextPoints[step.hit.point] = null;
    nextBar[step.hit.player] += 1;
  }

  if (step.toPoint !== "off") {
    addCheckerToPoint(nextPoints, step.toPoint, player);
  }

  return {
    points: nextPoints,
    bar: nextBar,
    borneOff: nextBorneOff
  };
};

const assembleTurnCandidates = (input: GetLegalMovesInput): readonly Move[] => {
  const [firstDie, secondDie] = input.roll.dice;

  if (firstDie === secondDie) {
    return input.roll.dice.flatMap((dieValue, dieIndex) =>
      generateSingleDieMoves({
        position: input.position,
        player: input.player,
        dieValue,
        dieIndex: dieIndex as 0 | 1
      })
    );
  }

  const orders: readonly [readonly [0 | 1, 0 | 1], readonly [0 | 1, 0 | 1]] = [
    [0, 1],
    [1, 0]
  ];
  const moves: Move[] = [];

  for (const [firstDieIndex, secondDieIndex] of orders) {
    const firstSteps = generateSingleDieMoves({
      position: input.position,
      player: input.player,
      dieValue: input.roll.dice[firstDieIndex],
      dieIndex: firstDieIndex
    });

    for (const firstMove of firstSteps) {
      const firstStep = firstMove.steps[0];
      if (firstStep === undefined) {
        continue;
      }

      const temporaryPosition = applyMoveStepTemporarily(input.position, input.player, firstStep);
      const secondSteps = generateSingleDieMoves({
        position: temporaryPosition,
        player: input.player,
        dieValue: input.roll.dice[secondDieIndex],
        dieIndex: secondDieIndex
      });

      if (secondSteps.length === 0) {
        moves.push(firstMove);
        continue;
      }

      for (const secondMove of secondSteps) {
        const secondStep = secondMove.steps[0];
        if (secondStep === undefined) {
          continue;
        }

        moves.push({
          player: input.player,
          steps: [firstStep, secondStep]
        });
      }
    }
  }

  return moves;
};

const filterTurnCandidatesByDiceUsage = (
  roll: DiceRoll,
  candidates: readonly Move[]
): readonly Move[] => {
  const [firstDie, secondDie] = roll.dice;

  if (firstDie === secondDie) {
    return candidates;
  }

  const completedTurns = candidates.filter((move) => move.steps.length === 2);
  if (completedTurns.length > 0) {
    return completedTurns;
  }

  const oneStepTurns = candidates.filter((move) => move.steps.length === 1);
  if (oneStepTurns.length === 0) {
    return [];
  }

  const largerDie = firstDie > secondDie ? firstDie : secondDie;
  const smallerDie = firstDie > secondDie ? secondDie : firstDie;
  const largerDieTurns = oneStepTurns.filter((move) => move.steps[0]?.dieValue === largerDie);

  if (largerDieTurns.length > 0) {
    return largerDieTurns;
  }

  return oneStepTurns.filter((move) => move.steps[0]?.dieValue === smallerDie);
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
  const assembledTurns = assembleTurnCandidates(input);

  return {
    moves: filterTurnCandidatesByDiceUsage(input.roll, assembledTurns)
  };
};
