import type { ChatModel, ChatModelResult } from "@backgammon-trainer/ai-contracts";
import type { BackgammonKnowledgeConcept } from "@backgammon-trainer/backgammon-knowledge";
import type { RankedLegalMoveAnalysis } from "@backgammon-trainer/backgammon-analysis";
import type {
  AnalysisRecord,
  AnalysisSession
} from "@backgammon-trainer/backgammon-analysis-session";
import type { TurnRecord } from "@backgammon-trainer/backgammon-engine";

import {
  appendCoachCoachMessage,
  appendUserCoachMessage,
  type CoachConversation,
  type CoachConversationMessage
} from "./conversation";
import { buildCoachEvidence, type CoachEvidenceBundle } from "./evidence";
import type { CoachKnowledgeRetriever } from "./knowledge";
import { buildCoachModelRequest, toCoachEvidenceReference, toCoachModelProvenance } from "./prompt";
import type { CoachGameReviewTurnEvidence, CoachQuestionContext } from "./context";

type HistoryTurnContext = Extract<CoachQuestionContext, { kind: "history-turn" }>;
type GameReviewContext = Extract<CoachQuestionContext, { kind: "game-review" }>;

const LAST_MOVE_REVIEW_PATTERN =
  /\b(last move|that move|what should i have done|why was .* better|review my last move|was that move good)\b/i;

const FULL_GAME_REVIEW_PATTERN =
  /\b(review (this )?game|review (the )?game so far|how did i play|most important decisions|where did i give up the most|which moves should i study)\b/i;

const TURN_NUMBER_PATTERN = /\bturn\s+([0-9]+)\b/gi;

const isLastMoveReviewQuestion = (question: string): boolean => {
  return LAST_MOVE_REVIEW_PATTERN.test(question);
};

const isFullGameReviewQuestion = (question: string): boolean => {
  return FULL_GAME_REVIEW_PATTERN.test(question);
};

const parseReferencedTurnNumbers = (question: string): readonly number[] => {
  const referenced = new Set<number>();
  for (const match of question.matchAll(TURN_NUMBER_PATTERN)) {
    const raw = match[1];
    if (raw === undefined) {
      continue;
    }

    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      referenced.add(parsed);
    }
  }

  return [...referenced].sort((left, right) => left - right);
};

const getLatestCommittedMoveTurn = (
  context: CoachQuestionContext
): HistoryTurnContext | undefined => {
  const latestMoveTurn = [...context.snapshot.turnHistory]
    .reverse()
    .find((turnRecord) => turnRecord.outcome.kind === "move");

  if (latestMoveTurn === undefined) {
    return undefined;
  }

  return {
    kind: "history-turn",
    gameReference: context.gameReference,
    turnNumber: latestMoveTurn.turnNumber,
    selectionSource: "latest-committed",
    snapshot: structuredClone(context.snapshot),
    turnRecord: structuredClone(latestMoveTurn)
  };
};

const resolveBaselineReviewTurns = (input: {
  snapshotTurns: readonly TurnRecord[];
  analysisSession?: AnalysisSession;
}): readonly CoachGameReviewTurnEvidence[] => {
  const analysisByTurn = new Map<number, AnalysisRecord>();
  for (const record of input.analysisSession?.records ?? []) {
    analysisByTurn.set(record.turnNumber, record);
  }

  return input.snapshotTurns.map((turnRecord) => {
    if (turnRecord.outcome.kind !== "move") {
      return {
        turnNumber: turnRecord.turnNumber,
        turnRecord: structuredClone(turnRecord),
        analysisSource: "unsupported" as const
      };
    }

    const analysisRecord = analysisByTurn.get(turnRecord.turnNumber);
    if (analysisRecord === undefined) {
      return {
        turnNumber: turnRecord.turnNumber,
        turnRecord: structuredClone(turnRecord),
        analysisSource: "missing" as const
      };
    }

    return {
      turnNumber: turnRecord.turnNumber,
      turnRecord: structuredClone(turnRecord),
      analysisRecord: structuredClone(analysisRecord),
      rankedAnalysis: structuredClone(analysisRecord.rankedMoveAnalysis),
      analysisSource: "analysis-record" as const
    };
  });
};

export type GameReviewTurnHydrationResult =
  | {
      readonly ok: true;
      readonly rankedAnalysis: RankedLegalMoveAnalysis;
    }
  | {
      readonly ok: false;
      readonly status: "unavailable" | "failed";
      readonly message: string;
    };

