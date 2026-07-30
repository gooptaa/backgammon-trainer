import {
  applyMove,
  getLegalMoves,
  type DiceRoll,
  type GameState,
  type Move
} from "@backgammon-trainer/backgammon-engine";

export type Position = GameState["position"];
export type Player = GameState["activePlayer"];

export type ContactStatus = "contact" | "race";
export type PipCountLeader = Player | "tied";

export type PointIdentifier =
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

export interface PlayerPositionFeatures {
  readonly checkersOnBoard: number;
  readonly checkersOnBar: number;
  readonly checkersBorneOff: number;
  readonly totalCheckersAccountedFor: number;
  readonly pipCount: number;
  readonly blotCount: number;
  readonly blotPoints: readonly PointIdentifier[];
  readonly madePointCount: number;
  readonly madePoints: readonly PointIdentifier[];
  readonly madeHomeBoardPointCount: number;
  readonly madeHomeBoardPoints: readonly PointIdentifier[];
  readonly occupiedPointCount: number;
  readonly occupiedPoints: readonly PointIdentifier[];
  readonly checkersInHomeBoard: number;
  readonly checkersOutsideHomeBoard: number;
}

export interface PositionRelationshipFeatures {
  readonly pipCountDifferenceWhiteMinusBlack: number;
  readonly absolutePipCountDifference: number;
  readonly pipCountLeader: PipCountLeader;
  readonly contactStatus: ContactStatus;
}

export interface PositionAnalysis {
  readonly white: PlayerPositionFeatures;
  readonly black: PlayerPositionFeatures;
  readonly relationship: PositionRelationshipFeatures;
}

export interface PlayerFeatureDelta {
  readonly pipCountDelta: number;
  readonly blotCountDelta: number;
  readonly madePointCountDelta: number;
  readonly madeHomeBoardPointCountDelta: number;
  readonly barCountDelta: number;
  readonly borneOffCountDelta: number;
  readonly occupiedPointCountDelta: number;
}

export interface PositionFeatureDelta {
  readonly white: PlayerFeatureDelta;
  readonly black: PlayerFeatureDelta;
  readonly relationship: {
    readonly pipCountDifferenceWhiteMinusBlackDelta: number;
    readonly contactStatusBefore: ContactStatus;
    readonly contactStatusAfter: ContactStatus;
    readonly pipCountLeaderBefore: PipCountLeader;
    readonly pipCountLeaderAfter: PipCountLeader;
  };
}

export interface LegalMoveOutcome {
  readonly move: Move;
  readonly positionAfter: Position;
  readonly analysisAfter: PositionAnalysis;
  readonly featureDelta: PositionFeatureDelta;
}

export interface LegalMoveOutcomeAnalysis {
  readonly player: Player;
  readonly dice: DiceRoll;
  readonly positionBefore: PositionAnalysis;
  readonly outcomes: readonly LegalMoveOutcome[];
}

export type AnalyzeLegalMoveOutcomesResult =
  | {
      readonly ok: true;
      readonly analysis: LegalMoveOutcomeAnalysis;
    }
  | {
      readonly ok: false;
      readonly reason: "engine-transition-failed";
      readonly message: string;
    };

const POINTS: readonly PointIdentifier[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24
];

const BAR_PIP_DISTANCE = 25;

const isHomeBoardPoint = (point: PointIdentifier, player: Player): boolean => {
  return player === "white" ? point >= 1 && point <= 6 : point >= 19 && point <= 24;
};

const getPipDistanceToBearOff = (point: PointIdentifier, player: Player): number => {
  return player === "white" ? point : 25 - point;
};

const getPipCountLeader = (whitePipCount: number, blackPipCount: number): PipCountLeader => {
  if (whitePipCount < blackPipCount) {
    return "white";
  }

  if (blackPipCount < whitePipCount) {
    return "black";
  }

  return "tied";
};

const classifyContactStatus = (position: Position): ContactStatus => {
  if (position.bar.white > 0 || position.bar.black > 0) {
    return "contact";
  }

  let whiteMaxPoint: number | null = null;
  let blackMinPoint: number | null = null;

  for (const point of POINTS) {
    const occupancy = position.points[point];

    if (occupancy === null) {
      continue;
    }

    if (occupancy.player === "white") {
      if (whiteMaxPoint === null || point > whiteMaxPoint) {
        whiteMaxPoint = point;
      }
      continue;
    }

    if (blackMinPoint === null || point < blackMinPoint) {
      blackMinPoint = point;
    }
  }

  if (whiteMaxPoint === null || blackMinPoint === null) {
    return "race";
  }

  return whiteMaxPoint > blackMinPoint ? "contact" : "race";
};

