import {
  analyzePosition,
  getMoveFingerprint,
  type EvaluatorProvenance,
  type LegalMoveOutcome,
  type PositionFeatureDelta
} from "@backgammon-trainer/backgammon-analysis";
import type { Move } from "@backgammon-trainer/backgammon-engine";
import {
  summarizeAnalysisSession,
  type AnalysisSession
} from "@backgammon-trainer/backgammon-analysis-session";
import {
  classifyCommittedMove,
  formatUnclassifiedReason,
  isFixtureEvaluator,
  MOVE_CLASSIFICATION_POLICY,
  type CoachMoveClassification
} from "./classification";

import type { CoachConversation } from "./conversation";
import type { CoachGameReviewTurnEvidence, CoachQuestionContext } from "./context";

interface CoachGameReviewDecisionEvidence {
  readonly turnNumber: number;
  readonly player: "white" | "black";
  readonly playedMove: string;
  readonly analysisSource:
    "analysis-record" | "hydrated" | "missing" | "failed" | "unavailable" | "unsupported";
  readonly coverage?: "complete" | "partial";
  readonly playedMoveEvaluated: boolean;
  readonly playedMoveRank?: number;
  readonly playedMoveNormalizedScore?: number;
  readonly strongestAlternative?: {
    moveFingerprint: string;
    moveLabel: string;
    evaluatorRank: number;
    normalizedScore: number;
  };
  readonly moveClassification: CoachMoveClassification;
  readonly normalizedScoreDifference?: number;
  readonly isTieForHighestEvaluation?: boolean;
  readonly note: string;
}

export interface CoachEvidenceWarning {
  readonly code:
    | "fixture-evaluator"
    | "no-ranked-analysis"
    | "missing-history-analysis"
    | "knowledge-unavailable"
    | "ambiguous-move-reference"
    | "unmatched-move-reference"
    | "move-evidence-truncated"
    | "warning-limit-reached"
    | "ambiguous-review-ownership";
  readonly message: string;
}

export interface CoachMoveSelectionReason {
  readonly code:
    | "inspected-move-outcome"
    | "staged-candidate"
    | "question-reference-clear"
    | "question-reference-partial"
    | "question-reference-ambiguous"
    | "top-ranked-comparison"
    | "factual-contrast"
    | "deterministic-fallback";
  readonly message: string;
}

export interface CoachMoveReferenceEvidence {
  readonly notation: string;
  readonly resolution: "clear" | "partial" | "ambiguous" | "unmatched";
  readonly matchedMoveFingerprints: readonly string[];
  readonly matchedMoveLabels: readonly string[];
}

export interface CoachMoveEvidence {
  readonly moveFingerprint: string;
  readonly moveLabel: string;
  readonly featureDelta: PositionFeatureDelta;
  readonly selectionReasons: readonly CoachMoveSelectionReason[];
  readonly evaluatorRank?: number;
  readonly normalizedScore?: number;
  readonly lossFromTopScoredMove?: number;
}

export interface CoachSupportedRecommendation {
  readonly kind: "authoritative" | "strongest-evaluated";
  readonly moveFingerprint: string;
  readonly moveLabel: string;
  readonly evaluatorRank: number;
  readonly normalizedScore: number;
  readonly comparedLegalMoveCount: number;
  readonly totalLegalMoveCount: number;
  readonly unevaluatedLegalMoveCount: number;
}

export interface CoachRecommendationSupport {
  readonly status: "supported" | "not-supported";
  readonly reason:
    | "complete-trustworthy-coverage"
    | "partial-coverage"
    | "fixture-evaluator"
    | "missing-evaluator"
    | "non-decision-state"
    | "no-legal-moves"
    | "played-move-not-evaluated"
    | "unsupported-history-turn";
  readonly supportedRecommendation?: CoachSupportedRecommendation;
}

export interface CoachLegalMoveSelectionSummary {
  readonly totalLegalMoves: number;
  readonly selectedLegalMoves: number;
  readonly omittedLegalMoves: number;
  readonly coachEvidenceCoverage: "complete" | "selected-subset";
  readonly truncated: boolean;
  readonly questionMoveReferences: readonly CoachMoveReferenceEvidence[];
}

export interface CoachEvidenceBundle {
  evidenceVersion: 4;
  questionContext: {
    kind: CoachQuestionContext["kind"];
  };
  moveClassificationPolicy?: typeof MOVE_CLASSIFICATION_POLICY;
  positionFacts?: ReturnType<typeof analyzePosition>;
  legalMoveSelection?: CoachLegalMoveSelectionSummary;
  legalMoveEvidence?: readonly CoachMoveEvidence[];
  historicalReviewEvidence?: {
    selectionSource: "selected-history" | "latest-committed";
    turnNumber: number;
    playedMove: string;
    playedMoveFingerprint?: string;
    totalLegalMoveCount?: number;
    evaluatedLegalMoveCount?: number;
    unevaluatedLegalMoveCount?: number;
    playedMoveEvaluated: boolean;
    bestEvaluatedMove?: {
      moveFingerprint: string;
      moveLabel: string;
      evaluatorRank: number;
      normalizedScore: number;
    };
    moveClassification?: CoachMoveClassification;
    limitations: readonly string[];
  };
  committedTurnEvidence?: {
    turnNumber: number;
    player: "white" | "black";
    dice: readonly [number, number];
    outcome: string;
    hasAnalysisRecord: boolean;
    evaluatedChosenMove?: {
      evaluatorRank?: number;
      normalizedScore?: number;
      lossFromTopScoredMove?: number;
    };
    moveClassification?: CoachMoveClassification;
  };
  gameReviewEvidence?: {
    reviewScope: "completed-game" | "game-so-far";
    selectionSource: "explicit-request" | "completed-fallback";
    committedTurnBoundary: number;
    reviewedPlayerScope: "learner-only" | "all-players";
    reviewedPlayer?: "white" | "black";
    ownershipStatus: "authoritative" | "ambiguous";
    selectedTurnNumber?: number;
    referencedTurnNumbers: readonly number[];
    committedTurnCount: number;
    supportedCheckerPlayDecisionCount: number;
    unsupportedDecisionCount: number;
    analyzedTurnNumbers: readonly number[];
    analysisRecordCount: number;
    evaluatedChosenMoveCount: number;
    unevaluatedChosenMoveCount: number;
    bestCount: number;
    reasonableCount: number;
    mistakeCount: number;
    majorMistakeCount: number;
    unclassifiedCount: number;
    completeCoverageCount: number;
    partialCoverageCount: number;
    missingCoverageCount: number;
    fixtureCoverageCount: number;
    failedCoverageCount: number;
    unavailableCoverageCount: number;
    winner?: "white" | "black";
    evaluatorProvenanceSummary?: {
      provider: string;
      providerVersion: string;
      adapterVersion: string;
    };
    keyDecisions: readonly CoachGameReviewDecisionEvidence[];
    limitations: readonly string[];
  };
  evaluatorProvenance?: EvaluatorProvenance;
  evaluatorCoverage?: "complete" | "partial";
  recommendationSupport?: CoachRecommendationSupport;
  progressEvidence?: {
    policyId: string;
    policyVersion: string;
    compatibilityMode: "current-policy-only";
    recentWindowSize: number;
    maxObservations: number;
    counts: {
      fullProfile: {
        best: number;
        reasonable: number;
        mistake: number;
        majorMistake: number;
        unclassified: number;
        totalEligible: number;
        totalClassified: number;
        bestOrReasonable: number;
      };
      recentWindow: {
        best: number;
        reasonable: number;
        mistake: number;
        majorMistake: number;
        unclassified: number;
        totalEligible: number;
        totalClassified: number;
        bestOrReasonable: number;
      };
    };
    gamesRepresented: {
      fullProfile: number;
      recentWindow: number;
    };
    coverage: {
      fullProfileClassifiedRatio: number;
      recentWindowClassifiedRatio: number;
    };
    trend:
      | {
          status: "insufficient-evidence";
          reason:
            | "not-enough-observations"
            | "insufficient-classified-observations"
            | "incompatible-policy";
          recentWindowSize: number;
          previousWindowSize: number;
          recentClassifiedCount: number;
          previousClassifiedCount: number;
        }
      | {
          status: "supported";
          recentWindowSize: number;
          previousWindowSize: number;
          recentClassifiedCount: number;
          previousClassifiedCount: number;
          recentBestOrReasonableShare: number;
          previousBestOrReasonableShare: number;
          recentMajorMistakeShare: number;
          previousMajorMistakeShare: number;
          bestOrReasonableShareDelta: number;
          majorMistakeShareDelta: number;
          recentMajorMistakeCount: number;
          previousMajorMistakeCount: number;
          majorMistakeCountDelta: number;
        };
    limitations: readonly string[];
  };
  conversationSummary: {
    messageCount: number;
    userMessageCount: number;
    coachMessageCount: number;
  };
  warnings: readonly CoachEvidenceWarning[];
}

