import { describe, expect, it } from "vitest";
import { STANDARD_STARTING_POSITION } from "@backgammon-trainer/backgammon-domain";
import { createGameState } from "@backgammon-trainer/backgammon-engine";
import { evaluateLegalMoves } from "@backgammon-trainer/backgammon-analysis";
import { createFixturePositionEvaluator } from "@backgammon-trainer/backgammon-analysis/fixture";

import {
  classifyCommittedMove,
  MOVE_CLASSIFICATION_POLICY,
  type CoachMoveClassificationLabel
} from "../src/classification";

const createTrustedCompleteAnalysis = async () => {
  const gameState = createGameState(STANDARD_STARTING_POSITION, "white");
  const ranked = await evaluateLegalMoves(
    {
      position: gameState.position,
      player: "white",
      dice: { dice: [1, 2] }
    },
    createFixturePositionEvaluator({ mode: "complete" })
  );

  expect(ranked.ok).toBe(true);
  if (!ranked.ok || ranked.analysis.kind !== "evaluated") {
    throw new Error("Expected evaluated fixture analysis.");
  }

  return {
    ...ranked.analysis,
    scoreScale: {
      kind: "equity" as const,
      unit: "points" as const
    },
    provenance: {
      ...ranked.analysis.provenance,
      provider: "trusted-evaluator"
    },
    coverage: "complete" as const
  };
};

const withPlayedLoss = (input: {
  analysis: Awaited<ReturnType<typeof createTrustedCompleteAnalysis>>;
  playedMoveFingerprint: string;
  lossFromBest: number;
  rank: number;
}) => {
  return {
    ...input.analysis,
    rankedMoves: input.analysis.rankedMoves.map((row) => {
      if (row.moveFingerprint !== input.playedMoveFingerprint) {
        return row;
      }

      return {
        ...row,
        rank: input.rank,
        lossFromBest: input.lossFromBest,
        normalizedScore: input.analysis.rankedMoves[0]!.normalizedScore - input.lossFromBest
      };
    })
  };
};

const expectClassifiedLabel = (input: {
  label: CoachMoveClassificationLabel;
  lossFromBest: number;
  rank: number;
  tieForBest?: boolean;
}) => {
  return async () => {
    const analysis = await createTrustedCompleteAnalysis();
    const played = analysis.rankedMoves[1] ?? analysis.rankedMoves[0];

    expect(played).toBeDefined();
    if (played === undefined) {
      return;
    }

    const patched = withPlayedLoss({
      analysis,
      playedMoveFingerprint: played.moveFingerprint,
      lossFromBest: input.lossFromBest,
      rank: input.rank
    });

    const classification = classifyCommittedMove({
      playedMoveFingerprint: played.moveFingerprint,
      rankedAnalysis: patched,
      analysisSource: "analysis-record"
    });

    expect(classification.status).toBe("classified");
    if (classification.status !== "classified") {
      return;
    }

    expect(classification.label).toBe(input.label);
    expect(classification.policyVersion).toBe(MOVE_CLASSIFICATION_POLICY.version);
    expect(classification.normalizedLossFromBest).toBe(input.lossFromBest);
    if (input.tieForBest !== undefined) {
      expect(classification.isTieForBest).toBe(input.tieForBest);
    }
  };
};

