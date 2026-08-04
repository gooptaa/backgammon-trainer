import { describe, expect, it } from "vitest";
import { createFixturePositionEvaluator } from "@backgammon-trainer/backgammon-analysis/fixture";
import {
  analyzePosition,
  evaluateLegalMoves,
  getMoveFingerprint,
  type RankedLegalMoveAnalysis
} from "@backgammon-trainer/backgammon-analysis";
import { STANDARD_STARTING_POSITION } from "@backgammon-trainer/backgammon-domain";
import { createTurnRecord } from "@backgammon-trainer/backgammon-engine";

import {
  createLearnerProfile,
  decodeLearnerProfile,
  encodeLearnerProfile,
  getLineageOwnershipMode,
  ingestCommittedLearnerObservation,
  LEARNER_PROFILE_FORMAT,
  LEARNER_PROFILE_VERSION,
  setLineageOwnership,
  summarizeLearnerProgress
} from "../src/index";

const NOW = "2026-08-04T00:00:00.000Z";

const createCommittedMoveTurn = (turnNumber: number, player: "white" | "black") => {
  return createTurnRecord({
    turnNumber,
    player,
    dice: { dice: [1, 2] },
    outcome: {
      kind: "move",
      move: {
        player,
        steps: [
          {
            kind: "point-to-point",
            fromPoint: player === "white" ? 13 : 12,
            toPoint: player === "white" ? 12 : 13,
            dieValue: 1,
            dieIndex: 0,
            hitsBlot: false
          },
          {
            kind: "point-to-point",
            fromPoint: player === "white" ? 8 : 17,
            toPoint: player === "white" ? 6 : 19,
            dieValue: 2,
            dieIndex: 1,
            hitsBlot: false
          }
        ]
      }
    },
    positionBefore: STANDARD_STARTING_POSITION,
    positionAfter: STANDARD_STARTING_POSITION,
    gameStatusAfter: { state: "in-progress" },
    phase: "normal"
  });
};

const getEvaluatedAnalysis = async (): Promise<RankedLegalMoveAnalysis> => {
  const result = await evaluateLegalMoves(
    {
      position: STANDARD_STARTING_POSITION,
      player: "white",
      dice: { dice: [1, 2] },
      context: {
        gameMode: "money"
      }
    },
    createFixturePositionEvaluator({ mode: "complete" })
  );

  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("Expected fixture evaluator analysis");
  }

  if (result.analysis.kind !== "evaluated") {
    return result.analysis;
  }

  return {
    ...result.analysis,
    scoreScale: {
      kind: "equity",
      unit: "points"
    },
    provenance: {
      ...result.analysis.provenance,
      provider: "gnubg"
    }
  };
};

const withPoint = (
  player: "white" | "black",
  checkerCount: number
): { readonly player: "white" | "black"; readonly checkerCount: number } => {
  return { player, checkerCount };
};

const createPatternTestPositions = () => {
  const positionBefore = structuredClone(STANDARD_STARTING_POSITION);
  const playedPositionAfter = {
    ...positionBefore,
    points: {
      ...positionBefore.points,
      6: withPoint("white", 1),
      8: withPoint("white", 1),
      13: withPoint("white", 8),
      24: withPoint("white", 5)
    }
  };

  const strongerPositionAfter = {
    ...positionBefore,
    points: {
      ...positionBefore.points,
      6: withPoint("white", 2),
      8: withPoint("white", 1),
      13: withPoint("white", 8),
      24: withPoint("white", 4)
    }
  };

  return {
    positionBefore,
    playedPositionAfter,
    strongerPositionAfter
  };
};

