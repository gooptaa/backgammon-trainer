import {
  analyzePosition,
  type RankedLegalMoveAnalysis
} from "@backgammon-trainer/backgammon-analysis";

import { isFixtureEvaluator, type CoachMoveClassification } from "./classification";

export const PATTERN_DETECTION_POLICY = {
  id: "deterministic-committed-move-patterns",
  version: "1.0.0"
} as const;

export const MAIN_PATTERN_SUPPORT_RULES = {
  minEligibleDecisions: 4,
  minPatternOccurrences: 2,
  maxPatternSummaries: 3,
  maxRepresentativeTurns: 3
} as const;

export type LearnerPatternDetectorId =
  "avoidable-blot-exposure" | "missed-point-making-opportunity" | "missed-hit-opportunity";

export type LearnerPatternSkillArea = "safety-versus-risk" | "making-points" | "hitting-and-tempo";

export interface LearnerPatternSignal {
  readonly signalId: string;
  readonly observationId: string;
  readonly detectorId: LearnerPatternDetectorId;
  readonly detectorVersion: "1.0.0";
  readonly displayName: string;
  readonly skillArea: LearnerPatternSkillArea;
  readonly lineageId: string;
  readonly turnNumber: number;
  readonly actingSide: "white" | "black";
  readonly playedMoveFingerprint: string;
  readonly strongerMoveFingerprint: string;
  readonly moveClassificationLabel: "mistake" | "major mistake";
  readonly normalizedLossFromBest: number;
  readonly observedAt: string;
  readonly evidence:
    | {
        readonly kind: "avoidable-blot-exposure";
        readonly playedBlotCount: number;
        readonly strongerBlotCount: number;
        readonly additionalExposedBlots: number;
      }
    | {
        readonly kind: "missed-point-making-opportunity";
        readonly playedMadePointCount: number;
        readonly strongerMadePointCount: number;
        readonly playedHomeBoardPointCount: number;
        readonly strongerHomeBoardPointCount: number;
        readonly additionalMadePoints: number;
        readonly additionalHomeBoardPoints: number;
      }
    | {
        readonly kind: "missed-hit-opportunity";
        readonly playedHitCount: number;
        readonly strongerHitCount: number;
        readonly missedHits: number;
      };
  readonly limitations: readonly string[];
}

export interface LearnerPatternAggregate {
  readonly detectorId: LearnerPatternDetectorId;
  readonly detectorVersion: "1.0.0";
  readonly displayName: string;
  readonly skillArea: LearnerPatternSkillArea;
  readonly occurrenceCount: number;
  readonly mistakeCount: number;
  readonly majorMistakeCount: number;
  readonly cumulativeNormalizedLossFromBest: number;
  readonly gamesRepresented: number;
  readonly mostRecentObservedAt: string;
  readonly representativeTurns: readonly {
    readonly lineageId: string;
    readonly turnNumber: number;
    readonly actingSide: "white" | "black";
  }[];
}

export type LearnerMainPatternSelection =
  | {
      readonly status: "supported";
      readonly detectorId: LearnerPatternDetectorId;
      readonly detectorVersion: "1.0.0";
      readonly displayName: string;
      readonly skillArea: LearnerPatternSkillArea;
      readonly occurrenceCount: number;
      readonly gamesRepresented: number;
      readonly eligibleDecisionCount: number;
    }
  | {
      readonly status: "tied";
      readonly tiedPatterns: readonly {
        readonly detectorId: LearnerPatternDetectorId;
        readonly detectorVersion: "1.0.0";
        readonly displayName: string;
        readonly skillArea: LearnerPatternSkillArea;
        readonly occurrenceCount: number;
      }[];
      readonly eligibleDecisionCount: number;
    }
  | {
      readonly status: "insufficient-evidence";
      readonly reason:
        "not-enough-eligible-decisions" | "no-supported-pattern-signals" | "no-recurring-pattern";
      readonly eligibleDecisionCount: number;
    };

export interface LearnerPatternSummary {
  readonly policyId: typeof PATTERN_DETECTION_POLICY.id;
  readonly policyVersion: typeof PATTERN_DETECTION_POLICY.version;
  readonly compatibilityMode: "current-policy-only";
  readonly recentWindowSize: number;
  readonly fullProfile: {
    readonly compatibleObservationCount: number;
    readonly eligibleDecisionCount: number;
    readonly topPatterns: readonly LearnerPatternAggregate[];
  };
  readonly recentWindow: {
    readonly compatibleObservationCount: number;
    readonly eligibleDecisionCount: number;
    readonly topPatterns: readonly LearnerPatternAggregate[];
  };
  readonly incompatiblePatternPolicyObservationCount: number;
  readonly mainPattern: LearnerMainPatternSelection;
  readonly limitations: readonly string[];
}

