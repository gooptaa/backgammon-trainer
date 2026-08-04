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

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | {
      readonly [key: string]: JsonValue;
    };

export interface EvaluationContext {
  readonly gameMode: "money";
}

export interface EvaluatePositionRequest {
  readonly position: Position;
  readonly player: Player;
  readonly dice: DiceRoll;
  readonly legalOutcomes: readonly LegalMoveOutcome[];
  readonly context?: EvaluationContext;
}

export interface EvaluatedMoveScore {
  readonly moveFingerprint: string;
  readonly normalizedScore: number;
  readonly providerRank?: number;
}

export type EvaluationScoreScale =
  | {
      readonly kind: "equity";
      readonly unit: "points";
    }
  | {
      readonly kind: "probability";
      readonly range: readonly [0, 1];
    }
  | {
      readonly kind: "relative";
    };

export interface EvaluatorProvenance {
  readonly provider: string;
  readonly providerVersion: string;
  readonly adapterVersion: string;
  readonly settings: Readonly<Record<string, JsonValue>>;
}

export type EvaluatePositionFailureReason =
  | "unavailable"
  | "unsupported-position"
  | "timeout"
  | "provider-failed"
  | "invalid-provider-result";

export type EvaluatePositionResult =
  | {
      readonly ok: true;
      readonly coverage: "complete" | "partial";
      readonly scores: readonly EvaluatedMoveScore[];
      readonly scoreScale: EvaluationScoreScale;
      readonly provenance: EvaluatorProvenance;
      readonly warnings: readonly string[];
    }
  | {
      readonly ok: false;
      readonly reason: EvaluatePositionFailureReason;
      readonly message: string;
      readonly provenance?: EvaluatorProvenance;
    };

export interface PositionEvaluator {
  evaluate(request: EvaluatePositionRequest): Promise<EvaluatePositionResult>;
}

export interface RankedMoveOutcome {
  readonly rank: number;
  readonly normalizedScore: number;
  readonly lossFromBest: number;
  readonly moveFingerprint: string;
  readonly providerRank?: number;
  readonly outcome: LegalMoveOutcome;
}

export type RankedLegalMoveAnalysis =
  | {
      readonly kind: "no-legal-moves";
      readonly player: Player;
      readonly dice: DiceRoll;
      readonly positionBefore: PositionAnalysis;
      readonly factualOutcomes: readonly LegalMoveOutcome[];
      readonly coverage: "complete";
      readonly rankedMoves: readonly [];
      readonly unevaluatedMoves: readonly [];
      readonly warnings: readonly [];
    }
  | {
      readonly kind: "evaluated";
      readonly player: Player;
      readonly dice: DiceRoll;
      readonly positionBefore: PositionAnalysis;
      readonly factualOutcomes: readonly LegalMoveOutcome[];
      readonly scoreScale: EvaluationScoreScale;
      readonly provenance: EvaluatorProvenance;
      readonly coverage: "complete" | "partial";
      readonly rankedMoves: readonly RankedMoveOutcome[];
      readonly unevaluatedMoves: readonly LegalMoveOutcome[];
      readonly warnings: readonly string[];
    };

export type EvaluateLegalMovesResult =
  | {
      readonly ok: true;
      readonly analysis: RankedLegalMoveAnalysis;
    }
  | {
      readonly ok: false;
      readonly reason: "factual-analysis-failed";
      readonly message: string;
    }
  | {
      readonly ok: false;
      readonly reason: EvaluatePositionFailureReason;
      readonly message: string;
      readonly factualAnalysis: LegalMoveOutcomeAnalysis;
      readonly provenance?: EvaluatorProvenance;
    };

