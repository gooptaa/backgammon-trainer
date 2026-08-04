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
      "kg.blitz-holding-and-backgame-plans",
      "kg.glossary-core-terms"
    ]);
    expect(results[0]?.reasons.some((reason) => reason.kind === "concept")).toBe(true);
  });

  it("does not include documentation README as runtime corpus content", () => {
    expect(
      backgammonKnowledgeCorpus.entries.some((entry) => entry.id.toLowerCase().includes("readme"))
    ).toBe(false);
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

  it("favors glossary entry for direct definition questions", () => {
    const results = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "What is an anchor?",
      contextKind: "current-position",
      concepts: ["anchors"],
      preferredTracks: ["board-vision"],
      intent: "definition",
      queryTerms: ["anchor"],
      maxEntries: 2
    });

    expect(results[0]?.entry.id).toBe("kg.glossary-core-terms");
  });

  it("favors point-making guidance for point-making questions", () => {
    const results = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "Should I make a point or run?",
      contextKind: "current-position",
      concepts: ["made-points", "anchors"],
      preferredTracks: ["making-points"],
      queryTerms: ["make", "point", "run"],
      maxEntries: 3
    });

    expect(results[0]?.entry.id).toBe("kg.making-points-and-anchors");
  });

  it("favors race guidance for race questions", () => {
    const results = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "How should I think about this race and pip count?",
      contextKind: "current-position",
      concepts: ["race"],
      preferredTracks: ["game-plan-recognition"],
      queryTerms: ["race", "pip", "count"],
      maxEntries: 3
    });

    expect(results[0]?.entry.id).toBe("kg.pip-count-and-race-context");
  });

  it("favors bearing-off guidance for bearing-off questions", () => {
    const results = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "How should I bear off safely here?",
      contextKind: "current-position",
      concepts: ["bearing-off", "risk"],
      preferredTracks: ["game-plan-recognition"],
      queryTerms: ["bear", "off", "safely"],
      maxEntries: 3
    });

    expect(results[0]?.entry.id).toBe("kg.bearing-off-basics");
  });

  it("favors opening and priming entries for topic-specific questions", () => {
    const openingResults = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "What are opening principles I should follow?",
      contextKind: "current-position",
      concepts: ["game-plan"],
      preferredTracks: ["game-plan-recognition"],
      queryTerms: ["opening", "principles"],
      maxEntries: 2
    });

    const primingResults = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "How do prime battles change my move choice?",
      contextKind: "current-position",
      concepts: ["structure", "game-plan"],
      preferredTracks: ["game-plan-recognition"],
      queryTerms: ["prime", "battles"],
      maxEntries: 2
    });

    expect(openingResults[0]?.entry.id).toBe("kg.opening-principles-first");
    expect(primingResults[0]?.entry.id).toBe("kg.priming-and-prime-battles");
  });

  it("does not let broad coaching snippets outrank specific strategy by default", () => {
    const results = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "Why was blot exposure a mistake in this move review?",
      contextKind: "history-turn",
      concepts: ["blots", "safety", "move-review"],
      preferredTracks: ["hitting-tempo", "safety-risk"],
      queryTerms: ["blot", "exposure", "mistake"],
      maxEntries: 4
    });

    expect(results[0]?.entry.id).toBe("kg.blots-hits-and-tempo");
    expect(results[0]?.entry.id).not.toBe("kg.reusable-coaching-snippets");
  });

  it("prefers point-making strategy over move-review templates for point-value follow-ups", () => {
    const results = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "Why is the 3-point valuable?",
      contextKind: "history-turn",
      concepts: ["made-points", "inner-board", "bar-entry"],
      preferredTracks: ["making-points", "safety-risk"],
      queryTerms: ["3", "point", "valuable"],
      intent: "strategic-concept-explanation",
      maxEntries: 4
    });

    expect(results[0]?.entry.id).toBe("kg.making-points-and-anchors");
    expect(results[0]?.entry.track).not.toBe("move-review");
  });

  it("prefers move-review material for explicit candidate comparisons", () => {
    const results = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "Why was that better than 1/4, 12/17?",
      contextKind: "history-turn",
      concepts: ["candidate-comparison", "move-review", "risk"],
      preferredTracks: ["move-review", "safety-risk"],
      queryTerms: ["better", "than", "1/4", "12/17"],
      intent: "candidate-comparison",
      maxEntries: 4
    });

    expect(results[0]?.entry.track).toBe("move-review");
  });

  it("keeps legality requests board-vision focused", () => {
    const results = searchBackgammonKnowledge(backgammonKnowledgeCorpus, {
      question: "Can I move the same checker twice?",
      contextKind: "current-position",
      concepts: ["legal-moves", "dice-use"],
      preferredTracks: ["board-vision"],
      queryTerms: ["move", "same", "checker", "twice"],
      intent: "rules-legality",
      maxEntries: 3
    });

    expect(results[0]?.entry.track).toBe("board-vision");
  });
});
