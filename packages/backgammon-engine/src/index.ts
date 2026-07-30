import {
  POINT_INDEXES,
  STANDARD_STARTING_POSITION,
  type BoardPosition,
  type DieValue,
  type Player,
  type PointIndex,
  type PointOccupancy,
  validateBoardPosition
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

export type TurnPhase = "opening" | "normal";

export type TurnOutcome =
  | {
      readonly kind: "move";
      readonly move: Move;
    }
  | {
      readonly kind: "pass";
    };

export interface TurnRecord {
  readonly turnNumber: number;
  readonly player: Player;
  readonly dice: DiceRoll;
  readonly outcome: TurnOutcome;
  readonly positionBefore: BoardPosition;
  readonly positionAfter: BoardPosition;
  readonly gameStatusAfter: GameStatus;
  readonly phase: TurnPhase;
}

export interface CreateTurnRecordInput {
  readonly turnNumber: number;
  readonly player: Player;
  readonly dice: DiceRoll;
  readonly outcome: TurnOutcome;
  readonly positionBefore: BoardPosition;
  readonly positionAfter: BoardPosition;
  readonly gameStatusAfter: GameStatus;
  readonly phase: TurnPhase;
}

export const GAME_SNAPSHOT_FORMAT = "backgammon-trainer-game";
export const GAME_SNAPSHOT_VERSION = 1;

export type SnapshotOpeningState =
  | {
      readonly phase: "waiting";
      readonly openingTurnPending: false;
    }
  | {
      readonly phase: "tied";
      readonly whiteDie: DieValue;
      readonly blackDie: DieValue;
      readonly openingTurnPending: false;
    }
  | {
      readonly phase: "resolved";
      readonly whiteDie: DieValue;
      readonly blackDie: DieValue;
      readonly startingPlayer: Player;
      readonly openingTurnPending: boolean;
    };

export interface GameSnapshot {
  readonly savedAt: string;
  readonly gameState: GameState;
  readonly turnHistory: readonly TurnRecord[];
  readonly openingState: SnapshotOpeningState;
}

export interface SerializedGameStateV1 {
  readonly position: BoardPosition;
  readonly activePlayer: Player;
  readonly dice: DiceRoll | null;
}

export type SerializedTurnRecordV1 = TurnRecord;
export type SerializedOpeningStateV1 = SnapshotOpeningState;

export interface SerializedGameSnapshotV1 {
  readonly format: typeof GAME_SNAPSHOT_FORMAT;
  readonly version: typeof GAME_SNAPSHOT_VERSION;
  readonly savedAt: string;
  readonly gameState: SerializedGameStateV1;
  readonly turnHistory: readonly SerializedTurnRecordV1[];
  readonly openingState: SerializedOpeningStateV1;
}

export type ParseGameSnapshotFailureReason =
  | "invalid-json"
  | "wrong-format"
  | "unsupported-version"
  | "invalid-structure"
  | "invalid-domain-state";

export type ParseGameSnapshotResult =
  | {
      readonly ok: true;
      readonly snapshot: GameSnapshot;
    }
  | {
      readonly ok: false;
      readonly reason: ParseGameSnapshotFailureReason;
      readonly message: string;
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

const cloneBoardPosition = (position: BoardPosition): BoardPosition => {
  const nextPoints: Record<PointIndex, PointOccupancy | null> = { ...position.points };

  for (const pointIndex of POINT_INDEXES) {
    const occupancy = position.points[pointIndex];

    nextPoints[pointIndex] =
      occupancy === null
        ? null
        : {
            player: occupancy.player,
            checkerCount: occupancy.checkerCount
          };
  }

  return {
    points: nextPoints,
    bar: {
      white: position.bar.white,
      black: position.bar.black
    },
    borneOff: {
      white: position.borneOff.white,
      black: position.borneOff.black
    }
  };
};

const cloneMove = (move: Move): Move => {
  return {
    player: move.player,
    steps: move.steps.map((step) => ({
      kind: step.kind,
      fromPoint: step.fromPoint,
      toPoint: step.toPoint,
      dieValue: step.dieValue,
      dieIndex: step.dieIndex,
      hitsBlot: step.hitsBlot,
      ...(step.hit === undefined
        ? {}
        : {
            hit: {
              player: step.hit.player,
              point: step.hit.point
            }
          })
    }))
  };
};

const cloneGameStatus = (status: GameStatus): GameStatus => {
  return status.state === "in-progress" ? { state: "in-progress" } : { ...status };
};

const cloneTurnOutcome = (outcome: TurnOutcome): TurnOutcome => {
  if (outcome.kind === "pass") {
    return {
      kind: "pass"
    };
  }

  return {
    kind: "move",
    move: cloneMove(outcome.move)
  };
};

const cloneGameState = (state: GameState): GameState => {
  return {
    position: cloneBoardPosition(state.position),
    activePlayer: state.activePlayer,
    dice: state.dice === null ? null : cloneDiceRoll(state.dice)
  };
};

const cloneSnapshotOpeningState = (openingState: SnapshotOpeningState): SnapshotOpeningState => {
  if (openingState.phase === "waiting") {
    return {
      phase: "waiting",
      openingTurnPending: false
    };
  }

  if (openingState.phase === "tied") {
    return {
      phase: "tied",
      whiteDie: openingState.whiteDie,
      blackDie: openingState.blackDie,
      openingTurnPending: false
    };
  }

  return {
    phase: "resolved",
    whiteDie: openingState.whiteDie,
    blackDie: openingState.blackDie,
    startingPlayer: openingState.startingPlayer,
    openingTurnPending: openingState.openingTurnPending
  };
};

const failSnapshotParse = (
  reason: ParseGameSnapshotFailureReason,
  message: string
): ParseGameSnapshotResult => {
  return {
    ok: false,
    reason,
    message
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isPlayerValue = (value: unknown): value is Player => {
  return value === "white" || value === "black";
};

const isDieValue = (value: unknown): value is DieValue => {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 6;
};

const parseDiceRoll = (
  value: unknown,
  path: string
): { ok: true; dice: DiceRoll } | { ok: false; result: ParseGameSnapshotResult } => {
  if (!isRecord(value) || !Array.isArray(value.dice) || value.dice.length !== 2) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-structure", `${path}.dice must contain exactly two dice.`)
    };
  }

  const diceValues = value.dice as readonly unknown[];
  const dieOne = diceValues[0];
  const dieTwo = diceValues[1];

  if (!isDieValue(dieOne) || !isDieValue(dieTwo)) {
    return {
      ok: false,
      result: failSnapshotParse(
        "invalid-domain-state",
        `${path}.dice must contain values 1 through 6.`
      )
    };
  }

  return {
    ok: true,
    dice: {
      dice: [dieOne, dieTwo]
    }
  };
};

const parseBoardPosition = (
  value: unknown,
  path: string
): { ok: true; position: BoardPosition } | { ok: false; result: ParseGameSnapshotResult } => {
  if (!isRecord(value)) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-structure", `${path} must be an object.`)
    };
  }

  const validated = validateBoardPosition(value);

  if (!validated.valid) {
    return {
      ok: false,
      result: failSnapshotParse(
        "invalid-domain-state",
        `${path} is invalid: ${validated.errors[0]?.message ?? "position validation failed"}`
      )
    };
  }

  const points = value.points as Record<string, unknown>;
  const bar = value.bar as Record<string, unknown>;
  const borneOff = value.borneOff as Record<string, unknown>;

  const nextPoints = {} as Record<PointIndex, PointOccupancy | null>;

  for (const point of POINT_INDEXES) {
    const occupancy = points[String(point)];

    if (occupancy === null) {
      nextPoints[point] = null;
      continue;
    }

    const occupancyRecord = occupancy as Record<string, unknown>;
    nextPoints[point] = {
      player: occupancyRecord.player as Player,
      checkerCount: occupancyRecord.checkerCount as number
    };
  }

  return {
    ok: true,
    position: {
      points: nextPoints,
      bar: {
        white: bar.white as number,
        black: bar.black as number
      },
      borneOff: {
        white: borneOff.white as number,
        black: borneOff.black as number
      }
    }
  };
};

