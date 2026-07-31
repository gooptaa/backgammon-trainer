import {
  appendAnalysisRecord,
  createAnalysisRecord,
  getDecisionPositionFingerprint,
  type AnalysisMetadata,
  type AnalysisRecord,
  type AnalysisSession,
  type AppendAnalysisRecordResult,
  type CreateAnalysisRecordResult
} from "@backgammon-trainer/backgammon-analysis-session";
import type { RankedLegalMoveAnalysis } from "@backgammon-trainer/backgammon-analysis";
import type { DiceRoll, GameSnapshot, TurnRecord } from "@backgammon-trainer/backgammon-engine";
import type { BoardPosition, Player } from "@backgammon-trainer/backgammon-domain";

export type AnalysisEvaluatorStatus =
  "not-configured" | "idle" | "evaluating" | "ready" | "unavailable" | "failed" | "invalid";

export type AnalysisCaptureRuntime = {
  createSessionId(): string;
  now(): string;
};

export type FixtureAnalysisSessionMetadataConfig = {
  analysisFormat: string;
  analysisVersion: number;
  generatorVersion: string;
  evaluatorProvider: string;
  evaluatorVersion: string;
  scoreScale: AnalysisMetadata["scoreScale"];
};

export type PendingDecisionAnalysis = {
  decisionKey: string;
  gameReference: string;
  turnNumber: number;
  snapshotBeforeTurn: GameSnapshot;
  player: Player;
  dice: DiceRoll;
  decisionFingerprint: string;
  rankedAnalysis: RankedLegalMoveAnalysis;
  evaluatorRequestId: number;
};

export type AnalysisCaptureFailureReason =
  | "session-not-initialized"
  | "game-reference-mismatch"
  | "record-construction-failed"
  | "record-append-failed";

export type AnalysisCaptureFailure = {
  reason: AnalysisCaptureFailureReason;
  message: string;
};

export type AnalysisCaptureState = {
  session: AnalysisSession | null;
  pendingDecision: PendingDecisionAnalysis | null;
  evaluatorStatus: AnalysisEvaluatorStatus;
  lastCaptureFailure: AnalysisCaptureFailure | null;
};

export type CaptureCommittedTurnAnalysisResult =
  | {
      ok: true;
      captured: true;
      session: AnalysisSession;
      record: AnalysisRecord;
      appendResult: AppendAnalysisRecordResult;
    }
  | {
      ok: true;
      captured: false;
      reason: "no-pending-analysis" | "stale-decision" | "analysis-not-successful";
      session: AnalysisSession;
    }
  | {
      ok: false;
      reason: AnalysisCaptureFailureReason;
      message: string;
      session: AnalysisSession | null;
      createResult?: CreateAnalysisRecordResult;
      appendResult?: AppendAnalysisRecordResult;
    };

export const createFixtureAnalysisSessionMetadata = (
  config: FixtureAnalysisSessionMetadataConfig,
  createdAt: string
): AnalysisMetadata => {
  return {
    analysisFormat: config.analysisFormat,
    analysisVersion: config.analysisVersion,
    generatorVersion: config.generatorVersion,
    evaluatorProvider: config.evaluatorProvider,
    evaluatorVersion: config.evaluatorVersion,
    scoreScale: structuredClone(config.scoreScale),
    createdAt
  };
};

export const getAnalysisDecisionKey = (input: {
  gameReference: string;
  turnNumber: number;
  position: BoardPosition;
  player: Player;
  dice: DiceRoll;
}): string => {
  const decisionFingerprint = getDecisionPositionFingerprint({
    position: input.position,
    player: input.player,
    dice: input.dice
  });

  return [
    "analysis-decision-v1",
    input.gameReference,
    String(input.turnNumber),
    input.player,
    String(input.dice.dice[0]),
    String(input.dice.dice[1]),
    decisionFingerprint
  ].join("|");
};