const resolveFullGameReviewContext = async (input: {
  question: string;
  context: CoachQuestionContext;
  analysisSession?: AnalysisSession;
  resolveGameReviewTurnAnalysis?: (input: {
    question: string;
    context: GameReviewContext;
    turnRecord: TurnRecord;
  }) => Promise<GameReviewTurnHydrationResult>;
}): Promise<GameReviewContext> => {
  const snapshot = structuredClone(input.context.snapshot);
  const completed = snapshot.turnHistory.at(-1)?.gameStatusAfter.state === "complete";
  const selectedTurnNumber =
    input.context.kind === "history-turn" ? input.context.turnNumber : undefined;
  const referencedTurnNumbers = parseReferencedTurnNumbers(input.question);

  let reviewContext: GameReviewContext = {
    kind: "game-review",
    gameReference: input.context.gameReference,
    snapshot,
    reviewScope: completed ? "completed-game" : "game-so-far",
    selectionSource: "explicit-request",
    committedTurnBoundary: snapshot.turnHistory.length,
    reviewedPlayerScope: {
      kind: "all-players",
      reason: "ownership-ambiguous"
    },
    ...(selectedTurnNumber === undefined ? {} : { selectedTurnNumber }),
    ...(referencedTurnNumbers.length === 0 ? {} : { referencedTurnNumbers }),
    ...(input.analysisSession === undefined
      ? {}
      : { analysisSession: structuredClone(input.analysisSession) }),
    reviewedTurns: resolveBaselineReviewTurns({
      snapshotTurns: snapshot.turnHistory,
      ...(input.analysisSession === undefined ? {} : { analysisSession: input.analysisSession })
    })
  };

  if (
    input.resolveGameReviewTurnAnalysis === undefined ||
    reviewContext.reviewedTurns === undefined
  ) {
    return reviewContext;
  }

  const hydratedTurns: CoachGameReviewTurnEvidence[] = [];
  const seenTurns = new Set<number>();

  for (const reviewTurn of reviewContext.reviewedTurns) {
    if (seenTurns.has(reviewTurn.turnNumber)) {
      hydratedTurns.push(reviewTurn);
      continue;
    }
    seenTurns.add(reviewTurn.turnNumber);

    if (reviewTurn.analysisSource !== "missing") {
      hydratedTurns.push(reviewTurn);
      continue;
    }

    try {
      const hydrationResult = await input.resolveGameReviewTurnAnalysis({
        question: input.question,
        context: reviewContext,
        turnRecord: reviewTurn.turnRecord
      });

      if (hydrationResult.ok) {
        hydratedTurns.push({
          ...reviewTurn,
          rankedAnalysis: structuredClone(hydrationResult.rankedAnalysis),
          analysisSource: "hydrated"
        });
        continue;
      }

      hydratedTurns.push({
        ...reviewTurn,
        analysisSource: hydrationResult.status,
        analysisIssue: hydrationResult.message
      });
    } catch {
      hydratedTurns.push({
        ...reviewTurn,
        analysisSource: "failed",
        analysisIssue: "Hydration failed unexpectedly."
      });
    }
  }

  reviewContext = {
    ...reviewContext,
    reviewedTurns: hydratedTurns
  };

  return reviewContext;
};

const resolveSubmissionContext = (
  question: string,
  context: CoachQuestionContext,
  analysisSession?: AnalysisSession
): Promise<CoachQuestionContext> => {
  if (isFullGameReviewQuestion(question)) {
    return resolveFullGameReviewContext({
      question,
      context,
      ...(analysisSession === undefined ? {} : { analysisSession })
    });
  }

  if (!isLastMoveReviewQuestion(question)) {
    return Promise.resolve(context);
  }

  if (context.kind === "history-turn") {
    return Promise.resolve(context);
  }

  return Promise.resolve(getLatestCommittedMoveTurn(context) ?? context);
};

