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
 * One turn may contain multiple steps, including up to four on doubles.
 * For doubles, dieIndex values 0,1,2,3 represent the ordered die uses.
 */
export interface MoveStep {
  readonly kind: MoveStepKind;
  readonly fromPoint: PointIndex | "bar";
  readonly toPoint: PointIndex | "off";
  readonly dieValue: DieValue;
  readonly dieIndex: 0 | 1 | 2 | 3;
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

export interface MovePrefixStep {
  readonly fromPoint: PointIndex | "bar";
  readonly toPoint: PointIndex | "off";
}

/**
 * Result container returned by the legal-move engine API.
 * Includes candidate turn list and optional non-fatal diagnostics.
 */
export interface LegalMoveResult {
  readonly moves: readonly Move[];
  readonly warnings?: readonly string[];
}

export type GameStatus =
  | {
      readonly state: "in-progress";
    }
  | {
      readonly state: "complete";
      readonly winner: Player;
    };

export interface GameState {
  readonly position: BoardPosition;
  readonly activePlayer: Player;
  readonly dice: DiceRoll | null;
}

export type SetDiceFailureReason = "game-complete" | "dice-already-set";

export type SetDiceResult =
  | {
      readonly ok: true;
      readonly state: GameState;
    }
  | {
      readonly ok: false;
      readonly reason: SetDiceFailureReason;
    };

export type GetLegalMovesForStateFailureReason = "game-complete" | "dice-not-set";

export type GetLegalMovesForStateResult =
  | {
      readonly ok: true;
      readonly moves: readonly Move[];
      readonly warnings?: readonly string[];
    }
  | {
      readonly ok: false;
      readonly reason: GetLegalMovesForStateFailureReason;
      readonly moves: readonly [];
    };

export type ApplyGameMoveFailureReason = "game-complete" | "dice-not-set" | ApplyMoveFailureReason;

export type ApplyGameMoveResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly status: GameStatus;
    }
  | {
      readonly ok: false;
      readonly reason: ApplyGameMoveFailureReason;
    };

export type PassTurnFailureReason = "game-complete" | "dice-not-set" | "legal-moves-available";

export type PassTurnResult =
  | {
      readonly ok: true;
      readonly state: GameState;
    }
  | {
      readonly ok: false;
      readonly reason: PassTurnFailureReason;
    };

export type ApplyMoveFailureReason = "illegal-move" | "invalid-step-sequence";

export type PreviewMovePrefixFailureReason =
  "illegal-prefix" | "invalid-step-sequence" | "ambiguous-prefix";

export type PreviewMovePrefixResult =
  | {
      readonly ok: true;
      readonly position: BoardPosition;
      readonly candidateMoves: readonly Move[];
    }
  | {
      readonly ok: false;
      readonly reason: PreviewMovePrefixFailureReason;
    };

export type ApplyMoveResult =
  | {
      readonly ok: true;
      readonly position: BoardPosition;
    }
  | {
      readonly ok: false;
      readonly reason: ApplyMoveFailureReason;
    };

export interface GetLegalMovesInput {
  readonly position: BoardPosition;
  readonly player: Player;
  readonly roll: DiceRoll;
}

/**
 * Dice roll input consumed by move generation.
 */
export interface DiceRoll {
  readonly dice: readonly [DieValue, DieValue];
}

const isPointIndex = (value: number): value is PointIndex => {
  return Number.isInteger(value) && value >= 1 && value <= 24;
};

const WINNING_BORNE_OFF_COUNT = 15;

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
  readonly dieIndex: 0 | 1 | 2 | 3;
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

  if (input.destinationOccupancy.player === input.player) {
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

  return null;
};

