import { describe, expect, it } from "vitest";

import {
  backgammonKnowledgeCorpus,
  searchBackgammonKnowledge,
  validateBackgammonKnowledgeCorpus
} from "../src/index";

describe("backgammon knowledge corpus", () => {
  it("validates the generated beginner corpus", () => {
    const result = validateBackgammonKnowledgeCorpus(backgammonKnowledgeCorpus);

    expect(result).toEqual({
      ok: true,
      issues: []
    });
  });

  it("retrieves relevant knowledge deterministically from question and concepts", () => {
    const results = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "Should I be thinking about hitting here?",
      contextKind: "current-position",
      concepts: ["hits", "contact"],
      maxEntries: 3
    });

    expect(results.map((match) => match.entry.id)).toEqual([
      "kg.blots-hits-and-tempo",
      "kg.bar-entry-and-inner-board",
      "kg.board-vision-first-look"
    ]);
    expect(results[0]?.reasons.some((reason) => reason.kind === "concept")).toBe(true);
  });

  it("allows no-match results instead of filler entries", () => {
    const results = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "tell me about doubling cube take points",
      contextKind: "current-position",
      concepts: [],
      maxEntries: 4
    });

    expect(results).toEqual([]);
  });
});
