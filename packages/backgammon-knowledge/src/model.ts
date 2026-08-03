export const BACKGAMMON_KNOWLEDGE_SCHEMA_VERSION = 1 as const;
export const BACKGAMMON_KNOWLEDGE_TAXONOMY_VERSION = 1 as const;

export const BACKGAMMON_KNOWLEDGE_TRACKS = [
  "board-vision",
  "safety-risk",
  "making-points",
  "hitting-tempo",
  "game-plan-recognition",
  "move-review"
] as const;

export const BACKGAMMON_KNOWLEDGE_CONCEPTS = [
  "current-position",
  "legal-moves",
  "dice-use",
  "bar-entry",
  "bearing-off",
  "blots",
  "hits",
  "tempo",
  "made-points",
  "anchors",
  "inner-board",
  "safety",
  "risk",
  "running",
  "structure",
  "race",
  "contact",
  "candidate-comparison",
  "move-review",
  "game-plan"
] as const;

export const BACKGAMMON_KNOWLEDGE_CONTEXTS = [
  "current-position",
  "move-outcome",
  "history-turn",
  "game-review"
] as const;

export const BACKGAMMON_KNOWLEDGE_LEARNER_LEVELS = ["beginner", "intermediate"] as const;
export const BACKGAMMON_KNOWLEDGE_PROVENANCE_KINDS = ["project-authored"] as const;

export type BackgammonKnowledgeTrack = (typeof BACKGAMMON_KNOWLEDGE_TRACKS)[number];
export type BackgammonKnowledgeConcept = (typeof BACKGAMMON_KNOWLEDGE_CONCEPTS)[number];
export type BackgammonKnowledgeContextKind = (typeof BACKGAMMON_KNOWLEDGE_CONTEXTS)[number];
export type BackgammonKnowledgeLearnerLevel = (typeof BACKGAMMON_KNOWLEDGE_LEARNER_LEVELS)[number];
export type BackgammonKnowledgeProvenanceKind =
  (typeof BACKGAMMON_KNOWLEDGE_PROVENANCE_KINDS)[number];

export interface BackgammonKnowledgeProvenance {
  readonly kind: BackgammonKnowledgeProvenanceKind;
  readonly label: string;
}

export interface BackgammonKnowledgeEntry {
  readonly schemaVersion: typeof BACKGAMMON_KNOWLEDGE_SCHEMA_VERSION;
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly learnerLevel: BackgammonKnowledgeLearnerLevel;
  readonly track: BackgammonKnowledgeTrack;
  readonly concepts: readonly BackgammonKnowledgeConcept[];
  readonly contexts: readonly BackgammonKnowledgeContextKind[];
  readonly aliases: readonly string[];
  readonly provenance: BackgammonKnowledgeProvenance;
  readonly body: string;
}

export interface BackgammonKnowledgeCorpus {
  readonly schemaVersion: typeof BACKGAMMON_KNOWLEDGE_SCHEMA_VERSION;
  readonly taxonomyVersion: typeof BACKGAMMON_KNOWLEDGE_TAXONOMY_VERSION;
  readonly entries: readonly BackgammonKnowledgeEntry[];
}

export interface BackgammonKnowledgeQuery {
  readonly question: string;
  readonly contextKind: BackgammonKnowledgeContextKind;
  readonly concepts?: readonly BackgammonKnowledgeConcept[];
  readonly maxEntries: number;
}

export interface BackgammonKnowledgeMatchReason {
  readonly kind: "context" | "concept" | "alias" | "keyword";
  readonly value: string;
}

export interface BackgammonKnowledgeMatch {
  readonly entry: BackgammonKnowledgeEntry;
  readonly reasons: readonly BackgammonKnowledgeMatchReason[];
}
