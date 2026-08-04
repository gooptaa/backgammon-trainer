import type {
  AnalyzeLegalMoveOutcomesResult,
  LegalMoveOutcome,
  LegalMoveOutcomeAnalysis,
  RankedLegalMoveAnalysis
} from "@backgammon-trainer/backgammon-analysis";
import type {
  AnalysisRecord,
  AnalysisSession
} from "@backgammon-trainer/backgammon-analysis-session";
import type { DiceRoll, GameSnapshot, TurnRecord } from "@backgammon-trainer/backgammon-engine";
import type { Player } from "@backgammon-trainer/backgammon-domain";
import type { LearnerProgressSnapshot } from "./profile";

export type CoachTurnStatus =
  | "opening-unresolved"
  | "waiting-for-dice"
  | "decision-available"
  | "no-legal-move"
  | "game-complete";

export interface CoachStagedSelectionSummary {
  readonly selectedSteps: readonly string[];
  readonly candidateMoveFingerprints: readonly string[];
  readonly candidateMoveLabels: readonly string[];
}

export interface CurrentTurnContext {
  readonly status: CoachTurnStatus;
  readonly activePlayer?: Player;
  readonly dice?: DiceRoll;
  readonly legalMoveOutcomes?: LegalMoveOutcomeAnalysis;
  readonly rankedAnalysis?: RankedLegalMoveAnalysis;
  readonly stagedSelection?: CoachStagedSelectionSummary;
}

export interface CoachGameReviewTurnEvidence {
  readonly turnNumber: number;
  readonly turnRecord: TurnRecord;
  readonly analysisRecord?: AnalysisRecord;
  readonly rankedAnalysis?: RankedLegalMoveAnalysis;
  readonly analysisSource:
    "analysis-record" | "hydrated" | "missing" | "failed" | "unavailable" | "unsupported";
  readonly analysisIssue?: string;
}

export interface CoachReviewedPlayerScope {
  readonly kind: "learner-only" | "all-players";
  readonly player?: Player;
  readonly reason?: "ownership-ambiguous";
}

export type CoachQuestionContext =
  | {
      readonly kind: "current-position";
      readonly gameReference: string;
      readonly snapshot: GameSnapshot;
      readonly currentTurn: CurrentTurnContext;
    }
  | {
      readonly kind: "history-turn";
      readonly gameReference: string;
      readonly turnNumber: number;
      readonly selectionSource: "selected-history" | "latest-committed";
      readonly snapshot: GameSnapshot;
      readonly turnRecord: TurnRecord;
      readonly analysisRecord?: AnalysisRecord;
      readonly rankedAnalysis?: RankedLegalMoveAnalysis;
    }
  | {
      readonly kind: "move-outcome";
      readonly gameReference: string;
      readonly snapshot: GameSnapshot;
      readonly moveFingerprint: string;
      readonly outcome: LegalMoveOutcome;
    }
  | {
      readonly kind: "game-review";
      readonly gameReference: string;
      readonly snapshot: GameSnapshot;
      readonly reviewScope: "completed-game" | "game-so-far";
      readonly selectionSource: "explicit-request" | "completed-fallback";
      readonly committedTurnBoundary: number;
      readonly reviewedPlayerScope: CoachReviewedPlayerScope;
      readonly selectedTurnNumber?: number;
      readonly referencedTurnNumbers?: readonly number[];
      readonly reviewedTurns?: readonly CoachGameReviewTurnEvidence[];
      readonly analysisSession?: AnalysisSession;
    }
  | {
      readonly kind: "progress-profile";
      readonly gameReference: string;
      readonly snapshot: GameSnapshot;
      readonly progress: LearnerProgressSnapshot;
    };

export interface ResolveCoachQuestionContextInput {
  readonly gameReference: string;
  readonly snapshot: GameSnapshot;
  readonly openingResolved: boolean;
  readonly gameComplete: boolean;
  readonly legalMoveOutcomesResult: AnalyzeLegalMoveOutcomesResult | null;
  readonly rankedAnalysis?: RankedLegalMoveAnalysis;
  readonly stagedSelection?: CoachStagedSelectionSummary;
  readonly selectedHistoryTurn?: {
    readonly turnRecord: TurnRecord;
    readonly analysisRecord?: AnalysisRecord;
    readonly rankedAnalysis?: RankedLegalMoveAnalysis;
  };
  readonly selectedMoveOutcome?: {
    readonly moveFingerprint: string;
    readonly outcome: LegalMoveOutcome;
  };
  readonly analysisSession?: AnalysisSession;
}

