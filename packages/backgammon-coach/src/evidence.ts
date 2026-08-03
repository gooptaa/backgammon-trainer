import {
  analyzePosition,
  getMoveFingerprint,
  type EvaluatorProvenance,
  type PositionFeatureDelta
} from "@backgammon-trainer/backgammon-analysis";
import {
  summarizeAnalysisSession,
  type AnalysisSession
} from "@backgammon-trainer/backgammon-analysis-session";

import type { CoachConversation } from "./conversation";
import type { CoachQuestionContext } from "./context";

export interface CoachEvidenceWarning {
  readonly code:
    | "fixture-evaluator"
    | "no-ranked-analysis"
    | "missing-history-analysis"
    | "knowledge-unavailable"
    | "move-evidence-truncated"
    | "warning-limit-reached";
  readonly message: string;
}

export interface CoachMoveEvidence {
  readonly moveFingerprint: string;
  readonly moveLabel: string;
  readonly featureDelta: PositionFeatureDelta;
  readonly evaluatorRank?: number;
  readonly normalizedScore?: number;
  readonly lossFromTopScoredMove?: number;
}

export interface CoachEvidenceBundle {
  evidenceVersion: 1;
  questionContext: {
    kind: CoachQuestionContext["kind"];
  };
  positionFacts?: ReturnType<typeof analyzePosition>;
  legalMoveEvidence?: readonly CoachMoveEvidence[];
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
  };
  gameReviewEvidence?: {
    committedTurnCount: number;
    analyzedTurnNumbers: readonly number[];
    analysisRecordCount: number;
    evaluatedChosenMoveCount: number;
    unevaluatedChosenMoveCount: number;
    completeCoverageCount: number;
    partialCoverageCount: number;
    winner?: "white" | "black";
    evaluatorProvenanceSummary?: {
      provider: string;
      providerVersion: string;
      adapterVersion: string;
    };
  };
  evaluatorProvenance?: EvaluatorProvenance;
  evaluatorCoverage?: "complete" | "partial";
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
  maxLegalMoves: 24,
  maxWarnings: 8
};

