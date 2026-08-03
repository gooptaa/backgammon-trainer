import { describe, expect, it } from "vitest";
import { getMoveFingerprint } from "@backgammon-trainer/backgammon-analysis";

import { matchGnuBgMoveToLegalOutcome, parseGnuBgMoveNotation } from "../src/matching";
import {
  AMBIGUOUS_COORDINATE_MOVE_A,
  AMBIGUOUS_COORDINATE_MOVE_B,
  WHITE_BAR_ENTRY_MOVE,
  WHITE_BEAR_OFF_MOVE,
  WHITE_DOUBLES_MOVE,
  WHITE_HIT_MOVE,
  WHITE_ORDINARY_MOVE,
  WHITE_REVERSED_ORDINARY_MOVE,
  createOutcome
} from "./fixtures/testData";

describe("GNU move matching", () => {
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

  it("rejects unknown and ambiguous GNU moves rather than choosing arbitrarily", () => {
    const unknown = parseGnuBgMoveNotation("24/20", "white");
    const ambiguous = parseGnuBgMoveNotation("8/7 7/6", "white");
    const ambiguousOutcomes = [
      createOutcome(AMBIGUOUS_COORDINATE_MOVE_A),
      createOutcome(AMBIGUOUS_COORDINATE_MOVE_B)
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
