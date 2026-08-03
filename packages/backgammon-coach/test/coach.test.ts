import { describe, expect, it } from "vitest";
import {
  createGameState,
  createTurnRecord,
  type GameSnapshot,
  type TurnRecord
} from "@backgammon-trainer/backgammon-engine";
import { STANDARD_STARTING_POSITION } from "@backgammon-trainer/backgammon-domain";
import {
  analyzeLegalMoveOutcomes,
  evaluateLegalMoves,
  getMoveFingerprint
} from "@backgammon-trainer/backgammon-analysis";
import { createFixturePositionEvaluator } from "@backgammon-trainer/backgammon-analysis/fixture";

import {
  appendCoachCoachMessage,
  appendUserCoachMessage,
  buildCoachEvidence,
  buildCoachModelRequest,
  createCoachConversation,
  createFixtureCoachKnowledgeRetriever,
  createLocalCoachKnowledgeRetriever,
  createNoopCoachKnowledgeRetriever,
  deriveCurrentTurnContext,
  resolveCoachQuestionContext,
  submitCoachQuestion
} from "../src/index";
import { createFixtureChatModel } from "@backgammon-trainer/ai-contracts/fixture";

const NOW = "2026-08-03T12:00:00.000Z";

const buildSnapshot = (): GameSnapshot => ({
  savedAt: NOW,
  gameState: createGameState(STANDARD_STARTING_POSITION, "white"),
  turnHistory: [],
  openingState: {
    phase: "waiting",
    openingTurnPending: false
  }
});

const runtime = {
  counter: 0,
  createId() {
    this.counter += 1;
    return `id-${this.counter}`;
  },
  now() {
    return NOW;
  }
};

describe("coach conversation domain", () => {
  it("creates an empty conversation with explicit id and timestamp", () => {
    const conversation = createCoachConversation({ id: "conversation-1", createdAt: NOW });

    expect(conversation).toEqual({
      id: "conversation-1",
      createdAt: NOW,
      updatedAt: NOW,
      messages: []
    });
  });

  it("rejects empty user text and trims valid text", () => {
    const conversation = createCoachConversation({ id: "conversation-1", createdAt: NOW });

    const rejected = appendUserCoachMessage({
      conversation,
      id: "message-1",
      createdAt: NOW,
      text: "   ",
      contextReference: {
        kind: "current-position",
        gameReference: "game-1"
      }
    });

    expect(rejected.ok).toBe(false);

    const appended = appendUserCoachMessage({
      conversation,
      id: "message-2",
      createdAt: NOW,
      text: "  Why not 13/8?  ",
      contextReference: {
        kind: "current-position",
        gameReference: "game-1"
      }
    });

    expect(appended.ok).toBe(true);
    if (!appended.ok) {
      return;
    }

    expect(appended.message.text).toBe("Why not 13/8?");
  });

  it("appends user and coach messages immutably and preserves order", () => {
    const conversation = createCoachConversation({ id: "conversation-1", createdAt: NOW });
    const first = appendUserCoachMessage({
      conversation,
      id: "message-1",
      createdAt: NOW,
      text: "Question",
      contextReference: { kind: "current-position", gameReference: "game-1" }
    });

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const second = appendCoachCoachMessage({
      conversation: first.conversation,
      id: "message-2",
      createdAt: NOW,
      text: "Answer"
    });

    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }

    expect(conversation.messages).toHaveLength(0);
    expect(second.conversation.messages.map((message) => message.id)).toEqual([
      "message-1",
      "message-2"
    ]);
  });

  it("rejects duplicate ids and invalid timestamps", () => {
    const conversation = createCoachConversation({ id: "conversation-1", createdAt: NOW });
    const first = appendUserCoachMessage({
      conversation,
      id: "message-1",
      createdAt: NOW,
      text: "Question",
      contextReference: { kind: "current-position", gameReference: "game-1" }
    });

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const duplicate = appendCoachCoachMessage({
      conversation: first.conversation,
      id: "message-1",
      createdAt: NOW,
      text: "Answer"
    });
    expect(duplicate).toMatchObject({ ok: false, reason: "duplicate-message-id" });

    const badTimestamp = appendCoachCoachMessage({
      conversation: first.conversation,
      id: "message-2",
      createdAt: "not-a-time",
      text: "Answer"
    });
    expect(badTimestamp).toMatchObject({ ok: false, reason: "invalid-timestamp" });
  });

  it("is deterministic and json-safe for equivalent inputs", () => {
    const conversationA = createCoachConversation({ id: "conversation-1", createdAt: NOW });
    const appendedA = appendUserCoachMessage({
      conversation: conversationA,
      id: "message-1",
      createdAt: NOW,
      text: "Question",
      contextReference: { kind: "current-position", gameReference: "game-1" }
    });

    const conversationB = createCoachConversation({ id: "conversation-1", createdAt: NOW });
    const appendedB = appendUserCoachMessage({
      conversation: conversationB,
      id: "message-1",
      createdAt: NOW,
      text: "Question",
      contextReference: { kind: "current-position", gameReference: "game-1" }
    });

    expect(appendedA).toEqual(appendedB);
    expect(() => JSON.stringify(appendedA)).not.toThrow();
  });
});