const areBoardPositionsEqual = (left: BoardPosition, right: BoardPosition): boolean => {
  for (const point of POINT_INDEXES) {
    const leftOccupancy = left.points[point];
    const rightOccupancy = right.points[point];

    if (leftOccupancy === null && rightOccupancy === null) {
      continue;
    }

    if (leftOccupancy === null || rightOccupancy === null) {
      return false;
    }

    if (
      leftOccupancy.player !== rightOccupancy.player ||
      leftOccupancy.checkerCount !== rightOccupancy.checkerCount
    ) {
      return false;
    }
  }

  return (
    left.bar.white === right.bar.white &&
    left.bar.black === right.bar.black &&
    left.borneOff.white === right.borneOff.white &&
    left.borneOff.black === right.borneOff.black
  );
};

const parseMoveStep = (
  value: unknown,
  path: string
): { ok: true; step: MoveStep } | { ok: false; result: ParseGameSnapshotResult } => {
  if (!isRecord(value)) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-structure", `${path} must be an object.`)
    };
  }

  const kind = value.kind;
  const fromPoint = value.fromPoint;
  const toPoint = value.toPoint;
  const dieValue = value.dieValue;
  const dieIndex = value.dieIndex;
  const hitsBlot = value.hitsBlot;

  if (kind !== "point-to-point" && kind !== "enter-from-bar" && kind !== "bear-off") {
    return {
      ok: false,
      result: failSnapshotParse("invalid-domain-state", `${path}.kind is invalid.`)
    };
  }

  if (fromPoint !== "bar" && !isPointIndex(fromPoint as number)) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-domain-state", `${path}.fromPoint is invalid.`)
    };
  }

  if (toPoint !== "off" && !isPointIndex(toPoint as number)) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-domain-state", `${path}.toPoint is invalid.`)
    };
  }

  if (!isDieValue(dieValue)) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-domain-state", `${path}.dieValue must be between 1 and 6.`)
    };
  }

  if (typeof dieIndex !== "number" || !Number.isInteger(dieIndex) || dieIndex < 0 || dieIndex > 3) {
    return {
      ok: false,
      result: failSnapshotParse(
        "invalid-domain-state",
        `${path}.dieIndex must be an integer from 0 through 3.`
      )
    };
  }

  if (typeof hitsBlot !== "boolean") {
    return {
      ok: false,
      result: failSnapshotParse("invalid-structure", `${path}.hitsBlot must be a boolean.`)
    };
  }

  if (kind === "point-to-point" && (fromPoint === "bar" || toPoint === "off")) {
    return {
      ok: false,
      result: failSnapshotParse(
        "invalid-domain-state",
        `${path} has incompatible coordinates for point-to-point.`
      )
    };
  }

  if (kind === "enter-from-bar" && (fromPoint !== "bar" || toPoint === "off")) {
    return {
      ok: false,
      result: failSnapshotParse(
        "invalid-domain-state",
        `${path} has incompatible coordinates for enter-from-bar.`
      )
    };
  }

  if (kind === "bear-off" && (fromPoint === "bar" || toPoint !== "off")) {
    return {
      ok: false,
      result: failSnapshotParse(
        "invalid-domain-state",
        `${path} has incompatible coordinates for bear-off.`
      )
    };
  }

  const hitValue = value.hit;

  if (!hitsBlot && hitValue !== undefined) {
    return {
      ok: false,
      result: failSnapshotParse(
        "invalid-domain-state",
        `${path}.hit must be omitted when hitsBlot is false.`
      )
    };
  }

  if (hitsBlot) {
    if (
      !isRecord(hitValue) ||
      !isPlayerValue(hitValue.player) ||
      !isPointIndex(hitValue.point as number)
    ) {
      return {
        ok: false,
        result: failSnapshotParse("invalid-domain-state", `${path}.hit metadata is invalid.`)
      };
    }
  }

  return {
    ok: true,
    step: {
      kind,
      fromPoint: fromPoint as PointIndex | "bar",
      toPoint: toPoint as PointIndex | "off",
      dieValue,
      dieIndex: dieIndex as 0 | 1 | 2 | 3,
      hitsBlot,
      ...(hitsBlot
        ? {
            hit: {
              player: (hitValue as Record<string, unknown>).player as Player,
              point: (hitValue as Record<string, unknown>).point as PointIndex
            }
          }
        : {})
    }
  };
};