export const createPendingDecisionAnalysis = (input: {
  decisionKey: string;
  gameReference: string;
  turnNumber: number;
  snapshotBeforeTurn: GameSnapshot;
  player: Player;
  dice: DiceRoll;
  rankedAnalysis: RankedLegalMoveAnalysis;
  evaluatorRequestId: number;
}): PendingDecisionAnalysis => {
  return {
    decisionKey: input.decisionKey,
    gameReference: input.gameReference,
    turnNumber: input.turnNumber,
    snapshotBeforeTurn: structuredClone(input.snapshotBeforeTurn),
    player: input.player,
    dice: {
      dice: [input.dice.dice[0], input.dice.dice[1]]
    },
    decisionFingerprint: getDecisionPositionFingerprint({
      position: input.snapshotBeforeTurn.gameState.position,
      player: input.player,
      dice: input.dice
    }),
    rankedAnalysis: structuredClone(input.rankedAnalysis),
    evaluatorRequestId: input.evaluatorRequestId
  };
};

export const captureCommittedTurnAnalysis = (input: {
  session: AnalysisSession | null;
  pendingDecision: PendingDecisionAnalysis | null;
  snapshotBeforeTurn: GameSnapshot;
  snapshotAfterTurn: GameSnapshot;
  committedTurn: TurnRecord;
  updatedAt: string;
}): CaptureCommittedTurnAnalysisResult => {
  if (input.session === null) {
    return {
      ok: false,
      reason: "session-not-initialized",
      message: "Analysis session is not initialized.",
      session: null
    };
  }

  if (input.pendingDecision === null) {
    return {
      ok: true,
      captured: false,
      reason: "no-pending-analysis",
      session: input.session
    };
  }

  const session = input.session;
  const pending = input.pendingDecision;

  if (
    pending.rankedAnalysis.kind !== "evaluated" &&
    pending.rankedAnalysis.kind !== "no-legal-moves"
  ) {
    return {
      ok: true,
      captured: false,
      reason: "analysis-not-successful",
      session
    };
  }

  if (pending.gameReference !== session.gameSnapshotReference.gameReference) {
    return {
      ok: false,
      reason: "game-reference-mismatch",
      message: "Pending analysis game reference does not match the active analysis session.",
      session
    };
  }

  const committedDecisionKey = getAnalysisDecisionKey({
    gameReference: session.gameSnapshotReference.gameReference,
    turnNumber: input.committedTurn.turnNumber,
    position: input.committedTurn.positionBefore,
    player: input.committedTurn.player,
    dice: input.committedTurn.dice
  });

  if (pending.decisionKey !== committedDecisionKey) {
    return {
      ok: true,
      captured: false,
      reason: "stale-decision",
      session
    };
  }

  const createResult = createAnalysisRecord({
    session,
    snapshotBeforeTurn: input.snapshotBeforeTurn,
    snapshotAfterTurn: input.snapshotAfterTurn,
    committedTurn: input.committedTurn,
    rankedAnalysis: pending.rankedAnalysis,
    createdAt: input.updatedAt
  });

  if (!createResult.ok) {
    return {
      ok: false,
      reason: "record-construction-failed",
      message: `Unable to construct analysis record: ${createResult.reason}. ${createResult.message}`,
      session,
      createResult
    };
  }

  const appendResult = appendAnalysisRecord({
    session,
    record: createResult.record,
    updatedAt: input.updatedAt
  });

  if (!appendResult.ok) {
    return {
      ok: false,
      reason: "record-append-failed",
      message: `Unable to append analysis record: ${appendResult.reason}. ${appendResult.message}`,
      session,
      createResult,
      appendResult
    };
  }

  if (appendResult.idempotent) {
    return {
      ok: true,
      captured: false,
      reason: "stale-decision",
      session: appendResult.session
    };
  }

  return {
    ok: true,
    captured: true,
    session: appendResult.session,
    record: createResult.record,
    appendResult
  };
};
