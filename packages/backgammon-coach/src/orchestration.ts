import type { ChatModel, ChatModelResult } from "@backgammon-trainer/ai-contracts";
import type { BackgammonKnowledgeConcept } from "@backgammon-trainer/backgammon-knowledge";

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

  const now = input.runtime.now();
  const userMessageId = input.runtime.createId();
  const appendUserResult = appendUserCoachMessage({
    conversation: input.conversation,
    id: userMessageId,
    createdAt: now,
    text: question,
    contextReference: {
      kind: input.context.kind,
      gameReference: input.context.gameReference,
      ...(input.context.kind === "history-turn" ? { turnNumber: input.context.turnNumber } : {}),
      ...(input.context.kind === "move-outcome"
        ? { moveFingerprint: input.context.moveFingerprint }
        : {})
    }
  });

  if (!appendUserResult.ok) {
    return {
      ok: false,
      reason: "conversation-rejected",
      message: appendUserResult.message,
      conversation: input.conversation,
      context: input.context
    };
  }

  let knowledgeWarning: string | undefined;
  const evidenceResult = buildCoachEvidence({
    question,
    context: input.context,
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
          contextKind: input.context.kind,
          ...(() => {
            const concepts = deriveKnowledgeConcepts(input.context, evidenceResult.evidence);
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
    context: input.context,
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
      context: input.context,
      response
    };
  }

  const appendCoachResult = appendCoachCoachMessage({
    conversation: appendUserResult.conversation,
    id: input.runtime.createId(),
    createdAt: input.runtime.now(),
    text: response.text,
    evidenceReference: toCoachEvidenceReference({
      context: input.context,
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
      context: input.context
    };
  }

  return {
    ok: true,
    requestId,
    conversation: appendCoachResult.conversation,
    context: input.context,
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
