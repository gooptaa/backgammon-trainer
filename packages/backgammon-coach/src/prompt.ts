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
import type { CoachIntentResolution, CoachKnowledgeRetrievalPlan } from "./retrievalPlan";

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
  readonly intentResolution?: CoachIntentResolution;
  readonly retrievalPlan?: CoachKnowledgeRetrievalPlan;
  readonly responsePreferences: CoachResponsePreferences;
}

export interface BuildCoachModelRequestLimits {
  readonly maxConversationMessages: number;
  readonly maxMessageChars: number;
  readonly maxKnowledgeEntries: number;
  readonly maxKnowledgeEntryChars: number;
  readonly maxKnowledgeTotalChars: number;
}

const DEFAULT_LIMITS: BuildCoachModelRequestLimits = {
  maxConversationMessages: 8,
  maxMessageChars: 800,
  maxKnowledgeEntries: 4,
  maxKnowledgeEntryChars: 900,
  maxKnowledgeTotalChars: 2400
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

const getIntentSpecificInstructions = (
  intentResolution?: CoachIntentResolution
): readonly string[] => {
  if (intentResolution === undefined) {
    return [];
  }

  const base = [
    "Reassess the user intent on every turn. Use conversation history to resolve references, but use the current user message to determine the requested task.",
    `Resolved current intent: ${intentResolution.intent}.`,
    `Resolved subject: ${intentResolution.subject.label} (${intentResolution.subject.kind}, ${intentResolution.subject.source}).`
  ];

  switch (intentResolution.intent) {
    case "move-evaluation":
      return [
        ...base,
        "This turn is move evaluation. Lead with verdict, then magnitude, then concrete comparison and one practical lesson.",
        "Evaluator evidence is primary for this turn. Keep strategy guidance grounded in supplied move facts and rankings."
      ];
    case "strategic-concept-explanation":
      return [
        ...base,
        "Begin with the strategic mechanism in plain language before any evaluator comment.",
        "Explain what the feature does in backgammon terms, then apply it to the current position.",
        "Do not use circular reasoning such as saying the feature is valuable only because it appeared in a top-ranked move.",
        "If evaluator evidence is mentioned, use it only as supporting context after the mechanism is explained."
      ];
    case "position-specific-explanation":
      return [
        ...base,
        "Start with why this feature matters in this position now: identify the local cause and consequence.",
        "Use deterministic board facts first, then strategic knowledge. Keep evaluator commentary secondary."
      ];
    case "candidate-comparison":
      return [
        ...base,
        "Compare the named candidates directly and identify the most important tradeoff.",
        "If wording sounds like legality (for example couldn't), distinguish legal-vs-weaker explicitly instead of assuming illegality."
      ];
    case "rules-legality":
      return [
        ...base,
        "State the governing rule first, then apply it to the position.",
        "Avoid strategic speculation when answering a legality question."
      ];
    case "definition":
      return [
        ...base,
        "Provide a plain-English definition first, then a short example.",
        "Do not re-evaluate prior moves unless the user explicitly asks for evaluation."
      ];
    case "counterfactual-analysis":
      return [
        ...base,
        "State the changed assumption explicitly before analysis.",
        "Do not invent exact evaluator outcomes for hypothetical positions that were not evaluated."
      ];
    case "learning-focus":
      return [
        ...base,
        "Answer as a learning-focus request using deterministic progress evidence plus curated study guidance."
      ];
    case "progress-count":
      return [...base, "Answer as factual counting only; do not add strategic speculation."];
    case "unsupported-topic":
      return [...base, "This topic is unsupported. Return a concise no-match response."];
  }
};

export const buildCoachModelRequest = (
  request: CoachRequest,
  limits?: Partial<BuildCoachModelRequestLimits>
): ChatModelRequest => {
  const resolvedLimits: BuildCoachModelRequestLimits = {
    maxConversationMessages:
      limits?.maxConversationMessages ?? DEFAULT_LIMITS.maxConversationMessages,
    maxMessageChars: limits?.maxMessageChars ?? DEFAULT_LIMITS.maxMessageChars,
    maxKnowledgeEntries: limits?.maxKnowledgeEntries ?? DEFAULT_LIMITS.maxKnowledgeEntries,
    maxKnowledgeEntryChars: limits?.maxKnowledgeEntryChars ?? DEFAULT_LIMITS.maxKnowledgeEntryChars,
    maxKnowledgeTotalChars: limits?.maxKnowledgeTotalChars ?? DEFAULT_LIMITS.maxKnowledgeTotalChars
  };

  const messages = trimMessageHistory(request.conversation, resolvedLimits);
  const boundedKnowledge: {
    id: string;
    title: string;
    summary: string;
    text: string;
    source: string;
    track: string;
    concepts: readonly string[];
    selectionReasons: readonly { kind: string; value: string }[];
    provenance: { kind: string; label: string };
  }[] = [];
  let aggregateKnowledgeChars = 0;
  for (const entry of request.knowledge.slice(0, resolvedLimits.maxKnowledgeEntries)) {
    const available = Math.max(0, resolvedLimits.maxKnowledgeTotalChars - aggregateKnowledgeChars);
    if (available === 0) {
      break;
    }

    const entryLimit = Math.min(resolvedLimits.maxKnowledgeEntryChars, available);
    const text = entry.text.slice(0, entryLimit);
    if (text.length === 0) {
      continue;
    }

    const summary = (entry.summary ?? text.slice(0, 160)).slice(0, 200);
    aggregateKnowledgeChars += text.length;
    boundedKnowledge.push({
      id: entry.id,
      title: entry.title,
      summary,
      text,
      source: entry.source,
      track: entry.track ?? "general",
      concepts: [...(entry.concepts ?? [])],
      selectionReasons: (entry.selectionReasons ?? []).map((reason) => ({ ...reason })),
      provenance: {
        kind: entry.provenance?.kind ?? "project-authored",
        label: entry.provenance?.label ?? entry.source
      }
    });
  }
  const serializedEvidence = JSON.parse(JSON.stringify(request.evidence)) as JsonValue;
  const recommendationSupport = request.evidence.recommendationSupport;
  const hasProgressEvidence = request.evidence.progressEvidence !== undefined;
  const hasDeterministicClassification =
    request.evidence.historicalReviewEvidence?.moveClassification !== undefined ||
    (request.evidence.gameReviewEvidence?.keyDecisions.some(
      (decision) => decision.moveClassification !== undefined
    ) ??
      false);

  const recommendationInstruction =
    recommendationSupport === undefined || recommendationSupport.status === "not-supported"
      ? recommendationSupport?.reason === "fixture-evaluator"
        ? "Fixture evaluator evidence is synthetic. Do not present any move as authoritative best play."
        : recommendationSupport?.reason === "partial-coverage"
          ? "Evaluator coverage is partial. If the played move is evaluated and tied for the strongest evaluated move, lead with a positive coaching assessment such as 'That was a strong move' and say it was best among the moves analyzed; do not call the move unclear merely because a formal classification is unavailable, and do not claim it is definitively best among all legal moves. Put the concrete coverage limitation in one brief final sentence."
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
        ? "A trustworthy complete-coverage evaluator recommendation is supplied. Lead with a clear coaching verdict, then explain why the recommendation is better in plain language."
        : "Only strongest-evaluated support is supplied from partial evaluator coverage. If the played move is evaluated and tied for the strongest evaluated move, lead with a positive coaching assessment such as 'That was a strong move' and say it was best among the moves analyzed; do not call the move unclear merely because a formal classification is unavailable, and do not claim it is definitively best among all legal moves. Put the concrete coverage limitation in one brief final sentence.";

  const classificationInstruction = hasDeterministicClassification
    ? "Move classifications in deterministic evidence are authoritative policy outputs. Do not strengthen, weaken, replace, or invent a supplied formal label. Treat classification eligibility and the coaching assessment as separate: an unclassified move may still receive an evaluator-supported practical assessment. Do not mention classification bookkeeping unless the user explicitly asks for diagnostics."
    : null;
  const progressInstruction = hasProgressEvidence
    ? "Progress and pattern fields in deterministic evidence are authoritative. Do not invent additional occurrences, hidden motives, skill ratings, confidence claims, or improvement claims beyond supplied deterministic support."
    : null;
  const intentSpecificInstructions = getIntentSpecificInstructions(request.intentResolution);

  return {
    requestId: request.requestId,
    systemInstruction:
      "You are a backgammon coach assistant. Answer the user question using only supplied evidence. Do not invent legal moves, board facts, evaluator scores, committed history, or long-term patterns.",
    developerInstructions: [
      ...intentSpecificInstructions,
      "When the resolved intent is move evaluation, give a plain-language verdict and evaluator-supported magnitude in the first two sentences.",
      "Use this response order: verdict, magnitude, main comparison, one practical takeaway, then confidence note for move-evaluation questions.",
      "Answer the user question directly in the first two sentences using plain language and only the supplied evidence.",
      "Use the response order that matches the resolved intent. Do not force evaluation-first structure for non-evaluation questions.",
      "When structured context includes completed-turn fields (player, dice, move, before/after position, evaluation status), treat those fields as authoritative even if the user message is short or ambiguous.",
      "Do not claim a move, roll, or board fact is missing when that field is present in deterministic evidence.",
      "If required information is truly missing, name the exact missing structured field (for example completed move, completed-turn dice, or evaluator result) instead of using a generic not-enough-information disclaimer.",
      "Do not lead with evaluation coverage, policy status, or provenance details unless the user explicitly asked for diagnostics.",
      "Hide internal implementation terms and classification-bookkeeping terms in user-facing prose (for example official classification, recorded mistake, fixture-derived, unclassified, supplied evidence, policy outputs, classification eligibility, attach a mistake label). Translate any necessary limitation into plain language.",
      "Treat engine-derived and deterministic analysis evidence as authoritative for board facts and legal move facts.",
      "Treat evaluator ranking evidence as authoritative only when recommendation support explicitly says it is supported.",
      recommendationInstruction,
      ...(classificationInstruction === null ? [] : [classificationInstruction]),
      ...(progressInstruction === null ? [] : [progressInstruction]),
      "When evidence does not explain why an engine-preferred move is better, say that directly and do not pretend strategic certainty from superficial feature counts.",
      "Do not treat unchanged checker-count features alone as proof that strategic quality is unchanged.",
      "Use explicit structured evaluation coverage status when discussing completeness; do not infer coverage by comparing unrelated arrays or counts.",
      "Use exact rank/equity numbers only when the user asks for precision or when the number changes the coaching conclusion.",
      "If evidence supports no reliable strategic lesson, state that explicitly instead of inventing one.",
      "Keep deterministic facts, evaluator-attributed evidence, and curated general guidance clearly separated; curated knowledge is instructional and does not prove any move is best for this position.",
      "Omitted legal move rows may still represent legal moves; do not describe omitted rows as illegal or infer missing evaluator scores from coach evidence coverage alone.",
      "If evaluator provenance is fixture/synthetic, state that clearly, do not present it as expert advice, and never claim GNU/expert evaluation unless provenance explicitly supports it.",
      "Do not perform result-based reasoning or hidden board reconstruction.",
      "Acknowledge insufficient evidence when the supplied facts do not settle the question, and remain concise unless the user asks for more detail.",
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
      ...(request.intentResolution === undefined
        ? {}
        : {
            coachingOperation: {
              intent: request.intentResolution.intent,
              subject: {
                kind: request.intentResolution.subject.kind,
                label: request.intentResolution.subject.label,
                source: request.intentResolution.subject.source
              },
              evidencePriority: [...request.intentResolution.evidencePriority],
              evaluatorRole: request.intentResolution.evaluatorRole
            }
          }),
      ...(request.retrievalPlan === undefined
        ? {}
        : {
            retrievalPlan: {
              intent: request.retrievalPlan.intent,
              enabled: request.retrievalPlan.enabled,
              maxItems: request.retrievalPlan.maxItems,
              concepts: [...request.retrievalPlan.concepts],
              preferredTracks: [...request.retrievalPlan.preferredTracks],
              queryTerms: [...request.retrievalPlan.queryTerms]
            }
          }),
      curatedKnowledge: boundedKnowledge,
      truncation: {
        maxConversationMessages: resolvedLimits.maxConversationMessages,
        maxMessageChars: resolvedLimits.maxMessageChars,
        maxKnowledgeEntries: resolvedLimits.maxKnowledgeEntries,
        maxKnowledgeEntryChars: resolvedLimits.maxKnowledgeEntryChars,
        maxKnowledgeTotalChars: resolvedLimits.maxKnowledgeTotalChars,
        conversationMessagesIncluded: messages.length,
        knowledgeIncluded: boundedKnowledge.length,
        knowledgeCharsIncluded: aggregateKnowledgeChars
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
