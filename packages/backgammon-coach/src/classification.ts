import {
  getMoveFingerprint,
  type RankedLegalMoveAnalysis
} from "@backgammon-trainer/backgammon-analysis";
import type { Move } from "@backgammon-trainer/backgammon-engine";

export type CoachMoveClassificationLabel = "best" | "reasonable" | "mistake" | "major mistake";

export type CoachMoveClassificationUnclassifiedReason =
  | "unsupported-turn-kind"
  | "missing-ranked-analysis"
  | "evaluation-failed"
  | "evaluation-unavailable"
  | "unsupported-analysis-source"
  | "fixture-provenance"
  | "partial-coverage"
  | "played-move-not-evaluated"
  | "unsupported-score-scale"
  | "missing-best-evaluated-move"
  | "invalid-loss-from-best";

export interface CoachMoveClassificationPolicy {
  readonly id: "deterministic-loss-from-best";
  readonly version: "1.0.0";
  readonly normalizedQuantity: "loss-from-best";
  readonly supportedScoreScale: "equity-points";
  readonly tieToleranceInclusive: number;
  readonly thresholds: {
    readonly reasonableMaxInclusive: number;
    readonly mistakeMaxInclusive: number;
  };
}

export const MOVE_CLASSIFICATION_POLICY: CoachMoveClassificationPolicy = {
  id: "deterministic-loss-from-best",
  version: "1.0.0",
  normalizedQuantity: "loss-from-best",
  supportedScoreScale: "equity-points",
  tieToleranceInclusive: 0.000001,
  thresholds: {
    reasonableMaxInclusive: 0.08,
    mistakeMaxInclusive: 0.2
  }
};

export type CoachMoveClassification =
  | {
      readonly status: "classified";
      readonly label: CoachMoveClassificationLabel;
      readonly policyId: CoachMoveClassificationPolicy["id"];
      readonly policyVersion: CoachMoveClassificationPolicy["version"];
      readonly normalizedLossFromBest: number;
      readonly playedMoveRank: number;
      readonly isTieForBest: boolean;
      readonly tieWithinTolerance: boolean;
    }
  | {
      readonly status: "unclassified";
      readonly reason: CoachMoveClassificationUnclassifiedReason;
      readonly policyId: CoachMoveClassificationPolicy["id"];
      readonly policyVersion: CoachMoveClassificationPolicy["version"];
    };

export type CoachMoveClassificationAnalysisSource =
  "analysis-record" | "hydrated" | "missing" | "failed" | "unavailable" | "unsupported";

const classified = (
  label: CoachMoveClassificationLabel,
  normalizedLossFromBest: number,
  playedMoveRank: number,
  isTieForBest: boolean,
  tieWithinTolerance: boolean
): CoachMoveClassification => {
  return {
    status: "classified",
    label,
    policyId: MOVE_CLASSIFICATION_POLICY.id,
    policyVersion: MOVE_CLASSIFICATION_POLICY.version,
    normalizedLossFromBest,
    playedMoveRank,
    isTieForBest,
    tieWithinTolerance
  };
};

const unclassified = (
  reason: CoachMoveClassificationUnclassifiedReason
): CoachMoveClassification => {
  return {
    status: "unclassified",
    reason,
    policyId: MOVE_CLASSIFICATION_POLICY.id,
    policyVersion: MOVE_CLASSIFICATION_POLICY.version
  };
};

export const isFixtureEvaluator = (provider: string): boolean => {
  const normalized = provider.toLowerCase();
  return normalized.includes("fixture") || normalized.includes("mock");
};

const classifyLossFromBest = (lossFromBest: number): CoachMoveClassificationLabel => {
  if (lossFromBest <= MOVE_CLASSIFICATION_POLICY.tieToleranceInclusive) {
    return "best";
  }

  if (lossFromBest <= MOVE_CLASSIFICATION_POLICY.thresholds.reasonableMaxInclusive) {
    return "reasonable";
  }

  if (lossFromBest <= MOVE_CLASSIFICATION_POLICY.thresholds.mistakeMaxInclusive) {
    return "mistake";
  }

  return "major mistake";
};

const getCanonicalMoveFingerprint = (move: Move): string => {
  const stepKeys = move.steps
    .map((step) => {
      const hitKey = step.hit === undefined ? "" : `:${step.hit.player}:${step.hit.point}`;
      return `${step.kind}:${step.fromPoint}:${step.toPoint}:${step.dieValue}:${step.hitsBlot}${hitKey}`;
    })
    .sort((left, right) => left.localeCompare(right));

  return `${move.player}::${stepKeys.join("|")}`;
};

