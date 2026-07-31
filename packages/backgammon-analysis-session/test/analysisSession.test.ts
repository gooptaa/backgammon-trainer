import { describe, expect, it } from "vitest";
import {
  ANALYSIS_SESSION_FORMAT,
  ANALYSIS_SESSION_VERSION,
  decodeAnalysisSession,
  encodeAnalysisSession,
  parseAnalysisSession,
  serializeAnalysisSession,
  summarizeAnalysisSession,
  type AnalysisSession
} from "../src/index";
import {
  analyzeLegalMoveOutcomes,
  getMoveFingerprint
} from "@backgammon-trainer/backgammon-analysis";

type Position = Parameters<typeof analyzeLegalMoveOutcomes>[0];

const createEmptyPoints = (): Position["points"] => ({
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
  7: null,
  8: null,
  9: null,
  10: null,
  11: null,
  12: null,
  13: null,
  14: null,
  15: null,
  16: null,
  17: null,
  18: null,
  19: null,
  20: null,
  21: null,
  22: null,
  23: null,
  24: null
});

const createPosition = (input?: {
  points?: Partial<Position["points"]>;
  bar?: Partial<Position["bar"]>;
  borneOff?: Partial<Position["borneOff"]>;
}): Position => ({
  points: {
    ...createEmptyPoints(),
    ...(input?.points ?? {})
  },
  bar: {
    white: 0,
    black: 0,
    ...(input?.bar ?? {})
  },
  borneOff: {
    white: 0,
    black: 0,
    ...(input?.borneOff ?? {})
  }
});

const DICE = { dice: [1, 2] } as const;

const PLAYABLE_POSITION = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 14,
    black: 14
  }
});

const createValidSession = (): AnalysisSession => {
  const outcomeResult = analyzeLegalMoveOutcomes(PLAYABLE_POSITION, "white", DICE);
  if (!outcomeResult.ok) {
    throw new Error("Expected legal move outcomes for fixture session.");
  }

  const factualOutcomes = outcomeResult.analysis.outcomes;
  const rankedMoves = factualOutcomes
    .map((outcome, index) => ({
      rank: index + 1,
      normalizedScore: 10 - index,
      lossFromBest: index,
      moveFingerprint: getMoveFingerprint(outcome.move),
      providerRank: index + 1,
      outcome
    }))
    .sort((left, right) => {
      if (left.normalizedScore !== right.normalizedScore) {
        return right.normalizedScore - left.normalizedScore;
      }
      return left.moveFingerprint.localeCompare(right.moveFingerprint);
    })
    .map((row, index, rows) => ({
      ...row,
      rank:
        index === 0 || rows[index - 1]!.normalizedScore !== row.normalizedScore
          ? index === 0
            ? 1
            : rows[index - 1]!.rank + 1
          : rows[index - 1]!.rank,
      lossFromBest: rows[0]!.normalizedScore - row.normalizedScore
    }));

  const rankedAnalysis = {
    kind: "evaluated" as const,
    player: "white" as const,
    dice: DICE,
    positionBefore: outcomeResult.analysis.positionBefore,
    factualOutcomes,
    scoreScale: { kind: "relative" as const },
    provenance: {
      provider: "fixture",
      providerVersion: "1.0.0",
      adapterVersion: "adapter-1",
      settings: {
        profile: "deterministic"
      }
    },
    coverage: "complete" as const,
    rankedMoves,
    unevaluatedMoves: [],
    warnings: []
  };

  return {
    sessionId: "session-001",
    format: ANALYSIS_SESSION_FORMAT,
    version: ANALYSIS_SESSION_VERSION,
    createdAt: "2026-07-31T07:14:00.000Z",
    updatedAt: "2026-07-31T07:30:00.000Z",
    metadata: {
      analysisFormat: "ranked-legal-move-analysis",
      analysisVersion: 1,
      generatorVersion: "analysis-session-generator/0.1.0",
      evaluatorProvider: "fixture",
      evaluatorVersion: "1.0.0",
      scoreScale: { kind: "relative" },
      createdAt: "2026-07-31T07:14:00.000Z"
    },
    gameSnapshotReference: {
      snapshotFormat: "backgammon-trainer-game",
      snapshotVersion: 1,
      savedAt: "2026-07-31T07:13:00.000Z"
    },
    records: [
      {
        turnNumber: 1,
        player: "white",
        positionHash: "sha256:turn1",
        snapshotReference: {
          turnNumber: 1,
          position: "before-turn"
        },
        evaluatorProvenance: {
          provider: "fixture",
          providerVersion: "1.0.0",
          adapterVersion: "adapter-1",
          settings: {
            profile: "deterministic"
          }
        },
        rankedMoveAnalysis: rankedAnalysis,
        chosenMove: rankedMoves[0]!.outcome.move,
        annotations: ["opening rollout excluded"],
        tags: ["opening", "benchmark"]
      }
    ]
  };
};

