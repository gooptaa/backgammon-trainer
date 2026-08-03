import type { ChatModel, ChatModelResult } from "@backgammon-trainer/ai-contracts";
import type { BackgammonKnowledgeConcept } from "@backgammon-trainer/backgammon-knowledge";
import type { RankedLegalMoveAnalysis } from "@backgammon-trainer/backgammon-analysis";

import {
  appendCoachCoachMessage,
  appendUserCoachMessage,
  type CoachConversation,
  type CoachConversationMessage
} from "./conversation";
import { buildCoachEvidence, type CoachEvidenceBundle } from "./evidence";
import type { CoachKnowledgeRetriever } from "./knowledge";
import { buildCoachModelRequest, toCoachEvidenceReference, toCoachModelProvenance } from "./prompt";
import type { CoachQuestionContext } from "./context";

type HistoryTurnContext = Extract<CoachQuestionContext, { kind: "history-turn" }>;

const LAST_MOVE_REVIEW_PATTERN =
  /\b(last move|that move|what should i have done|why was .* better|review my last move|was that move good)\b/i;

const isLastMoveReviewQuestion = (question: string): boolean => {
  return LAST_MOVE_REVIEW_PATTERN.test(question);
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

const resolveSubmissionContext = (
  question: string,
  context: CoachQuestionContext
): CoachQuestionContext => {
  if (!isLastMoveReviewQuestion(question)) {
    return context;
  }

  if (context.kind === "history-turn") {
    return context;
  }

  return getLatestCommittedMoveTurn(context) ?? context;
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
  resolveHistoryTurnAnalysis?: (input: {
    question: string;
    context: HistoryTurnContext;
  }) => Promise<RankedLegalMoveAnalysis | undefined>;
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

  let resolvedContext = resolveSubmissionContext(question, input.context);
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
