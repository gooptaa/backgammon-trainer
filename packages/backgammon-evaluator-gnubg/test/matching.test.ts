import { describe, expect, it } from "vitest";
import { analyzeLegalMoveOutcomes } from "@backgammon-trainer/backgammon-analysis";
import { getMoveFingerprint } from "@backgammon-trainer/backgammon-analysis";

import { matchGnuBgMoveToLegalOutcome, parseGnuBgMoveNotation } from "../src/matching";
import {
  AMBIGUOUS_COORDINATE_MOVE_A,
  AMBIGUOUS_COORDINATE_MOVE_B,
  createPosition,
  WHITE_BAR_ENTRY_MOVE,
  WHITE_BEAR_OFF_MOVE,
  WHITE_DOUBLES_MOVE,
  WHITE_ORDINARY_MOVE,
  WHITE_REVERSED_ORDINARY_MOVE,
  WHITE_HIT_MOVE,
  createOutcome
} from "./fixtures/testData";

describe("GNU move matching", () => {
  it("normalizes compressed notation coordinates and hit marker for both movers", () => {
    const blackCompressedHit = parseGnuBgMoveNotation("6/1*", "black");
    const whiteCompressedHit = parseGnuBgMoveNotation("19/24*", "white");
    const blackCompressedNoHit = parseGnuBgMoveNotation("6/1", "black");
    const uncompressed = parseGnuBgMoveNotation("6/4 4/1*", "black");

    expect(blackCompressedHit.ok).toBe(true);
    expect(whiteCompressedHit.ok).toBe(true);
    expect(blackCompressedNoHit.ok).toBe(true);
    expect(uncompressed.ok).toBe(true);

    if (
      !blackCompressedHit.ok ||
      !whiteCompressedHit.ok ||
      !blackCompressedNoHit.ok ||
      !uncompressed.ok
    ) {
      return;
    }

    expect(blackCompressedHit.move.steps).toEqual([
      {
        kind: "point-to-point",
        fromPoint: 19,
        toPoint: 24,
        hitsBlot: true
      }
    ]);
    expect(whiteCompressedHit.move.steps).toEqual([
      {
        kind: "point-to-point",
        fromPoint: 19,
        toPoint: 24,
        hitsBlot: true
      }
    ]);
    expect(blackCompressedNoHit.move.steps[0]).toMatchObject({
      fromPoint: 19,
      toPoint: 24,
      hitsBlot: false
    });
    expect(uncompressed.move.steps).toHaveLength(2);
  });

  it("fails safely for malformed GNU move notation", () => {
    expect(parseGnuBgMoveNotation("6//1*", "black")).toEqual(
      expect.objectContaining({ ok: false })
    );
  });

  it("matches compressed black notation 6/1* to one legal outcome class across both die-order variants", () => {
    const position = createPosition({
      points: {
        19: { player: "black", checkerCount: 1 },
        24: { player: "white", checkerCount: 1 }
      },
      borneOff: {
        white: 14,
        black: 14
      }
    });
    const legalOutcomeAnalysis = analyzeLegalMoveOutcomes(position, "black", { dice: [2, 3] });

    expect(legalOutcomeAnalysis.ok).toBe(true);
    if (!legalOutcomeAnalysis.ok) {
      return;
    }

    const parsed = parseGnuBgMoveNotation("6/1*", "black");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const matchingVariants = legalOutcomeAnalysis.analysis.outcomes.filter((outcome) => {
      const steps = outcome.move.steps;
      return (
        steps.length === 2 &&
        steps[0]?.fromPoint === 19 &&
        (steps[0]?.toPoint === 21 || steps[0]?.toPoint === 22) &&
        steps[1]?.fromPoint === steps[0]?.toPoint &&
        steps[1]?.toPoint === 24 &&
        steps[1]?.hitsBlot === true
      );
    });

    expect(matchingVariants).toHaveLength(2);
    expect(matchingVariants[0]?.positionAfter).toEqual(matchingVariants[1]?.positionAfter);

    const matched = matchGnuBgMoveToLegalOutcome(
      parsed.move,
      legalOutcomeAnalysis.analysis.outcomes
    );

    expect(matched.ok).toBe(true);
    if (!matched.ok) {
      return;
    }

    expect(
      matchingVariants.some(
        (variant) => getMoveFingerprint(variant.move) === matched.moveFingerprint
      )
    ).toBe(true);
  });

  it("fails closed when compressed hit marker disagrees with legal outcomes", () => {
    const position = createPosition({
      points: {
        19: { player: "black", checkerCount: 1 },
        24: { player: "white", checkerCount: 2 }
      },
      borneOff: {
        white: 13,
        black: 14
      }
    });
    const legalOutcomeAnalysis = analyzeLegalMoveOutcomes(position, "black", { dice: [2, 3] });
    expect(legalOutcomeAnalysis.ok).toBe(true);
    if (!legalOutcomeAnalysis.ok) {
      return;
    }

    const parsedWithHit = parseGnuBgMoveNotation("6/1*", "black");
    const parsedWithoutHit = parseGnuBgMoveNotation("6/1", "black");
    expect(parsedWithHit.ok && parsedWithoutHit.ok).toBe(true);
    if (!parsedWithHit.ok || !parsedWithoutHit.ok) {
      return;
    }

    expect(
      matchGnuBgMoveToLegalOutcome(parsedWithHit.move, legalOutcomeAnalysis.analysis.outcomes)
    ).toEqual(expect.objectContaining({ ok: false, reason: "unknown-move" }));
    expect(
      matchGnuBgMoveToLegalOutcome(parsedWithoutHit.move, legalOutcomeAnalysis.analysis.outcomes)
    ).toEqual(expect.objectContaining({ ok: false, reason: "unknown-move" }));
  });

  it("does not accidentally match reversed mover orientation", () => {
    const parsedAsWhite = parseGnuBgMoveNotation("6/1*", "white");
    const outcomes = [createOutcome(WHITE_HIT_MOVE)];

    expect(parsedAsWhite.ok).toBe(true);
    if (!parsedAsWhite.ok) {
      return;
    }

    expect(matchGnuBgMoveToLegalOutcome(parsedAsWhite.move, outcomes)).toEqual(
      expect.objectContaining({ ok: false, reason: "unknown-move" })
    );
  });

  it("expands repeated-step notation tokens such as 8/7(2)", () => {
    const parsed = parseGnuBgMoveNotation("8/7(2) 7/6 6/5", "white");

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.move.steps).toHaveLength(4);
    expect(parsed.move.steps[0]).toMatchObject({ fromPoint: 8, toPoint: 7 });
    expect(parsed.move.steps[1]).toMatchObject({ fromPoint: 8, toPoint: 7 });
  });

  it("resolves ordinary, hit, bar-entry, bear-off, and doubles notation to exactly one canonical move", () => {
    const ordinary = parseGnuBgMoveNotation("8/7 7/5", "white");
    const hit = parseGnuBgMoveNotation("8/7* 7/5", "white");
    const barEntry = parseGnuBgMoveNotation("bar/24 24/22", "white");
    const bearOff = parseGnuBgMoveNotation("2/off 1/off", "white");
    const doubles = parseGnuBgMoveNotation("8/7 7/6 6/5 5/4", "white");

    expect(ordinary.ok && hit.ok && barEntry.ok && bearOff.ok && doubles.ok).toBe(true);
    if (!ordinary.ok || !hit.ok || !barEntry.ok || !bearOff.ok || !doubles.ok) {
      return;
    }

    expect(
      matchGnuBgMoveToLegalOutcome(ordinary.move, [createOutcome(WHITE_ORDINARY_MOVE)])
    ).toEqual(
      expect.objectContaining({
        ok: true,
        moveFingerprint: getMoveFingerprint(WHITE_ORDINARY_MOVE)
      })
    );
    expect(matchGnuBgMoveToLegalOutcome(hit.move, [createOutcome(WHITE_HIT_MOVE)])).toEqual(
      expect.objectContaining({ ok: true, moveFingerprint: getMoveFingerprint(WHITE_HIT_MOVE) })
    );
    expect(
      matchGnuBgMoveToLegalOutcome(barEntry.move, [createOutcome(WHITE_BAR_ENTRY_MOVE)])
    ).toEqual(
      expect.objectContaining({
        ok: true,
        moveFingerprint: getMoveFingerprint(WHITE_BAR_ENTRY_MOVE)
      })
    );
    expect(
      matchGnuBgMoveToLegalOutcome(bearOff.move, [createOutcome(WHITE_BEAR_OFF_MOVE)])
    ).toEqual(
      expect.objectContaining({
        ok: true,
        moveFingerprint: getMoveFingerprint(WHITE_BEAR_OFF_MOVE)
      })
    );
    expect(matchGnuBgMoveToLegalOutcome(doubles.move, [createOutcome(WHITE_DOUBLES_MOVE)])).toEqual(
      expect.objectContaining({ ok: true, moveFingerprint: getMoveFingerprint(WHITE_DOUBLES_MOVE) })
    );
  });

  it("respects alternate step order and preserves canonical die-index identity after matching", () => {
    const first = parseGnuBgMoveNotation("8/7 7/5", "white");
    const second = parseGnuBgMoveNotation("8/6 6/5", "white");
    const outcomes = [
      createOutcome(WHITE_ORDINARY_MOVE),
      createOutcome(WHITE_REVERSED_ORDINARY_MOVE)
    ];

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    const firstMatch = matchGnuBgMoveToLegalOutcome(first.move, outcomes);
    const secondMatch = matchGnuBgMoveToLegalOutcome(second.move, outcomes);

    expect(firstMatch).toEqual(
      expect.objectContaining({
        ok: true,
        moveFingerprint: getMoveFingerprint(WHITE_ORDINARY_MOVE)
      })
    );
    expect(secondMatch).toEqual(
      expect.objectContaining({
        ok: true,
        moveFingerprint: getMoveFingerprint(WHITE_REVERSED_ORDINARY_MOVE)
      })
    );
    expect((firstMatch.ok && firstMatch.moveFingerprint) || "").not.toBe("8/7 7/5");
  });

  it("matches collapsed notation when GNU combines multiple die-steps into one token", () => {
    const parsed = parseGnuBgMoveNotation("8/5", "white");
    const outcomes = [
      createOutcome(WHITE_ORDINARY_MOVE),
      createOutcome(WHITE_REVERSED_ORDINARY_MOVE)
    ];

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const match = matchGnuBgMoveToLegalOutcome(parsed.move, outcomes);

    expect(match).toEqual(
      expect.objectContaining({
        ok: true,
        moveFingerprint: getMoveFingerprint(WHITE_REVERSED_ORDINARY_MOVE)
      })
    );
  });

  it("rejects unknown moves and remains strict when equally-shaped candidates lead to different positions", () => {
    const unknown = parseGnuBgMoveNotation("24/20", "white");
    const ambiguous = parseGnuBgMoveNotation("8/7 7/6", "white");
    const ambiguousOutcomeA = createOutcome(AMBIGUOUS_COORDINATE_MOVE_A);
    const ambiguousOutcomeB = createOutcome(AMBIGUOUS_COORDINATE_MOVE_B);
    const ambiguousOutcomes = [
      {
        ...ambiguousOutcomeA,
        positionAfter: createPosition({
          points: {
            6: { player: "white", checkerCount: 1 }
          },
          borneOff: {
            white: 14,
            black: 15
          }
        })
      },
      {
        ...ambiguousOutcomeB,
        positionAfter: createPosition({
          points: {
            6: { player: "white", checkerCount: 1 },
            2: { player: "black", checkerCount: 1 }
          },
          borneOff: {
            white: 14,
            black: 14
          }
        })
      }
    ];

    expect(unknown.ok && ambiguous.ok).toBe(true);
    if (!unknown.ok || !ambiguous.ok) {
      return;
    }

    expect(
      matchGnuBgMoveToLegalOutcome(unknown.move, [createOutcome(WHITE_ORDINARY_MOVE)])
    ).toEqual(expect.objectContaining({ ok: false, reason: "unknown-move" }));
    expect(matchGnuBgMoveToLegalOutcome(ambiguous.move, ambiguousOutcomes)).toEqual(
      expect.objectContaining({ ok: false, reason: "ambiguous-move" })
    );
  });

  it("is deterministic and does not mutate legal outcomes", () => {
    const parsed = parseGnuBgMoveNotation("8/7 7/5", "white");
    const outcomes = [
      createOutcome(WHITE_ORDINARY_MOVE),
      createOutcome(WHITE_REVERSED_ORDINARY_MOVE)
    ];
    const before = structuredClone(outcomes);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const first = matchGnuBgMoveToLegalOutcome(parsed.move, outcomes);
    const second = matchGnuBgMoveToLegalOutcome(parsed.move, outcomes);

    expect(first).toEqual(second);
    expect(outcomes).toEqual(before);
  });
});
