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
      summary: entry.summary ?? entry.text.slice(0, 160),
      text: entry.text,
      source: entry.source,
      track: entry.track ?? "general",
      concepts: [...(entry.concepts ?? [])],
      selectionReasons: (entry.selectionReasons ?? []).map((reason) => ({ ...reason })),
      provenance: {
        kind: entry.provenance?.kind ?? "project-authored",
        label: entry.provenance?.label ?? entry.source
      }
    }));
  const serializedEvidence = JSON.parse(JSON.stringify(request.evidence)) as JsonValue;
  const recommendationSupport = request.evidence.recommendationSupport;

  const recommendationInstruction =
    recommendationSupport === undefined || recommendationSupport.status === "not-supported"
      ? recommendationSupport?.reason === "fixture-evaluator"
        ? "Fixture evaluator evidence is synthetic. Do not present any move as authoritative best play."
        : recommendationSupport?.reason === "partial-coverage"
          ? "Evaluator coverage is partial. You may describe the strongest evaluated move but must not claim it is definitively best among all legal moves."
          : recommendationSupport?.reason === "no-legal-moves"
            ? "No legal checker-play move exists in this state. Explain the state factually and do not invent a move recommendation."
            : recommendationSupport?.reason === "played-move-not-evaluated"
              ? "The played move was not evaluator-scored. Do not assign a rank or loss value to the played move."
              : recommendationSupport?.reason === "unsupported-history-turn"
                ? "This historical turn is not a supported checker-play move for evaluator comparison. Explain only factual limitations."
                : recommendationSupport?.reason === "non-decision-state"
                  ? "This is not an active checker-play decision state. Do not fabricate a recommendation."
                  : "No trustworthy evaluator ranking is available. Do not claim the strongest legal move is known."
      : recommendationSupport.supportedRecommendation?.kind === "authoritative"
        ? "A trustworthy complete-coverage evaluator recommendation is supplied. Lead with that legal move and explain tradeoffs without exaggerating close alternatives."
        : "Only strongest-evaluated support is supplied from partial evaluator coverage. State the coverage caveat plainly before recommending it as strongest among evaluated moves.";

  return {
    requestId: request.requestId,
    systemInstruction:
      "You are a backgammon coach assistant. Answer the user question using only supplied evidence. Do not invent legal moves, board facts, evaluator scores, committed history, or long-term patterns.",
    developerInstructions: [
      "Treat engine-derived and deterministic analysis evidence as authoritative for board facts and legal move facts.",
      "Treat evaluator ranking evidence as authoritative only when recommendation support explicitly says it is supported.",
      recommendationInstruction,
      "Keep deterministic facts, evaluator-attributed evidence, and curated general guidance clearly separated.",
      "Curated knowledge is general instructional guidance and does not prove that any legal move is best in this position.",
      "Omitted legal move rows may still represent legal moves; do not describe omitted rows as illegal.",
      "Evaluator coverage and coach evidence coverage are different. Do not infer missing evaluator scores.",
      "If evaluator provenance is fixture/synthetic, state that clearly and do not present it as expert advice.",
      "Never claim GNU or expert evaluation unless provenance explicitly supports it.",
      "Do not perform result-based reasoning or hidden board reconstruction.",
      "Acknowledge insufficient evidence when the supplied facts do not settle the question.",
      "Long-term player patterns are not available yet.",
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
      deterministicEvidence: serializedEvidence,
      curatedKnowledge: boundedKnowledge,
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