describe("coach context resolution", () => {
  it("resolves current-position when no explicit selection exists", () => {
    const snapshot = buildSnapshot();
    const result = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot,
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: null
    });

    expect(result.kind).toBe("current-position");
  });

  it("resolves move-outcome before history and current context", () => {
    const snapshot = buildSnapshot();
    const legal = analyzeLegalMoveOutcomes(snapshot.gameState.position, "white", { dice: [1, 2] });
    expect(legal.ok).toBe(true);
    if (!legal.ok) {
      return;
    }

    const outcome = legal.analysis.outcomes[0]!;
    const result = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot,
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: legal,
      selectedMoveOutcome: {
        moveFingerprint: getMoveFingerprint(outcome.move),
        outcome
      },
      selectedHistoryTurn: {
        turnRecord: createTurnRecord({
          turnNumber: 1,
          player: "white",
          dice: { dice: [1, 2] },
          outcome: { kind: "pass" },
          positionBefore: snapshot.gameState.position,
          positionAfter: snapshot.gameState.position,
          gameStatusAfter: { state: "in-progress" },
          phase: "opening"
        })
      }
    });

    expect(result.kind).toBe("move-outcome");
  });

  it("resolves history-turn before current-position", () => {
    const snapshot = buildSnapshot();
    const turnRecord = createTurnRecord({
      turnNumber: 3,
      player: "white",
      dice: { dice: [1, 2] },
      outcome: { kind: "pass" },
      positionBefore: snapshot.gameState.position,
      positionAfter: snapshot.gameState.position,
      gameStatusAfter: { state: "in-progress" },
      phase: "normal"
    });

    const result = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot,
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: null,
      selectedHistoryTurn: { turnRecord }
    });

    expect(result.kind).toBe("history-turn");
    if (result.kind !== "history-turn") {
      return;
    }
    expect(result.turnNumber).toBe(3);
  });

  it("resolves completed game context when no narrower selection exists", () => {
    const snapshot = buildSnapshot();
    const result = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot,
      openingResolved: true,
      gameComplete: true,
      legalMoveOutcomesResult: null
    });

    expect(result.kind).toBe("game-review");
  });

  it("derives explicit current-turn statuses deterministically", () => {
    const opening = deriveCurrentTurnContext({
      openingResolved: false,
      gameComplete: false,
      activePlayer: "white",
      dice: null,
      legalMoveOutcomesResult: null
    });
    expect(opening.status).toBe("opening-unresolved");

    const waiting = deriveCurrentTurnContext({
      openingResolved: true,
      gameComplete: false,
      activePlayer: "white",
      dice: null,
      legalMoveOutcomesResult: null
    });
    expect(waiting.status).toBe("waiting-for-dice");

    const noMove = deriveCurrentTurnContext({
      openingResolved: true,
      gameComplete: false,
      activePlayer: "white",
      dice: { dice: [1, 2] },
      legalMoveOutcomesResult: {
        ok: true,
        analysis: {
          player: "white",
          dice: { dice: [1, 2] },
          positionBefore: {
            white: {
              checkersOnBoard: 0,
              checkersOnBar: 0,
              checkersBorneOff: 0,
              totalCheckersAccountedFor: 0,
              pipCount: 0,
              blotCount: 0,
              blotPoints: [],
              madePointCount: 0,
              madePoints: [],
              madeHomeBoardPointCount: 0,
              madeHomeBoardPoints: [],
              occupiedPointCount: 0,
              occupiedPoints: [],
              checkersInHomeBoard: 0,
              checkersOutsideHomeBoard: 0
            },
            black: {
              checkersOnBoard: 0,
              checkersOnBar: 0,
              checkersBorneOff: 0,
              totalCheckersAccountedFor: 0,
              pipCount: 0,
              blotCount: 0,
              blotPoints: [],
              madePointCount: 0,
              madePoints: [],
              madeHomeBoardPointCount: 0,
              madeHomeBoardPoints: [],
              occupiedPointCount: 0,
              occupiedPoints: [],
              checkersInHomeBoard: 0,
              checkersOutsideHomeBoard: 0
            },
            relationship: {
              pipCountDifferenceWhiteMinusBlack: 0,
              absolutePipCountDifference: 0,
              pipCountLeader: "tied",
              contactStatus: "race"
            }
          },
          outcomes: []
        }
      }
    });
    expect(noMove.status).toBe("no-legal-move");

    const complete = deriveCurrentTurnContext({
      openingResolved: true,
      gameComplete: true,
      activePlayer: "white",
      dice: null,
      legalMoveOutcomesResult: null
    });
    expect(complete.status).toBe("game-complete");
  });
});