describe("analysis session serialization", () => {
  it("round-trips valid sessions through serialize/parse and encode/decode", () => {
    const session = createValidSession();

    const serialized = serializeAnalysisSession(session);
    const parsed = parseAnalysisSession(serialized);
    const decoded = decodeAnalysisSession(encodeAnalysisSession(session));

    expect(parsed.ok).toBe(true);
    expect(decoded.ok).toBe(true);

    if (!parsed.ok || !decoded.ok) {
      return;
    }

    expect(parsed.session).toEqual(session);
    expect(decoded.session).toEqual(session);
  });

  it("rejects unsupported versions", () => {
    const session = createValidSession();
    const serialized = serializeAnalysisSession(session) as unknown as { version: number };
    serialized.version = ANALYSIS_SESSION_VERSION + 1;

    const parsed = parseAnalysisSession(serialized);

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("unsupported-version");
    }
  });

  it("rejects malformed envelopes", () => {
    const session = createValidSession();
    const serialized = serializeAnalysisSession(session) as unknown as { format: string };
    serialized.format = "wrong-format";

    const parsed = parseAnalysisSession(serialized);

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("wrong-format");
    }
  });

  it("rejects duplicate turn numbers", () => {
    const session = createValidSession();
    const serialized = serializeAnalysisSession(session) as unknown as {
      records: Array<{ turnNumber: number; positionHash: string }>;
    };

    serialized.records = [
      serialized.records[0]!,
      {
        ...serialized.records[0]!,
        positionHash: "sha256:turn2"
      }
    ];

    const parsed = parseAnalysisSession(serialized);

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("invalid-domain-state");
      expect(parsed.message).toContain("contiguous turn numbers");
    }
  });

  it("rejects out-of-order records", () => {
    const session = createValidSession();
    const serialized = serializeAnalysisSession(session) as unknown as {
      records: Array<{ turnNumber: number; positionHash: string }>;
    };

    serialized.records = [
      {
        ...serialized.records[0]!,
        turnNumber: 2,
        positionHash: "sha256:turn2"
      },
      {
        ...serialized.records[0]!,
        turnNumber: 1,
        positionHash: "sha256:turn1"
      }
    ];

    const parsed = parseAnalysisSession(serialized);

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("invalid-domain-state");
      expect(parsed.message).toContain("contiguous turn numbers");
    }
  });

  it("rejects invalid metadata", () => {
    const session = createValidSession();
    const serialized = serializeAnalysisSession(session) as unknown as {
      metadata: { evaluatorVersion: string };
    };

    serialized.metadata = {
      ...serialized.metadata,
      evaluatorVersion: ""
    };

    const parsed = parseAnalysisSession(serialized);

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("invalid-domain-state");
      expect(parsed.message).toContain("metadata.evaluatorVersion");
    }
  });

  it("preserves evaluator provenance and evaluator output fields", () => {
    const session = createValidSession();
    const parsed = parseAnalysisSession(serializeAnalysisSession(session));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const record = parsed.session.records[0]!;
    expect(record.evaluatorProvenance).toEqual(session.records[0]!.evaluatorProvenance);
    expect(record.rankedMoveAnalysis.kind).toBe("evaluated");

    if (record.rankedMoveAnalysis.kind !== "evaluated") {
      return;
    }

    expect(record.rankedMoveAnalysis.scoreScale).toEqual({ kind: "relative" });
    expect(record.rankedMoveAnalysis.rankedMoves.length).toBeGreaterThan(0);
  });

  it("rejects malformed ranked analysis integrity", () => {
    const session = createValidSession();
    const serialized = serializeAnalysisSession(session) as unknown as {
      records: Array<{ rankedMoveAnalysis: { rankedMoves: Array<{ lossFromBest: number }> } }>;
    };

    serialized.records[0]!.rankedMoveAnalysis.rankedMoves[0]!.lossFromBest = 1;

    const parsed = parseAnalysisSession(serialized);

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("invalid-domain-state");
      expect(parsed.message).toContain("lossFromBest");
    }
  });

  it("detaches parsed output from input object references", () => {
    const session = createValidSession();
    const serialized = serializeAnalysisSession(session) as unknown as {
      metadata: { evaluatorVersion: string };
      records: Array<{ positionHash: string }>;
    };

    const parsed = parseAnalysisSession(serialized);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    serialized.metadata.evaluatorVersion = "mutated";
    serialized.records[0]!.positionHash = "sha256:mutated";

    expect(parsed.session.metadata.evaluatorVersion).toBe("1.0.0");
    expect(parsed.session.records[0]!.positionHash).toBe("sha256:turn1");
  });

  it("encodes deterministically", () => {
    const session = createValidSession();

    const textA = encodeAnalysisSession(session);
    const textB = encodeAnalysisSession(session);

    expect(textA).toBe(textB);
  });

  it("rejects invalid json decode", () => {
    const result = decodeAnalysisSession("{invalid-json");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid-json");
    }
  });

  it("summarizes coverage and tag counts", () => {
    const summary = summarizeAnalysisSession(createValidSession());

    expect(summary.sessionId).toBe("session-001");
    expect(summary.recordCount).toBe(1);
    expect(summary.completeCoverageCount).toBe(1);
    expect(summary.partialCoverageCount).toBe(0);
    expect(summary.noLegalMovesCount).toBe(0);
    expect(summary.taggedRecordCount).toBe(1);
  });
});
