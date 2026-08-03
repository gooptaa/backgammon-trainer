import type { CoachContextKind } from "./conversation";

export interface CoachKnowledgeRequest {
  readonly question: string;
  readonly contextKind: CoachContextKind;
  readonly conceptTags?: readonly string[];
  readonly maxItems: number;
}

export interface CoachKnowledgeExcerpt {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly source: string;
  readonly tags: readonly string[];
}

export type CoachKnowledgeResult =
  | {
      readonly ok: true;
      readonly entries: readonly CoachKnowledgeExcerpt[];
    }
  | {
      readonly ok: false;
      readonly reason: "unavailable" | "failed";
      readonly message: string;
    };

export interface CoachKnowledgeRetriever {
  retrieve(request: CoachKnowledgeRequest): Promise<CoachKnowledgeResult>;
}

const normalizeExcerpt = (entry: CoachKnowledgeExcerpt): CoachKnowledgeExcerpt | null => {
  const id = entry.id.trim();
  const title = entry.title.trim();
  const text = entry.text.trim();
  const source = entry.source.trim();
  if (id.length === 0 || title.length === 0 || text.length === 0 || source.length === 0) {
    return null;
  }

  return {
    id,
    title,
    text,
    source,
    tags: entry.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
  };
};

export const createNoopCoachKnowledgeRetriever = (): CoachKnowledgeRetriever => {
  return {
    retrieve: async () => ({
      ok: true,
      entries: []
    })
  };
};

export const createFixtureCoachKnowledgeRetriever = (input: {
  entries: readonly CoachKnowledgeExcerpt[];
  mode?: "success" | "unavailable" | "failed";
}): CoachKnowledgeRetriever => {
  return {
    retrieve: async (request) => {
      const mode = input.mode ?? "success";
      if (mode === "unavailable") {
        return {
          ok: false,
          reason: "unavailable",
          message: "Fixture knowledge retriever unavailable."
        };
      }

      if (mode === "failed") {
        return {
          ok: false,
          reason: "failed",
          message: "Fixture knowledge retrieval failed."
        };
      }

      const bounded = input.entries.slice(0, Math.max(0, request.maxItems));
      const normalized = bounded
        .map((entry) => normalizeExcerpt(entry))
        .filter((entry): entry is CoachKnowledgeExcerpt => entry !== null);

      return {
        ok: true,
        entries: normalized
      };
    }
  };
};
