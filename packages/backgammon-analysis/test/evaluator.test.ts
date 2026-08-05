import { describe, expect, it, vi } from "vitest";
import * as engineModule from "@backgammon-trainer/backgammon-engine";
import type {
  EvaluatePositionRequest,
  EvaluatePositionResult,
  Position,
  PositionEvaluator
} from "../src/index";
import {
  analyzeLegalMoveOutcomes,
  evaluateLegalMoves,
  getCanonicalMoveFingerprint,
  getMoveFingerprint
} from "../src/index";
import { createFixturePositionEvaluator } from "../src/fixture";

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

// Two white checkers, each with exactly one intermediate waypoint blocked by a black
// point, so each checker has exactly one legal way to play both dice. This yields
// exactly two legal moves with no raw-path duplicates within a canonical move class,
// which keeps the generic evaluator plumbing tests independent of move-deduplication
// behavior (that is covered separately by DUPLICATE_AUDIT_POSITION below).
const PLAYABLE_POSITION = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 },
    20: { player: "white", checkerCount: 1 },
    7: { player: "black", checkerCount: 2 },
    19: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 13,
    black: 11
  }
});

const DUPLICATE_AUDIT_POSITION = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 },
    9: { player: "white", checkerCount: 1 }
  },
  borneOff: {
    white: 13,
    black: 15
  }
});

const NO_MOVE_POSITION = createPosition({
  points: {
    8: { player: "white", checkerCount: 1 },
    7: { player: "black", checkerCount: 2 }
  },
  borneOff: {
    white: 14,
    black: 13
  }
});

const DICE = { dice: [1, 2] } as const;

const createSuccessEvaluator = (
  factory: (fingerprints: readonly string[]) => EvaluatePositionResult
): PositionEvaluator => ({
  evaluate: async (request) => {
    const fingerprints = request.legalOutcomes.map((outcome) => getMoveFingerprint(outcome.move));
    return factory(fingerprints);
  }
});