export interface BuildCoachEvidenceResult {
  readonly evidence: CoachEvidenceBundle;
  readonly warnings: readonly CoachEvidenceWarning[];
}

export interface CoachEvidenceBuildLimits {
  readonly maxLegalMoves: number;
  readonly maxWarnings: number;
}

const DEFAULT_LIMITS: CoachEvidenceBuildLimits = {
  maxLegalMoves: 8,
  maxWarnings: 8
};

const formatMoveLabel = (move: Move): string => {
  return move.steps.map((step) => `${step.fromPoint}/${step.toPoint}`).join(", ");
};

const formatStepLabel = (fromPoint: string | number, toPoint: string | number): string => {
  return `${fromPoint}/${toPoint}`;
};

const moveStepKeys = (move: Move): readonly string[] => {
  return move.steps.map((step) => formatStepLabel(step.fromPoint, step.toPoint));
};

const MOVE_REFERENCE_PATTERN =
  /\b(?:[1-9]|1[0-9]|2[0-4])\s*(?:\/|-|\bto\b)\s*(?:[1-9]|1[0-9]|2[0-4])\b(?:\s*,\s*\b(?:[1-9]|1[0-9]|2[0-4])\s*(?:\/|-|\bto\b)\s*(?:[1-9]|1[0-9]|2[0-4])\b)*/gi;

const normalizeReferenceSteps = (notation: string): readonly string[] => {
  const matches =
    notation.match(/(?:[1-9]|1[0-9]|2[0-4])\s*(?:\/|-|\bto\b)\s*(?:[1-9]|1[0-9]|2[0-4])/gi) ?? [];
  return matches.map((match) => {
    const numbers = match.match(/[0-9]+/g) ?? [];
    const fromPoint = numbers[0] ?? "";
    const toPoint = numbers[1] ?? "";
    return formatStepLabel(fromPoint, toPoint);
  });
};

const reasonPriority = (reason: CoachMoveSelectionReason): number => {
  switch (reason.code) {
    case "question-reference-clear":
      return 1;
    case "question-reference-partial":
      return 2;
    case "question-reference-ambiguous":
      return 3;
    case "staged-candidate":
      return 4;
    case "inspected-move-outcome":
      return 5;
    case "top-ranked-comparison":
      return 6;
    case "factual-contrast":
      return 7;
    default:
      return 8;
  }
};

interface MoveSelectionCandidate {
  readonly outcome: LegalMoveOutcome;
  readonly moveFingerprint: string;
  readonly moveLabel: string;
  readonly engineOrder: number;
  readonly stepKeys: readonly string[];
  readonly evaluatorRank?: number;
  readonly normalizedScore?: number;
  readonly lossFromTopScoredMove?: number;
}

const pushUniqueReason = (
  reasonsByFingerprint: Map<string, CoachMoveSelectionReason[]>,
  fingerprint: string,
  reason: CoachMoveSelectionReason
): void => {
  const current = reasonsByFingerprint.get(fingerprint) ?? [];
  if (current.some((item) => item.code === reason.code)) {
    reasonsByFingerprint.set(fingerprint, current);
    return;
  }

  reasonsByFingerprint.set(fingerprint, [...current, reason]);
};