export interface EvaluateLegalMovesRequest {
  readonly position: Position;
  readonly player: Player;
  readonly dice: DiceRoll;
  readonly context?: EvaluationContext;
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

export const getMoveFingerprint = (move: Move): string => {
  const steps = move.steps
    .map((step) => {
      const hitKey = step.hit === undefined ? "" : `:${step.hit.player}:${step.hit.point}`;
      return `${step.kind}:${step.fromPoint}:${step.toPoint}:${step.dieValue}:${step.dieIndex}:${step.hitsBlot}${hitKey}`;
    })
    .join("|");

  return `${move.player}::${steps}`;
};

export const getCanonicalMoveFingerprint = (move: Move): string => {
  const stepKeys = move.steps
    .map((step) => {
      const hitKey = step.hit === undefined ? "" : `:${step.hit.player}:${step.hit.point}`;
      return `${step.kind}:${step.fromPoint}:${step.toPoint}:${step.dieValue}:${step.hitsBlot}${hitKey}`;
    })
    .sort((left, right) => left.localeCompare(right));

  return `${move.player}::${stepKeys.join("|")}`;
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

const cloneLegalMoveOutcome = (outcome: LegalMoveOutcome): LegalMoveOutcome => {
  return {
    move: cloneMove(outcome.move),
    positionAfter: clonePosition(outcome.positionAfter),
    analysisAfter: structuredClone(outcome.analysisAfter),
    featureDelta: structuredClone(outcome.featureDelta)
  };
};

const isFiniteNumber = (value: number): boolean => {
  return Number.isFinite(value);
};

const isJsonSafeValue = (value: unknown): value is JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonSafeValue(item));
  }

  if (typeof value !== "object") {
    return false;
  }

  if (Object.getPrototypeOf(value) !== Object.prototype) {
    return false;
  }

  return Object.values(value).every((entry) => isJsonSafeValue(entry));
};

const isValidScoreScale = (scale: EvaluationScoreScale): boolean => {
  if (scale.kind === "relative") {
    return true;
  }

  if (scale.kind === "equity") {
    return scale.unit === "points";
  }

  return scale.range[0] === 0 && scale.range[1] === 1;
};

const isValidProvenance = (provenance: EvaluatorProvenance): boolean => {
  return (
    provenance.provider.trim().length > 0 &&
    provenance.providerVersion.trim().length > 0 &&
    provenance.adapterVersion.trim().length > 0 &&
    isJsonSafeValue(provenance.settings)
  );
};

interface ValidatedEvaluationSuccess {
  readonly coverage: "complete" | "partial";
  readonly scoreScale: EvaluationScoreScale;
  readonly provenance: EvaluatorProvenance;
  readonly warnings: readonly string[];
  readonly scoredByFingerprint: ReadonlyMap<string, EvaluatedMoveScore>;
}

const validateEvaluationSuccess = (
  legalOutcomes: readonly LegalMoveOutcome[],
  result: Extract<EvaluatePositionResult, { ok: true }>
): ValidatedEvaluationSuccess | string => {
  if (!isValidScoreScale(result.scoreScale)) {
    return "Evaluator reported an invalid score scale.";
  }

  if (!isValidProvenance(result.provenance)) {
    return "Evaluator provenance is missing or invalid.";
  }

  const legalFingerprints = new Set(
    legalOutcomes.map((outcome) => getMoveFingerprint(outcome.move))
  );
  const scoredByFingerprint = new Map<string, EvaluatedMoveScore>();

  for (const score of result.scores) {
    if (!isFiniteNumber(score.normalizedScore)) {
      return "Evaluator reported a non-finite score.";
    }

    if (
      score.providerRank !== undefined &&
      (!Number.isInteger(score.providerRank) || score.providerRank <= 0)
    ) {
      return "Evaluator reported an invalid provider rank.";
    }

    if (!legalFingerprints.has(score.moveFingerprint)) {
      return "Evaluator reported a move that is not in the legal move set.";
    }

    if (scoredByFingerprint.has(score.moveFingerprint)) {
      return "Evaluator reported duplicate scores for one move.";
    }

    scoredByFingerprint.set(score.moveFingerprint, score);
  }

  if (result.coverage === "complete" && scoredByFingerprint.size !== legalFingerprints.size) {
    return "Evaluator marked complete coverage but did not score every legal move.";
  }

  if (result.coverage === "partial" && scoredByFingerprint.size === 0 && legalOutcomes.length > 0) {
    return "Evaluator marked partial coverage but did not score any legal move.";
  }

  return {
    coverage: result.coverage,
    scoreScale: result.scoreScale,
    provenance: result.provenance,
    warnings: result.warnings,
    scoredByFingerprint
  };
};