const formatMoveLabel = (move: import("@backgammon-trainer/backgammon-engine").Move): string => {
  return move.steps.map((step) => `${step.fromPoint}->${step.toPoint}`).join(", ");
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
    evidenceVersion: 1,
    questionContext: {
      kind: input.context.kind
    },
    conversationSummary: summarizeConversation(input.conversation),
    warnings: []
  };

  if (input.context.kind === "current-position") {
    const positionFacts = analyzePosition(input.context.snapshot.gameState.position);
    evidence.positionFacts = positionFacts;

    const legalMoveOutcomes = input.context.currentTurn.legalMoveOutcomes?.outcomes ?? [];
    const rankedAnalysis = input.context.currentTurn.rankedAnalysis;
    const rankedByFingerprint = new Map<string, { rank: number; score: number; loss: number }>();

    if (rankedAnalysis?.kind === "evaluated") {
      evidence.evaluatorProvenance = structuredClone(rankedAnalysis.provenance);
      evidence.evaluatorCoverage = rankedAnalysis.coverage;

      if (rankedAnalysis.provenance.provider.includes("fixture")) {
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
    } else if (legalMoveOutcomes.length > 0) {
      warnings.push({
        code: "no-ranked-analysis",
        message: "No ranked analysis was available for these legal outcomes."
      });
    }

    const stagedPriority = new Set(
      input.context.currentTurn.stagedSelection?.candidateMoveFingerprints ?? []
    );

    const orderedOutcomes = [...legalMoveOutcomes].sort((left, right) => {
      const leftFingerprint = getMoveFingerprint(left.move);
      const rightFingerprint = getMoveFingerprint(right.move);
      const leftPriority = stagedPriority.has(leftFingerprint) ? 1 : 0;
      const rightPriority = stagedPriority.has(rightFingerprint) ? 1 : 0;
      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }
      return leftFingerprint.localeCompare(rightFingerprint);
    });

    const truncated = orderedOutcomes.length > limits.maxLegalMoves;
    const selectedOutcomes = orderedOutcomes.slice(0, limits.maxLegalMoves);

    evidence.legalMoveEvidence = selectedOutcomes.map((outcome) => {
      const moveFingerprint = getMoveFingerprint(outcome.move);
      const ranked = rankedByFingerprint.get(moveFingerprint);
      return {
        moveFingerprint,
        moveLabel: formatMoveLabel(outcome.move),
        featureDelta: structuredClone(outcome.featureDelta),
        ...(ranked === undefined
          ? {}
          : {
              evaluatorRank: ranked.rank,
              normalizedScore: ranked.score,
              lossFromTopScoredMove: ranked.loss
            })
      };
    });

    if (truncated) {
      warnings.push({
        code: "move-evidence-truncated",
        message: `Included ${limits.maxLegalMoves} of ${orderedOutcomes.length} legal moves.`
      });
    }
  }

  if (input.context.kind === "move-outcome") {
    evidence.positionFacts = analyzePosition(input.context.snapshot.gameState.position);
    evidence.legalMoveEvidence = [
      {
        moveFingerprint: input.context.moveFingerprint,
        moveLabel: formatMoveLabel(input.context.outcome.move),
        featureDelta: structuredClone(input.context.outcome.featureDelta)
      }
    ];
  }

  if (input.context.kind === "history-turn") {
    const turnRecord = input.context.turnRecord;
    evidence.positionFacts = analyzePosition(turnRecord.positionBefore);

    let evaluatedChosenMove:
      | {
          evaluatorRank?: number;
          normalizedScore?: number;
          lossFromTopScoredMove?: number;
        }
      | undefined;

    if (input.context.analysisRecord !== undefined && turnRecord.outcome.kind === "move") {
      const ranked = input.context.analysisRecord.rankedMoveAnalysis;
      if (ranked.kind === "evaluated") {
        evidence.evaluatorProvenance = structuredClone(ranked.provenance);
        evidence.evaluatorCoverage = ranked.coverage;
        const fingerprint = getMoveFingerprint(turnRecord.outcome.move);
        const rankedChosen = ranked.rankedMoves.find((row) => row.moveFingerprint === fingerprint);
        evaluatedChosenMove = {
          ...(rankedChosen === undefined ? {} : { evaluatorRank: rankedChosen.rank }),
          ...(rankedChosen === undefined ? {} : { normalizedScore: rankedChosen.normalizedScore }),
          ...(rankedChosen === undefined
            ? {}
            : { lossFromTopScoredMove: rankedChosen.lossFromBest })
        };
      }
    }

    evidence.committedTurnEvidence = {
      turnNumber: turnRecord.turnNumber,
      player: turnRecord.player,
      dice: [turnRecord.dice.dice[0], turnRecord.dice.dice[1]],
      outcome:
        turnRecord.outcome.kind === "pass" ? "pass" : formatMoveLabel(turnRecord.outcome.move),
      hasAnalysisRecord: input.context.analysisRecord !== undefined,
      ...(evaluatedChosenMove === undefined ? {} : { evaluatedChosenMove })
    };

    if (input.context.analysisRecord === undefined) {
      warnings.push({
        code: "missing-history-analysis",
        message: "No analysis record is available for the selected historical turn."
      });
    }
  }

  if (input.context.kind === "game-review") {
    const snapshot = input.context.snapshot;
    evidence.positionFacts = analyzePosition(snapshot.gameState.position);

    const summary =
      input.context.analysisSession === undefined
        ? null
        : summarizeAnalysisSession(input.context.analysisSession);
    const provenanceSummary = getSessionProvenanceSummary(input.context.analysisSession);

    const lastTurn = snapshot.turnHistory.at(-1);
    evidence.gameReviewEvidence = {
      committedTurnCount: snapshot.turnHistory.length,
      analyzedTurnNumbers: summary?.analyzedTurnNumbers ?? [],
      analysisRecordCount: summary?.recordCount ?? 0,
      evaluatedChosenMoveCount: summary?.evaluatedChosenMoves ?? 0,
      unevaluatedChosenMoveCount: summary?.unevaluatedChosenMoves ?? 0,
      completeCoverageCount: summary?.completeCoverageCount ?? 0,
      partialCoverageCount: summary?.partialCoverageCount ?? 0,
      ...(lastTurn === undefined || lastTurn.gameStatusAfter.state !== "complete"
        ? {}
        : { winner: lastTurn.gameStatusAfter.winner }),
      ...(provenanceSummary === undefined ? {} : { evaluatorProvenanceSummary: provenanceSummary })
    };
  }

  const cappedWarnings = capWarnings(warnings, limits.maxWarnings);
  evidence.warnings = cappedWarnings;

  return {
    evidence,
    warnings: cappedWarnings
  };
};