const createTrustedRankedAnalysis = (options?: {
  strongerHits?: boolean;
}): Extract<RankedLegalMoveAnalysis, { kind: "evaluated" }> => {
  const positions = createPatternTestPositions();
  const playedMove = {
    player: "white" as const,
    steps: [
      {
        kind: "point-to-point" as const,
        fromPoint: 13 as const,
        toPoint: 12 as const,
        dieValue: 1,
        dieIndex: 0,
        hitsBlot: false
      },
      {
        kind: "point-to-point" as const,
        fromPoint: 8 as const,
        toPoint: 6 as const,
        dieValue: 2,
        dieIndex: 1,
        hitsBlot: false
      }
    ]
  } as const;

  const strongerMove = {
    player: "white" as const,
    steps: [
      {
        kind: "point-to-point" as const,
        fromPoint: 13 as const,
        toPoint: 11 as const,
        dieValue: 2,
        dieIndex: 1,
        hitsBlot: options?.strongerHits ?? false
      },
      {
        kind: "point-to-point" as const,
        fromPoint: 8 as const,
        toPoint: 7 as const,
        dieValue: 1,
        dieIndex: 0,
        hitsBlot: false
      }
    ]
  } as const;

  const playedOutcome = {
    move: playedMove,
    positionAfter: positions.playedPositionAfter,
    analysisAfter: analyzePosition(positions.playedPositionAfter),
    featureDelta: {
      white: {
        pipCountDelta: 0,
        blotCountDelta: 1,
        madePointCountDelta: -1,
        madeHomeBoardPointCountDelta: -1,
        barCountDelta: 0,
        borneOffCountDelta: 0,
        occupiedPointCountDelta: 1
      },
      black: {
        pipCountDelta: 0,
        blotCountDelta: 0,
        madePointCountDelta: 0,
        madeHomeBoardPointCountDelta: 0,
        barCountDelta: 0,
        borneOffCountDelta: 0,
        occupiedPointCountDelta: 0
      },
      relationship: {
        pipCountDifferenceWhiteMinusBlackDelta: 0,
        contactStatusBefore: "contact" as const,
        contactStatusAfter: "contact" as const,
        pipCountLeaderBefore: "tied" as const,
        pipCountLeaderAfter: "tied" as const
      }
    }
  };

  const strongerOutcome = {
    move: strongerMove,
    positionAfter: positions.strongerPositionAfter,
    analysisAfter: analyzePosition(positions.strongerPositionAfter),
    featureDelta: playedOutcome.featureDelta
  };

  const playedFingerprint = getMoveFingerprint(playedMove);
  const strongerFingerprint = getMoveFingerprint(strongerMove);

  return {
    kind: "evaluated",
    player: "white",
    dice: { dice: [1, 2] },
    positionBefore: analyzePosition(positions.positionBefore),
    factualOutcomes: [playedOutcome, strongerOutcome],
    scoreScale: {
      kind: "equity",
      unit: "points"
    },
    provenance: {
      provider: "trusted-evaluator",
      providerVersion: "1.0.0",
      adapterVersion: "1.0.0",
      settings: {}
    },
    coverage: "complete",
    rankedMoves: [
      {
        rank: 1,
        normalizedScore: 0.4,
        lossFromBest: 0,
        moveFingerprint: strongerFingerprint,
        outcome: strongerOutcome
      },
      {
        rank: 2,
        normalizedScore: 0.26,
        lossFromBest: 0.14,
        moveFingerprint: playedFingerprint,
        outcome: playedOutcome
      }
    ],
    unevaluatedMoves: [],
    warnings: []
  };
};

const createPatternTurn = (turnNumber: number) => {
  const positions = createPatternTestPositions();
  return createTurnRecord({
    turnNumber,
    player: "white",
    dice: { dice: [1, 2] },
    outcome: {
      kind: "move",
      move: {
        player: "white",
        steps: [
          {
            kind: "point-to-point",
            fromPoint: 13,
            toPoint: 12,
            dieValue: 1,
            dieIndex: 0,
            hitsBlot: false
          },
          {
            kind: "point-to-point",
            fromPoint: 8,
            toPoint: 6,
            dieValue: 2,
            dieIndex: 1,
            hitsBlot: false
          }
        ]
      }
    },
    positionBefore: positions.positionBefore,
    positionAfter: positions.playedPositionAfter,
    gameStatusAfter: { state: "in-progress" },
    phase: "normal"
  });
};