const PATTERN_DETECTOR_META: Readonly<
  Record<LearnerPatternDetectorId, { displayName: string; skillArea: LearnerPatternSkillArea }>
> = {
  "avoidable-blot-exposure": {
    displayName: "avoidable blot exposure",
    skillArea: "safety-versus-risk"
  },
  "missed-point-making-opportunity": {
    displayName: "missed point-making opportunity",
    skillArea: "making-points"
  },
  "missed-hit-opportunity": {
    displayName: "missed hit or tempo opportunity",
    skillArea: "hitting-and-tempo"
  }
};

const toSignalId = (input: {
  observationId: string;
  detectorId: LearnerPatternDetectorId;
}): string => {
  return [
    "learner-pattern-signal-v1",
    PATTERN_DETECTION_POLICY.id,
    PATTERN_DETECTION_POLICY.version,
    input.detectorId,
    input.observationId
  ].join("|");
};

type HitAwareMove = {
  readonly steps: readonly {
    readonly hitsBlot: boolean;
  }[];
};

const hitCount = (move: HitAwareMove): number => {
  return move.steps.reduce((total: number, step) => total + (step.hitsBlot ? 1 : 0), 0);
};

const selectStrongerEvaluatedMove = (
  rankedAnalysis: Extract<RankedLegalMoveAnalysis, { kind: "evaluated" }>,
  playedMoveFingerprint: string
):
  | {
      readonly played: Extract<
        RankedLegalMoveAnalysis,
        { kind: "evaluated" }
      >["rankedMoves"][number];
      readonly stronger: Extract<
        RankedLegalMoveAnalysis,
        { kind: "evaluated" }
      >["rankedMoves"][number];
    }
  | undefined => {
  const played = rankedAnalysis.rankedMoves.find(
    (row) => row.moveFingerprint === playedMoveFingerprint
  );
  if (played === undefined) {
    return undefined;
  }

  const stronger = rankedAnalysis.rankedMoves.find((row) => row.rank === 1);
  if (stronger === undefined) {
    return undefined;
  }

  if (played.moveFingerprint === stronger.moveFingerprint) {
    return undefined;
  }

  return {
    played,
    stronger
  };
};