const deriveKnowledgeConcepts = (
  context: CoachQuestionContext,
  evidence: CoachEvidenceBundle
): readonly BackgammonKnowledgeConcept[] => {
  const concepts = new Set<BackgammonKnowledgeConcept>();

  if (context.kind === "current-position") {
    concepts.add("current-position");
    if (context.currentTurn.stagedSelection !== undefined) {
      concepts.add("candidate-comparison");
    }

    for (const outcome of context.currentTurn.legalMoveOutcomes?.outcomes ?? []) {
      if (outcome.move.steps.some((step) => step.hitsBlot)) {
        concepts.add("hits");
        concepts.add("blots");
      }

      if (outcome.move.steps.some((step) => step.kind === "enter-from-bar")) {
        concepts.add("bar-entry");
      }

      if (outcome.move.steps.some((step) => step.kind === "bear-off")) {
        concepts.add("bearing-off");
      }

      if (
        outcome.featureDelta.white.madePointCountDelta > 0 ||
        outcome.featureDelta.black.madePointCountDelta > 0
      ) {
        concepts.add("made-points");
      }
    }
  }

  if (context.kind === "history-turn" || context.kind === "game-review") {
    concepts.add("move-review");
  }

  if (evidence.positionFacts?.relationship.contactStatus === "contact") {
    concepts.add("contact");
  }

  if (evidence.positionFacts?.relationship.contactStatus === "race") {
    concepts.add("race");
  }

  if (
    (evidence.positionFacts?.white.checkersOnBar ?? 0) > 0 ||
    (evidence.positionFacts?.black.checkersOnBar ?? 0) > 0
  ) {
    concepts.add("bar-entry");
  }

  if (
    (evidence.positionFacts?.white.madeHomeBoardPointCount ?? 0) > 0 ||
    (evidence.positionFacts?.black.madeHomeBoardPointCount ?? 0) > 0
  ) {
    concepts.add("inner-board");
  }

  if (
    (evidence.positionFacts?.white.checkersBorneOff ?? 0) > 0 ||
    (evidence.positionFacts?.black.checkersBorneOff ?? 0) > 0
  ) {
    concepts.add("bearing-off");
  }

  return [...concepts].sort();
};

export interface CoachRuntime {
  createId(): string;
  now(): string;
}

export type SubmitCoachQuestionResult =
  | {
      readonly ok: true;
      readonly requestId: string;
      readonly conversation: CoachConversation;
      readonly context: CoachQuestionContext;
      readonly evidence: CoachEvidenceBundle;
      readonly response: ChatModelResult;
      readonly knowledge: readonly import("./knowledge").CoachKnowledgeExcerpt[];
      readonly knowledgeWarning?: string;
    }
  | {
      readonly ok: false;
      readonly reason:
        "no-model" | "pending" | "invalid-question" | "conversation-rejected" | "model-failed";
      readonly message: string;
      readonly conversation: CoachConversation;
      readonly context?: CoachQuestionContext;
      readonly response?: ChatModelResult;
    };