const parseMove = (
  value: unknown,
  path: string
): { ok: true; move: Move } | { ok: false; result: ParseGameSnapshotResult } => {
  if (!isRecord(value)) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-structure", `${path} must be an object.`)
    };
  }

  if (!isPlayerValue(value.player)) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-domain-state", `${path}.player is invalid.`)
    };
  }

  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-domain-state", `${path}.steps must be a non-empty array.`)
    };
  }

  const parsedSteps: MoveStep[] = [];

  for (let index = 0; index < value.steps.length; index += 1) {
    const parsedStep = parseMoveStep(value.steps[index], `${path}.steps[${index}]`);

    if (!parsedStep.ok) {
      return parsedStep;
    }

    parsedSteps.push(parsedStep.step);
  }

  return {
    ok: true,
    move: {
      player: value.player,
      steps: parsedSteps
    }
  };
};

const parseGameStatusValue = (
  value: unknown,
  path: string
): { ok: true; status: GameStatus } | { ok: false; result: ParseGameSnapshotResult } => {
  if (!isRecord(value)) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-structure", `${path} must be an object.`)
    };
  }

  if (value.state === "in-progress") {
    return {
      ok: true,
      status: {
        state: "in-progress"
      }
    };
  }

  if (value.state === "complete" && isPlayerValue(value.winner)) {
    return {
      ok: true,
      status: {
        state: "complete",
        winner: value.winner
      }
    };
  }

  return {
    ok: false,
    result: failSnapshotParse("invalid-domain-state", `${path} is invalid.`)
  };
};