describe("deterministic move classification policy", () => {
  it(
    "classifies evaluator-best move as best",
    expectClassifiedLabel({ label: "best", lossFromBest: 0, rank: 1 })
  );

  it(
    "classifies tied evaluator-best moves as best",
    expectClassifiedLabel({ label: "best", lossFromBest: 0, rank: 1, tieForBest: true })
  );

  it(
    "classifies loss below first threshold as reasonable",
    expectClassifiedLabel({ label: "reasonable", lossFromBest: 0.05, rank: 2 })
  );

  it(
    "treats the first threshold as inclusive for reasonable",
    expectClassifiedLabel({ label: "reasonable", lossFromBest: 0.08, rank: 2 })
  );

  it(
    "classifies mistake-range loss as mistake",
    expectClassifiedLabel({ label: "mistake", lossFromBest: 0.11, rank: 2 })
  );

  it(
    "treats the mistake threshold as inclusive",
    expectClassifiedLabel({ label: "mistake", lossFromBest: 0.2, rank: 2 })
  );

  it(
    "classifies larger loss as major mistake",
    expectClassifiedLabel({ label: "major mistake", lossFromBest: 0.35, rank: 2 })
  );

  it("fails closed for partial coverage", async () => {
    const analysis = await createTrustedCompleteAnalysis();
    const played = analysis.rankedMoves[1] ?? analysis.rankedMoves[0];
    expect(played).toBeDefined();
    if (played === undefined) {
      return;
    }

    const classification = classifyCommittedMove({
      playedMoveFingerprint: played.moveFingerprint,
      rankedAnalysis: {
        ...analysis,
        coverage: "partial"
      },
      analysisSource: "analysis-record"
    });

    expect(classification).toMatchObject({
      status: "unclassified",
      reason: "partial-coverage"
    });
  });

  it("fails closed for fixture provenance", async () => {
    const analysis = await createTrustedCompleteAnalysis();
    const played = analysis.rankedMoves[1] ?? analysis.rankedMoves[0];
    expect(played).toBeDefined();
    if (played === undefined) {
      return;
    }

    const classification = classifyCommittedMove({
      playedMoveFingerprint: played.moveFingerprint,
      rankedAnalysis: {
        ...analysis,
        provenance: {
          ...analysis.provenance,
          provider: "fixture-position-evaluator"
        }
      },
      analysisSource: "analysis-record"
    });

    expect(classification).toMatchObject({
      status: "unclassified",
      reason: "fixture-provenance"
    });
  });

  it("fails closed when played move is not in scored coverage", async () => {
    const analysis = await createTrustedCompleteAnalysis();
    const played = analysis.rankedMoves[1] ?? analysis.rankedMoves[0];
    expect(played).toBeDefined();
    if (played === undefined) {
      return;
    }

    const classification = classifyCommittedMove({
      playedMoveFingerprint: "missing-fingerprint",
      rankedAnalysis: analysis,
      analysisSource: "analysis-record"
    });

    expect(classification).toMatchObject({
      status: "unclassified",
      reason: "played-move-not-evaluated"
    });
  });

  it("fails closed for unsupported score scales", async () => {
    const analysis = await createTrustedCompleteAnalysis();
    const played = analysis.rankedMoves[1] ?? analysis.rankedMoves[0];
    expect(played).toBeDefined();
    if (played === undefined) {
      return;
    }

    const classification = classifyCommittedMove({
      playedMoveFingerprint: played.moveFingerprint,
      rankedAnalysis: {
        ...analysis,
        scoreScale: { kind: "relative" as const }
      },
      analysisSource: "analysis-record"
    });

    expect(classification).toMatchObject({
      status: "unclassified",
      reason: "unsupported-score-scale"
    });
  });

  it("fails closed for missing, failed, and unavailable analysis", () => {
    const missing = classifyCommittedMove({
      playedMoveFingerprint: "x",
      analysisSource: "missing"
    });
    const failed = classifyCommittedMove({
      playedMoveFingerprint: "x",
      analysisSource: "failed"
    });
    const unavailable = classifyCommittedMove({
      playedMoveFingerprint: "x",
      analysisSource: "unavailable"
    });

    expect(missing).toMatchObject({ status: "unclassified", reason: "missing-ranked-analysis" });
    expect(failed).toMatchObject({ status: "unclassified", reason: "evaluation-failed" });
    expect(unavailable).toMatchObject({ status: "unclassified", reason: "evaluation-unavailable" });
  });

  it("fails closed for invalid loss values", async () => {
    const analysis = await createTrustedCompleteAnalysis();
    const played = analysis.rankedMoves[1] ?? analysis.rankedMoves[0];
    expect(played).toBeDefined();
    if (played === undefined) {
      return;
    }

    const classification = classifyCommittedMove({
      playedMoveFingerprint: played.moveFingerprint,
      rankedAnalysis: withPlayedLoss({
        analysis,
        playedMoveFingerprint: played.moveFingerprint,
        lossFromBest: Number.NaN,
        rank: 2
      }),
      analysisSource: "analysis-record"
    });

    expect(classification).toMatchObject({
      status: "unclassified",
      reason: "invalid-loss-from-best"
    });
  });
});