const createDenseRanking = (
  scoredOutcomes: readonly {
    outcome: LegalMoveOutcome;
    score: EvaluatedMoveScore;
    moveFingerprint: string;
  }[]
): readonly RankedMoveOutcome[] => {
  const sorted = [...scoredOutcomes].sort((left, right) => {
    if (left.score.normalizedScore !== right.score.normalizedScore) {
      return right.score.normalizedScore - left.score.normalizedScore;
    }

    return left.moveFingerprint.localeCompare(right.moveFingerprint);
  });

  if (sorted.length === 0) {
    return [];
  }

  const bestScore = sorted[0]!.score.normalizedScore;
  let denseRank = 1;

  return sorted.map((entry, index) => {
    if (index > 0 && sorted[index - 1]!.score.normalizedScore !== entry.score.normalizedScore) {
      denseRank += 1;
    }

    return {
      rank: denseRank,
      normalizedScore: entry.score.normalizedScore,
      lossFromBest: bestScore - entry.score.normalizedScore,
      moveFingerprint: entry.moveFingerprint,
      ...(entry.score.providerRank === undefined ? {} : { providerRank: entry.score.providerRank }),
      outcome: cloneLegalMoveOutcome(entry.outcome)
    };
  });
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

export const evaluateLegalMoves = async (
  request: EvaluateLegalMovesRequest,
  evaluator: PositionEvaluator
): Promise<EvaluateLegalMovesResult> => {
  const factual = analyzeLegalMoveOutcomes(request.position, request.player, request.dice);

  if (!factual.ok) {
    return {
      ok: false,
      reason: "factual-analysis-failed",
      message: factual.message
    };
  }

  if (factual.analysis.outcomes.length === 0) {
    return {
      ok: true,
      analysis: {
        kind: "no-legal-moves",
        player: factual.analysis.player,
        dice: cloneDice(factual.analysis.dice),
        positionBefore: structuredClone(factual.analysis.positionBefore),
        factualOutcomes: [],
        coverage: "complete",
        rankedMoves: [],
        unevaluatedMoves: [],
        warnings: []
      }
    };
  }

  let evaluationResult: EvaluatePositionResult;

  try {
    evaluationResult = await evaluator.evaluate({
      position: request.position,
      player: request.player,
      dice: request.dice,
      legalOutcomes: factual.analysis.outcomes,
      ...(request.context === undefined ? {} : { context: request.context })
    });
  } catch {
    return {
      ok: false,
      reason: "provider-failed",
      message: "Evaluator request failed.",
      factualAnalysis: factual.analysis
    };
  }

  if (!evaluationResult.ok) {
    return {
      ok: false,
      reason: evaluationResult.reason,
      message: evaluationResult.message,
      factualAnalysis: factual.analysis,
      ...(evaluationResult.provenance === undefined
        ? {}
        : { provenance: evaluationResult.provenance })
    };
  }

  const validated = validateEvaluationSuccess(factual.analysis.outcomes, evaluationResult);

  if (typeof validated === "string") {
    return {
      ok: false,
      reason: "invalid-provider-result",
      message: validated,
      factualAnalysis: factual.analysis,
      provenance: evaluationResult.provenance
    };
  }

  const scoredOutcomes = factual.analysis.outcomes.flatMap((outcome) => {
    const moveFingerprint = getMoveFingerprint(outcome.move);
    const score = validated.scoredByFingerprint.get(moveFingerprint);

    if (score === undefined) {
      return [];
    }

    return [
      {
        outcome,
        score,
        moveFingerprint
      }
    ];
  });

  const unevaluatedMoves = factual.analysis.outcomes
    .filter((outcome) => !validated.scoredByFingerprint.has(getMoveFingerprint(outcome.move)))
    .map((outcome) => cloneLegalMoveOutcome(outcome));

  return {
    ok: true,
    analysis: {
      kind: "evaluated",
      player: factual.analysis.player,
      dice: cloneDice(factual.analysis.dice),
      positionBefore: structuredClone(factual.analysis.positionBefore),
      factualOutcomes: factual.analysis.outcomes.map((outcome) => cloneLegalMoveOutcome(outcome)),
      scoreScale: validated.scoreScale,
      provenance: validated.provenance,
      coverage: validated.coverage,
      rankedMoves: createDenseRanking(scoredOutcomes),
      unevaluatedMoves,
      warnings: [...validated.warnings]
    }
  };
};
