import type {
  BackgammonKnowledgeConcept,
  BackgammonKnowledgeTrack
} from "@backgammon-trainer/backgammon-knowledge";

import type { CoachQuestionContext } from "./context";
import type { CoachEvidenceBundle } from "./evidence";
import { mapPatternSkillAreaToKnowledgeConcept } from "./patterns";

export type CoachKnowledgeRetrievalIntent =
  | "strategic-explanation"
  | "definition"
  | "learning-focus"
  | "progress-count"
  | "unsupported-topic";

export interface CoachKnowledgeRetrievalPlan {
  readonly intent: CoachKnowledgeRetrievalIntent;
  readonly enabled: boolean;
  readonly maxItems: number;
  readonly concepts: readonly BackgammonKnowledgeConcept[];
  readonly preferredTracks: readonly BackgammonKnowledgeTrack[];
  readonly queryTerms: readonly string[];
}

const DEFINITION_PATTERN =
  /\b(what is|what's|what does|define|definition|meaning of|what does .* mean)\b/i;

const LEARNING_FOCUS_PATTERN =
  /\b(focus on|learn next|study plan|what should i learn|what should i focus|practice next|curriculum|improve next)\b/i;

const PROGRESS_COUNT_PATTERN =
  /\b(how many|count|number of|total)\b.*\b(mistake|mistakes|major mistakes|best|reasonable|unclassified)\b/i;

const UNSUPPORTED_CUBE_PATTERN =
  /\b(cube|doubling|double\b|take point|cash point|match play|crawford|beaver|jacoby)\b/i;

const REVIEW_STYLE_PATTERN =
  /\b(review|feedback|analogy|snippet|coaching phrase|coach answer|conversation pattern)\b/i;

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
  evidence: CoachEvidenceBundle
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

  if (context.kind === "history-turn" || context.kind === "game-review") {
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
  intent: CoachKnowledgeRetrievalIntent;
  context: CoachQuestionContext;
  concepts: readonly BackgammonKnowledgeConcept[];
  question: string;
}): readonly BackgammonKnowledgeTrack[] => {
  if (input.intent === "definition") {
    return ["board-vision"];
  }

  if (input.intent === "learning-focus") {
    return ["move-review", "game-plan-recognition"];
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

  if (!contextual && !hasReviewStyleWording) {
    tracks.delete("move-review");
  }

  if (tracks.size === 0) {
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

  return "strategic-explanation";
};

export const buildCoachKnowledgeRetrievalPlan = (input: {
  question: string;
  context: CoachQuestionContext;
  evidence: CoachEvidenceBundle;
}): CoachKnowledgeRetrievalPlan => {
  const intent = inferIntent(input.question, input.context);
  if (intent === "unsupported-topic" || intent === "progress-count") {
    return {
      intent,
      enabled: false,
      maxItems: 0,
      concepts: [],
      preferredTracks: [],
      queryTerms: []
    };
  }

  const concepts = new Set<BackgammonKnowledgeConcept>([
    ...deriveConceptsFromContext(input.context, input.evidence),
    ...deriveConceptsFromQuestion(input.question)
  ]);

  const preferredTracks = derivePreferredTracks({
    intent,
    context: input.context,
    concepts: [...concepts],
    question: input.question
  });

  const maxItems = intent === "definition" ? 2 : 3;
  const queryTerms = tokenize(input.question);

  return {
    intent,
    enabled: true,
    maxItems,
    concepts: [...concepts].sort(),
    preferredTracks,
    queryTerms
  };
};