const parseTurnRecordValue = (
  value: unknown,
  expectedTurnNumber: number,
  path: string
): { ok: true; record: TurnRecord } | { ok: false; result: ParseGameSnapshotResult } => {
  if (!isRecord(value)) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-structure", `${path} must be an object.`)
    };
  }

  if (value.turnNumber !== expectedTurnNumber) {
    return {
      ok: false,
      result: failSnapshotParse(
        "invalid-domain-state",
        `${path}.turnNumber must be contiguous and start at 1.`
      )
    };
  }

  if (!isPlayerValue(value.player)) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-domain-state", `${path}.player is invalid.`)
    };
  }

  if (value.phase !== "opening" && value.phase !== "normal") {
    return {
      ok: false,
      result: failSnapshotParse("invalid-domain-state", `${path}.phase is invalid.`)
    };
  }

  const parsedDice = parseDiceRoll(value.dice, `${path}.dice`);
  if (!parsedDice.ok) {
    return parsedDice;
  }

  const parsedBefore = parseBoardPosition(value.positionBefore, `${path}.positionBefore`);
  if (!parsedBefore.ok) {
    return parsedBefore;
  }

  const parsedAfter = parseBoardPosition(value.positionAfter, `${path}.positionAfter`);
  if (!parsedAfter.ok) {
    return parsedAfter;
  }

  const parsedGameStatus = parseGameStatusValue(value.gameStatusAfter, `${path}.gameStatusAfter`);
  if (!parsedGameStatus.ok) {
    return parsedGameStatus;
  }

  const expectedGameStatus = getGameStatus(parsedAfter.position);

  if (
    parsedGameStatus.status.state !== expectedGameStatus.state ||
    (parsedGameStatus.status.state === "complete" &&
      expectedGameStatus.state === "complete" &&
      parsedGameStatus.status.winner !== expectedGameStatus.winner)
  ) {
    return {
      ok: false,
      result: failSnapshotParse(
        "invalid-domain-state",
        `${path}.gameStatusAfter does not match positionAfter.`
      )
    };
  }

  if (
    !isRecord(value.outcome) ||
    (value.outcome.kind !== "move" && value.outcome.kind !== "pass")
  ) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-domain-state", `${path}.outcome is invalid.`)
    };
  }

  let outcome: TurnOutcome;

  if (value.outcome.kind === "pass") {
    outcome = {
      kind: "pass"
    };
  } else {
    const parsedMove = parseMove(value.outcome.move, `${path}.outcome.move`);
    if (!parsedMove.ok) {
      return parsedMove;
    }

    if (parsedMove.move.player !== value.player) {
      return {
        ok: false,
        result: failSnapshotParse(
          "invalid-domain-state",
          `${path}.outcome.move.player must match record player.`
        )
      };
    }

    outcome = {
      kind: "move",
      move: parsedMove.move
    };
  }

  return {
    ok: true,
    record: createTurnRecord({
      turnNumber: expectedTurnNumber,
      player: value.player,
      dice: parsedDice.dice,
      outcome,
      positionBefore: parsedBefore.position,
      positionAfter: parsedAfter.position,
      gameStatusAfter: parsedGameStatus.status,
      phase: value.phase
    })
  };
};