interface SingleDieGenerationInput {
  readonly position: BoardPosition;
  readonly player: Player;
  readonly dieValue: DieValue;
  readonly dieIndex: 0 | 1 | 2 | 3;
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

const applyMoveStepUnchecked = (
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

const areStepsEquivalent = (expected: MoveStep, supplied: MoveStep): boolean => {
  if (
    expected.kind !== supplied.kind ||
    expected.fromPoint !== supplied.fromPoint ||
    expected.toPoint !== supplied.toPoint ||
    expected.dieValue !== supplied.dieValue ||
    expected.dieIndex !== supplied.dieIndex ||
    expected.hitsBlot !== supplied.hitsBlot
  ) {
    return false;
  }

  if (expected.hit === undefined && supplied.hit === undefined) {
    return true;
  }

  if (expected.hit === undefined || supplied.hit === undefined) {
    return false;
  }

  return expected.hit.player === supplied.hit.player && expected.hit.point === supplied.hit.point;
};

const isValidPrefixStepShape = (step: MovePrefixStep): boolean => {
  if (step.fromPoint === "bar") {
    return step.toPoint !== "off";
  }

  if (step.toPoint === "off") {
    return true;
  }

  return true;
};

const moveStartsWithPrefixSteps = (move: Move, prefixSteps: readonly MovePrefixStep[]): boolean => {
  if (prefixSteps.length > move.steps.length) {
    return false;
  }

  return prefixSteps.every((prefixStep, index) => {
    const moveStep = move.steps[index];
    return (
      moveStep !== undefined &&
      moveStep.fromPoint === prefixStep.fromPoint &&
      moveStep.toPoint === prefixStep.toPoint
    );
  });
};

const arePositionsEquivalent = (first: BoardPosition, second: BoardPosition): boolean => {
  if (
    first.bar.white !== second.bar.white ||
    first.bar.black !== second.bar.black ||
    first.borneOff.white !== second.borneOff.white ||
    first.borneOff.black !== second.borneOff.black
  ) {
    return false;
  }

  return POINT_INDEXES.every((pointIndex) => {
    const firstOccupancy = first.points[pointIndex];
    const secondOccupancy = second.points[pointIndex];

    if (firstOccupancy === null || secondOccupancy === null) {
      return firstOccupancy === secondOccupancy;
    }

    return (
      firstOccupancy.player === secondOccupancy.player &&
      firstOccupancy.checkerCount === secondOccupancy.checkerCount
    );
  });
};

const projectMovePrefixPosition = (
  position: BoardPosition,
  player: Player,
  move: Move,
  prefixLength: number
): BoardPosition | null => {
  let stagedPosition = position;

  for (let stepIndex = 0; stepIndex < prefixLength; stepIndex += 1) {
    const step = move.steps[stepIndex];

    if (step === undefined) {
      return null;
    }

    stagedPosition = applyMoveStepUnchecked(stagedPosition, player, step);
  }

  return stagedPosition;
};

export const areMovesEquivalent = (expected: Move, supplied: Move): boolean => {
  if (expected.player !== supplied.player || expected.steps.length !== supplied.steps.length) {
    return false;
  }

  return expected.steps.every((step, stepIndex) => {
    const suppliedStep = supplied.steps[stepIndex];
    return suppliedStep !== undefined && areStepsEquivalent(step, suppliedStep);
  });
};

const isMoveStepSequenceWellFormed = (move: Move): boolean => {
  if (move.steps.length === 0) {
    return false;
  }

  return move.steps.every((step) => {
    if (step.hitsBlot !== (step.hit !== undefined)) {
      return false;
    }

    if (step.kind === "point-to-point") {
      return step.fromPoint !== "bar" && step.toPoint !== "off";
    }

    if (step.kind === "enter-from-bar") {
      return step.fromPoint === "bar" && step.toPoint !== "off";
    }

    if (step.kind === "bear-off") {
      return step.fromPoint !== "bar" && step.toPoint === "off";
    }

    return false;
  });
};

interface DieUse {
  readonly dieValue: DieValue;
  readonly dieIndex: 0 | 1 | 2 | 3;
}

const buildTurnCandidatesRecursively = (
  position: BoardPosition,
  player: Player,
  orderedDieUses: readonly DieUse[],
  currentDepth: number,
  accumulatedSteps: readonly MoveStep[]
): readonly Move[] => {
  if (currentDepth >= orderedDieUses.length) {
    return accumulatedSteps.length === 0
      ? []
      : [
          {
            player,
            steps: accumulatedSteps
          }
        ];
  }

  const dieUse = orderedDieUses[currentDepth];
  if (dieUse === undefined) {
    return accumulatedSteps.length === 0
      ? []
      : [
          {
            player,
            steps: accumulatedSteps
          }
        ];
  }

  const nextSteps = generateSingleDieMoves({
    position,
    player,
    dieValue: dieUse.dieValue,
    dieIndex: dieUse.dieIndex
  });

  if (nextSteps.length === 0) {
    return accumulatedSteps.length === 0
      ? []
      : [
          {
            player,
            steps: accumulatedSteps
          }
        ];
  }

  const candidates: Move[] = [];

  for (const nextMove of nextSteps) {
    const nextStep = nextMove.steps[0];
    if (nextStep === undefined) {
      continue;
    }

    const temporaryPosition = applyMoveStepUnchecked(position, player, nextStep);
    const continuation = buildTurnCandidatesRecursively(
      temporaryPosition,
      player,
      orderedDieUses,
      currentDepth + 1,
      [...accumulatedSteps, nextStep]
    );

    candidates.push(...continuation);
  }

  return candidates;
};

const assembleTurnCandidates = (input: GetLegalMovesInput): readonly Move[] => {
  const [firstDie, secondDie] = input.roll.dice;

  if (firstDie === secondDie) {
    return buildTurnCandidatesRecursively(
      input.position,
      input.player,
      [
        { dieValue: firstDie, dieIndex: 0 },
        { dieValue: firstDie, dieIndex: 1 },
        { dieValue: firstDie, dieIndex: 2 },
        { dieValue: firstDie, dieIndex: 3 }
      ],
      0,
      []
    );
  }

  const orders: readonly [readonly [0 | 1, 0 | 1], readonly [0 | 1, 0 | 1]] = [
    [0, 1],
    [1, 0]
  ];

  return orders.flatMap(([firstDieIndex, secondDieIndex]) =>
    buildTurnCandidatesRecursively(
      input.position,
      input.player,
      [
        { dieValue: input.roll.dice[firstDieIndex], dieIndex: firstDieIndex },
        { dieValue: input.roll.dice[secondDieIndex], dieIndex: secondDieIndex }
      ],
      0,
      []
    )
  );
};

const filterTurnCandidatesByDiceUsage = (
  roll: DiceRoll,
  candidates: readonly Move[]
): readonly Move[] => {
  const [firstDie, secondDie] = roll.dice;

  if (firstDie === secondDie) {
    if (candidates.length === 0) {
      return [];
    }

    const maxPlayableSteps = Math.max(...candidates.map((move) => move.steps.length));
    return candidates.filter((move) => move.steps.length === maxPlayableSteps);
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

export const previewMovePrefix = (
  position: BoardPosition,
  player: Player,
  dice: DiceRoll,
  selectedSteps: readonly MovePrefixStep[]
): PreviewMovePrefixResult => {
  if (!selectedSteps.every(isValidPrefixStepShape)) {
    return {
      ok: false,
      reason: "invalid-step-sequence"
    };
  }

  const legalMoves = getLegalMoves({
    position,
    player,
    roll: dice
  }).moves;

  const candidateMoves = legalMoves.filter((move) =>
    moveStartsWithPrefixSteps(move, selectedSteps)
  );

  if (candidateMoves.length === 0) {
    return {
      ok: false,
      reason: "illegal-prefix"
    };
  }

  try {
    const projectedPositions = candidateMoves.map((candidateMove) =>
      projectMovePrefixPosition(position, player, candidateMove, selectedSteps.length)
    );
    const firstProjectedPosition = projectedPositions[0];

    if (firstProjectedPosition === undefined || firstProjectedPosition === null) {
      return {
        ok: false,
        reason: "invalid-step-sequence"
      };
    }

    for (const projectedPosition of projectedPositions) {
      if (projectedPosition === null) {
        return {
          ok: false,
          reason: "invalid-step-sequence"
        };
      }

      if (!arePositionsEquivalent(firstProjectedPosition, projectedPosition)) {
        return {
          ok: false,
          reason: "ambiguous-prefix"
        };
      }
    }

    return {
      ok: true,
      position: firstProjectedPosition,
      candidateMoves
    };
  } catch {
    return {
      ok: false,
      reason: "invalid-step-sequence"
    };
  }
};

export const applyMove = (
  position: BoardPosition,
  player: Player,
  dice: DiceRoll,
  move: Move
): ApplyMoveResult => {
  if (!isMoveStepSequenceWellFormed(move)) {
    return {
      ok: false,
      reason: "invalid-step-sequence"
    };
  }

  const legalMoves = getLegalMoves({
    position,
    player,
    roll: dice
  }).moves;
  const matchedLegalMove = legalMoves.find((legalMove) => areMovesEquivalent(legalMove, move));

  if (matchedLegalMove === undefined) {
    return {
      ok: false,
      reason: "illegal-move"
    };
  }

  let nextPosition = position;

  try {
    for (const step of matchedLegalMove.steps) {
      nextPosition = applyMoveStepUnchecked(nextPosition, player, step);
    }
  } catch {
    return {
      ok: false,
      reason: "invalid-step-sequence"
    };
  }

  return {
    ok: true,
    position: nextPosition
  };
};

export const getGameStatus = (position: BoardPosition): GameStatus => {
  const whiteComplete = position.borneOff.white === WINNING_BORNE_OFF_COUNT;
  const blackComplete = position.borneOff.black === WINNING_BORNE_OFF_COUNT;

  if (whiteComplete !== blackComplete) {
    return {
      state: "complete",
      winner: whiteComplete ? "white" : "black"
    };
  }

  return {
    state: "in-progress"
  };
};

const cloneDiceRoll = (dice: DiceRoll): DiceRoll => {
  return {
    dice: [dice.dice[0], dice.dice[1]]
  };
};

export const createGameState = (position: BoardPosition, activePlayer: Player): GameState => {
  return {
    position,
    activePlayer,
    dice: null
  };
};

export const setDice = (state: GameState, dice: DiceRoll): SetDiceResult => {
  if (getGameStatus(state.position).state === "complete") {
    return {
      ok: false,
      reason: "game-complete"
    };
  }

  if (state.dice !== null) {
    return {
      ok: false,
      reason: "dice-already-set"
    };
  }

  return {
    ok: true,
    state: {
      position: state.position,
      activePlayer: state.activePlayer,
      dice: cloneDiceRoll(dice)
    }
  };
};

export const getLegalMovesForState = (state: GameState): GetLegalMovesForStateResult => {
  if (getGameStatus(state.position).state === "complete") {
    return {
      ok: false,
      reason: "game-complete",
      moves: []
    };
  }

  if (state.dice === null) {
    return {
      ok: false,
      reason: "dice-not-set",
      moves: []
    };
  }

  return {
    ok: true,
    ...getLegalMoves({
      position: state.position,
      player: state.activePlayer,
      roll: state.dice
    })
  };
};

export const applyGameMove = (state: GameState, move: Move): ApplyGameMoveResult => {
  if (getGameStatus(state.position).state === "complete") {
    return {
      ok: false,
      reason: "game-complete"
    };
  }

  if (state.dice === null) {
    return {
      ok: false,
      reason: "dice-not-set"
    };
  }

  const applied = applyMove(state.position, state.activePlayer, state.dice, move);

  if (!applied.ok) {
    return {
      ok: false,
      reason: applied.reason
    };
  }

  const status = getGameStatus(applied.position);

  return {
    ok: true,
    status,
    state: {
      position: applied.position,
      activePlayer:
        status.state === "complete" ? state.activePlayer : getOpponent(state.activePlayer),
      dice: null
    }
  };
};

export const passTurn = (state: GameState): PassTurnResult => {
  if (getGameStatus(state.position).state === "complete") {
    return {
      ok: false,
      reason: "game-complete"
    };
  }

  if (state.dice === null) {
    return {
      ok: false,
      reason: "dice-not-set"
    };
  }

  const legalMoves = getLegalMoves({
    position: state.position,
    player: state.activePlayer,
    roll: state.dice
  });

  if (legalMoves.moves.length > 0) {
    return {
      ok: false,
      reason: "legal-moves-available"
    };
  }

  return {
    ok: true,
    state: {
      position: state.position,
      activePlayer: getOpponent(state.activePlayer),
      dice: null
    }
  };
};