describe("evaluateLegalMoves", () => {
  it("passes complete legal outcomes and original position/player/dice to evaluator", async () => {
    let capturedPlayer: string | null = null;
    let capturedDice: EvaluatePositionRequest["dice"] | null = null;
    let capturedPosition: EvaluatePositionRequest["position"] | null = null;
    let capturedLegalOutcomesCount = -1;

    const evaluator: PositionEvaluator = {
      evaluate: async (request: EvaluatePositionRequest) => {
        capturedPlayer = request.player;
        capturedDice = request.dice;
        capturedPosition = request.position;
        capturedLegalOutcomesCount = request.legalOutcomes.length;
        return {
          ok: true,
          coverage: "complete",
          scores: request.legalOutcomes.map((outcome, index) => ({
            moveFingerprint: getMoveFingerprint(outcome.move),
            normalizedScore: 10 - index
          })),
          scoreScale: { kind: "relative" },
          provenance: {
            provider: "test",
            providerVersion: "1",
            adapterVersion: "1",
            settings: {}
          },
          warnings: []
        };
      }
    };

    const result = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE,
        context: { gameMode: "money" }
      },
      evaluator
    );

    expect(capturedPosition).toBe(PLAYABLE_POSITION);
    expect(capturedPlayer).toBe("white");
    expect(capturedDice).toBe(DICE);
    expect(capturedLegalOutcomesCount).toBeGreaterThan(0);
    expect(result.ok).toBe(true);
  });

  it("stops when factual analysis fails and does not invoke evaluator", async () => {
    const applySpy = vi.spyOn(engineModule, "applyMove").mockReturnValueOnce({
      ok: false,
      reason: "illegal-move"
    });

    let evaluatorCallCount = 0;
    const evaluator: PositionEvaluator = {
      evaluate: async () => {
        evaluatorCallCount += 1;
        throw new Error("should not run");
      }
    };

    const result = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("factual-analysis-failed");
    }
    expect(evaluatorCallCount).toBe(0);
    applySpy.mockRestore();
  });

  it("joins complete evaluator coverage to every legal move", async () => {
    const evaluator = createSuccessEvaluator((fingerprints) => ({
      ok: true,
      coverage: "complete",
      scores: fingerprints.map((fingerprint, index) => ({
        moveFingerprint: fingerprint,
        normalizedScore: 100 - index
      })),
      scoreScale: { kind: "relative" },
      provenance: {
        provider: "test",
        providerVersion: "1",
        adapterVersion: "1",
        settings: {}
      },
      warnings: []
    }));

    const result = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.analysis.kind !== "evaluated") {
      return;
    }

    expect(result.analysis.coverage).toBe("complete");
    expect(result.analysis.unevaluatedMoves).toHaveLength(0);
    expect(result.analysis.rankedMoves).toHaveLength(result.analysis.factualOutcomes.length);
  });

  it("treats canonical-equivalent move classes as complete coverage and propagates their score to every raw variant", async () => {
    const evaluator: PositionEvaluator = {
      evaluate: async (request) => {
        const seenCanonicalFingerprints = new Set<string>();
        const scores = [] as {
          moveFingerprint: string;
          normalizedScore: number;
        }[];

        for (const outcome of request.legalOutcomes) {
          const canonicalFingerprint = getCanonicalMoveFingerprint(outcome);

          if (seenCanonicalFingerprints.has(canonicalFingerprint)) {
            continue;
          }

          seenCanonicalFingerprints.add(canonicalFingerprint);
          scores.push({
            moveFingerprint: getMoveFingerprint(outcome.move),
            normalizedScore: 100 - scores.length
          });
        }

        return {
          ok: true,
          coverage: "complete",
          scores,
          scoreScale: { kind: "relative" },
          provenance: {
            provider: "test",
            providerVersion: "1",
            adapterVersion: "1",
            settings: {}
          },
          warnings: []
        };
      }
    };

    const result = await evaluateLegalMoves(
      {
        position: DUPLICATE_AUDIT_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.analysis.kind !== "evaluated") {
      return;
    }

    const canonicalFingerprints = result.analysis.factualOutcomes.map((outcome) =>
      getCanonicalMoveFingerprint(outcome)
    );
    const duplicateCanonicalFingerprint = canonicalFingerprints.find(
      (fingerprint, index) => canonicalFingerprints.indexOf(fingerprint) !== index
    );

    expect(result.analysis.coverage).toBe("complete");
    expect(result.analysis.unevaluatedMoves).toHaveLength(0);
    expect(result.analysis.rankedMoves).toHaveLength(result.analysis.factualOutcomes.length);
    expect(new Set(canonicalFingerprints).size).toBeLessThan(
      result.analysis.factualOutcomes.length
    );

    if (duplicateCanonicalFingerprint === undefined) {
      return;
    }

    const duplicateClass = result.analysis.rankedMoves.filter(
      (row) => getCanonicalMoveFingerprint(row.outcome) === duplicateCanonicalFingerprint
    );

    expect(duplicateClass.length).toBeGreaterThan(1);
    expect(new Set(duplicateClass.map((row) => row.normalizedScore)).size).toBe(1);
    expect(new Set(duplicateClass.map((row) => row.lossFromBest)).size).toBe(1);
  });

  it("supports partial coverage and preserves unevaluated moves", async () => {
    const evaluator = createSuccessEvaluator((fingerprints) => ({
      ok: true,
      coverage: "partial",
      scores: [
        {
          moveFingerprint: fingerprints[0]!,
          normalizedScore: 9
        }
      ],
      scoreScale: { kind: "relative" },
      provenance: {
        provider: "test",
        providerVersion: "1",
        adapterVersion: "1",
        settings: {}
      },
      warnings: []
    }));

    const result = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.analysis.kind !== "evaluated") {
      return;
    }

    expect(result.analysis.coverage).toBe("partial");
    expect(result.analysis.rankedMoves).toHaveLength(1);
    expect(result.analysis.unevaluatedMoves.length).toBeGreaterThan(0);
  });

  it("rejects unknown move fingerprints", async () => {
    const evaluator = createSuccessEvaluator(() => ({
      ok: true,
      coverage: "complete",
      scores: [
        {
          moveFingerprint: "unknown::fingerprint",
          normalizedScore: 1
        }
      ],
      scoreScale: { kind: "relative" },
      provenance: {
        provider: "test",
        providerVersion: "1",
        adapterVersion: "1",
        settings: {}
      },
      warnings: []
    }));

    const result = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid-provider-result");
    }
  });

  it("rejects duplicate move fingerprints", async () => {
    const evaluator = createSuccessEvaluator((fingerprints) => ({
      ok: true,
      coverage: "partial",
      scores: [
        {
          moveFingerprint: fingerprints[0]!,
          normalizedScore: 2
        },
        {
          moveFingerprint: fingerprints[0]!,
          normalizedScore: 1
        }
      ],
      scoreScale: { kind: "relative" },
      provenance: {
        provider: "test",
        providerVersion: "1",
        adapterVersion: "1",
        settings: {}
      },
      warnings: []
    }));

    const result = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid-provider-result");
    }
  });

  it("rejects complete coverage with missing moves", async () => {
    const evaluator = createSuccessEvaluator((fingerprints) => ({
      ok: true,
      coverage: "complete",
      scores: [
        {
          moveFingerprint: fingerprints[0]!,
          normalizedScore: 5
        }
      ],
      scoreScale: { kind: "relative" },
      provenance: {
        provider: "test",
        providerVersion: "1",
        adapterVersion: "1",
        settings: {}
      },
      warnings: []
    }));

    const result = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid-provider-result");
    }
  });

  it("rejects non-finite scores, invalid scale, missing provenance shape, and invalid provider rank", async () => {
    const nonFinite = createSuccessEvaluator((fingerprints) => ({
      ok: true,
      coverage: "partial",
      scores: [
        {
          moveFingerprint: fingerprints[0]!,
          normalizedScore: Number.POSITIVE_INFINITY
        }
      ],
      scoreScale: { kind: "relative" },
      provenance: {
        provider: "test",
        providerVersion: "1",
        adapterVersion: "1",
        settings: {}
      },
      warnings: []
    }));

    const invalidScale = createSuccessEvaluator(
      (fingerprints) =>
        ({
          ok: true,
          coverage: "partial",
          scores: [
            {
              moveFingerprint: fingerprints[0]!,
              normalizedScore: 1
            }
          ],
          scoreScale: { kind: "probability", range: [0, 2] },
          provenance: {
            provider: "test",
            providerVersion: "1",
            adapterVersion: "1",
            settings: {}
          },
          warnings: []
        }) as unknown as EvaluatePositionResult
    );

    const invalidProvenance = createSuccessEvaluator((fingerprints) => ({
      ok: true,
      coverage: "partial",
      scores: [
        {
          moveFingerprint: fingerprints[0]!,
          normalizedScore: 1
        }
      ],
      scoreScale: { kind: "relative" },
      provenance: {
        provider: "",
        providerVersion: "1",
        adapterVersion: "1",
        settings: {}
      },
      warnings: []
    }));

    const invalidProviderRank = createSuccessEvaluator((fingerprints) => ({
      ok: true,
      coverage: "partial",
      scores: [
        {
          moveFingerprint: fingerprints[0]!,
          normalizedScore: 1,
          providerRank: 0
        }
      ],
      scoreScale: { kind: "relative" },
      provenance: {
        provider: "test",
        providerVersion: "1",
        adapterVersion: "1",
        settings: {}
      },
      warnings: []
    }));

    for (const evaluator of [nonFinite, invalidScale, invalidProvenance, invalidProviderRank]) {
      const result = await evaluateLegalMoves(
        {
          position: PLAYABLE_POSITION,
          player: "white",
          dice: DICE
        },
        evaluator
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("invalid-provider-result");
      }
    }
  });

  it("ranks by higher score first regardless of provider order and uses dense ties", async () => {
    const evaluator = createSuccessEvaluator((fingerprints) => ({
      ok: true,
      coverage: "partial",
      scores: [
        { moveFingerprint: fingerprints[1]!, normalizedScore: 0.4 },
        { moveFingerprint: fingerprints[0]!, normalizedScore: 0.4 }
      ],
      scoreScale: { kind: "relative" },
      provenance: {
        provider: "test",
        providerVersion: "1",
        adapterVersion: "1",
        settings: {}
      },
      warnings: []
    }));

    const result = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.analysis.kind !== "evaluated") {
      return;
    }

    expect(result.analysis.rankedMoves[0]!.normalizedScore).toBeGreaterThanOrEqual(
      result.analysis.rankedMoves[1]!.normalizedScore
    );
    expect(result.analysis.rankedMoves[0]!.rank).toBe(1);
    expect(result.analysis.rankedMoves[1]!.rank).toBe(1);
    expect(
      result.analysis.rankedMoves[0]!.moveFingerprint <
        result.analysis.rankedMoves[1]!.moveFingerprint
    ).toBe(true);
  });

  it("computes non-negative lossFromBest as bestScore - moveScore", async () => {
    const evaluator = createSuccessEvaluator((fingerprints) => ({
      ok: true,
      coverage: "partial",
      scores: [
        { moveFingerprint: fingerprints[0]!, normalizedScore: 1.5 },
        { moveFingerprint: fingerprints[1]!, normalizedScore: 1.0 }
      ],
      scoreScale: { kind: "relative" },
      provenance: {
        provider: "test",
        providerVersion: "1",
        adapterVersion: "1",
        settings: {}
      },
      warnings: []
    }));

    const result = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.analysis.kind !== "evaluated") {
      return;
    }

    expect(result.analysis.rankedMoves[0]!.lossFromBest).toBe(0);
    expect(result.analysis.rankedMoves[1]!.lossFromBest).toBe(0.5);
    expect(result.analysis.rankedMoves.every((row) => row.lossFromBest >= 0)).toBe(true);
  });

  it("preserves canonical move metadata and factual analysis fields in ranked output", async () => {
    const factual = analyzeLegalMoveOutcomes(PLAYABLE_POSITION, "white", DICE);
    if (!factual.ok) {
      throw new Error("Expected factual outcomes");
    }

    const evaluator = createSuccessEvaluator((fingerprints) => ({
      ok: true,
      coverage: "complete",
      scores: fingerprints.map((fingerprint, index) => ({
        moveFingerprint: fingerprint,
        normalizedScore: 10 - index
      })),
      scoreScale: { kind: "relative" },
      provenance: {
        provider: "test",
        providerVersion: "1",
        adapterVersion: "1",
        settings: {}
      },
      warnings: []
    }));

    const result = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.analysis.kind !== "evaluated") {
      return;
    }

    expect(result.analysis.positionBefore).toEqual(factual.analysis.positionBefore);
    expect(result.analysis.factualOutcomes).toEqual(factual.analysis.outcomes);
  });

  it("does not mutate input position or dice and returns deterministic repeated results", async () => {
    const positionBefore = JSON.parse(JSON.stringify(PLAYABLE_POSITION)) as Position;
    const diceBefore = JSON.parse(JSON.stringify(DICE)) as typeof DICE;
    const evaluator = createFixturePositionEvaluator();

    const first = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );
    const second = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(PLAYABLE_POSITION).toEqual(positionBefore);
    expect(DICE).toEqual(diceBefore);
    expect(first).toEqual(second);
  });

  it("returns no-legal-moves success without evaluator invocation and without fake pass", async () => {
    let evaluatorCallCount = 0;
    const evaluator: PositionEvaluator = {
      evaluate: async () => {
        evaluatorCallCount += 1;
        throw new Error("should not run");
      }
    };

    const result = await evaluateLegalMoves(
      {
        position: NO_MOVE_POSITION,
        player: "white",
        dice: {
          dice: [1, 1]
        }
      },
      evaluator
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.analysis.kind).toBe("no-legal-moves");
    expect(evaluatorCallCount).toBe(0);
  });
});

