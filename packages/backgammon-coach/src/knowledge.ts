import {
  backgammonKnowledgeCorpus,
  searchBackgammonKnowledge,
  type BackgammonKnowledgeConcept,
  type BackgammonKnowledgeMatchReason
} from "@backgammon-trainer/backgammon-knowledge";

import type { CoachContextKind } from "./conversation";

export interface CoachKnowledgeRequest {
  readonly question: string;
  readonly contextKind: CoachContextKind;
  readonly concepts?: readonly BackgammonKnowledgeConcept[];
  readonly maxItems: number;
}

export interface CoachKnowledgeSelectionReason {
  readonly kind: "context" | "concept" | "alias" | "keyword";
  readonly value: string;
}

export interface CoachKnowledgeProvenance {
  readonly kind: string;
  readonly label: string;
}

export interface CoachKnowledgeExcerpt {
  readonly id: string;
  readonly title: string;
  readonly summary?: string;
  readonly text: string;
  readonly source: string;
  readonly track?: string;
  readonly concepts?: readonly string[];
  readonly selectionReasons?: readonly CoachKnowledgeSelectionReason[];
  readonly provenance?: CoachKnowledgeProvenance;
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
  const summary = (entry.summary ?? text.slice(0, 160)).trim();
  if (
    id.length === 0 ||
    title.length === 0 ||
    summary.length === 0 ||
    text.length === 0 ||
    source.length === 0
  ) {
    return null;
  }

  return {
    id,
    title,
    summary,
    text,
    source,
    track: entry.track?.trim() ?? "general",
    concepts: (entry.concepts ?? [])
      .map((concept) => concept.trim())
      .filter((concept) => concept.length > 0),
    selectionReasons: (entry.selectionReasons ?? []).map((reason) => ({
      kind: reason.kind,
      value: reason.value.trim()
    })),
    provenance: {
      kind: entry.provenance?.kind.trim() ?? "project-authored",
      label: entry.provenance?.label.trim() ?? source
    }
  };
};

const toSelectionReasons = (
  reasons: readonly BackgammonKnowledgeMatchReason[]
): readonly CoachKnowledgeSelectionReason[] => {
  return reasons.map((reason) => ({
    kind: reason.kind,
    value: reason.value
  }));
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

export const createLocalCoachKnowledgeRetriever = (): CoachKnowledgeRetriever => {
  return {
    retrieve: async (request) => {
      const matches = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
        question: request.question,
        contextKind: request.contextKind,
        ...(request.concepts === undefined ? {} : { concepts: request.concepts }),
        maxEntries: request.maxItems
      });

      return {
        ok: true,
        entries: matches.map((match) => ({
          id: match.entry.id,
          title: match.entry.title,
          summary: match.entry.summary,
          text: match.entry.body,
          source: match.entry.provenance.label,
          track: match.entry.track,
          concepts: [...match.entry.concepts],
          selectionReasons: toSelectionReasons(match.reasons),
          provenance: {
            kind: match.entry.provenance.kind,
            label: match.entry.provenance.label
          }
        }))
      };
    }
  };
};
