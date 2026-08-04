import type {
  BackgammonKnowledgeConcept,
  BackgammonKnowledgeTrack
} from "@backgammon-trainer/backgammon-knowledge";

import type { CoachQuestionContext } from "./context";
import type { CoachEvidenceBundle } from "./evidence";
import { mapPatternSkillAreaToKnowledgeConcept } from "./patterns";

export type CoachKnowledgeRetrievalIntent =
  | "move-evaluation"
  | "strategic-concept-explanation"
  | "position-specific-explanation"
  | "candidate-comparison"
  | "rules-legality"
  | "definition"
  | "counterfactual-analysis"
  | "learning-focus"
  | "progress-count"
  | "unsupported-topic";

export interface CoachResolvedSubject {
  readonly kind:
    | "move"
    | "candidate-move"
    | "point"
    | "anchor"
    | "blot"
    | "hit"
    | "prime"
    | "race"
    | "rule"
    | "term"
    | "counterfactual"
    | "position"
    | "unknown";
  readonly label: string;
  readonly source: "question-explicit" | "context-derived";
}

export interface CoachIntentResolution {
  readonly intent: CoachKnowledgeRetrievalIntent;
  readonly subject: CoachResolvedSubject;
  readonly evidencePriority: readonly string[];
  readonly evaluatorRole: "primary" | "secondary" | "optional" | "not-applicable";
}

export interface CoachKnowledgeRetrievalPlan {
  readonly intent: CoachKnowledgeRetrievalIntent;
  readonly enabled: boolean;
  readonly maxItems: number;
  readonly concepts: readonly BackgammonKnowledgeConcept[];
  readonly preferredTracks: readonly BackgammonKnowledgeTrack[];
  readonly queryTerms: readonly string[];
  readonly operation: CoachIntentResolution;
}