export const formatUnclassifiedReason = (
  reason: CoachMoveClassificationUnclassifiedReason
): string => {
  switch (reason) {
    case "unsupported-turn-kind":
      return "The committed action is not a checker-play move.";
    case "missing-ranked-analysis":
      return "No ranked evaluator evidence is available for this committed move.";
    case "evaluation-failed":
      return "Evaluator analysis failed for this committed move.";
    case "evaluation-unavailable":
      return "Evaluator analysis was unavailable for this committed move.";
    case "unsupported-analysis-source":
      return "This committed move is not supported by evaluable checker-play evidence.";
    case "fixture-provenance":
      return "Evaluator evidence is fixture-derived synthetic output.";
    case "partial-coverage":
      return "Evaluator coverage is partial and cannot prove the best legal move.";
    case "played-move-not-evaluated":
      return "The committed move was not scored by the evaluator.";
    case "unsupported-score-scale":
      return "Evaluator score scale is unsupported by this classification policy.";
    case "missing-best-evaluated-move":
      return "Evaluator output did not include a strongest scored move.";
    case "invalid-loss-from-best":
      return "Evaluator loss-from-best values were invalid.";
  }
};

export const classifyCommittedMove = (input: {
  readonly playedMoveFingerprint?: string;
  readonly rankedAnalysis?: RankedLegalMoveAnalysis;
  readonly analysisSource?: CoachMoveClassificationAnalysisSource;
}): CoachMoveClassification => {
  if (input.playedMoveFingerprint === undefined) {
    return unclassified("unsupported-turn-kind");
  }

  if (input.rankedAnalysis === undefined) {
    if (input.analysisSource === "failed") {
      return unclassified("evaluation-failed");
    }

    if (input.analysisSource === "unavailable") {
      return unclassified("evaluation-unavailable");
    }

    if (input.analysisSource === "unsupported") {
      return unclassified("unsupported-analysis-source");
    }

    return unclassified("missing-ranked-analysis");
  }

  if (input.rankedAnalysis.kind !== "evaluated") {
    return unclassified("missing-ranked-analysis");
  }

  if (isFixtureEvaluator(input.rankedAnalysis.provenance.provider)) {
    return unclassified("fixture-provenance");
  }

  if (
    input.rankedAnalysis.scoreScale.kind !== "equity" ||
    input.rankedAnalysis.scoreScale.unit !== "points"
  ) {
    return unclassified("unsupported-score-scale");
  }

  const totalCanonicalMoveCount = new Set(
    input.rankedAnalysis.factualOutcomes.map((outcome) => getCanonicalMoveFingerprint(outcome.move))
  ).size;
  const evaluatedCanonicalSet = new Set(
    input.rankedAnalysis.rankedMoves.map((row) => getCanonicalMoveFingerprint(row.outcome.move))
  );
  const evaluatedCanonicalMoveCount = evaluatedCanonicalSet.size;
  const hasCanonicalOverlapBetweenEvaluatedAndUnevaluated =
    input.rankedAnalysis.unevaluatedMoves.some((outcome) =>
      evaluatedCanonicalSet.has(getCanonicalMoveFingerprint(outcome.move))
    );
  const hasCompleteCanonicalCoverage =
    totalCanonicalMoveCount > 0 &&
    evaluatedCanonicalMoveCount >= totalCanonicalMoveCount &&
    hasCanonicalOverlapBetweenEvaluatedAndUnevaluated;

  if (input.rankedAnalysis.coverage !== "complete" && !hasCompleteCanonicalCoverage) {
    return unclassified("partial-coverage");
  }

  const topRanked = input.rankedAnalysis.rankedMoves[0];
  if (topRanked === undefined) {
    return unclassified("missing-best-evaluated-move");
  }

  const playedOutcome = input.rankedAnalysis.factualOutcomes.find(
    (outcome) => getMoveFingerprint(outcome.move) === input.playedMoveFingerprint
  );
  const playedCanonicalFingerprint =
    playedOutcome === undefined ? undefined : getCanonicalMoveFingerprint(playedOutcome.move);

  const playedRanked = input.rankedAnalysis.rankedMoves.find((row) => {
    return (
      row.moveFingerprint === input.playedMoveFingerprint ||
      (playedCanonicalFingerprint !== undefined &&
        getCanonicalMoveFingerprint(row.outcome.move) === playedCanonicalFingerprint)
    );
  });

  if (playedRanked === undefined) {
    return unclassified("played-move-not-evaluated");
  }

  if (!Number.isFinite(playedRanked.lossFromBest) || playedRanked.lossFromBest < 0) {
    return unclassified("invalid-loss-from-best");
  }

  const tieWithinTolerance =
    playedRanked.lossFromBest <= MOVE_CLASSIFICATION_POLICY.tieToleranceInclusive;
  const isTieForBest =
    tieWithinTolerance &&
    input.rankedAnalysis.rankedMoves.filter((row) => row.rank === 1).length > 1;

  return classified(
    classifyLossFromBest(playedRanked.lossFromBest),
    playedRanked.lossFromBest,
    playedRanked.rank,
    isTieForBest,
    tieWithinTolerance
  );
};