describe("coach evidence and prompt", () => {
  it("builds factual evidence with canonical fingerprints and bounded move rows", async () => {
    const snapshot = buildSnapshot();
    const legal = analyzeLegalMoveOutcomes(snapshot.gameState.position, "white", { dice: [1, 2] });
    expect(legal.ok).toBe(true);
    if (!legal.ok) {
      return;
    }

    const ranked = await evaluateLegalMoves(
      {
        position: snapshot.gameState.position,
        player: "white",
        dice: { dice: [1, 2] }
      },
      createFixturePositionEvaluator({ mode: "complete" })
    );

    const context = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot: {
        ...snapshot,
        gameState: {
          ...snapshot.gameState,
          dice: { dice: [1, 2] }
        }
      },
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: legal,
      ...(ranked.ok ? { rankedAnalysis: ranked.analysis } : {})
    });

    expect(context.kind).toBe("current-position");
    if (context.kind !== "current-position") {
      return;
    }

    const conversation = createCoachConversation({ id: "conversation-1", createdAt: NOW });

    const evidence = buildCoachEvidence({
      question: "What are the options?",
      context,
      conversation,
      limits: { maxLegalMoves: 2 }
    });

    expect(evidence.evidence.positionFacts).toBeDefined();
    expect(evidence.evidence.legalMoveEvidence?.length).toBe(2);
    expect(
      evidence.evidence.warnings.some((warning) => warning.code === "move-evidence-truncated")
    ).toBe(true);
    expect(() => JSON.stringify(evidence.evidence)).not.toThrow();
  });

  it("derives authoritative recommendation support only for complete non-fixture coverage", async () => {
    const snapshot = buildSnapshot();
    const legal = analyzeLegalMoveOutcomes(snapshot.gameState.position, "white", { dice: [1, 2] });
    expect(legal.ok).toBe(true);
    if (!legal.ok) {
      return;
    }

    const ranked = await evaluateLegalMoves(
      {
        position: snapshot.gameState.position,
        player: "white",
        dice: { dice: [1, 2] }
      },
      createFixturePositionEvaluator({ mode: "complete" })
    );
    expect(ranked.ok).toBe(true);
    if (!ranked.ok || ranked.analysis.kind !== "evaluated") {
      return;
    }

    const trustedRankedAnalysis = {
      ...ranked.analysis,
      provenance: {
        ...ranked.analysis.provenance,
        provider: "trusted-evaluator"
      }
    };

    const context = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot: {
        ...snapshot,
        gameState: {
          ...snapshot.gameState,
          dice: { dice: [1, 2] }
        }
      },
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: legal,
      rankedAnalysis: trustedRankedAnalysis
    });

    expect(context.kind).toBe("current-position");
    if (context.kind !== "current-position") {
      return;
    }

    const evidence = buildCoachEvidence({
      question: "What should I do?",
      context,
      conversation: createCoachConversation({ id: "conversation-1", createdAt: NOW })
    });

    expect(evidence.evidence.recommendationSupport?.status).toBe("supported");
    expect(evidence.evidence.recommendationSupport?.reason).toBe("complete-trustworthy-coverage");
    expect(evidence.evidence.recommendationSupport?.supportedRecommendation?.kind).toBe(
      "authoritative"
    );
  });

  it("derives strongest-evaluated recommendation support for partial trusted coverage", async () => {
    const snapshot = buildSnapshot();
    const legal = analyzeLegalMoveOutcomes(snapshot.gameState.position, "white", { dice: [1, 2] });
    expect(legal.ok).toBe(true);
    if (!legal.ok) {
      return;
    }

    const ranked = await evaluateLegalMoves(
      {
        position: snapshot.gameState.position,
        player: "white",
        dice: { dice: [1, 2] }
      },
      createFixturePositionEvaluator({ mode: "partial" })
    );
    expect(ranked.ok).toBe(true);
    if (!ranked.ok || ranked.analysis.kind !== "evaluated") {
      return;
    }

    const trustedRankedAnalysis = {
      ...ranked.analysis,
      provenance: {
        ...ranked.analysis.provenance,
        provider: "trusted-evaluator"
      }
    };

    const context = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot: {
        ...snapshot,
        gameState: {
          ...snapshot.gameState,
          dice: { dice: [1, 2] }
        }
      },
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: legal,
      rankedAnalysis: trustedRankedAnalysis
    });

    expect(context.kind).toBe("current-position");
    if (context.kind !== "current-position") {
      return;
    }

    const evidence = buildCoachEvidence({
      question: "What is strongest among these?",
      context,
      conversation: createCoachConversation({ id: "conversation-1", createdAt: NOW })
    });

    expect(evidence.evidence.recommendationSupport?.status).toBe("supported");
    expect(evidence.evidence.recommendationSupport?.reason).toBe("partial-coverage");
    expect(evidence.evidence.recommendationSupport?.supportedRecommendation?.kind).toBe(
      "strongest-evaluated"
    );
  });

  it("blocks authoritative recommendation support for fixture evaluator provenance", async () => {
    const snapshot = buildSnapshot();
    const legal = analyzeLegalMoveOutcomes(snapshot.gameState.position, "white", { dice: [1, 2] });
    expect(legal.ok).toBe(true);
    if (!legal.ok) {
      return;
    }

    const ranked = await evaluateLegalMoves(
      {
        position: snapshot.gameState.position,
        player: "white",
        dice: { dice: [1, 2] }
      },
      createFixturePositionEvaluator({ mode: "complete" })
    );
    expect(ranked.ok).toBe(true);
    if (!ranked.ok) {
      return;
    }

    const context = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot: {
        ...snapshot,
        gameState: {
          ...snapshot.gameState,
          dice: { dice: [1, 2] }
        }
      },
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: legal,
      rankedAnalysis: ranked.analysis
    });

    expect(context.kind).toBe("current-position");
    if (context.kind !== "current-position") {
      return;
    }

    const evidence = buildCoachEvidence({
      question: "Best move?",
      context,
      conversation: createCoachConversation({ id: "conversation-1", createdAt: NOW })
    });

    expect(evidence.evidence.recommendationSupport).toEqual({
      status: "not-supported",
      reason: "fixture-evaluator"
    });
  });

  it("selects a clearly referenced legal move and records coverage details", () => {
    const snapshot = buildSnapshot();
    const legal = analyzeLegalMoveOutcomes(snapshot.gameState.position, "white", { dice: [1, 2] });
    expect(legal.ok).toBe(true);
    if (!legal.ok) {
      return;
    }

    const referencedOutcome = legal.analysis.outcomes[0];
    expect(referencedOutcome).toBeDefined();
    if (referencedOutcome === undefined) {
      return;
    }

    const question = `Why not ${referencedOutcome.move.steps.map((step) => `${step.fromPoint}/${step.toPoint}`).join(", ")}?`;
    const context = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot: {
        ...snapshot,
        gameState: {
          ...snapshot.gameState,
          dice: { dice: [1, 2] }
        }
      },
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: legal
    });

    expect(context.kind).toBe("current-position");
    if (context.kind !== "current-position") {
      return;
    }

    const result = buildCoachEvidence({
      question,
      context,
      conversation: createCoachConversation({ id: "conversation-1", createdAt: NOW })
    });

    expect(result.evidence.legalMoveSelection?.totalLegalMoves).toBe(
      legal.analysis.outcomes.length
    );
    expect(result.evidence.legalMoveSelection?.questionMoveReferences[0]).toMatchObject({
      resolution: "clear"
    });
    expect(
      result.evidence.legalMoveEvidence?.[0]?.selectionReasons.some(
        (reason) => reason.code === "question-reference-clear"
      )
    ).toBe(true);
  });

  it("builds historical evidence with warning for missing analysis", () => {
    const snapshot = buildSnapshot();
    const turnRecord: TurnRecord = createTurnRecord({
      turnNumber: 1,
      player: "white",
      dice: { dice: [1, 2] },
      outcome: { kind: "pass" },
      positionBefore: snapshot.gameState.position,
      positionAfter: snapshot.gameState.position,
      gameStatusAfter: { state: "in-progress" },
      phase: "opening"
    });

    const context = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot,
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: null,
      selectedHistoryTurn: { turnRecord }
    });

    expect(context.kind).toBe("history-turn");
    if (context.kind !== "history-turn") {
      return;
    }

    const evidence = buildCoachEvidence({
      question: "What happened?",
      context,
      conversation: createCoachConversation({ id: "conversation-1", createdAt: NOW })
    });

    expect(evidence.evidence.committedTurnEvidence?.turnNumber).toBe(1);
    expect(evidence.warnings.some((warning) => warning.code === "missing-history-analysis")).toBe(
      true
    );
  });

  it("builds deterministic provider-neutral prompt with bounded history", () => {
    const snapshot = buildSnapshot();
    const context = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot,
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: null
    });

    const conversation = createCoachConversation({ id: "conversation-1", createdAt: NOW });
    const first = appendUserCoachMessage({
      conversation,
      id: "m1",
      createdAt: NOW,
      text: "question one",
      contextReference: {
        kind: "current-position",
        gameReference: "game-1"
      }
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const request = buildCoachModelRequest(
      {
        requestId: "request-1",
        conversationId: "conversation-1",
        userMessageId: "m1",
        question: "question one",
        context,
        conversation: first.conversation,
        evidence: buildCoachEvidence({
          question: "question one",
          context,
          conversation: first.conversation
        }).evidence,
        knowledge: [
          {
            id: "k1",
            title: "Anchor",
            summary: "Anchor summary",
            text: "Use context evidence only",
            source: "fixture",
            track: "making-points",
            concepts: ["anchors"],
            selectionReasons: [{ kind: "concept", value: "anchors" }],
            provenance: {
              kind: "project-authored",
              label: "fixture"
            }
          }
        ],
        responsePreferences: {
          explanationLevel: "beginner",
          verbosity: "normal"
        }
      },
      {
        maxConversationMessages: 1,
        maxKnowledgeEntries: 1,
        maxMessageChars: 20
      }
    );

    expect(request.messages).toHaveLength(1);
    expect(request.systemInstruction).toContain("Do not invent legal moves");
    expect(JSON.stringify(request)).toContain("curatedKnowledge");
    expect(JSON.stringify(request)).not.toContain("apiKey");
  });

  it("instructs the model not to claim strongest move when evaluator evidence is missing", () => {
    const snapshot = buildSnapshot();
    const decisionSnapshot = {
      ...snapshot,
      gameState: {
        ...snapshot.gameState,
        dice: { dice: [1, 2] as const }
      }
    };
    const context = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot: decisionSnapshot,
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: analyzeLegalMoveOutcomes(snapshot.gameState.position, "white", {
        dice: [1, 2]
      })
    });

    const conversation = createCoachConversation({ id: "conversation-1", createdAt: NOW });
    const request = buildCoachModelRequest({
      requestId: "request-2",
      conversationId: "conversation-1",
      userMessageId: "m2",
      question: "What should I do?",
      context,
      conversation,
      evidence: buildCoachEvidence({
        question: "What should I do?",
        context,
        conversation
      }).evidence,
      knowledge: [],
      responsePreferences: {
        explanationLevel: "beginner",
        verbosity: "normal"
      }
    });

    const developerInstructions = request.developerInstructions ?? [];

    expect(
      developerInstructions.some((instruction) =>
        instruction.includes("No trustworthy evaluator ranking is available")
      )
    ).toBe(true);
  });
});