const DEFINITION_PATTERN =
  /\b(what is|what's|what does|define|definition|meaning of|what does .* mean)\b/i;

const LEARNING_FOCUS_PATTERN =
  /\b(focus on|learn next|study plan|what should i learn|what should i focus|practice next|curriculum|improve next)\b/i;

const PROGRESS_COUNT_PATTERN =
  /\b(how many|count|number of|total)\b.*\b(mistake|mistakes|major mistakes|best|reasonable|unclassified)\b/i;

const UNSUPPORTED_CUBE_PATTERN =
  /\b(cube|doubling|double\b|take point|cash point|match play|crawford|beaver|jacoby)\b/i;

const MOVE_EVALUATION_PATTERN =
  /\b(was (?:my|that|the) move (?:actually )?best|was (?:my|that|the) move good|was (?:my|that|the) move (?:a )?mistake|thoughts on (?:that|my|the) move|what should i have played|what should i have done|feedback on (?:that|my|the) move|review (?:that|my|the) move|assess (?:that|my|the) move)\b/i;

const CANDIDATE_COMPARISON_PATTERN =
  /\b(better than|worse than|instead of|rather than|compared to|versus|vs\.?|other move|alternative|what does the other move give up|give up)\b/i;

const LEGALITY_PATTERN =
  /\b(legal|illegal|can i|am i allowed|do i have to|must i|can i move the same checker twice|why can['’]?t i play|why can['’]?t i|can['’]?t i|cannot i|have to enter)\b/i;

const COUNTERFACTUAL_PATTERN =
  /\b(what if|would .* if|if .* would|suppose|assuming|imagine|still matter if|what changes if|had no checker back)\b/i;

const POSITION_SPECIFIC_PATTERN = /\b(here|in this position|right now|now)\b/i;

const STRATEGIC_EXPLANATION_PATTERN = /\b(why is|why are|what makes|how does|why do)\b/i;

const REFERENTIAL_SUBJECT_PATTERN =
  /\b(that move|the move|that point|the point|it|that blot|the blot|that hit|the hit|the alternative)\b/i;

const MOVE_NOTATION_PATTERN = /\b(?:[1-9]|1[0-9]|2[0-4])\s*(?:\/|-)\s*(?:[1-9]|1[0-9]|2[0-4])\b/i;

const REVIEW_STYLE_PATTERN =
  /\b(review|feedback|analogy|snippet|coaching phrase|coach answer|conversation pattern)\b/i;

const POINT_SUBJECT_PATTERN = /\b([1-9]|1[0-9]|2[0-4])\s*(?:-|\s*)?(?:pt|point)\b/i;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "what",
  "why",
  "how",
  "when",
  "from",
  "into",
  "should",
  "would",
  "about",
  "have",
  "been",
  "your",
  "my",
  "our",
  "their",
  "there",
  "here",
  "then",
  "than"
]);

const QUESTION_TERM_LIMIT = 10;

const tokenize = (question: string): readonly string[] => {
  const raw = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  const unique = new Set<string>();
  for (const token of raw) {
    unique.add(token);
    if (unique.size >= QUESTION_TERM_LIMIT) {
      break;
    }
  }

  return [...unique];
};

const addConcept = (
  concepts: Set<BackgammonKnowledgeConcept>,
  concept: BackgammonKnowledgeConcept
): void => {
  concepts.add(concept);
};

const deriveConceptsFromQuestion = (question: string): readonly BackgammonKnowledgeConcept[] => {
  const normalized = question.toLowerCase();
  const concepts = new Set<BackgammonKnowledgeConcept>();

  if (normalized.includes("anchor")) {
    addConcept(concepts, "anchors");
  }
  if (normalized.includes("blot")) {
    addConcept(concepts, "blots");
  }
  if (normalized.includes("hit")) {
    addConcept(concepts, "hits");
  }
  if (normalized.includes("tempo") || normalized.includes("timing")) {
    addConcept(concepts, "tempo");
  }
  if (normalized.includes("race") || normalized.includes("pip")) {
    addConcept(concepts, "race");
  }
  if (normalized.includes("contact")) {
    addConcept(concepts, "contact");
  }
  if (normalized.includes("bar")) {
    addConcept(concepts, "bar-entry");
  }
  if (normalized.includes("bearing off") || normalized.includes("bear off")) {
    addConcept(concepts, "bearing-off");
  }
  if (normalized.includes("point")) {
    addConcept(concepts, "made-points");
  }
  if (normalized.includes("safe") || normalized.includes("safety")) {
    addConcept(concepts, "safety");
  }
  if (normalized.includes("risk")) {
    addConcept(concepts, "risk");
  }
  if (normalized.includes("opening")) {
    addConcept(concepts, "game-plan");
  }
  if (normalized.includes("prime") || normalized.includes("priming")) {
    addConcept(concepts, "structure");
    addConcept(concepts, "game-plan");
  }

  return [...concepts];
};

const deriveConceptsFromContext = (
  context: CoachQuestionContext,
  evidence: CoachEvidenceBundle,
  intent: CoachKnowledgeRetrievalIntent
): readonly BackgammonKnowledgeConcept[] => {
  const concepts = new Set<BackgammonKnowledgeConcept>();

  if (context.kind === "current-position") {
    addConcept(concepts, "current-position");
    if (context.currentTurn.stagedSelection !== undefined) {
      addConcept(concepts, "candidate-comparison");
    }

    for (const outcome of context.currentTurn.legalMoveOutcomes?.outcomes ?? []) {
      if (outcome.move.steps.some((step) => step.hitsBlot)) {
        addConcept(concepts, "hits");
        addConcept(concepts, "blots");
      }

      if (outcome.move.steps.some((step) => step.kind === "enter-from-bar")) {
        addConcept(concepts, "bar-entry");
      }

      if (outcome.move.steps.some((step) => step.kind === "bear-off")) {
        addConcept(concepts, "bearing-off");
      }

      if (
        outcome.featureDelta.white.madePointCountDelta > 0 ||
        outcome.featureDelta.black.madePointCountDelta > 0
      ) {
        addConcept(concepts, "made-points");
      }
    }
  }

  if (
    (context.kind === "history-turn" || context.kind === "game-review") &&
    (intent === "move-evaluation" ||
      intent === "candidate-comparison" ||
      intent === "learning-focus")
  ) {
    addConcept(concepts, "move-review");
    addConcept(concepts, "candidate-comparison");
  }

  if (context.kind === "progress-profile") {
    addConcept(concepts, "move-review");
    const mainPattern = context.progress.patterns.mainPattern;
    if (mainPattern.status === "supported") {
      addConcept(concepts, mapPatternSkillAreaToKnowledgeConcept(mainPattern.skillArea));
    }
    if (mainPattern.status === "tied") {
      for (const pattern of mainPattern.tiedPatterns) {
        addConcept(concepts, mapPatternSkillAreaToKnowledgeConcept(pattern.skillArea));
      }
    }
  }

  if (evidence.positionFacts?.relationship.contactStatus === "contact") {
    addConcept(concepts, "contact");
  }
  if (evidence.positionFacts?.relationship.contactStatus === "race") {
    addConcept(concepts, "race");
  }

  if ((evidence.positionFacts?.white.checkersOnBar ?? 0) > 0) {
    addConcept(concepts, "bar-entry");
  }
  if ((evidence.positionFacts?.black.checkersOnBar ?? 0) > 0) {
    addConcept(concepts, "bar-entry");
  }

  if ((evidence.positionFacts?.white.checkersBorneOff ?? 0) > 0) {
    addConcept(concepts, "bearing-off");
  }
  if ((evidence.positionFacts?.black.checkersBorneOff ?? 0) > 0) {
    addConcept(concepts, "bearing-off");
  }

  if ((evidence.positionFacts?.white.madeHomeBoardPointCount ?? 0) > 0) {
    addConcept(concepts, "inner-board");
  }
  if ((evidence.positionFacts?.black.madeHomeBoardPointCount ?? 0) > 0) {
    addConcept(concepts, "inner-board");
  }

  return [...concepts];
};

const conceptToTrack = (
  concept: BackgammonKnowledgeConcept
): BackgammonKnowledgeTrack | undefined => {
  if (concept === "anchors" || concept === "made-points") {
    return "making-points";
  }
  if (concept === "hits" || concept === "blots" || concept === "tempo") {
    return "hitting-tempo";
  }
  if (concept === "bar-entry" || concept === "safety" || concept === "risk") {
    return "safety-risk";
  }
  if (concept === "race" || concept === "contact" || concept === "game-plan") {
    return "game-plan-recognition";
  }
  if (concept === "current-position" || concept === "legal-moves" || concept === "dice-use") {
    return "board-vision";
  }
  if (concept === "move-review" || concept === "candidate-comparison") {
    return "move-review";
  }
  return undefined;
};

const derivePreferredTracks = (input: {
  operation: CoachIntentResolution;
  context: CoachQuestionContext;
  concepts: readonly BackgammonKnowledgeConcept[];
  question: string;
}): readonly BackgammonKnowledgeTrack[] => {
  const intent = input.operation.intent;

  if (intent === "definition" || intent === "rules-legality") {
    return ["board-vision"];
  }

  if (intent === "learning-focus") {
    return ["move-review", "game-plan-recognition"];
  }

  if (intent === "move-evaluation") {
    return ["move-review", "board-vision"];
  }

  if (intent === "candidate-comparison") {
    return ["move-review", "board-vision", "making-points", "safety-risk"];
  }

  if (intent === "counterfactual-analysis") {
    return ["game-plan-recognition", "board-vision", "making-points"];
  }

  const tracks = new Set<BackgammonKnowledgeTrack>();

  for (const concept of input.concepts) {
    const track = conceptToTrack(concept);
    if (track !== undefined) {
      tracks.add(track);
    }
  }

  const contextual =
    input.context.kind === "history-turn" ||
    input.context.kind === "game-review" ||
    input.context.kind === "progress-profile";
  const hasReviewStyleWording = REVIEW_STYLE_PATTERN.test(input.question);

  if (
    (intent === "strategic-concept-explanation" || intent === "position-specific-explanation") &&
    !hasReviewStyleWording
  ) {
    tracks.delete("move-review");
  }

  if (!contextual && !hasReviewStyleWording) {
    tracks.delete("move-review");
  }

  if (tracks.size === 0) {
    if (intent === "position-specific-explanation") {
      return ["board-vision", "making-points", "safety-risk"];
    }

    if (intent === "strategic-concept-explanation") {
      return ["making-points", "safety-risk", "game-plan-recognition"];
    }

    return contextual ? ["move-review"] : ["board-vision"];
  }

  return [...tracks];
};

const inferIntent = (
  question: string,
  context: CoachQuestionContext
): CoachKnowledgeRetrievalIntent => {
  if (UNSUPPORTED_CUBE_PATTERN.test(question)) {
    return "unsupported-topic";
  }

  if (context.kind === "progress-profile" && PROGRESS_COUNT_PATTERN.test(question)) {
    return "progress-count";
  }

  if (DEFINITION_PATTERN.test(question)) {
    return "definition";
  }

  if (context.kind === "progress-profile" && LEARNING_FOCUS_PATTERN.test(question)) {
    return "learning-focus";
  }

  if (COUNTERFACTUAL_PATTERN.test(question)) {
    return "counterfactual-analysis";
  }

  const hasComparisonLanguage =
    CANDIDATE_COMPARISON_PATTERN.test(question) ||
    (MOVE_NOTATION_PATTERN.test(question) &&
      /\b(better|instead|rather|alternative|other|give up)\b/i.test(question));
  if (hasComparisonLanguage) {
    return "candidate-comparison";
  }

  if (LEGALITY_PATTERN.test(question) && !hasComparisonLanguage) {
    return "rules-legality";
  }

  if (MOVE_EVALUATION_PATTERN.test(question)) {
    return "move-evaluation";
  }

  if (
    POSITION_SPECIFIC_PATTERN.test(question) &&
    /\b(why|how|what makes|does that matter)\b/i.test(question)
  ) {
    return "position-specific-explanation";
  }

  if (
    REFERENTIAL_SUBJECT_PATTERN.test(question) &&
    /\b(why|how|what makes)\b/i.test(question) &&
    (context.kind === "history-turn" || context.kind === "current-position")
  ) {
    return "position-specific-explanation";
  }

  if (STRATEGIC_EXPLANATION_PATTERN.test(question)) {
    return "strategic-concept-explanation";
  }

  return "strategic-concept-explanation";
};

const resolveSubject = (question: string, context: CoachQuestionContext): CoachResolvedSubject => {
  const pointMatch = question.match(POINT_SUBJECT_PATTERN);
  if (pointMatch?.[1] !== undefined) {
    return {
      kind: "point",
      label: `${pointMatch[1]}-point`,
      source: "question-explicit"
    };
  }

  const normalized = question.toLowerCase();
  if (normalized.includes("anchor")) {
    return { kind: "anchor", label: "anchor", source: "question-explicit" };
  }
  if (normalized.includes("blot")) {
    return { kind: "blot", label: "blot", source: "question-explicit" };
  }
  if (normalized.includes("hit")) {
    return { kind: "hit", label: "hit", source: "question-explicit" };
  }
  if (normalized.includes("prime")) {
    return { kind: "prime", label: "prime", source: "question-explicit" };
  }
  if (normalized.includes("race") || normalized.includes("pip")) {
    return { kind: "race", label: "race lead", source: "question-explicit" };
  }
  if (
    normalized.includes("what if") ||
    normalized.includes("would") ||
    normalized.includes("if ")
  ) {
    return { kind: "counterfactual", label: "hypothetical variation", source: "question-explicit" };
  }
  if (DEFINITION_PATTERN.test(question)) {
    return { kind: "term", label: "term clarification", source: "question-explicit" };
  }
  if (LEGALITY_PATTERN.test(question)) {
    return { kind: "rule", label: "legal move rule", source: "question-explicit" };
  }
  if (
    MOVE_NOTATION_PATTERN.test(question) ||
    normalized.includes("move") ||
    normalized.includes("alternative")
  ) {
    return {
      kind: "candidate-move",
      label: "candidate move comparison",
      source: "question-explicit"
    };
  }

  if (context.kind === "history-turn" && context.turnRecord.outcome.kind === "move") {
    return {
      kind: "move",
      label: `turn ${context.turnNumber} committed move`,
      source: "context-derived"
    };
  }

  if (context.kind === "current-position") {
    return {
      kind: "position",
      label: "current position",
      source: "context-derived"
    };
  }

  return {
    kind: "unknown",
    label: "contextual referent",
    source: "context-derived"
  };
};

const getEvidencePriority = (intent: CoachKnowledgeRetrievalIntent): readonly string[] => {
  switch (intent) {
    case "move-evaluation":
      return [
        "evaluator-result",
        "deterministic-move-facts",
        "curated-strategy-knowledge",
        "constrained-explanation"
      ];
    case "strategic-concept-explanation":
      return [
        "curated-strategy-knowledge",
        "deterministic-position-facts",
        "learner-context",
        "evaluator-support"
      ];
    case "position-specific-explanation":
      return [
        "deterministic-position-facts",
        "curated-strategy-knowledge",
        "evaluator-support",
        "constrained-explanation"
      ];
    case "candidate-comparison":
      return [
        "evaluated-candidate-comparison",
        "deterministic-move-delta",
        "curated-strategy-knowledge",
        "constrained-explanation"
      ];
    case "rules-legality":
      return ["engine-rules", "legal-move-facts", "glossary-knowledge"];
    case "definition":
      return ["glossary-knowledge", "curated-definitions", "position-illustration"];
    case "counterfactual-analysis":
      return [
        "stated-assumption",
        "deterministic-base-facts",
        "evaluator-evidence-when-available",
        "curated-strategy-knowledge"
      ];
    case "learning-focus":
      return ["deterministic-progress-facts", "curated-learning-material", "review-context"];
    case "progress-count":
      return ["deterministic-progress-facts"];
    case "unsupported-topic":
      return ["deterministic-no-match"];
  }
};

const getEvaluatorRole = (
  intent: CoachKnowledgeRetrievalIntent
): CoachIntentResolution["evaluatorRole"] => {
  switch (intent) {
    case "move-evaluation":
    case "candidate-comparison":
      return "primary";
    case "strategic-concept-explanation":
    case "position-specific-explanation":
    case "learning-focus":
      return "secondary";
    case "counterfactual-analysis":
      return "optional";
    default:
      return "not-applicable";
  }
};

export const resolveCoachIntent = (input: {
  question: string;
  context: CoachQuestionContext;
}): CoachIntentResolution => {
  const intent = inferIntent(input.question, input.context);
  return {
    intent,
    subject: resolveSubject(input.question, input.context),
    evidencePriority: getEvidencePriority(intent),
    evaluatorRole: getEvaluatorRole(intent)
  };
};

export const buildCoachKnowledgeRetrievalPlan = (input: {
  question: string;
  context: CoachQuestionContext;
  evidence: CoachEvidenceBundle;
  operation?: CoachIntentResolution;
}): CoachKnowledgeRetrievalPlan => {
  const operation = input.operation ?? resolveCoachIntent(input);
  const intent = operation.intent;
  if (intent === "unsupported-topic" || intent === "progress-count") {
    return {
      intent,
      enabled: false,
      maxItems: 0,
      concepts: [],
      preferredTracks: [],
      queryTerms: [],
      operation
    };
  }

  const concepts = new Set<BackgammonKnowledgeConcept>([
    ...deriveConceptsFromContext(input.context, input.evidence, intent),
    ...deriveConceptsFromQuestion(input.question)
  ]);

  const preferredTracks = derivePreferredTracks({
    operation,
    context: input.context,
    concepts: [...concepts],
    question: input.question
  });

  const maxItems = intent === "definition" || intent === "rules-legality" ? 2 : 3;
  const queryTerms = tokenize(input.question);

  return {
    intent,
    enabled: true,
    maxItems,
    concepts: [...concepts].sort(),
    preferredTracks,
    queryTerms,
    operation
  };
};