const selectCurrentPositionMoves = (input: {
  question: string;
  outcomes: readonly LegalMoveOutcome[];
  stagedFingerprints: ReadonlySet<string>;
  rankedByFingerprint: ReadonlyMap<string, { rank: number; score: number; loss: number }>;
  maxLegalMoves: number;
}): {
  readonly selected: readonly CoachMoveEvidence[];
  readonly summary: CoachLegalMoveSelectionSummary;
  readonly warnings: readonly CoachEvidenceWarning[];
} => {
  const candidates: readonly MoveSelectionCandidate[] = input.outcomes.map(
    (outcome, engineOrder) => {
      const moveFingerprint = getMoveFingerprint(outcome.move);
      const ranked = input.rankedByFingerprint.get(moveFingerprint);

      return {
        outcome,
        moveFingerprint,
        moveLabel: formatMoveLabel(outcome.move),
        engineOrder,
        stepKeys: moveStepKeys(outcome.move),
        ...(ranked === undefined
          ? {}
          : {
              evaluatorRank: ranked.rank,
              normalizedScore: ranked.score,
              lossFromTopScoredMove: ranked.loss
            })
      };
    }
  );

  const byFingerprint = new Map(
    candidates.map((candidate) => [candidate.moveFingerprint, candidate])
  );
  const warnings: CoachEvidenceWarning[] = [];
  const reasonsByFingerprint = new Map<string, CoachMoveSelectionReason[]>();
  const references: CoachMoveReferenceEvidence[] = [];

  const questionReferences = input.question.match(MOVE_REFERENCE_PATTERN) ?? [];
  for (const notation of questionReferences) {
    const normalizedSteps = normalizeReferenceSteps(notation);
    const subsetMatches = candidates.filter((candidate) =>
      normalizedSteps.every((step) => candidate.stepKeys.includes(step))
    );
    const exactMatches = subsetMatches.filter(
      (candidate) => candidate.stepKeys.length === normalizedSteps.length
    );

    if (exactMatches.length === 1) {
      const match = exactMatches[0];
      if (match === undefined) {
        continue;
      }

      references.push({
        notation,
        resolution: "clear",
        matchedMoveFingerprints: [match.moveFingerprint],
        matchedMoveLabels: [match.moveLabel]
      });
      pushUniqueReason(reasonsByFingerprint, match.moveFingerprint, {
        code: "question-reference-clear",
        message: `Selected because the question clearly referenced ${notation}.`
      });
      continue;
    }

    if (exactMatches.length > 1) {
      references.push({
        notation,
        resolution: "ambiguous",
        matchedMoveFingerprints: exactMatches.map((candidate) => candidate.moveFingerprint),
        matchedMoveLabels: exactMatches.map((candidate) => candidate.moveLabel)
      });
      warnings.push({
        code: "ambiguous-move-reference",
        message: `Question reference ${notation} matched multiple legal candidates.`
      });
      for (const match of exactMatches) {
        pushUniqueReason(reasonsByFingerprint, match.moveFingerprint, {
          code: "question-reference-ambiguous",
          message: `Selected because the question referenced ambiguous legal notation ${notation}.`
        });
      }
      continue;
    }

    if (subsetMatches.length > 0) {
      references.push({
        notation,
        resolution: "partial",
        matchedMoveFingerprints: subsetMatches.map((candidate) => candidate.moveFingerprint),
        matchedMoveLabels: subsetMatches.map((candidate) => candidate.moveLabel)
      });
      for (const match of subsetMatches) {
        pushUniqueReason(reasonsByFingerprint, match.moveFingerprint, {
          code: "question-reference-partial",
          message: `Selected because the question partially referenced ${notation}.`
        });
      }
      continue;
    }

    references.push({
      notation,
      resolution: "unmatched",
      matchedMoveFingerprints: [],
      matchedMoveLabels: []
    });
    warnings.push({
      code: "unmatched-move-reference",
      message: `Question reference ${notation} did not match any legal candidate.`
    });
  }

  for (const candidate of candidates) {
    if (input.stagedFingerprints.has(candidate.moveFingerprint)) {
      pushUniqueReason(reasonsByFingerprint, candidate.moveFingerprint, {
        code: "staged-candidate",
        message: "Selected because it is part of the current staged candidate set."
      });
    }
  }

  const rankedCandidates = [...candidates]
    .filter((candidate) => candidate.evaluatorRank !== undefined)
    .sort((left, right) => {
      if (
        (left.evaluatorRank ?? Number.POSITIVE_INFINITY) !==
        (right.evaluatorRank ?? Number.POSITIVE_INFINITY)
      ) {
        return (
          (left.evaluatorRank ?? Number.POSITIVE_INFINITY) -
          (right.evaluatorRank ?? Number.POSITIVE_INFINITY)
        );
      }
      return left.moveFingerprint.localeCompare(right.moveFingerprint);
    });

  const alreadySelected = (): number => reasonsByFingerprint.size;
  if (rankedCandidates.length > 0) {
    const topRanked = rankedCandidates[0];
    if (topRanked !== undefined) {
      pushUniqueReason(reasonsByFingerprint, topRanked.moveFingerprint, {
        code: "top-ranked-comparison",
        message: "Selected as a ranked comparison candidate."
      });
    }

    if (alreadySelected() < 2 && rankedCandidates[1] !== undefined) {
      pushUniqueReason(reasonsByFingerprint, rankedCandidates[1].moveFingerprint, {
        code: "top-ranked-comparison",
        message: "Selected as another ranked comparison candidate."
      });
    }
  }

  const contrastCandidates = candidates.filter((candidate) => {
    const move = candidate.outcome.move;
    return (
      move.steps.some((step) => step.hitsBlot) ||
      candidate.outcome.featureDelta.white.madePointCountDelta !== 0 ||
      candidate.outcome.featureDelta.black.madePointCountDelta !== 0 ||
      candidate.outcome.featureDelta.white.borneOffCountDelta !== 0 ||
      candidate.outcome.featureDelta.black.borneOffCountDelta !== 0
    );
  });

  for (const candidate of contrastCandidates) {
    if (alreadySelected() >= 3) {
      break;
    }

    pushUniqueReason(reasonsByFingerprint, candidate.moveFingerprint, {
      code: "factual-contrast",
      message: "Selected because it offers a factually distinct legal contrast."
    });
  }

  if (alreadySelected() === 0 && candidates[0] !== undefined) {
    pushUniqueReason(reasonsByFingerprint, candidates[0].moveFingerprint, {
      code: "deterministic-fallback",
      message: "Selected as a deterministic fallback legal candidate."
    });
  }

  const selectedCandidates = [...reasonsByFingerprint.entries()]
    .map(([fingerprint, reasons]) => {
      const candidate = byFingerprint.get(fingerprint);
      if (candidate === undefined) {
        return null;
      }

      return {
        candidate,
        reasons: [...reasons].sort((left, right) => {
          const leftPriority = reasonPriority(left);
          const rightPriority = reasonPriority(right);
          if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
          }
          return left.message.localeCompare(right.message);
        })
      };
    })
    .filter(
      (
        entry
      ): entry is { candidate: MoveSelectionCandidate; reasons: CoachMoveSelectionReason[] } =>
        entry !== null
    )
    .sort((left, right) => {
      const leftPriority = reasonPriority(
        left.reasons[0] ?? { code: "deterministic-fallback", message: "" }
      );
      const rightPriority = reasonPriority(
        right.reasons[0] ?? { code: "deterministic-fallback", message: "" }
      );
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      if (
        (left.candidate.evaluatorRank ?? Number.POSITIVE_INFINITY) !==
        (right.candidate.evaluatorRank ?? Number.POSITIVE_INFINITY)
      ) {
        return (
          (left.candidate.evaluatorRank ?? Number.POSITIVE_INFINITY) -
          (right.candidate.evaluatorRank ?? Number.POSITIVE_INFINITY)
        );
      }

      return left.candidate.engineOrder - right.candidate.engineOrder;
    });

  const truncated = selectedCandidates.length > input.maxLegalMoves;
  const boundedSelected = selectedCandidates
    .slice(0, input.maxLegalMoves)
    .map(({ candidate, reasons }) => ({
      moveFingerprint: candidate.moveFingerprint,
      moveLabel: candidate.moveLabel,
      featureDelta: structuredClone(candidate.outcome.featureDelta),
      selectionReasons: reasons,
      ...(candidate.evaluatorRank === undefined ? {} : { evaluatorRank: candidate.evaluatorRank }),
      ...(candidate.normalizedScore === undefined
        ? {}
        : { normalizedScore: candidate.normalizedScore }),
      ...(candidate.lossFromTopScoredMove === undefined
        ? {}
        : { lossFromTopScoredMove: candidate.lossFromTopScoredMove })
    }));

  if (truncated) {
    warnings.push({
      code: "move-evidence-truncated",
      message: `Included ${input.maxLegalMoves} selected legal moves out of ${selectedCandidates.length} relevant candidates.`
    });
  }

  return {
    selected: boundedSelected,
    summary: {
      totalLegalMoves: candidates.length,
      selectedLegalMoves: boundedSelected.length,
      omittedLegalMoves: Math.max(0, candidates.length - boundedSelected.length),
      coachEvidenceCoverage:
        boundedSelected.length >= candidates.length ? "complete" : "selected-subset",
      truncated,
      questionMoveReferences: references
    },
    warnings
  };
};