describe("coach knowledge and orchestration", () => {
  it("noop retriever returns no entries", async () => {
    const retriever = createNoopCoachKnowledgeRetriever();
    const result = await retriever.retrieve({
      question: "q",
      contextKind: "current-position",
      maxItems: 3
    });

    expect(result).toEqual({ ok: true, entries: [] });
  });

  it("fixture retriever is deterministic and bounded", async () => {
    const retriever = createFixtureCoachKnowledgeRetriever({
      entries: [
        {
          id: "k1",
          title: "A",
          summary: "A summary",
          text: "T",
          source: "fixture",
          track: "general",
          concepts: [],
          selectionReasons: [],
          provenance: {
            kind: "project-authored",
            label: "fixture"
          }
        },
        {
          id: "k2",
          title: "B",
          summary: "B summary",
          text: "T",
          source: "fixture",
          track: "general",
          concepts: [],
          selectionReasons: [],
          provenance: {
            kind: "project-authored",
            label: "fixture"
          }
        }
      ]
    });

    const first = await retriever.retrieve({
      question: "q",
      contextKind: "current-position",
      maxItems: 1
    });
    const second = await retriever.retrieve({
      question: "q",
      contextKind: "current-position",
      maxItems: 1
    });

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    expect(first.entries).toHaveLength(1);
  });

  it("local retriever returns project-authored knowledge with reasons", async () => {
    const retriever = createLocalCoachKnowledgeRetriever();
    const result = await retriever.retrieve({
      question: "Should I be thinking about hitting here?",
      contextKind: "current-position",
      concepts: ["hits", "contact"],
      maxItems: 2
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.entries[0]?.id).toBe("kg.blots-hits-and-tempo");
    const firstEntry = result.entries[0];
    expect(firstEntry).toBeDefined();
    if (firstEntry === undefined) {
      return;
    }

    expect(firstEntry.provenance?.kind).toBe("project-authored");
    expect(firstEntry.selectionReasons?.length ?? 0).toBeGreaterThan(0);
  });

  it("submits through model and preserves immutable conversation state", async () => {
    const snapshot = buildSnapshot();
    const context = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot,
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: null
    });

    const conversation = createCoachConversation({ id: "conversation-1", createdAt: NOW });
    const result = await submitCoachQuestion({
      model: createFixtureChatModel(),
      knowledgeRetriever: createNoopCoachKnowledgeRetriever(),
      runtime,
      conversation,
      question: "What should I think about here?",
      context,
      pending: false
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(conversation.messages).toHaveLength(0);
    expect(result.conversation.messages).toHaveLength(2);
  });

  it("allows request construction even when knowledge retrieval fails", async () => {
    const snapshot = buildSnapshot();
    const context = resolveCoachQuestionContext({
      gameReference: "game-1",
      snapshot,
      openingResolved: true,
      gameComplete: false,
      legalMoveOutcomesResult: null
    });

    const failingRetriever = createFixtureCoachKnowledgeRetriever({
      entries: [],
      mode: "failed"
    });

    const result = await submitCoachQuestion({
      model: createFixtureChatModel(),
      knowledgeRetriever: failingRetriever,
      runtime,
      conversation: createCoachConversation({ id: "conversation-1", createdAt: NOW }),
      question: "Explain this position",
      context,
      pending: false
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.knowledgeWarning).toContain("failed");
  });
});