const parseOpeningStateValue = (
  value: unknown,
  path: string
):
  | { ok: true; openingState: SnapshotOpeningState }
  | { ok: false; result: ParseGameSnapshotResult } => {
  if (!isRecord(value)) {
    return {
      ok: false,
      result: failSnapshotParse("invalid-structure", `${path} must be an object.`)
    };
  }

  if (typeof value.openingTurnPending !== "boolean") {
    return {
      ok: false,
      result: failSnapshotParse(
        "invalid-structure",
        `${path}.openingTurnPending must be a boolean.`
      )
    };
  }

  if (value.phase === "waiting") {
    if (value.openingTurnPending) {
      return {
        ok: false,
        result: failSnapshotParse(
          "invalid-domain-state",
          `${path}.openingTurnPending cannot be true when phase is waiting.`
        )
      };
    }

    return {
      ok: true,
      openingState: {
        phase: "waiting",
        openingTurnPending: false
      }
    };
  }

  if (value.phase === "tied") {
    if (!isDieValue(value.whiteDie) || !isDieValue(value.blackDie)) {
      return {
        ok: false,
        result: failSnapshotParse(
          "invalid-domain-state",
          `${path} tied dice must be between 1 and 6.`
        )
      };
    }

    if (value.whiteDie !== value.blackDie) {
      return {
        ok: false,
        result: failSnapshotParse("invalid-domain-state", `${path} tied phase requires equal dice.`)
      };
    }

    if (value.openingTurnPending) {
      return {
        ok: false,
        result: failSnapshotParse(
          "invalid-domain-state",
          `${path}.openingTurnPending cannot be true when phase is tied.`
        )
      };
    }

    return {
      ok: true,
      openingState: {
        phase: "tied",
        whiteDie: value.whiteDie,
        blackDie: value.blackDie,
        openingTurnPending: false
      }
    };
  }

  if (value.phase === "resolved") {
    if (
      !isDieValue(value.whiteDie) ||
      !isDieValue(value.blackDie) ||
      !isPlayerValue(value.startingPlayer)
    ) {
      return {
        ok: false,
        result: failSnapshotParse("invalid-domain-state", `${path} resolved fields are invalid.`)
      };
    }

    if (value.whiteDie === value.blackDie) {
      return {
        ok: false,
        result: failSnapshotParse(
          "invalid-domain-state",
          `${path} resolved phase requires unequal dice.`
        )
      };
    }

    const expectedStarter = value.whiteDie > value.blackDie ? "white" : "black";

    if (value.startingPlayer !== expectedStarter) {
      return {
        ok: false,
        result: failSnapshotParse(
          "invalid-domain-state",
          `${path}.startingPlayer must match the higher opening die.`
        )
      };
    }

    return {
      ok: true,
      openingState: {
        phase: "resolved",
        whiteDie: value.whiteDie,
        blackDie: value.blackDie,
        startingPlayer: value.startingPlayer,
        openingTurnPending: value.openingTurnPending
      }
    };
  }

  return {
    ok: false,
    result: failSnapshotParse("invalid-domain-state", `${path}.phase is invalid.`)
  };
};

const serializeTurnRecord = (record: TurnRecord): SerializedTurnRecordV1 => {
  return createTurnRecord(record);
};