export const submitCoachQuestion = async (input: {
  model: ChatModel | undefined;
  knowledgeRetriever: CoachKnowledgeRetriever | undefined;
  runtime: CoachRuntime;
  conversation: CoachConversation;
  question: string;
  context: CoachQuestionContext;
  analysisSession?: AnalysisSession;
  resolveHistoryTurnAnalysis?: (input: {
    question: string;
    context: HistoryTurnContext;
  }) => Promise<RankedLegalMoveAnalysis | undefined>;
  resolveGameReviewTurnAnalysis?: (input: {
    question: string;
    context: GameReviewContext;
    turnRecord: TurnRecord;
  }) => Promise<GameReviewTurnHydrationResult>;
  pending: boolean;
}): Promise<SubmitCoachQuestionResult> => {
  if (input.model === undefined) {
    return {
      ok: false,
      reason: "no-model",
      message: "No coach model configured.",
      conversation: input.conversation,
      context: input.context
    };
  }

  if (input.pending) {
    return {
      ok: false,
      reason: "pending",
      message: "A coach request is already pending.",
      conversation: input.conversation,
      context: input.context
    };
  }

  const question = input.question.trim();
  if (question.length === 0) {
    return {
      ok: false,
      reason: "invalid-question",
      message: "Question text must not be empty.",
      conversation: input.conversation,
      context: input.context
    };
  }

  let resolvedContext = await resolveSubmissionContext(
    question,
    input.context,
    input.analysisSession
  );
  if (isFullGameReviewQuestion(question) && resolvedContext.kind === "game-review") {
    resolvedContext = await resolveFullGameReviewContext({
      question,
      context: resolvedContext,
      ...(input.analysisSession === undefined ? {} : { analysisSession: input.analysisSession }),
      ...(input.resolveGameReviewTurnAnalysis === undefined
        ? {}
        : { resolveGameReviewTurnAnalysis: input.resolveGameReviewTurnAnalysis })
    });
  }

  if (
    resolvedContext.kind === "history-turn" &&
    resolvedContext.turnRecord.outcome.kind === "move" &&
    resolvedContext.analysisRecord === undefined &&
    resolvedContext.rankedAnalysis === undefined &&
    input.resolveHistoryTurnAnalysis !== undefined
  ) {
    try {
      const rankedAnalysis = await input.resolveHistoryTurnAnalysis({
        question,
        context: resolvedContext
      });

      if (rankedAnalysis !== undefined) {
        resolvedContext = {
          ...resolvedContext,
          rankedAnalysis: structuredClone(rankedAnalysis)
        };
      }
    } catch {
      // Fall back to factual history evidence without evaluator rankings.
    }
  }

  const now = input.runtime.now();
  const userMessageId = input.runtime.createId();
  const appendUserResult = appendUserCoachMessage({
    conversation: input.conversation,
    id: userMessageId,
    createdAt: now,
    text: question,
    contextReference: {
      kind: resolvedContext.kind,
      gameReference: resolvedContext.gameReference,
      ...(resolvedContext.kind === "history-turn"
        ? { turnNumber: resolvedContext.turnNumber }
        : {}),
      ...(resolvedContext.kind === "move-outcome"
        ? { moveFingerprint: resolvedContext.moveFingerprint }
        : {})
    }
  });

  if (!appendUserResult.ok) {
    return {
      ok: false,
      reason: "conversation-rejected",
      message: appendUserResult.message,
      conversation: input.conversation,
      context: resolvedContext
    };
  }

  let knowledgeWarning: string | undefined;
  const evidenceResult = buildCoachEvidence({
    question,
    context: resolvedContext,
    conversation: appendUserResult.conversation
  });

  const knowledgeRetriever = input.knowledgeRetriever;
  const knowledgeResult =
    knowledgeRetriever === undefined
      ? {
          ok: true as const,
          entries: [] as const
        }
      : await knowledgeRetriever.retrieve({
          question,
          contextKind: resolvedContext.kind,
          ...(() => {
            const concepts = deriveKnowledgeConcepts(resolvedContext, evidenceResult.evidence);
            return concepts.length === 0 ? {} : { concepts };
          })(),
          maxItems: 4
        });

  const knowledgeEntries = knowledgeResult.ok ? knowledgeResult.entries : [];
  if (!knowledgeResult.ok) {
    knowledgeWarning = knowledgeResult.message;
  }

  const requestId = input.runtime.createId();
  const modelRequest = buildCoachModelRequest({
    requestId,
    conversationId: appendUserResult.conversation.id,
    userMessageId,
    question,
    context: resolvedContext,
    conversation: appendUserResult.conversation,
    evidence: evidenceResult.evidence,
    knowledge: knowledgeEntries,
    responsePreferences: {
      explanationLevel: "intermediate",
      verbosity: "normal"
    }
  });

  const response = await input.model.complete(modelRequest);

  if (!response.ok) {
    return {
      ok: false,
      reason: "model-failed",
      message: response.message,
      conversation: appendUserResult.conversation,
      context: resolvedContext,
      response
    };
  }

  const appendCoachResult = appendCoachCoachMessage({
    conversation: appendUserResult.conversation,
    id: input.runtime.createId(),
    createdAt: input.runtime.now(),
    text: response.text,
    evidenceReference: toCoachEvidenceReference({
      context: resolvedContext,
      evidence: evidenceResult.evidence
    }),
    model: toCoachModelProvenance({
      provider: response.model.provider,
      model: response.model.model,
      adapterVersion: response.model.adapterVersion,
      ...(response.model.mode === undefined ? {} : { mode: response.model.mode })
    })
  });

  if (!appendCoachResult.ok) {
    return {
      ok: false,
      reason: "conversation-rejected",
      message: appendCoachResult.message,
      conversation: appendUserResult.conversation,
      context: resolvedContext
    };
  }

  return {
    ok: true,
    requestId,
    conversation: appendCoachResult.conversation,
    context: resolvedContext,
    evidence: evidenceResult.evidence,
    response,
    knowledge: knowledgeEntries,
    ...(knowledgeWarning === undefined ? {} : { knowledgeWarning })
  };
};

export const appendCoachFailureMessage = (input: {
  conversation: CoachConversation;
  runtime: CoachRuntime;
  failureText: string;
}): CoachConversation => {
  const result = appendCoachCoachMessage({
    conversation: input.conversation,
    id: input.runtime.createId(),
    createdAt: input.runtime.now(),
    text: input.failureText
  });

  return result.ok ? result.conversation : input.conversation;
};

export const getRecentConversationMessages = (
  conversation: CoachConversation
): readonly CoachConversationMessage[] => {
  return conversation.messages;
};