export const deriveLearnerPatternSignals = (input: {
  observationId: string;
  lineageId: string;
  turnNumber: number;
  actingSide: "white" | "black";
  observedAt: string;
  playedMoveFingerprint: string;
  classification: CoachMoveClassification;
  rankedAnalysis?: RankedLegalMoveAnalysis;
}): readonly LearnerPatternSignal[] => {
  if (input.classification.status !== "classified") {
    return [];
  }

  if (input.classification.label !== "mistake" && input.classification.label !== "major mistake") {
    return [];
  }

  if (input.rankedAnalysis?.kind !== "evaluated") {
    return [];
  }

  if (input.rankedAnalysis.coverage !== "complete") {
    return [];
  }

  if (isFixtureEvaluator(input.rankedAnalysis.provenance.provider)) {
    return [];
  }

  const comparison = selectStrongerEvaluatedMove(input.rankedAnalysis, input.playedMoveFingerprint);
  if (comparison === undefined) {
    return [];
  }

  const playedFacts = analyzePosition(comparison.played.outcome.positionAfter);
  const strongerFacts = analyzePosition(comparison.stronger.outcome.positionAfter);
  const playedSideFacts = input.actingSide === "white" ? playedFacts.white : playedFacts.black;
  const strongerSideFacts =
    input.actingSide === "white" ? strongerFacts.white : strongerFacts.black;

  const signals: LearnerPatternSignal[] = [];

  const additionalExposedBlots = playedSideFacts.blotCount - strongerSideFacts.blotCount;
  if (additionalExposedBlots >= 1) {
    const detectorId: LearnerPatternDetectorId = "avoidable-blot-exposure";
    signals.push({
      signalId: toSignalId({ observationId: input.observationId, detectorId }),
      observationId: input.observationId,
      detectorId,
      detectorVersion: "1.0.0",
      displayName: PATTERN_DETECTOR_META[detectorId].displayName,
      skillArea: PATTERN_DETECTOR_META[detectorId].skillArea,
      lineageId: input.lineageId,
      turnNumber: input.turnNumber,
      actingSide: input.actingSide,
      playedMoveFingerprint: comparison.played.moveFingerprint,
      strongerMoveFingerprint: comparison.stronger.moveFingerprint,
      moveClassificationLabel: input.classification.label,
      normalizedLossFromBest: input.classification.normalizedLossFromBest,
      observedAt: input.observedAt,
      evidence: {
        kind: detectorId,
        playedBlotCount: playedSideFacts.blotCount,
        strongerBlotCount: strongerSideFacts.blotCount,
        additionalExposedBlots
      },
      limitations: []
    });
  }

  const additionalMadePoints = strongerSideFacts.madePointCount - playedSideFacts.madePointCount;
  const additionalHomeBoardPoints =
    strongerSideFacts.madeHomeBoardPointCount - playedSideFacts.madeHomeBoardPointCount;
  if (additionalMadePoints >= 1 || additionalHomeBoardPoints >= 1) {
    const detectorId: LearnerPatternDetectorId = "missed-point-making-opportunity";
    signals.push({
      signalId: toSignalId({ observationId: input.observationId, detectorId }),
      observationId: input.observationId,
      detectorId,
      detectorVersion: "1.0.0",
      displayName: PATTERN_DETECTOR_META[detectorId].displayName,
      skillArea: PATTERN_DETECTOR_META[detectorId].skillArea,
      lineageId: input.lineageId,
      turnNumber: input.turnNumber,
      actingSide: input.actingSide,
      playedMoveFingerprint: comparison.played.moveFingerprint,
      strongerMoveFingerprint: comparison.stronger.moveFingerprint,
      moveClassificationLabel: input.classification.label,
      normalizedLossFromBest: input.classification.normalizedLossFromBest,
      observedAt: input.observedAt,
      evidence: {
        kind: detectorId,
        playedMadePointCount: playedSideFacts.madePointCount,
        strongerMadePointCount: strongerSideFacts.madePointCount,
        playedHomeBoardPointCount: playedSideFacts.madeHomeBoardPointCount,
        strongerHomeBoardPointCount: strongerSideFacts.madeHomeBoardPointCount,
        additionalMadePoints,
        additionalHomeBoardPoints
      },
      limitations: []
    });
  }

  const playedHitCount = hitCount(comparison.played.outcome.move);
  const strongerHitCount = hitCount(comparison.stronger.outcome.move);
  const missedHits = strongerHitCount - playedHitCount;
  if (missedHits >= 1) {
    const detectorId: LearnerPatternDetectorId = "missed-hit-opportunity";
    signals.push({
      signalId: toSignalId({ observationId: input.observationId, detectorId }),
      observationId: input.observationId,
      detectorId,
      detectorVersion: "1.0.0",
      displayName: PATTERN_DETECTOR_META[detectorId].displayName,
      skillArea: PATTERN_DETECTOR_META[detectorId].skillArea,
      lineageId: input.lineageId,
      turnNumber: input.turnNumber,
      actingSide: input.actingSide,
      playedMoveFingerprint: comparison.played.moveFingerprint,
      strongerMoveFingerprint: comparison.stronger.moveFingerprint,
      moveClassificationLabel: input.classification.label,
      normalizedLossFromBest: input.classification.normalizedLossFromBest,
      observedAt: input.observedAt,
      evidence: {
        kind: detectorId,
        playedHitCount,
        strongerHitCount,
        missedHits
      },
      limitations: []
    });
  }

  return signals.sort((left, right) => left.signalId.localeCompare(right.signalId));
};

const detectorSortOrder = (detectorId: LearnerPatternDetectorId): number => {
  if (detectorId === "avoidable-blot-exposure") {
    return 1;
  }
  if (detectorId === "missed-point-making-opportunity") {
    return 2;
  }
  return 3;
};