const parseSerializedGameSnapshotV1 = (input: Record<string, unknown>): ParseGameSnapshotResult => {
  if (typeof input.savedAt !== "string" || Number.isNaN(Date.parse(input.savedAt))) {
    return failSnapshotParse("invalid-structure", "savedAt must be an ISO-8601 timestamp string.");
  }

  if (!isRecord(input.gameState)) {
    return failSnapshotParse("invalid-structure", "gameState must be an object.");
  }

  const gameStateValue = input.gameState;

  if (!Array.isArray(input.turnHistory)) {
    return failSnapshotParse("invalid-structure", "turnHistory must be an array.");
  }

  const parsedOpeningState = parseOpeningStateValue(input.openingState, "openingState");
  if (!parsedOpeningState.ok) {
    return parsedOpeningState.result;
  }

  const gameStatePlayer = gameStateValue.activePlayer;
  if (!isPlayerValue(gameStatePlayer)) {
    return failSnapshotParse("invalid-domain-state", "gameState.activePlayer is invalid.");
  }

  const parsedPosition = parseBoardPosition(gameStateValue.position, "gameState.position");
  if (!parsedPosition.ok) {
    return parsedPosition.result;
  }

  let parsedDice: DiceRoll | null = null;
  const diceValue = gameStateValue.dice;
  if (diceValue !== null) {
    const diceParseResult = parseDiceRoll(diceValue, "gameState");
    if (!diceParseResult.ok) {
      return diceParseResult.result;
    }
    parsedDice = diceParseResult.dice;
  }

  const reconstructedBaseState = createGameState(parsedPosition.position, gameStatePlayer);
  const reconstructedState =
    parsedDice === null
      ? reconstructedBaseState
      : (() => {
          const assigned = setDice(reconstructedBaseState, parsedDice);
          if (!assigned.ok) {
            return null;
          }
          return assigned.state;
        })();

  if (reconstructedState === null) {
    return failSnapshotParse(
      "invalid-domain-state",
      "gameState.dice is not valid for the reconstructed game state."
    );
  }

  const parsedHistory: TurnRecord[] = [];
  for (let index = 0; index < input.turnHistory.length; index += 1) {
    const parsedRecord = parseTurnRecordValue(
      input.turnHistory[index],
      index + 1,
      `turnHistory[${index}]`
    );
    if (!parsedRecord.ok) {
      return parsedRecord.result;
    }
    parsedHistory.push(parsedRecord.record);
  }

  const openingTurnRecords = parsedHistory.filter((record) => record.phase === "opening");
  if (openingTurnRecords.length > 1) {
    return failSnapshotParse(
      "invalid-domain-state",
      "turnHistory may include at most one opening-phase record."
    );
  }

  if (openingTurnRecords.length === 1 && parsedHistory[0]?.phase !== "opening") {
    return failSnapshotParse(
      "invalid-domain-state",
      "Opening-phase record must be the first completed turn when present."
    );
  }

  if (parsedHistory.length > 0) {
    const finalHistoryPosition = parsedHistory[parsedHistory.length - 1]?.positionAfter;
    if (
      finalHistoryPosition === undefined ||
      !areBoardPositionsEqual(finalHistoryPosition, reconstructedState.position)
    ) {
      return failSnapshotParse(
        "invalid-domain-state",
        "Current game position must match the final positionAfter in turnHistory."
      );
    }
  }

  if (parsedOpeningState.openingState.phase === "waiting") {
    if (
      parsedHistory.length > 0 ||
      reconstructedState.dice !== null ||
      parsedOpeningState.openingState.openingTurnPending ||
      reconstructedState.activePlayer !== "white" ||
      !areBoardPositionsEqual(reconstructedState.position, STANDARD_STARTING_POSITION)
    ) {
      return failSnapshotParse(
        "invalid-domain-state",
        "Opening waiting state must represent a fresh game with no history or active dice."
      );
    }
  }

  if (parsedOpeningState.openingState.phase === "tied") {
    if (
      parsedHistory.length > 0 ||
      reconstructedState.dice !== null ||
      parsedOpeningState.openingState.openingTurnPending ||
      reconstructedState.activePlayer !== "white" ||
      !areBoardPositionsEqual(reconstructedState.position, STANDARD_STARTING_POSITION)
    ) {
      return failSnapshotParse(
        "invalid-domain-state",
        "Opening tied state must keep a fresh board, no history, and no active turn dice."
      );
    }
  }

  if (parsedOpeningState.openingState.phase === "resolved") {
    if (parsedOpeningState.openingState.openingTurnPending) {
      if (parsedHistory.length !== 0) {
        return failSnapshotParse(
          "invalid-domain-state",
          "Opening turn cannot be pending when turn history already contains completed turns."
        );
      }

      if (
        reconstructedState.dice === null ||
        reconstructedState.activePlayer !== parsedOpeningState.openingState.startingPlayer ||
        reconstructedState.dice.dice[0] !== parsedOpeningState.openingState.whiteDie ||
        reconstructedState.dice.dice[1] !== parsedOpeningState.openingState.blackDie
      ) {
        return failSnapshotParse(
          "invalid-domain-state",
          "Resolved opening-pending state must match current starter and opening dice."
        );
      }
    }

    if (!parsedOpeningState.openingState.openingTurnPending && parsedHistory.length === 0) {
      return failSnapshotParse(
        "invalid-domain-state",
        "Resolved opening state with no pending opening turn must include completed opening turn history."
      );
    }
  }

  if (getGameStatus(reconstructedState.position).state === "complete") {
    if (reconstructedState.dice !== null || parsedOpeningState.openingState.openingTurnPending) {
      return failSnapshotParse(
        "invalid-domain-state",
        "Completed game snapshots cannot restore with active dice or pending opening turn."
      );
    }
  }

  return {
    ok: true,
    snapshot: {
      savedAt: input.savedAt,
      gameState: cloneGameState(reconstructedState),
      turnHistory: parsedHistory.map((record) => createTurnRecord(record)),
      openingState: cloneSnapshotOpeningState(parsedOpeningState.openingState)
    }
  };
};

