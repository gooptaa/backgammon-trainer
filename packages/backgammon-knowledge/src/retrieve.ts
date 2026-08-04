import type {
  BackgammonKnowledgeCorpus,
  BackgammonKnowledgeMatch,
  BackgammonKnowledgeMatchReason,
  BackgammonKnowledgeQuery
} from "./model";

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokenize = (value: string): readonly string[] => {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3);
};

const hasWord = (source: string, word: string): boolean => {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}($|\\s)`).test(source);
};

const pushReason = (
  reasons: BackgammonKnowledgeMatchReason[],
  reason: BackgammonKnowledgeMatchReason
): void => {
  if (reasons.some((current) => current.kind === reason.kind && current.value === reason.value)) {
    return;
  }
  reasons.push(reason);
};

export const searchBackgammonKnowledge = (
  corpus: BackgammonKnowledgeCorpus,
  query: BackgammonKnowledgeQuery
): readonly BackgammonKnowledgeMatch[] => {
  const normalizedQuestion = normalizeText(query.question);
  const questionTokens = query.queryTerms ?? tokenize(query.question);
  const conceptSet = new Set(query.concepts ?? []);
  const preferredTrackSet = new Set(query.preferredTracks ?? []);
  const maxEntries = Math.max(0, query.maxEntries);
  const definitionIntent = query.intent === "definition";
  const learningFocusIntent = query.intent === "learning-focus";
  const moveEvaluationIntent = query.intent === "move-evaluation";
  const candidateComparisonIntent = query.intent === "candidate-comparison";
  const strategicConceptIntent = query.intent === "strategic-concept-explanation";
  const positionSpecificIntent = query.intent === "position-specific-explanation";
  const rulesLegalityIntent = query.intent === "rules-legality";
  const counterfactualIntent = query.intent === "counterfactual-analysis";

  if (
    maxEntries === 0 ||
    query.intent === "unsupported-topic" ||
    query.intent === "progress-count"
  ) {
    return [];
  }

  const scored = corpus.entries
    .map((entry) => {
      let score = 0;
      const reasons: BackgammonKnowledgeMatchReason[] = [];

      if (entry.contexts.includes(query.contextKind)) {
        score += 2;
        pushReason(reasons, { kind: "context", value: query.contextKind });
      }

      if (preferredTrackSet.has(entry.track)) {
        score += 3;
        pushReason(reasons, { kind: "track", value: entry.track });
      }

      if (query.learnerLevel !== undefined && entry.learnerLevel === query.learnerLevel) {
        score += 1;
      }

      for (const concept of entry.concepts) {
        if (conceptSet.has(concept)) {
          score += 3;
          pushReason(reasons, { kind: "concept", value: concept });
        }
      }

      for (const alias of entry.aliases) {
        const normalizedAlias = normalizeText(alias);
        if (normalizedAlias.length > 0 && normalizedQuestion.includes(normalizedAlias)) {
          score += definitionIntent ? 7 : 5;
          pushReason(reasons, { kind: "alias", value: alias });
        }
      }

      const titleAndAliases = normalizeText(`${entry.title} ${entry.aliases.join(" ")}`);
      const summaryAndConcepts = normalizeText(`${entry.summary} ${entry.concepts.join(" ")}`);
      for (const token of questionTokens) {
        if (hasWord(titleAndAliases, token)) {
          score += 2;
          pushReason(reasons, { kind: "keyword", value: token });
          continue;
        }

        if (summaryAndConcepts.includes(token)) {
          score += 1;
          pushReason(reasons, { kind: "keyword", value: token });
        }
      }

      if (learningFocusIntent && entry.track === "move-review") {
        score += 1;
      }

      if ((moveEvaluationIntent || candidateComparisonIntent) && entry.track === "move-review") {
        score += 2;
      }

      if (rulesLegalityIntent) {
        if (entry.track === "board-vision") {
          score += 4;
        }

        if (entry.concepts.includes("legal-moves") || entry.concepts.includes("dice-use")) {
          score += 3;
        }

        if (entry.track === "move-review") {
          score -= 4;
        }
      }

      if (
        (strategicConceptIntent || positionSpecificIntent || counterfactualIntent) &&
        entry.track === "move-review"
      ) {
        score -= 3;
      }

      if (
        !learningFocusIntent &&
        !definitionIntent &&
        !moveEvaluationIntent &&
        !candidateComparisonIntent &&
        query.contextKind === "current-position"
      ) {
        if (entry.track === "move-review") {
          score -= 2;
        }
      }

      return {
        entry,
        reasons,
        score,
        hasStrongReason: reasons.some(
          (reason) =>
            reason.kind === "alias" || reason.kind === "concept" || reason.kind === "track"
        ),
        keywordReasonCount: reasons.filter((reason) => reason.kind === "keyword").length
      };
    })
    .filter((row) => row.score > 0 && (row.hasStrongReason || row.keywordReasonCount >= 2))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      if (left.reasons.length !== right.reasons.length) {
        return right.reasons.length - left.reasons.length;
      }

      return left.entry.id.localeCompare(right.entry.id);
    })
    .slice(0, maxEntries);

  return scored.map<BackgammonKnowledgeMatch>((row) => ({
    entry: row.entry,
    reasons: row.reasons
  }));
};