describe("createFixturePositionEvaluator", () => {
  const getFactualOutcomes = () => {
    const result = analyzeLegalMoveOutcomes(PLAYABLE_POSITION, "white", DICE);

    if (!result.ok) {
      throw new Error("Expected factual outcomes");
    }

    return result.analysis.outcomes;
  };

  it("is asynchronous and deterministic", async () => {
    const evaluator = createFixturePositionEvaluator({ delayMs: 1 });
    const outcomes = getFactualOutcomes();

    const first = await evaluator.evaluate({
      position: PLAYABLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes: outcomes,
      context: { gameMode: "money" }
    });
    const second = await evaluator.evaluate({
      position: PLAYABLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes: outcomes,
      context: { gameMode: "money" }
    });

    expect(first).toEqual(second);
  });

  it("supports complete, partial, unavailable, provider failure, and malformed modes", async () => {
    const outcomes = getFactualOutcomes();

    const complete = createFixturePositionEvaluator({ mode: "complete" });
    const partial = createFixturePositionEvaluator({ mode: "partial" });
    const unavailable = createFixturePositionEvaluator({ mode: "unavailable" });
    const providerFailed = createFixturePositionEvaluator({ mode: "provider-failed" });
    const malformed = createFixturePositionEvaluator({ mode: "malformed" });

    const completeResult = await complete.evaluate({
      position: PLAYABLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes: outcomes,
      context: { gameMode: "money" }
    });
    const partialResult = await partial.evaluate({
      position: PLAYABLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes: outcomes,
      context: { gameMode: "money" }
    });
    const unavailableResult = await unavailable.evaluate({
      position: PLAYABLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes: outcomes,
      context: { gameMode: "money" }
    });
    const providerFailedResult = await providerFailed.evaluate({
      position: PLAYABLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes: outcomes,
      context: { gameMode: "money" }
    });
    const malformedResult = await malformed.evaluate({
      position: PLAYABLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes: outcomes,
      context: { gameMode: "money" }
    });

    expect(completeResult.ok).toBe(true);
    expect(partialResult.ok).toBe(true);
    expect(unavailableResult).toMatchObject({ ok: false, reason: "unavailable" });
    expect(providerFailedResult).toMatchObject({ ok: false, reason: "provider-failed" });
    expect(malformedResult.ok).toBe(true);
  });

  it("surfaces malformed fixture output as invalid provider result through evaluateLegalMoves", async () => {
    const evaluator = createFixturePositionEvaluator({ mode: "malformed" });

    const result = await evaluateLegalMoves(
      {
        position: PLAYABLE_POSITION,
        player: "white",
        dice: DICE
      },
      evaluator
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid-provider-result");
    }
  });
});