const aggregateSignals = (
  observations: readonly {
    lineageId: string;
    turnNumber: number;
    actingSide: "white" | "black";
    observedAt: string;
    classification: {
      status: "classified" | "unclassified";
      label?: "best" | "reasonable" | "mistake" | "major mistake";
    };
    patternSignals: readonly LearnerPatternSignal[];
  }[]
): readonly LearnerPatternAggregate[] => {
  const aggregateByDetector = new Map<
    LearnerPatternDetectorId,
    {
      detectorId: LearnerPatternDetectorId;
      detectorVersion: "1.0.0";
      displayName: string;
      skillArea: LearnerPatternSkillArea;
      occurrenceCount: number;
      mistakeCount: number;
      majorMistakeCount: number;
      cumulativeNormalizedLossFromBest: number;
      games: Set<string>;
      mostRecentObservedAt: string;
      representativeTurns: {
        lineageId: string;
        turnNumber: number;
        actingSide: "white" | "black";
      }[];
    }
  >();

  for (const observation of observations) {
    for (const signal of observation.patternSignals) {
      const current = aggregateByDetector.get(signal.detectorId) ?? {
        detectorId: signal.detectorId,
        detectorVersion: signal.detectorVersion,
        displayName: signal.displayName,
        skillArea: signal.skillArea,
        occurrenceCount: 0,
        mistakeCount: 0,
        majorMistakeCount: 0,
        cumulativeNormalizedLossFromBest: 0,
        games: new Set<string>(),
        mostRecentObservedAt: signal.observedAt,
        representativeTurns: []
      };

      current.occurrenceCount += 1;
      current.cumulativeNormalizedLossFromBest = Number(
        (current.cumulativeNormalizedLossFromBest + signal.normalizedLossFromBest).toFixed(6)
      );
      if (signal.moveClassificationLabel === "major mistake") {
        current.majorMistakeCount += 1;
      } else {
        current.mistakeCount += 1;
      }
      current.games.add(signal.lineageId);
      if (signal.observedAt > current.mostRecentObservedAt) {
        current.mostRecentObservedAt = signal.observedAt;
      }

      if (
        !current.representativeTurns.some(
          (turn) =>
            turn.lineageId === signal.lineageId &&
            turn.turnNumber === signal.turnNumber &&
            turn.actingSide === signal.actingSide
        )
      ) {
        current.representativeTurns.push({
          lineageId: signal.lineageId,
          turnNumber: signal.turnNumber,
          actingSide: signal.actingSide
        });
      }

      aggregateByDetector.set(signal.detectorId, current);
    }
  }

  return [...aggregateByDetector.values()]
    .map((value) => ({
      detectorId: value.detectorId,
      detectorVersion: value.detectorVersion,
      displayName: value.displayName,
      skillArea: value.skillArea,
      occurrenceCount: value.occurrenceCount,
      mistakeCount: value.mistakeCount,
      majorMistakeCount: value.majorMistakeCount,
      cumulativeNormalizedLossFromBest: value.cumulativeNormalizedLossFromBest,
      gamesRepresented: value.games.size,
      mostRecentObservedAt: value.mostRecentObservedAt,
      representativeTurns: value.representativeTurns
        .sort((left, right) => {
          if (left.lineageId !== right.lineageId) {
            return left.lineageId.localeCompare(right.lineageId);
          }
          return left.turnNumber - right.turnNumber;
        })
        .slice(0, MAIN_PATTERN_SUPPORT_RULES.maxRepresentativeTurns)
    }))
    .sort((left, right) => {
      if (left.majorMistakeCount !== right.majorMistakeCount) {
        return right.majorMistakeCount - left.majorMistakeCount;
      }
      if (left.occurrenceCount !== right.occurrenceCount) {
        return right.occurrenceCount - left.occurrenceCount;
      }
      if (left.cumulativeNormalizedLossFromBest !== right.cumulativeNormalizedLossFromBest) {
        return right.cumulativeNormalizedLossFromBest - left.cumulativeNormalizedLossFromBest;
      }
      if (left.mostRecentObservedAt !== right.mostRecentObservedAt) {
        return right.mostRecentObservedAt.localeCompare(left.mostRecentObservedAt);
      }
      return detectorSortOrder(left.detectorId) - detectorSortOrder(right.detectorId);
    });
};

const supportsTie = (left: LearnerPatternAggregate, right: LearnerPatternAggregate): boolean => {
  return (
    left.majorMistakeCount === right.majorMistakeCount &&
    left.occurrenceCount === right.occurrenceCount &&
    left.cumulativeNormalizedLossFromBest === right.cumulativeNormalizedLossFromBest
  );
};

