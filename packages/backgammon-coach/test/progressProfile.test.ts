import { describe, expect, it } from "vitest";
import { createFixturePositionEvaluator } from "@backgammon-trainer/backgammon-analysis/fixture";
import {
  evaluateLegalMoves,
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
});