const analyzePlayerPosition = (position: Position, player: Player): PlayerPositionFeatures => {
  let checkersOnBoard = 0;
  let checkersInHomeBoard = 0;
  let pipCount = position.bar[player] * BAR_PIP_DISTANCE;

  const occupiedPoints: PointIdentifier[] = [];
  const blotPoints: PointIdentifier[] = [];
  const madePoints: PointIdentifier[] = [];
  const madeHomeBoardPoints: PointIdentifier[] = [];

  for (const point of POINTS) {
    const occupancy = position.points[point];

    if (occupancy === null || occupancy.player !== player) {
      continue;
    }

    checkersOnBoard += occupancy.checkerCount;
    pipCount += occupancy.checkerCount * getPipDistanceToBearOff(point, player);
    occupiedPoints.push(point);

    if (occupancy.checkerCount === 1) {
      blotPoints.push(point);
    }

    if (occupancy.checkerCount >= 2) {
      madePoints.push(point);

      if (isHomeBoardPoint(point, player)) {
        madeHomeBoardPoints.push(point);
      }
    }

    if (isHomeBoardPoint(point, player)) {
      checkersInHomeBoard += occupancy.checkerCount;
    }
  }

  const checkersOnBar = position.bar[player];
  const checkersBorneOff = position.borneOff[player];

  return {
    checkersOnBoard,
    checkersOnBar,
    checkersBorneOff,
    totalCheckersAccountedFor: checkersOnBoard + checkersOnBar + checkersBorneOff,
    pipCount,
    blotCount: blotPoints.length,
    blotPoints,
    madePointCount: madePoints.length,
    madePoints,
    madeHomeBoardPointCount: madeHomeBoardPoints.length,
    madeHomeBoardPoints,
    occupiedPointCount: occupiedPoints.length,
    occupiedPoints,
    checkersInHomeBoard,
    checkersOutsideHomeBoard: checkersOnBoard - checkersInHomeBoard
  };
};

export const analyzePosition = (position: Position): PositionAnalysis => {
  const white = analyzePlayerPosition(position, "white");
  const black = analyzePlayerPosition(position, "black");
  const pipCountDifferenceWhiteMinusBlack = white.pipCount - black.pipCount;

  return {
    white,
    black,
    relationship: {
      pipCountDifferenceWhiteMinusBlack,
      absolutePipCountDifference: Math.abs(pipCountDifferenceWhiteMinusBlack),
      pipCountLeader: getPipCountLeader(white.pipCount, black.pipCount),
      contactStatus: classifyContactStatus(position)
    }
  };
};

const getPlayerDelta = (
  before: PlayerPositionFeatures,
  after: PlayerPositionFeatures
): PlayerFeatureDelta => {
  return {
    pipCountDelta: after.pipCount - before.pipCount,
    blotCountDelta: after.blotCount - before.blotCount,
    madePointCountDelta: after.madePointCount - before.madePointCount,
    madeHomeBoardPointCountDelta: after.madeHomeBoardPointCount - before.madeHomeBoardPointCount,
    barCountDelta: after.checkersOnBar - before.checkersOnBar,
    borneOffCountDelta: after.checkersBorneOff - before.checkersBorneOff,
    occupiedPointCountDelta: after.occupiedPointCount - before.occupiedPointCount
  };
};

const buildPositionFeatureDelta = (
  beforeAnalysis: PositionAnalysis,
  afterAnalysis: PositionAnalysis
): PositionFeatureDelta => {
  return {
    white: getPlayerDelta(beforeAnalysis.white, afterAnalysis.white),
    black: getPlayerDelta(beforeAnalysis.black, afterAnalysis.black),
    relationship: {
      pipCountDifferenceWhiteMinusBlackDelta:
        afterAnalysis.relationship.pipCountDifferenceWhiteMinusBlack -
        beforeAnalysis.relationship.pipCountDifferenceWhiteMinusBlack,
      contactStatusBefore: beforeAnalysis.relationship.contactStatus,
      contactStatusAfter: afterAnalysis.relationship.contactStatus,
      pipCountLeaderBefore: beforeAnalysis.relationship.pipCountLeader,
      pipCountLeaderAfter: afterAnalysis.relationship.pipCountLeader
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

const clonePosition = (position: Position): Position => {
  const nextPoints: Record<PointIdentifier, Position["points"][PointIdentifier]> = {
    ...position.points
  };

  for (const point of POINTS) {
    const occupancy = position.points[point];

    nextPoints[point] =
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

const cloneDice = (dice: DiceRoll): DiceRoll => {
  return {
    dice: [dice.dice[0], dice.dice[1]]
  };
};

export const analyzeLegalMoveOutcomes = (
  position: Position,
  player: Player,
  dice: DiceRoll
): AnalyzeLegalMoveOutcomesResult => {
  const legalMoves = getLegalMoves({
    position,
    player,
    roll: dice
  }).moves;
  const positionBefore = analyzePosition(position);
  const outcomes: LegalMoveOutcome[] = [];

  for (const move of legalMoves) {
    const applied = applyMove(position, player, dice, move);

    if (!applied.ok) {
      return {
        ok: false,
        reason: "engine-transition-failed",
        message: `Engine failed to apply a legal move: ${applied.reason}.`
      };
    }

    const analysisAfter = analyzePosition(applied.position);

    outcomes.push({
      move: cloneMove(move),
      positionAfter: clonePosition(applied.position),
      analysisAfter,
      featureDelta: buildPositionFeatureDelta(positionBefore, analysisAfter)
    });
  }

  return {
    ok: true,
    analysis: {
      player,
      dice: cloneDice(dice),
      positionBefore,
      outcomes
    }
  };
};

export const comparePositions = (before: Position, after: Position): PositionFeatureDelta => {
  const beforeAnalysis = analyzePosition(before);
  const afterAnalysis = analyzePosition(after);

  return buildPositionFeatureDelta(beforeAnalysis, afterAnalysis);
};