const summarizeConversation = (conversation: CoachConversation) => {
  let userMessageCount = 0;
  let coachMessageCount = 0;

  for (const message of conversation.messages) {
    if (message.role === "user") {
      userMessageCount += 1;
    } else {
      coachMessageCount += 1;
    }
  }

  return {
    messageCount: conversation.messages.length,
    userMessageCount,
    coachMessageCount
  };
};

const capWarnings = (
  warnings: readonly CoachEvidenceWarning[],
  maxWarnings: number
): readonly CoachEvidenceWarning[] => {
  if (warnings.length <= maxWarnings) {
    return warnings;
  }

  return [
    ...warnings.slice(0, Math.max(0, maxWarnings - 1)),
    {
      code: "warning-limit-reached",
      message: `Only the first ${Math.max(0, maxWarnings - 1)} warnings were kept.`
    }
  ];
};

const getSessionProvenanceSummary = (session: AnalysisSession | undefined) => {
  if (session === undefined) {
    return undefined;
  }

  return {
    provider: session.metadata.evaluatorProvider,
    providerVersion: session.metadata.evaluatorVersion,
    adapterVersion: session.metadata.generatorVersion
  };
};

const parseReferencedTurnNumbers = (question: string): readonly number[] => {
  const matches = question.matchAll(/\bturn\s+([0-9]+)\b/gi);
  const numbers = new Set<number>();

  for (const match of matches) {
    const raw = match[1];
    if (raw === undefined) {
      continue;
    }

    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      numbers.add(parsed);
    }
  }

  return [...numbers].sort((left, right) => left - right);
};

const classificationSeverity = (classification: CoachMoveClassification): number => {
  if (classification.status !== "classified") {
    return 5;
  }

  switch (classification.label) {
    case "major mistake":
      return 1;
    case "mistake":
      return 2;
    case "reasonable":
      return 3;
    case "best":
      return 4;
  }
};

const classificationLoss = (classification: CoachMoveClassification): number => {
  if (classification.status !== "classified") {
    return -1;
  }

  return classification.normalizedLossFromBest;
};

const isBalancedClassification = (classification: CoachMoveClassification): boolean => {
  return (
    classification.status === "classified" &&
    (classification.label === "reasonable" || classification.label === "best")
  );
};

const formatClassificationNote = (classification: CoachMoveClassification): string => {
  if (classification.status === "classified") {
    return classification.isTieForBest
      ? `Classified as ${classification.label}; tied for best within policy tolerance.`
      : `Classified as ${classification.label} under policy ${classification.policyVersion}.`;
  }

  return `Unclassified: ${formatUnclassifiedReason(classification.reason)}`;
};

const incrementClassificationCount = (
  counts: {
    best: number;
    reasonable: number;
    mistake: number;
    majorMistake: number;
    unclassified: number;
  },
  classification: CoachMoveClassification
): void => {
  if (classification.status !== "classified") {
    counts.unclassified += 1;
    return;
  }

  if (classification.label === "best") {
    counts.best += 1;
    return;
  }

  if (classification.label === "reasonable") {
    counts.reasonable += 1;
    return;
  }

  if (classification.label === "mistake") {
    counts.mistake += 1;
    return;
  }

  counts.majorMistake += 1;
};

