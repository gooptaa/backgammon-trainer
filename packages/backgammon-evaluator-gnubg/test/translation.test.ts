import { describe, expect, it } from "vitest";

import { enginePointToGnuPoint, translatePositionToGnuBgBoard } from "../src/translation";
import {
  BLACK_BAR_POSITION,
  STARTING_POSITION,
  WHITE_BAR_POSITION,
  createPosition
} from "./fixtures/testData";

describe("translatePositionToGnuBgBoard", () => {
  it("translates the starting position with correct checker totals", () => {
    const result = translatePositionToGnuBgBoard(STARTING_POSITION, "white");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.board.points).toHaveLength(24);
    expect(result.board.points.reduce((total, point) => total + point.rollerCheckerCount, 0)).toBe(
      15
    );
    expect(
      result.board.points.reduce((total, point) => total + point.opponentCheckerCount, 0)
    ).toBe(15);
  });

  it("keeps white-on-roll orientation aligned with engine point numbering", () => {
    const result = translatePositionToGnuBgBoard(STARTING_POSITION, "white");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.board.playerOnRoll).toBe("white");
    expect(result.board.rollerBar).toBe(0);
    expect(result.board.opponentBar).toBe(0);
    expect(result.board.rollerOff).toBe(0);
    expect(result.board.opponentOff).toBe(0);
    expect(result.board.points.find((point) => point.gnuPoint === 24)).toEqual({
      gnuPoint: 24,
      enginePoint: 24,
      rollerCheckerCount: 2,
      opponentCheckerCount: 0
    });
    expect(result.board.points.find((point) => point.gnuPoint === 13)).toEqual({
      gnuPoint: 13,
      enginePoint: 13,
      rollerCheckerCount: 5,
      opponentCheckerCount: 0
    });
    expect(result.board.points.find((point) => point.gnuPoint === 19)).toEqual({
      gnuPoint: 19,
      enginePoint: 19,
      rollerCheckerCount: 0,
      opponentCheckerCount: 5
    });
    expect(result.board.points.find((point) => point.gnuPoint === 1)).toEqual({
      gnuPoint: 1,
      enginePoint: 1,
      rollerCheckerCount: 0,
      opponentCheckerCount: 2
    });
  });

  it("normalizes black-on-roll orientation to roller-relative GNU points", () => {
    const result = translatePositionToGnuBgBoard(STARTING_POSITION, "black");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.board.points[0]).toEqual({
      gnuPoint: 24,
      enginePoint: 1,
      rollerCheckerCount: 2,
      opponentCheckerCount: 0
    });
    expect(result.board.points[5]).toEqual({
      gnuPoint: 19,
      enginePoint: 6,
      rollerCheckerCount: 0,
      opponentCheckerCount: 5
    });
    expect(enginePointToGnuPoint("black", 19)).toBe(6);
  });

  it("maps white and black bar and borne-off counts without reversing ownership", () => {
    const whiteResult = translatePositionToGnuBgBoard(WHITE_BAR_POSITION, "white");
    const blackResult = translatePositionToGnuBgBoard(BLACK_BAR_POSITION, "black");

    expect(whiteResult.ok).toBe(true);
    expect(blackResult.ok).toBe(true);
    if (!whiteResult.ok || !blackResult.ok) {
      return;
    }

    expect(whiteResult.board.rollerBar).toBe(1);
    expect(whiteResult.board.opponentBar).toBe(0);
    expect(whiteResult.board.rollerOff).toBe(13);
    expect(whiteResult.board.opponentOff).toBe(14);
    expect(blackResult.board.rollerBar).toBe(1);
    expect(blackResult.board.opponentBar).toBe(0);
    expect(blackResult.board.rollerOff).toBe(13);
    expect(blackResult.board.opponentOff).toBe(14);
  });

  it("rejects positions with invalid checker accounting", () => {
    const invalidPosition = createPosition({
      points: {
        8: { player: "white", checkerCount: 2 }
      },
      borneOff: {
        white: 14,
        black: 15
      }
    });

    expect(translatePositionToGnuBgBoard(invalidPosition, "white")).toEqual({
      ok: false,
      message: "Position does not account for 15 checkers per side."
    });
  });

  it("is deterministic and does not mutate the input position", () => {
    const before = structuredClone(STARTING_POSITION);
    const first = translatePositionToGnuBgBoard(STARTING_POSITION, "white");
    const second = translatePositionToGnuBgBoard(STARTING_POSITION, "white");

    expect(first).toEqual(second);
    expect(STARTING_POSITION).toEqual(before);
  });

  it("produces mirrored roller-relative boards for mirrored single-checker positions", () => {
    const whiteMirror = createPosition({
      points: {
        24: { player: "white", checkerCount: 1 }
      },
      borneOff: {
        white: 14,
        black: 15
      }
    });
    const blackMirror = createPosition({
      points: {
        1: { player: "black", checkerCount: 1 }
      },
      borneOff: {
        white: 15,
        black: 14
      }
    });

    const whiteResult = translatePositionToGnuBgBoard(whiteMirror, "white");
    const blackResult = translatePositionToGnuBgBoard(blackMirror, "black");

    expect(whiteResult.ok && blackResult.ok).toBe(true);
    if (!whiteResult.ok || !blackResult.ok) {
      return;
    }

    expect(whiteResult.board.points[0]?.gnuPoint).toBe(24);
    expect(whiteResult.board.points[0]?.rollerCheckerCount).toBe(1);
    expect(whiteResult.board.points[0]?.opponentCheckerCount).toBe(0);
    expect(blackResult.board.points[0]?.gnuPoint).toBe(24);
    expect(blackResult.board.points[0]?.rollerCheckerCount).toBe(1);
    expect(blackResult.board.points[0]?.opponentCheckerCount).toBe(0);
  });
});