export const serializeGameSnapshot = (snapshot: GameSnapshot): SerializedGameSnapshotV1 => {
  return {
    format: GAME_SNAPSHOT_FORMAT,
    version: GAME_SNAPSHOT_VERSION,
    savedAt: snapshot.savedAt,
    gameState: cloneGameState(snapshot.gameState),
    turnHistory: snapshot.turnHistory.map(serializeTurnRecord),
    openingState: cloneSnapshotOpeningState(snapshot.openingState)
  };
};

export const encodeGameSnapshot = (snapshot: GameSnapshot): string => {
  return JSON.stringify(serializeGameSnapshot(snapshot));
};

export const parseGameSnapshot = (input: unknown): ParseGameSnapshotResult => {
  if (!isRecord(input)) {
    return failSnapshotParse("invalid-structure", "Snapshot must be an object.");
  }

  if (input.format !== GAME_SNAPSHOT_FORMAT) {
    return failSnapshotParse("wrong-format", "Snapshot format identifier is not recognized.");
  }

  if (!Number.isInteger(input.version)) {
    return failSnapshotParse("invalid-structure", "Snapshot version must be an integer.");
  }

  if (input.version !== GAME_SNAPSHOT_VERSION) {
    return failSnapshotParse("unsupported-version", "Snapshot version is not supported.");
  }

  return parseSerializedGameSnapshotV1(input);
};

export const decodeGameSnapshot = (text: string): ParseGameSnapshotResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return failSnapshotParse("invalid-json", "Snapshot text is not valid JSON.");
  }

  return parseGameSnapshot(parsed);
};

export const createTurnRecord = (input: CreateTurnRecordInput): TurnRecord => {
  return {
    turnNumber: input.turnNumber,
    player: input.player,
    dice: cloneDiceRoll(input.dice),
    outcome: cloneTurnOutcome(input.outcome),
    positionBefore: cloneBoardPosition(input.positionBefore),
    positionAfter: cloneBoardPosition(input.positionAfter),
    gameStatusAfter: cloneGameStatus(input.gameStatusAfter),
    phase: input.phase
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