export const buildCoachEvidence = (input: {
  question: string;
  context: CoachQuestionContext;
  conversation: CoachConversation;
  limits?: Partial<CoachEvidenceBuildLimits>;
}): BuildCoachEvidenceResult => {
  const question = input.question.trim();
  const limits: CoachEvidenceBuildLimits = {
    maxLegalMoves: input.limits?.maxLegalMoves ?? DEFAULT_LIMITS.maxLegalMoves,
    maxWarnings: input.limits?.maxWarnings ?? DEFAULT_LIMITS.maxWarnings
  };

  const warnings: CoachEvidenceWarning[] = [];

  if (question.length === 0) {
    warnings.push({
      code: "knowledge-unavailable",
      message: "Question text was empty after trimming."
    });
  }

  const evidence: CoachEvidenceBundle = {
    evidenceVersion: 4,
    questionContext: {
      kind: input.context.kind
    },
    conversationSummary: summarizeConversation(input.conversation),
    warnings: []
  };

  if (input.context.kind === "progress-profile") {
    evidence.progressEvidence = structuredClone(input.context.progress);
    evidence.recommendationSupport = {
      status: "not-supported",
      reason: "non-decision-state"
    };
  }

  if (input.context.kind === "current-position") {
    const positionFacts = analyzePosition(input.context.snapshot.gameState.position);
    evidence.positionFacts = positionFacts;

    if (input.context.currentTurn.status !== "decision-available") {
      evidence.recommendationSupport = {
        status: "not-supported",
        reason: "non-decision-state"
      };
    }

    const legalMoveOutcomes = input.context.currentTurn.legalMoveOutcomes?.outcomes ?? [];
    const rankedAnalysis = input.context.currentTurn.rankedAnalysis;
    const rankedByFingerprint = new Map<string, { rank: number; score: number; loss: number }>();
    const legalMoveLabelByFingerprint = new Map<string, string>();

    for (const outcome of legalMoveOutcomes) {
      legalMoveLabelByFingerprint.set(
        getMoveFingerprint(outcome.move),
        formatMoveLabel(outcome.move)
      );
    }

    if (legalMoveOutcomes.length === 0 && input.context.currentTurn.status === "no-legal-move") {
      evidence.recommendationSupport = {
        status: "not-supported",
        reason: "no-legal-moves"
      };
    }

    if (rankedAnalysis?.kind === "evaluated") {
      evidence.evaluatorProvenance = structuredClone(rankedAnalysis.provenance);
      evidence.evaluatorCoverage = rankedAnalysis.coverage;

      if (isFixtureEvaluator(rankedAnalysis.provenance.provider)) {
        warnings.push({
          code: "fixture-evaluator",
          message: "Ranked analysis is fixture-derived synthetic output."
        });
      }

      for (const rankedMove of rankedAnalysis.rankedMoves) {
        rankedByFingerprint.set(rankedMove.moveFingerprint, {
          rank: rankedMove.rank,
          score: rankedMove.normalizedScore,
          loss: rankedMove.lossFromBest
        });
      }

      const topMove = rankedAnalysis.rankedMoves.find((move) => move.rank === 1);
      if (topMove !== undefined) {
        const moveLabel = legalMoveLabelByFingerprint.get(topMove.moveFingerprint);
        const fixtureProvider = isFixtureEvaluator(rankedAnalysis.provenance.provider);
        const unevaluatedLegalMoveCount = rankedAnalysis.unevaluatedMoves.length;

        if (moveLabel !== undefined) {
          if (fixtureProvider) {
            evidence.recommendationSupport = {
              status: "not-supported",
              reason: "fixture-evaluator"
            };
          } else if (rankedAnalysis.coverage === "complete") {
            evidence.recommendationSupport = {
              status: "supported",
              reason: "complete-trustworthy-coverage",
              supportedRecommendation: {
                kind: "authoritative",
                moveFingerprint: topMove.moveFingerprint,
                moveLabel,
                evaluatorRank: topMove.rank,
                normalizedScore: topMove.normalizedScore,
                comparedLegalMoveCount: rankedAnalysis.rankedMoves.length,
                totalLegalMoveCount: legalMoveOutcomes.length,
                unevaluatedLegalMoveCount
              }
            };
          } else {
            evidence.recommendationSupport = {
              status: "supported",
              reason: "partial-coverage",
              supportedRecommendation: {
                kind: "strongest-evaluated",
                moveFingerprint: topMove.moveFingerprint,
                moveLabel,
                evaluatorRank: topMove.rank,
                normalizedScore: topMove.normalizedScore,
                comparedLegalMoveCount: rankedAnalysis.rankedMoves.length,
                totalLegalMoveCount: legalMoveOutcomes.length,
                unevaluatedLegalMoveCount
              }
            };
          }
        }
      }
    } else if (legalMoveOutcomes.length > 0) {
      warnings.push({
        code: "no-ranked-analysis",
        message: "No ranked analysis was available for these legal outcomes."
      });
      if (evidence.recommendationSupport === undefined) {
        evidence.recommendationSupport = {
          status: "not-supported",
          reason: "missing-evaluator"
        };
      }
    }

    const stagedPriority = new Set(
      input.context.currentTurn.stagedSelection?.candidateMoveFingerprints ?? []
    );

    const selection = selectCurrentPositionMoves({
      question,
      outcomes: legalMoveOutcomes,
      stagedFingerprints: stagedPriority,
      rankedByFingerprint,
      maxLegalMoves: limits.maxLegalMoves
    });

    evidence.legalMoveSelection = selection.summary;
    evidence.legalMoveEvidence = selection.selected;
    warnings.push(...selection.warnings);
  }

  if (input.context.kind === "move-outcome") {
    evidence.positionFacts = analyzePosition(input.context.snapshot.gameState.position);
    evidence.legalMoveEvidence = [
      {
        moveFingerprint: input.context.moveFingerprint,
        moveLabel: formatMoveLabel(input.context.outcome.move),
        featureDelta: structuredClone(input.context.outcome.featureDelta),
        selectionReasons: [
          {
            code: "inspected-move-outcome",
            message: "Selected because this move outcome is explicitly inspected in the UI."
          }
        ]
      }
    ];
  }

  if (input.context.kind === "history-turn") {
    const turnRecord = input.context.turnRecord;
    const rankedAnalysis =
      input.context.analysisRecord?.rankedMoveAnalysis ?? input.context.rankedAnalysis;
    const limitations: string[] = [];
    evidence.positionFacts = analyzePosition(turnRecord.positionBefore);

    let evaluatedChosenMove:
      | {
          evaluatorRank?: number;
          normalizedScore?: number;
          lossFromTopScoredMove?: number;
        }
      | undefined;

    if (rankedAnalysis?.kind === "evaluated") {
      evidence.evaluatorProvenance = structuredClone(rankedAnalysis.provenance);
      evidence.evaluatorCoverage = rankedAnalysis.coverage;
    }

    let playedMoveFingerprint: string | undefined;
    let playedMoveEvaluated = false;

    if (turnRecord.outcome.kind === "move") {
      playedMoveFingerprint = getMoveFingerprint(turnRecord.outcome.move);
    }

    if (playedMoveFingerprint !== undefined && rankedAnalysis?.kind === "evaluated") {
      const rankedChosen = rankedAnalysis.rankedMoves.find(
        (row) => row.moveFingerprint === playedMoveFingerprint
      );
      playedMoveEvaluated = rankedChosen !== undefined;
      evaluatedChosenMove = {
        ...(rankedChosen === undefined ? {} : { evaluatorRank: rankedChosen.rank }),
        ...(rankedChosen === undefined ? {} : { normalizedScore: rankedChosen.normalizedScore }),
        ...(rankedChosen === undefined ? {} : { lossFromTopScoredMove: rankedChosen.lossFromBest })
      };

      const bestEvaluated = rankedAnalysis.rankedMoves.find((row) => row.rank === 1);

      if (isFixtureEvaluator(rankedAnalysis.provenance.provider)) {
        evidence.recommendationSupport = {
          status: "not-supported",
          reason: "fixture-evaluator"
        };
        limitations.push("Fixture evaluator evidence is non-authoritative.");
      } else if (rankedChosen !== undefined && bestEvaluated !== undefined) {
        const recommendationMove = rankedAnalysis.rankedMoves[0]!;
        const recommendationLabel = formatMoveLabel(recommendationMove.outcome.move);

        evidence.recommendationSupport = {
          status: "supported",
          reason:
            rankedAnalysis.coverage === "complete"
              ? "complete-trustworthy-coverage"
              : "partial-coverage",
          supportedRecommendation: {
            kind: rankedAnalysis.coverage === "complete" ? "authoritative" : "strongest-evaluated",
            moveFingerprint: recommendationMove.moveFingerprint,
            moveLabel: recommendationLabel,
            evaluatorRank: recommendationMove.rank,
            normalizedScore: recommendationMove.normalizedScore,
            comparedLegalMoveCount: rankedAnalysis.rankedMoves.length,
            totalLegalMoveCount:
              rankedAnalysis.rankedMoves.length + rankedAnalysis.unevaluatedMoves.length,
            unevaluatedLegalMoveCount: rankedAnalysis.unevaluatedMoves.length
          }
        };

        if (rankedAnalysis.coverage === "partial") {
          limitations.push("Evaluator coverage is partial across legal candidates.");
        }
      } else {
        evidence.recommendationSupport = {
          status: "not-supported",
          reason: "played-move-not-evaluated"
        };
        limitations.push("The played move was not scored by the evaluator.");
      }

      if (rankedAnalysis.rankedMoves.length > 0) {
        const bestEvaluated = rankedAnalysis.rankedMoves[0]!;
        const legalRows: CoachMoveEvidence[] = [];

        if (playedMoveFingerprint !== undefined) {
          const playedRanked = rankedAnalysis.rankedMoves.find(
            (row) => row.moveFingerprint === playedMoveFingerprint
          );
          const playedUnevaluated = rankedAnalysis.unevaluatedMoves.find(
            (outcome) => getMoveFingerprint(outcome.move) === playedMoveFingerprint
          );
          const playedOutcome = playedRanked?.outcome ?? playedUnevaluated;

          if (playedOutcome !== undefined) {
            legalRows.push({
              moveFingerprint: playedMoveFingerprint,
              moveLabel: formatMoveLabel(playedOutcome.move),
              featureDelta: structuredClone(playedOutcome.featureDelta),
              selectionReasons: [
                {
                  code: "deterministic-fallback",
                  message: "Selected because this is the committed move under review."
                }
              ],
              ...(playedRanked === undefined ? {} : { evaluatorRank: playedRanked.rank }),
              ...(playedRanked === undefined
                ? {}
                : { normalizedScore: playedRanked.normalizedScore }),
              ...(playedRanked === undefined
                ? {}
                : { lossFromTopScoredMove: playedRanked.lossFromBest })
            });
          }
        }

        if (bestEvaluated.moveFingerprint !== playedMoveFingerprint) {
          legalRows.push({
            moveFingerprint: bestEvaluated.moveFingerprint,
            moveLabel: formatMoveLabel(bestEvaluated.outcome.move),
            featureDelta: structuredClone(bestEvaluated.outcome.featureDelta),
            selectionReasons: [
              {
                code: "top-ranked-comparison",
                message: "Selected as the strongest evaluated legal alternative."
              }
            ],
            evaluatorRank: bestEvaluated.rank,
            normalizedScore: bestEvaluated.normalizedScore,
            lossFromTopScoredMove: bestEvaluated.lossFromBest
          });
        }

        evidence.legalMoveSelection = {
          totalLegalMoves:
            rankedAnalysis.rankedMoves.length + rankedAnalysis.unevaluatedMoves.length,
          selectedLegalMoves: legalRows.length,
          omittedLegalMoves: Math.max(
            0,
            rankedAnalysis.rankedMoves.length +
              rankedAnalysis.unevaluatedMoves.length -
              legalRows.length
          ),
          coachEvidenceCoverage:
            legalRows.length >=
            rankedAnalysis.rankedMoves.length + rankedAnalysis.unevaluatedMoves.length
              ? "complete"
              : "selected-subset",
          truncated: false,
          questionMoveReferences: []
        };
        evidence.legalMoveEvidence = legalRows;
      }
    } else if (turnRecord.outcome.kind === "move") {
      evidence.recommendationSupport = {
        status: "not-supported",
        reason: "missing-evaluator"
      };
      limitations.push("No evaluator ranking is available for this historical decision.");
    } else {
      evidence.recommendationSupport = {
        status: "not-supported",
        reason: "unsupported-history-turn"
      };
      limitations.push("The selected historical turn is not a checker-play move.");
    }

    const moveClassification = classifyCommittedMove({
      ...(playedMoveFingerprint === undefined ? {} : { playedMoveFingerprint }),
      ...(rankedAnalysis === undefined ? {} : { rankedAnalysis }),
      analysisSource:
        turnRecord.outcome.kind !== "move"
          ? "unsupported"
          : rankedAnalysis === undefined
            ? "missing"
            : "analysis-record"
    });

    evidence.moveClassificationPolicy = structuredClone(MOVE_CLASSIFICATION_POLICY);
    if (moveClassification.status === "unclassified") {
      limitations.push(formatUnclassifiedReason(moveClassification.reason));
    }

    evidence.historicalReviewEvidence = {
      selectionSource: input.context.selectionSource,
      turnNumber: turnRecord.turnNumber,
      playedMove:
        turnRecord.outcome.kind === "pass" ? "pass" : formatMoveLabel(turnRecord.outcome.move),
      ...(playedMoveFingerprint === undefined ? {} : { playedMoveFingerprint }),
      ...(turnRecord.outcome.kind !== "move" ? {} : { moveClassification }),
      ...(rankedAnalysis?.kind !== "evaluated"
        ? {}
        : {
            totalLegalMoveCount:
              rankedAnalysis.rankedMoves.length + rankedAnalysis.unevaluatedMoves.length,
            evaluatedLegalMoveCount: rankedAnalysis.rankedMoves.length,
            unevaluatedLegalMoveCount: rankedAnalysis.unevaluatedMoves.length,
            ...(rankedAnalysis.rankedMoves[0] === undefined
              ? {}
              : {
                  bestEvaluatedMove: {
                    moveFingerprint: rankedAnalysis.rankedMoves[0].moveFingerprint,
                    moveLabel: formatMoveLabel(rankedAnalysis.rankedMoves[0].outcome.move),
                    evaluatorRank: rankedAnalysis.rankedMoves[0].rank,
                    normalizedScore: rankedAnalysis.rankedMoves[0].normalizedScore
                  }
                })
          }),
      playedMoveEvaluated,
      limitations
    };

    evidence.committedTurnEvidence = {
      turnNumber: turnRecord.turnNumber,
      player: turnRecord.player,
      dice: [turnRecord.dice.dice[0], turnRecord.dice.dice[1]],
      outcome:
        turnRecord.outcome.kind === "pass" ? "pass" : formatMoveLabel(turnRecord.outcome.move),
      hasAnalysisRecord:
        input.context.analysisRecord !== undefined || input.context.rankedAnalysis !== undefined,
      ...(evaluatedChosenMove === undefined ? {} : { evaluatedChosenMove }),
      ...(turnRecord.outcome.kind !== "move" ? {} : { moveClassification })
    };

    if (input.context.analysisRecord === undefined && input.context.rankedAnalysis === undefined) {
      warnings.push({
        code: "missing-history-analysis",
        message: "No analysis record is available for the selected historical turn."
      });
    }
  }

  if (input.context.kind === "game-review") {
    const snapshot = input.context.snapshot;
    evidence.positionFacts = analyzePosition(snapshot.gameState.position);

    const reviewedTurns: readonly CoachGameReviewTurnEvidence[] =
      input.context.reviewedTurns ??
      snapshot.turnHistory.map((turnRecord) => ({
        turnNumber: turnRecord.turnNumber,
        turnRecord: structuredClone(turnRecord),
        analysisSource:
          turnRecord.outcome.kind === "move" ? ("missing" as const) : ("unsupported" as const)
      }));

    let supportedCheckerPlayDecisionCount = 0;
    let unsupportedDecisionCount = 0;
    let completeCoverageCount = 0;
    let partialCoverageCount = 0;
    let missingCoverageCount = 0;
    let fixtureCoverageCount = 0;
    let failedCoverageCount = 0;
    let unavailableCoverageCount = 0;
    let evaluatedChosenMoveCount = 0;
    let unevaluatedChosenMoveCount = 0;
    const classificationCounts = {
      best: 0,
      reasonable: 0,
      mistake: 0,
      majorMistake: 0,
      unclassified: 0
    };

    const limitations: string[] = [];
    const decisionEvidence: CoachGameReviewDecisionEvidence[] = [];

    for (const reviewedTurn of reviewedTurns) {
      const turnRecord = reviewedTurn.turnRecord;
      if (turnRecord.outcome.kind !== "move") {
        unsupportedDecisionCount += 1;
        continue;
      }

      supportedCheckerPlayDecisionCount += 1;
      const playedMoveLabel = formatMoveLabel(turnRecord.outcome.move);
      const playedMoveFingerprint = getMoveFingerprint(turnRecord.outcome.move);
      const countsIncludeTurn =
        input.context.reviewedPlayerScope.kind !== "learner-only" ||
        input.context.reviewedPlayerScope.player === undefined ||
        turnRecord.player === input.context.reviewedPlayerScope.player;

      if (reviewedTurn.rankedAnalysis?.kind !== "evaluated") {
        if (reviewedTurn.analysisSource === "failed") {
          failedCoverageCount += 1;
          limitations.push(
            `Turn ${turnRecord.turnNumber} could not be evaluated (${reviewedTurn.analysisIssue ?? "evaluation failed"}).`
          );
        } else if (reviewedTurn.analysisSource === "unavailable") {
          unavailableCoverageCount += 1;
          limitations.push(
            `Turn ${turnRecord.turnNumber} had no evaluator available (${reviewedTurn.analysisIssue ?? "unavailable"}).`
          );
        } else if (reviewedTurn.analysisSource === "unsupported") {
          unsupportedDecisionCount += 1;
        } else {
          missingCoverageCount += 1;
        }

        const moveClassification = classifyCommittedMove({
          playedMoveFingerprint,
          ...(reviewedTurn.rankedAnalysis === undefined
            ? {}
            : { rankedAnalysis: reviewedTurn.rankedAnalysis }),
          analysisSource: reviewedTurn.analysisSource
        });

        if (countsIncludeTurn) {
          incrementClassificationCount(classificationCounts, moveClassification);
        }

        decisionEvidence.push({
          turnNumber: turnRecord.turnNumber,
          player: turnRecord.player,
          playedMove: playedMoveLabel,
          analysisSource: reviewedTurn.analysisSource,
          playedMoveEvaluated: false,
          moveClassification,
          note: formatClassificationNote(moveClassification)
        });
        continue;
      }

      const rankedAnalysis = reviewedTurn.rankedAnalysis;
      const playedRanked = rankedAnalysis.rankedMoves.find(
        (row) => row.moveFingerprint === playedMoveFingerprint
      );
      const topRanked = rankedAnalysis.rankedMoves[0];
      const fixture = isFixtureEvaluator(rankedAnalysis.provenance.provider);
      const moveClassification = classifyCommittedMove({
        playedMoveFingerprint,
        rankedAnalysis,
        analysisSource: reviewedTurn.analysisSource
      });

      if (countsIncludeTurn) {
        incrementClassificationCount(classificationCounts, moveClassification);
      }

      if (fixture) {
        fixtureCoverageCount += 1;
      } else if (rankedAnalysis.coverage === "complete") {
        completeCoverageCount += 1;
      } else {
        partialCoverageCount += 1;
      }

      if (playedRanked === undefined) {
        unevaluatedChosenMoveCount += 1;
      } else {
        evaluatedChosenMoveCount += 1;
      }

      const normalizedScoreDifference = playedRanked?.lossFromBest;
      const topMoveDiffers =
        topRanked !== undefined && topRanked.moveFingerprint !== playedMoveFingerprint;

      const rankingNote =
        playedRanked?.rank === 1
          ? "Played move tied for highest evaluated rank."
          : playedRanked === undefined
            ? "Played move was not evaluated in ranked output."
            : topMoveDiffers
              ? "Played move ranked lower than the strongest evaluated alternative."
              : "Played move remained among strongest evaluated candidates.";

      decisionEvidence.push({
        turnNumber: turnRecord.turnNumber,
        player: turnRecord.player,
        playedMove: playedMoveLabel,
        analysisSource: reviewedTurn.analysisSource,
        coverage: rankedAnalysis.coverage,
        playedMoveEvaluated: playedRanked !== undefined,
        ...(playedRanked === undefined ? {} : { playedMoveRank: playedRanked.rank }),
        ...(playedRanked === undefined
          ? {}
          : { playedMoveNormalizedScore: playedRanked.normalizedScore }),
        ...(topRanked === undefined || !topMoveDiffers
          ? {}
          : {
              strongestAlternative: {
                moveFingerprint: topRanked.moveFingerprint,
                moveLabel: formatMoveLabel(topRanked.outcome.move),
                evaluatorRank: topRanked.rank,
                normalizedScore: topRanked.normalizedScore
              }
            }),
        moveClassification,
        ...(normalizedScoreDifference === undefined ? {} : { normalizedScoreDifference }),
        isTieForHighestEvaluation: playedRanked?.rank === 1,
        note: `${rankingNote} ${formatClassificationNote(moveClassification)}`
      });
    }

    evidence.moveClassificationPolicy = structuredClone(MOVE_CLASSIFICATION_POLICY);

    const explicitTurnNumbers = new Set<number>([
      ...(input.context.selectedTurnNumber === undefined ? [] : [input.context.selectedTurnNumber]),
      ...(input.context.referencedTurnNumbers ?? parseReferencedTurnNumbers(input.question))
    ]);

    const keyDecisions: CoachGameReviewDecisionEvidence[] = [];
    const seenDecisionTurns = new Set<number>();

    const pushDecision = (decision: CoachGameReviewDecisionEvidence): void => {
      if (seenDecisionTurns.has(decision.turnNumber)) {
        return;
      }

      if (keyDecisions.length >= limits.maxLegalMoves) {
        return;
      }

      seenDecisionTurns.add(decision.turnNumber);
      keyDecisions.push(decision);
    };

    const scoredDecisions = decisionEvidence
      .filter(
        (decision) =>
          decision.playedMoveEvaluated && decision.normalizedScoreDifference !== undefined
      )
      .sort((left, right) => {
        const leftDiff = left.normalizedScoreDifference ?? -1;
        const rightDiff = right.normalizedScoreDifference ?? -1;
        if (leftDiff !== rightDiff) {
          return rightDiff - leftDiff;
        }
        return left.turnNumber - right.turnNumber;
      });

    const severityOrderedDecisions = [...decisionEvidence].sort((left, right) => {
      const leftSeverity = classificationSeverity(left.moveClassification);
      const rightSeverity = classificationSeverity(right.moveClassification);
      if (leftSeverity !== rightSeverity) {
        return leftSeverity - rightSeverity;
      }

      const leftLoss = classificationLoss(left.moveClassification);
      const rightLoss = classificationLoss(right.moveClassification);
      if (leftLoss !== rightLoss) {
        return rightLoss - leftLoss;
      }

      return left.turnNumber - right.turnNumber;
    });

    for (const decision of decisionEvidence) {
      if (explicitTurnNumbers.has(decision.turnNumber)) {
        pushDecision(decision);
      }
    }

    const hasBalancedExplicit = keyDecisions.some((decision) =>
      isBalancedClassification(decision.moveClassification)
    );
    const balanceCandidate = severityOrderedDecisions.find((decision) =>
      isBalancedClassification(decision.moveClassification)
    );
    const reserveBalanceSlot =
      !hasBalancedExplicit && balanceCandidate !== undefined && limits.maxLegalMoves > 0;
    const severityBudget = reserveBalanceSlot
      ? Math.max(0, limits.maxLegalMoves - 1)
      : limits.maxLegalMoves;

    for (const decision of severityOrderedDecisions) {
      if (keyDecisions.length >= severityBudget) {
        break;
      }

      if (seenDecisionTurns.has(decision.turnNumber)) {
        continue;
      }

      pushDecision(decision);
    }

    if (reserveBalanceSlot && balanceCandidate !== undefined) {
      pushDecision(balanceCandidate);
    }

    const tieDecisions = scoredDecisions.filter((decision) => decision.isTieForHighestEvaluation);
    for (const decision of tieDecisions) {
      pushDecision(decision);
      if (keyDecisions.length >= limits.maxLegalMoves) {
        break;
      }
    }

    if (keyDecisions.length === 0) {
      const firstCovered = decisionEvidence
        .filter((decision) => decision.playedMoveEvaluated)
        .sort((left, right) => left.turnNumber - right.turnNumber)[0];
      if (firstCovered !== undefined) {
        pushDecision(firstCovered);
      }
    }

    const summary =
      input.context.analysisSession === undefined
        ? null
        : summarizeAnalysisSession(input.context.analysisSession);
    const provenanceSummary = getSessionProvenanceSummary(input.context.analysisSession);

    const lastTurn = snapshot.turnHistory.at(-1);
    evidence.gameReviewEvidence = {
      reviewScope: input.context.reviewScope,
      selectionSource: input.context.selectionSource,
      committedTurnBoundary: input.context.committedTurnBoundary,
      reviewedPlayerScope: input.context.reviewedPlayerScope.kind,
      ...(input.context.reviewedPlayerScope.player === undefined
        ? {}
        : { reviewedPlayer: input.context.reviewedPlayerScope.player }),
      ownershipStatus:
        input.context.reviewedPlayerScope.kind === "learner-only" ? "authoritative" : "ambiguous",
      ...(input.context.selectedTurnNumber === undefined
        ? {}
        : { selectedTurnNumber: input.context.selectedTurnNumber }),
      referencedTurnNumbers: input.context.referencedTurnNumbers ?? [],
      committedTurnCount: snapshot.turnHistory.length,
      supportedCheckerPlayDecisionCount,
      unsupportedDecisionCount,
      analyzedTurnNumbers: summary?.analyzedTurnNumbers ?? [],
      analysisRecordCount: summary?.recordCount ?? 0,
      evaluatedChosenMoveCount,
      unevaluatedChosenMoveCount,
      bestCount: classificationCounts.best,
      reasonableCount: classificationCounts.reasonable,
      mistakeCount: classificationCounts.mistake,
      majorMistakeCount: classificationCounts.majorMistake,
      unclassifiedCount: classificationCounts.unclassified,
      completeCoverageCount,
      partialCoverageCount,
      missingCoverageCount,
      fixtureCoverageCount,
      failedCoverageCount,
      unavailableCoverageCount,
      ...(lastTurn === undefined || lastTurn.gameStatusAfter.state !== "complete"
        ? {}
        : { winner: lastTurn.gameStatusAfter.winner }),
      ...(provenanceSummary === undefined ? {} : { evaluatorProvenanceSummary: provenanceSummary }),
      keyDecisions,
      limitations: [...new Set(limitations)]
    };

    evidence.recommendationSupport = {
      status: "not-supported",
      reason: "non-decision-state"
    };

    if (input.context.reviewedPlayerScope.kind === "all-players") {
      warnings.push({
        code: "ambiguous-review-ownership",
        message: "Reviewed-player ownership is ambiguous; evidence includes all committed players."
      });
    }
  }

  const cappedWarnings = capWarnings(warnings, limits.maxWarnings);
  evidence.warnings = cappedWarnings;

  return {
    evidence,
    warnings: cappedWarnings
  };
};