export const deriveCurrentTurnContext = (input: {
  openingResolved: boolean;
  gameComplete: boolean;
  activePlayer: Player;
  dice: DiceRoll | null;
  legalMoveOutcomesResult: AnalyzeLegalMoveOutcomesResult | null;
  rankedAnalysis?: RankedLegalMoveAnalysis;
  stagedSelection?: CoachStagedSelectionSummary;
}): CurrentTurnContext => {
  if (input.gameComplete) {
    return {
      status: "game-complete",
      activePlayer: input.activePlayer,
      ...(input.dice === null ? {} : { dice: { dice: [input.dice.dice[0], input.dice.dice[1]] } }),
      ...(input.stagedSelection === undefined
        ? {}
        : { stagedSelection: structuredClone(input.stagedSelection) })
    };
  }

  if (!input.openingResolved) {
    return {
      status: "opening-unresolved"
    };
  }

  if (input.dice === null) {
    return {
      status: "waiting-for-dice",
      activePlayer: input.activePlayer
    };
  }

  const legalMoveOutcomes =
    input.legalMoveOutcomesResult !== null && input.legalMoveOutcomesResult.ok
      ? input.legalMoveOutcomesResult.analysis
      : undefined;

  const status: CoachTurnStatus =
    legalMoveOutcomes !== undefined && legalMoveOutcomes.outcomes.length === 0
      ? "no-legal-move"
      : "decision-available";

  return {
    status,
    activePlayer: input.activePlayer,
    dice: { dice: [input.dice.dice[0], input.dice.dice[1]] },
    ...(legalMoveOutcomes === undefined
      ? {}
      : { legalMoveOutcomes: structuredClone(legalMoveOutcomes) }),
    ...(input.rankedAnalysis === undefined
      ? {}
      : { rankedAnalysis: structuredClone(input.rankedAnalysis) }),
    ...(input.stagedSelection === undefined
      ? {}
      : { stagedSelection: structuredClone(input.stagedSelection) })
  };
};

export const resolveCoachQuestionContext = (
  input: ResolveCoachQuestionContextInput
): CoachQuestionContext => {
  if (input.selectedMoveOutcome !== undefined) {
    return {
      kind: "move-outcome",
      gameReference: input.gameReference,
      snapshot: structuredClone(input.snapshot),
      moveFingerprint: input.selectedMoveOutcome.moveFingerprint,
      outcome: structuredClone(input.selectedMoveOutcome.outcome)
    };
  }

  if (input.selectedHistoryTurn !== undefined) {
    return {
      kind: "history-turn",
      gameReference: input.gameReference,
      turnNumber: input.selectedHistoryTurn.turnRecord.turnNumber,
      selectionSource: "selected-history",
      snapshot: structuredClone(input.snapshot),
      turnRecord: structuredClone(input.selectedHistoryTurn.turnRecord),
      ...(input.selectedHistoryTurn.analysisRecord === undefined
        ? {}
        : { analysisRecord: structuredClone(input.selectedHistoryTurn.analysisRecord) }),
      ...(input.selectedHistoryTurn.rankedAnalysis === undefined
        ? {}
        : { rankedAnalysis: structuredClone(input.selectedHistoryTurn.rankedAnalysis) })
    };
  }

  return {
    kind: "current-position",
    gameReference: input.gameReference,
    snapshot: structuredClone(input.snapshot),
    currentTurn: deriveCurrentTurnContext({
      openingResolved: input.openingResolved,
      gameComplete: input.gameComplete,
      activePlayer: input.snapshot.gameState.activePlayer,
      dice: input.snapshot.gameState.dice,
      legalMoveOutcomesResult: input.legalMoveOutcomesResult,
      ...(input.rankedAnalysis === undefined ? {} : { rankedAnalysis: input.rankedAnalysis }),
      ...(input.stagedSelection === undefined ? {} : { stagedSelection: input.stagedSelection })
    })
  };
};

export const formatCoachContextLabel = (context: CoachQuestionContext): string => {
  if (context.kind === "current-position") {
    return "Context: Current position";
  }

  if (context.kind === "move-outcome") {
    const firstStep = context.outcome.move.steps[0];
    if (firstStep === undefined) {
      return "Context: Move outcome";
    }

    return `Context: Move outcome ${firstStep.fromPoint} -> ${firstStep.toPoint}`;
  }

  if (context.kind === "history-turn") {
    if (context.turnRecord.outcome.kind === "move") {
      const moveLabel = context.turnRecord.outcome.move.steps
        .map((step) => `${step.fromPoint}/${step.toPoint}`)
        .join(" ");
      return `Reviewing turn ${context.turnNumber} · ${moveLabel}`;
    }

    return `Reviewing turn ${context.turnNumber} · pass`;
  }

  if (context.kind === "progress-profile") {
    return "Context: Learner progress";
  }

  if (context.reviewScope === "completed-game") {
    const reviewedCheckerPlayTurns =
      context.reviewedTurns?.filter((turn) => turn.turnRecord.outcome.kind === "move").length ??
      context.snapshot.turnHistory.filter((turn) => turn.outcome.kind === "move").length;

    const evaluatedTurns =
      context.reviewedTurns?.filter(
        (turn) => turn.rankedAnalysis !== undefined && turn.turnRecord.outcome.kind === "move"
      ).length ?? 0;

    return `Reviewing completed game · ${reviewedCheckerPlayTurns} checker-play turns · ${evaluatedTurns} evaluated`;
  }

  const reviewedCheckerPlayTurns =
    context.reviewedTurns?.filter((turn) => turn.turnRecord.outcome.kind === "move").length ??
    context.snapshot.turnHistory.filter((turn) => turn.outcome.kind === "move").length;
  const evaluatedTurns =
    context.reviewedTurns?.filter(
      (turn) => turn.rankedAnalysis !== undefined && turn.turnRecord.outcome.kind === "move"
    ).length ?? 0;

  return `Reviewing game so far · ${reviewedCheckerPlayTurns} checker-play turns · ${evaluatedTurns} evaluated`;
};