describe("learner profile", () => {
  it("creates a deterministic empty profile", () => {
    const profile = createLearnerProfile({ updatedAt: NOW });

    expect(profile.format).toBe(LEARNER_PROFILE_FORMAT);
    expect(profile.version).toBe(LEARNER_PROFILE_VERSION);
    expect(profile.observations).toHaveLength(0);
    expect(profile.lineageOwnership).toEqual({});
  });

  it("stores and reads lineage ownership deterministically", () => {
    const profile = createLearnerProfile({ updatedAt: NOW });
    const updated = setLineageOwnership({
      profile,
      lineageId: "lineage-1",
      mode: "white",
      resolvedAt: NOW
    });

    expect(getLineageOwnershipMode(updated, "lineage-1")).toBe("white");
    expect(getLineageOwnershipMode(updated, "lineage-unknown")).toBe("unknown");
  });

  it("does not ingest observations when learner ownership is unknown or both", () => {
    const profile = createLearnerProfile({ updatedAt: NOW });
    const turn = createCommittedMoveTurn(1, "white");

    const unknown = ingestCommittedLearnerObservation({
      profile,
      lineageId: "lineage-1",
      ownershipMode: "unknown",
      committedTurn: turn,
      observedAt: NOW
    });
    expect(unknown.ingested).toBe(false);
    expect(unknown.reason).toBe("unknown-ownership");

    const both = ingestCommittedLearnerObservation({
      profile,
      lineageId: "lineage-1",
      ownershipMode: "both",
      committedTurn: turn,
      observedAt: NOW
    });
    expect(both.ingested).toBe(false);
    expect(both.reason).toBe("both-sides");
  });

  it("ingests only learner-side committed turns and keeps opponent turns excluded", () => {
    const profile = createLearnerProfile({ updatedAt: NOW });
    const learnerTurn = createCommittedMoveTurn(1, "white");
    const opponentTurn = createCommittedMoveTurn(2, "black");

    const first = ingestCommittedLearnerObservation({
      profile,
      lineageId: "lineage-1",
      ownershipMode: "white",
      committedTurn: learnerTurn,
      observedAt: NOW
    });
    expect(first.ingested).toBe(true);
    expect(first.profile.observations).toHaveLength(1);

    const second = ingestCommittedLearnerObservation({
      profile: first.profile,
      lineageId: "lineage-1",
      ownershipMode: "white",
      committedTurn: opponentTurn,
      observedAt: "2026-08-04T00:00:01.000Z"
    });

    expect(second.ingested).toBe(false);
    expect(second.reason).toBe("opponent-turn");
    expect(second.profile.observations).toHaveLength(1);
  });

  it("supersedes an earlier unclassified observation with classified evidence for the same turn", async () => {
    const rankedAnalysis = await getEvaluatedAnalysis();
    const chosen = rankedAnalysis.kind === "evaluated" ? rankedAnalysis.rankedMoves[0] : undefined;
    expect(chosen).toBeDefined();
    if (chosen === undefined) {
      return;
    }

    const turn = createTurnRecord({
      turnNumber: 1,
      player: "white",
      dice: { dice: [1, 2] },
      outcome: {
        kind: "move",
        move: chosen.outcome.move
      },
      positionBefore: STANDARD_STARTING_POSITION,
      positionAfter: STANDARD_STARTING_POSITION,
      gameStatusAfter: { state: "in-progress" },
      phase: "normal"
    });

    const base = createLearnerProfile({ updatedAt: NOW });
    const first = ingestCommittedLearnerObservation({
      profile: base,
      lineageId: "lineage-1",
      ownershipMode: "white",
      committedTurn: turn,
      observedAt: NOW
    });
    expect(first.ingested).toBe(true);
    expect(first.profile.observations[0]?.classification.status).toBe("unclassified");

    const second = ingestCommittedLearnerObservation({
      profile: first.profile,
      lineageId: "lineage-1",
      ownershipMode: "white",
      committedTurn: turn,
      rankedAnalysis,
      observedAt: "2026-08-04T00:00:10.000Z"
    });

    expect(second.ingested).toBe(true);
    expect(second.profile.observations).toHaveLength(1);
    expect(second.profile.observations[0]?.classification.status).toBe("classified");
  });

  it("keeps identical positions in different lineages as distinct observations", () => {
    const turn = createCommittedMoveTurn(1, "white");
    const base = createLearnerProfile({ updatedAt: NOW });

    const first = ingestCommittedLearnerObservation({
      profile: base,
      lineageId: "lineage-a",
      gameReference: "game-ref-1",
      ownershipMode: "white",
      committedTurn: turn,
      observedAt: NOW
    });

    const second = ingestCommittedLearnerObservation({
      profile: first.profile,
      lineageId: "lineage-b",
      gameReference: "game-ref-1",
      ownershipMode: "white",
      committedTurn: turn,
      observedAt: "2026-08-04T00:00:01.000Z"
    });

    expect(second.profile.observations).toHaveLength(2);
    expect(new Set(second.profile.observations.map((item) => item.lineageId)).size).toBe(2);
  });

  it("produces bounded progress summaries with trend limitations when evidence is insufficient", () => {
    const turn = createCommittedMoveTurn(1, "white");
    const base = createLearnerProfile({ updatedAt: NOW });
    const ingested = ingestCommittedLearnerObservation({
      profile: base,
      lineageId: "lineage-1",
      ownershipMode: "white",
      committedTurn: turn,
      observedAt: NOW
    });

    const summary = summarizeLearnerProgress(ingested.profile, { recentWindowSize: 20 });

    expect(summary.counts.fullProfile.totalEligible).toBe(1);
    expect(summary.counts.recentWindow.totalEligible).toBe(1);
    expect(summary.trend.status).toBe("insufficient-evidence");
    expect(summary.recentWindowSize).toBe(20);
  });

  it("round-trips through encode/decode deterministically", () => {
    const profile = setLineageOwnership({
      profile: createLearnerProfile({ updatedAt: NOW }),
      lineageId: "lineage-z",
      mode: "black",
      resolvedAt: NOW
    });

    const encoded = encodeLearnerProfile(profile);
    const decoded = decodeLearnerProfile(encoded);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      return;
    }

    expect(decoded.profile).toEqual(profile);
  });

  it("emits deterministic pattern signals for avoidable blot exposure and missed point making", () => {
    const profile = createLearnerProfile({ updatedAt: NOW });
    const ingested = ingestCommittedLearnerObservation({
      profile,
      lineageId: "lineage-pattern-1",
      ownershipMode: "white",
      committedTurn: createPatternTurn(1),
      rankedAnalysis: createTrustedRankedAnalysis(),
      observedAt: NOW
    });

    expect(ingested.ingested).toBe(true);
    expect(ingested.profile.observations).toHaveLength(1);
    const signals = ingested.profile.observations[0]?.patternSignals ?? [];
    expect(signals.some((signal) => signal.detectorId === "avoidable-blot-exposure")).toBe(true);
    expect(signals.some((signal) => signal.detectorId === "missed-point-making-opportunity")).toBe(
      true
    );
  });

  it("emits deterministic missed-hit signals only when stronger move includes additional hits", () => {
    const profile = createLearnerProfile({ updatedAt: NOW });
    const withoutHit = ingestCommittedLearnerObservation({
      profile,
      lineageId: "lineage-pattern-2",
      ownershipMode: "white",
      committedTurn: createPatternTurn(1),
      rankedAnalysis: createTrustedRankedAnalysis({ strongerHits: false }),
      observedAt: NOW
    });
    const withoutHitSignals = withoutHit.profile.observations[0]?.patternSignals ?? [];
    expect(withoutHitSignals.some((signal) => signal.detectorId === "missed-hit-opportunity")).toBe(
      false
    );

    const withHit = ingestCommittedLearnerObservation({
      profile,
      lineageId: "lineage-pattern-3",
      ownershipMode: "white",
      committedTurn: createPatternTurn(1),
      rankedAnalysis: createTrustedRankedAnalysis({ strongerHits: true }),
      observedAt: NOW
    });
    const withHitSignals = withHit.profile.observations[0]?.patternSignals ?? [];
    expect(withHitSignals.some((signal) => signal.detectorId === "missed-hit-opportunity")).toBe(
      true
    );
  });

  it("keeps tied recurring pattern leaders explicit instead of forcing a single winner", () => {
    let profile = createLearnerProfile({ updatedAt: NOW });
    const rankedAnalysis = createTrustedRankedAnalysis();

    for (let turnNumber = 1; turnNumber <= 4; turnNumber += 1) {
      profile = ingestCommittedLearnerObservation({
        profile,
        lineageId: `lineage-pattern-main-${turnNumber}`,
        ownershipMode: "white",
        committedTurn: createPatternTurn(turnNumber),
        rankedAnalysis,
        observedAt: `2026-08-04T00:00:0${turnNumber}.000Z`
      }).profile;
    }

    const summary = summarizeLearnerProgress(profile, { recentWindowSize: 20 });
    expect(summary.patterns.mainPattern.status).toBe("tied");
    if (summary.patterns.mainPattern.status !== "tied") {
      return;
    }

    expect(
      summary.patterns.mainPattern.tiedPatterns.some(
        (pattern) => pattern.detectorId === "avoidable-blot-exposure"
      )
    ).toBe(true);
  });
});
