import {
  BACKGAMMON_KNOWLEDGE_CONCEPTS,
  BACKGAMMON_KNOWLEDGE_CONTEXTS,
  BACKGAMMON_KNOWLEDGE_LEARNER_LEVELS,
  BACKGAMMON_KNOWLEDGE_PROVENANCE_KINDS,
  BACKGAMMON_KNOWLEDGE_SCHEMA_VERSION,
  BACKGAMMON_KNOWLEDGE_TAXONOMY_VERSION,
  BACKGAMMON_KNOWLEDGE_TRACKS,
  type BackgammonKnowledgeConcept,
  type BackgammonKnowledgeCorpus,
  type BackgammonKnowledgeEntry
} from "./model";

export interface BackgammonKnowledgeValidationIssue {
  readonly entryId: string;
  readonly message: string;
}

export interface BackgammonKnowledgeValidationResult {
  readonly ok: boolean;
  readonly issues: readonly BackgammonKnowledgeValidationIssue[];
}

const MAX_SUMMARY_LENGTH = 220;
const MAX_BODY_LENGTH = 2400;

const hasOnlyUniqueValues = (values: readonly string[]): boolean => {
  return new Set(values).size === values.length;
};

const pushIssue = (
  issues: BackgammonKnowledgeValidationIssue[],
  entryId: string,
  message: string
): void => {
  issues.push({ entryId, message });
};

const normalizeAlias = (value: string): string => value.trim().toLowerCase();

const validateEntry = (
  entry: BackgammonKnowledgeEntry,
  seenIds: Set<string>,
  issues: BackgammonKnowledgeValidationIssue[]
): void => {
  if (entry.schemaVersion !== BACKGAMMON_KNOWLEDGE_SCHEMA_VERSION) {
    pushIssue(issues, entry.id, `Unsupported schema version ${String(entry.schemaVersion)}.`);
  }

  if (entry.id.trim().length === 0) {
    pushIssue(issues, "(missing-id)", "Knowledge entry id must be non-empty.");
  }

  if (seenIds.has(entry.id)) {
    pushIssue(issues, entry.id, "Duplicate knowledge entry id.");
  }
  seenIds.add(entry.id);

  if (entry.title.trim().length === 0) {
    pushIssue(issues, entry.id, "Knowledge entry title must be non-empty.");
  }

  if (entry.summary.trim().length === 0 || entry.summary.length > MAX_SUMMARY_LENGTH) {
    pushIssue(issues, entry.id, "Knowledge entry summary must be non-empty and reasonably short.");
  }

  if (entry.body.trim().length === 0 || entry.body.length > MAX_BODY_LENGTH) {
    pushIssue(issues, entry.id, "Knowledge entry body must be non-empty and bounded.");
  }

  if (!BACKGAMMON_KNOWLEDGE_LEARNER_LEVELS.includes(entry.learnerLevel)) {
    pushIssue(issues, entry.id, `Unsupported learner level ${entry.learnerLevel}.`);
  }

  if (!BACKGAMMON_KNOWLEDGE_TRACKS.includes(entry.track)) {
    pushIssue(issues, entry.id, `Unsupported knowledge track ${entry.track}.`);
  }

  if (entry.concepts.length === 0) {
    pushIssue(issues, entry.id, "Knowledge entry must declare at least one concept.");
  }

  for (const concept of entry.concepts) {
    if (!BACKGAMMON_KNOWLEDGE_CONCEPTS.includes(concept)) {
      pushIssue(issues, entry.id, `Unsupported concept ${concept}.`);
    }
  }

  for (const context of entry.contexts) {
    if (!BACKGAMMON_KNOWLEDGE_CONTEXTS.includes(context)) {
      pushIssue(issues, entry.id, `Unsupported context ${context}.`);
    }
  }

  if (!hasOnlyUniqueValues(entry.concepts)) {
    pushIssue(issues, entry.id, "Knowledge entry concepts must be unique.");
  }

  if (!hasOnlyUniqueValues(entry.contexts)) {
    pushIssue(issues, entry.id, "Knowledge entry contexts must be unique.");
  }

  const aliases = entry.aliases.map(normalizeAlias).filter((value) => value.length > 0);
  if (aliases.length === 0) {
    pushIssue(issues, entry.id, "Knowledge entry must declare at least one retrieval alias.");
  }

  if (!hasOnlyUniqueValues(aliases)) {
    pushIssue(issues, entry.id, "Knowledge entry aliases must be unique after normalization.");
  }

  if (!BACKGAMMON_KNOWLEDGE_PROVENANCE_KINDS.includes(entry.provenance.kind)) {
    pushIssue(issues, entry.id, `Unsupported provenance kind ${entry.provenance.kind}.`);
  }

  if (entry.provenance.label.trim().length === 0) {
    pushIssue(issues, entry.id, "Knowledge entry provenance label must be non-empty.");
  }
};

const REQUIRED_BEGINNER_CONCEPTS: readonly BackgammonKnowledgeConcept[] = [
  "current-position",
  "legal-moves",
  "dice-use",
  "bar-entry",
  "bearing-off",
  "blots",
  "hits",
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
];

export const validateBackgammonKnowledgeCorpus = (
  corpus: BackgammonKnowledgeCorpus
): BackgammonKnowledgeValidationResult => {
  const issues: BackgammonKnowledgeValidationIssue[] = [];

  if (corpus.schemaVersion !== BACKGAMMON_KNOWLEDGE_SCHEMA_VERSION) {
    issues.push({
      entryId: "(corpus)",
      message: `Unsupported corpus schema version ${String(corpus.schemaVersion)}.`
    });
  }

  if (corpus.taxonomyVersion !== BACKGAMMON_KNOWLEDGE_TAXONOMY_VERSION) {
    issues.push({
      entryId: "(corpus)",
      message: `Unsupported taxonomy version ${String(corpus.taxonomyVersion)}.`
    });
  }

  const seenIds = new Set<string>();
  for (const entry of corpus.entries) {
    validateEntry(entry, seenIds, issues);
  }

  const coveredConcepts = new Set(corpus.entries.flatMap((entry) => entry.concepts));
  for (const concept of REQUIRED_BEGINNER_CONCEPTS) {
    if (!coveredConcepts.has(concept)) {
      issues.push({
        entryId: "(corpus)",
        message: `Initial corpus is missing required concept coverage for ${concept}.`
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues
  };
};
