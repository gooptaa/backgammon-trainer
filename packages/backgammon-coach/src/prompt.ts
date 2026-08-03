import type {
  ChatModelMessage,
  ChatModelRequest,
  JsonValue
} from "@backgammon-trainer/ai-contracts";

import type {
  CoachConversation,
  CoachConversationMessage,
  CoachEvidenceReference,
  CoachModelProvenance
} from "./conversation";
import type { CoachQuestionContext } from "./context";
import type { CoachEvidenceBundle } from "./evidence";
import type { CoachKnowledgeExcerpt } from "./knowledge";

export interface CoachResponsePreferences {
  readonly explanationLevel: "beginner" | "intermediate" | "advanced";
  readonly verbosity: "concise" | "normal" | "detailed";
}

export interface CoachRequest {
  readonly requestId: string;
  readonly conversationId: string;
  readonly userMessageId: string;
  readonly question: string;
  readonly context: CoachQuestionContext;
  readonly conversation: CoachConversation;
  readonly evidence: CoachEvidenceBundle;
  readonly knowledge: readonly CoachKnowledgeExcerpt[];
  readonly responsePreferences: CoachResponsePreferences;
}

export interface BuildCoachModelRequestLimits {
  readonly maxConversationMessages: number;
  readonly maxMessageChars: number;
  readonly maxKnowledgeEntries: number;
}

const DEFAULT_LIMITS: BuildCoachModelRequestLimits = {
  maxConversationMessages: 8,
  maxMessageChars: 800,
  maxKnowledgeEntries: 4
};

const toChatMessage = (
  message: CoachConversationMessage,
  maxMessageChars: number
): ChatModelMessage => {
  const text = message.text.slice(0, maxMessageChars);
  return {
    role: message.role === "coach" ? "assistant" : "user",
    text
  };
};

const trimMessageHistory = (
  conversation: CoachConversation,
  limits: BuildCoachModelRequestLimits
): readonly ChatModelMessage[] => {
  const allMessages = conversation.messages;
  if (allMessages.length === 0) {
    return [];
  }

  const startIndex = Math.max(0, allMessages.length - limits.maxConversationMessages);
  return allMessages
    .slice(startIndex)
    .map((message) => toChatMessage(message, limits.maxMessageChars));
};

export const buildCoachModelRequest = (
  request: CoachRequest,
  limits?: Partial<BuildCoachModelRequestLimits>
): ChatModelRequest => {
  const resolvedLimits: BuildCoachModelRequestLimits = {
    maxConversationMessages:
      limits?.maxConversationMessages ?? DEFAULT_LIMITS.maxConversationMessages,
    maxMessageChars: limits?.maxMessageChars ?? DEFAULT_LIMITS.maxMessageChars,
    maxKnowledgeEntries: limits?.maxKnowledgeEntries ?? DEFAULT_LIMITS.maxKnowledgeEntries
  };

  const messages = trimMessageHistory(request.conversation, resolvedLimits);
  const boundedKnowledge = request.knowledge
    .slice(0, resolvedLimits.maxKnowledgeEntries)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      text: entry.text,
      source: entry.source,
      tags: [...entry.tags]
    }));
  const serializedEvidence = JSON.parse(JSON.stringify(request.evidence)) as JsonValue;

  return {
    requestId: request.requestId,
    systemInstruction:
      "You are a backgammon coach assistant. Answer the user question using only supplied evidence. Do not invent legal moves, board facts, evaluator scores, committed history, or long-term patterns.",
    developerInstructions: [
      "Treat deterministic evidence as authoritative.",
      "Distinguish known facts from uncertainty.",
      "If evaluator provenance is fixture/synthetic, state that clearly and do not present it as expert advice.",
      "Never claim GNU or expert evaluation unless provenance explicitly supports it.",
      "Do not perform result-based reasoning or hidden board reconstruction.",
      "Remain concise unless the user asks for more detail.",
      "Do not reveal internal JSON schema details unless explicitly requested."
    ],
    messages,
    evidence: {
      question: request.question,
      responsePreferences: {
        explanationLevel: request.responsePreferences.explanationLevel,
        verbosity: request.responsePreferences.verbosity
      },
      contextKind: request.context.kind,
      evidence: serializedEvidence,
      knowledge: boundedKnowledge,
      truncation: {
        maxConversationMessages: resolvedLimits.maxConversationMessages,
        maxMessageChars: resolvedLimits.maxMessageChars,
        maxKnowledgeEntries: resolvedLimits.maxKnowledgeEntries,
        conversationMessagesIncluded: messages.length,
        knowledgeIncluded: boundedKnowledge.length
      }
    }
  };
};

export const toCoachEvidenceReference = (input: {
  context: CoachQuestionContext;
  evidence: CoachEvidenceBundle;
}): CoachEvidenceReference => {
  return {
    evidenceVersion: input.evidence.evidenceVersion,
    contextKind: input.context.kind,
    warningCount: input.evidence.warnings.length
  };
};

export const toCoachModelProvenance = (input: {
  provider: string;
  model: string;
  adapterVersion: string;
  mode?: "fixture" | "production";
}): CoachModelProvenance => {
  return {
    provider: input.provider,
    model: input.model,
    adapterVersion: input.adapterVersion,
    ...(input.mode === undefined ? {} : { mode: input.mode })
  };
};