const selectMainPattern = (input: {
  eligibleDecisionCount: number;
  aggregates: readonly LearnerPatternAggregate[];
}): LearnerMainPatternSelection => {
  if (input.eligibleDecisionCount < MAIN_PATTERN_SUPPORT_RULES.minEligibleDecisions) {
    return {
      status: "insufficient-evidence",
      reason: "not-enough-eligible-decisions",
      eligibleDecisionCount: input.eligibleDecisionCount
    };
  }

  if (input.aggregates.length === 0) {
    return {
      status: "insufficient-evidence",
      reason: "no-supported-pattern-signals",
      eligibleDecisionCount: input.eligibleDecisionCount
    };
  }

  const top = input.aggregates[0];
  if (top === undefined || top.occurrenceCount < MAIN_PATTERN_SUPPORT_RULES.minPatternOccurrences) {
    return {
      status: "insufficient-evidence",
      reason: "no-recurring-pattern",
      eligibleDecisionCount: input.eligibleDecisionCount
    };
  }

  const tied = input.aggregates.filter((aggregate) => supportsTie(top, aggregate));
  if (tied.length > 1) {
    return {
      status: "tied",
      tiedPatterns: tied.map((aggregate) => ({
        detectorId: aggregate.detectorId,
        detectorVersion: aggregate.detectorVersion,
        displayName: aggregate.displayName,
        skillArea: aggregate.skillArea,
        occurrenceCount: aggregate.occurrenceCount
      })),
      eligibleDecisionCount: input.eligibleDecisionCount
    };
  }

  return {
    status: "supported",
    detectorId: top.detectorId,
    detectorVersion: top.detectorVersion,
    displayName: top.displayName,
    skillArea: top.skillArea,
    occurrenceCount: top.occurrenceCount,
    gamesRepresented: top.gamesRepresented,
    eligibleDecisionCount: input.eligibleDecisionCount
  };
};

export const summarizeLearnerPatterns = (input: {
  observations: readonly {
    lineageId: string;
    turnNumber: number;
    actingSide: "white" | "black";
    observedAt: string;
    classification: {
      status: "classified" | "unclassified";
      label?: "best" | "reasonable" | "mistake" | "major mistake";
    };
    patternPolicyId: string;
    patternPolicyVersion: string;
    patternSignals: readonly LearnerPatternSignal[];
  }[];
  recentWindowSize: number;
}): LearnerPatternSummary => {
  const compatible = input.observations.filter(
    (observation) =>
      observation.patternPolicyId === PATTERN_DETECTION_POLICY.id &&
      observation.patternPolicyVersion === PATTERN_DETECTION_POLICY.version
  );

  const incompatiblePatternPolicyObservationCount = input.observations.length - compatible.length;
  const recent = compatible.slice(-input.recentWindowSize);

  const fullEligibleDecisions = compatible.filter(
    (observation) =>
      observation.classification.status === "classified" &&
      (observation.classification.label === "mistake" ||
        observation.classification.label === "major mistake")
  );
  const recentEligibleDecisions = recent.filter(
    (observation) =>
      observation.classification.status === "classified" &&
      (observation.classification.label === "mistake" ||
        observation.classification.label === "major mistake")
  );

  const fullAggregates = aggregateSignals(compatible).slice(
    0,
    MAIN_PATTERN_SUPPORT_RULES.maxPatternSummaries
  );
  const recentAggregates = aggregateSignals(recent).slice(
    0,
    MAIN_PATTERN_SUPPORT_RULES.maxPatternSummaries
  );

  const limitations: string[] = [];
  if (incompatiblePatternPolicyObservationCount > 0) {
    limitations.push(
      `${incompatiblePatternPolicyObservationCount} stored observations use an incompatible pattern policy and are excluded from current pattern aggregates.`
    );
  }
  if (compatible.length === 0) {
    limitations.push("No compatible pattern observations are available yet.");
  }
  if (recent.length < input.recentWindowSize) {
    limitations.push(
      `Recent pattern window includes ${recent.length} of ${input.recentWindowSize} target observations.`
    );
  }

  return {
    policyId: PATTERN_DETECTION_POLICY.id,
    policyVersion: PATTERN_DETECTION_POLICY.version,
    compatibilityMode: "current-policy-only",
    recentWindowSize: input.recentWindowSize,
    fullProfile: {
      compatibleObservationCount: compatible.length,
      eligibleDecisionCount: fullEligibleDecisions.length,
      topPatterns: fullAggregates
    },
    recentWindow: {
      compatibleObservationCount: recent.length,
      eligibleDecisionCount: recentEligibleDecisions.length,
      topPatterns: recentAggregates
    },
    incompatiblePatternPolicyObservationCount,
    mainPattern: selectMainPattern({
      eligibleDecisionCount: recentEligibleDecisions.length,
      aggregates: recentAggregates
    }),
    limitations
  };
};

export const mapPatternSkillAreaToKnowledgeConcept = (
  skillArea: LearnerPatternSkillArea
): "safety" | "made-points" | "hits" => {
  if (skillArea === "safety-versus-risk") {
    return "safety";
  }
  if (skillArea === "making-points") {
    return "made-points";
  }
  return "hits";
};
