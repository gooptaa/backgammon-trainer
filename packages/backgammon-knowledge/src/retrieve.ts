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
  const questionTokens = tokenize(query.question);
  const conceptSet = new Set(query.concepts ?? []);
  const maxEntries = Math.max(0, query.maxEntries);

  const scored = corpus.entries
    .map((entry) => {
      let score = 0;
      const reasons: BackgammonKnowledgeMatchReason[] = [];

      if (entry.contexts.includes(query.contextKind)) {
        score += 2;
        pushReason(reasons, { kind: "context", value: query.contextKind });
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
          score += 5;
          pushReason(reasons, { kind: "alias", value: alias });
        }
      }

      const keywordSource = normalizeText(
        `${entry.title} ${entry.summary} ${entry.concepts.join(" ")}`
      );
      for (const token of questionTokens) {
        if (keywordSource.includes(token)) {
          score += 1;
          pushReason(reasons, { kind: "keyword", value: token });
        }
      }

      return {
        entry,
        reasons,
        score,
        hasStrongReason: reasons.some(
          (reason) => reason.kind === "alias" || reason.kind === "concept"
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
