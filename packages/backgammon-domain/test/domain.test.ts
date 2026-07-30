import { describe, expect, it } from "vitest";

import {
  STANDARD_STARTING_POSITION,
  countPlayerCheckers,
  createInitialCubeState,
  getPointOccupancy,
  validateBoardPosition,
  type BoardPosition
} from "../src/index";

const extractCodes = (position: unknown): readonly string[] => {
  const result = validateBoardPosition(position);
  return result.valid ? [] : result.errors.map((error) => error.code);
};

describe("board position", () => {
  it("starting position is valid", () => {
    expect(validateBoardPosition(STANDARD_STARTING_POSITION)).toEqual({ valid: true });
  });

  it("starting position has exactly 15 checkers for each player", () => {
    expect(countPlayerCheckers(STANDARD_STARTING_POSITION, "white")).toBe(15);
    expect(countPlayerCheckers(STANDARD_STARTING_POSITION, "black")).toBe(15);
  });

  it("invalidates a position with 14 or 16 total checkers for a player", () => {
    const fourteenCheckers: BoardPosition = {
      ...STANDARD_STARTING_POSITION,
      points: {
        ...STANDARD_STARTING_POSITION.points,
        6: { player: "white", checkerCount: 4 }
      }
    };

    const sixteenCheckers: BoardPosition = {
      ...STANDARD_STARTING_POSITION,
      bar: { ...STANDARD_STARTING_POSITION.bar, black: 1 }
    };

    expect(extractCodes(fourteenCheckers)).toContain("INVALID_PLAYER_CHECKER_TOTAL");
    expect(extractCodes(sixteenCheckers)).toContain("INVALID_PLAYER_CHECKER_TOTAL");
  });

  it("invalidates a negative bar count", () => {
    const invalid: BoardPosition = {
      ...STANDARD_STARTING_POSITION,
      bar: { ...STANDARD_STARTING_POSITION.bar, white: -1 }
    };

    expect(extractCodes(invalid)).toContain("INVALID_BAR_COUNT");
  });

  it("invalidates zero or negative occupied-point checker counts", () => {
    const zeroCount: BoardPosition = {
      ...STANDARD_STARTING_POSITION,
      points: {
        ...STANDARD_STARTING_POSITION.points,
        24: { player: "white", checkerCount: 0 }
      }
    };

    const negativeCount: BoardPosition = {
      ...STANDARD_STARTING_POSITION,
      points: {
        ...STANDARD_STARTING_POSITION.points,
        1: { player: "black", checkerCount: -1 }
      }
    };

    expect(extractCodes(zeroCount)).toContain("INVALID_POINT_CHECKER_COUNT");
    expect(extractCodes(negativeCount)).toContain("INVALID_POINT_CHECKER_COUNT");
  });

  it("invalidates a non-integer occupied-point checker count", () => {
    const invalid: BoardPosition = {
      ...STANDARD_STARTING_POSITION,
      points: {
        ...STANDARD_STARTING_POSITION.points,
        13: { player: "white", checkerCount: 4.5 }
      }
    };

    expect(extractCodes(invalid)).toContain("INVALID_POINT_CHECKER_COUNT");
  });

  it("uses the canonical absolute point-numbering convention for starting position", () => {
    expect(getPointOccupancy(STANDARD_STARTING_POSITION, 24)).toEqual({
      player: "white",
      checkerCount: 2
    });
    expect(getPointOccupancy(STANDARD_STARTING_POSITION, 13)).toEqual({
      player: "white",
      checkerCount: 5
    });
    expect(getPointOccupancy(STANDARD_STARTING_POSITION, 8)).toEqual({
      player: "white",
      checkerCount: 3
    });
    expect(getPointOccupancy(STANDARD_STARTING_POSITION, 6)).toEqual({
      player: "white",
      checkerCount: 5
    });
    expect(getPointOccupancy(STANDARD_STARTING_POSITION, 1)).toEqual({
      player: "black",
      checkerCount: 2
    });
    expect(getPointOccupancy(STANDARD_STARTING_POSITION, 12)).toEqual({
      player: "black",
      checkerCount: 5
    });
    expect(getPointOccupancy(STANDARD_STARTING_POSITION, 17)).toEqual({
      player: "black",
      checkerCount: 3
    });
    expect(getPointOccupancy(STANDARD_STARTING_POSITION, 19)).toEqual({
      player: "black",
      checkerCount: 5
    });
  });

  it("returns multiple detectable validation errors in one pass", () => {
    const invalid: BoardPosition = {
      ...STANDARD_STARTING_POSITION,
      bar: { ...STANDARD_STARTING_POSITION.bar, white: -1 },
      points: {
        ...STANDARD_STARTING_POSITION.points,
        24: { player: "white", checkerCount: 0 }
      }
    };
    const invalidWithExtraPointKey = invalid as BoardPosition & {
      points: BoardPosition["points"] & Record<string, unknown>;
    };
    invalidWithExtraPointKey.points[25] = { player: "black", checkerCount: 1 };

    const result = validateBoardPosition(invalidWithExtraPointKey);
    expect(result.valid).toBe(false);
    if (result.valid) {
      return;
    }

    const codes = result.errors.map((error) => error.code);
    expect(codes).toContain("INVALID_BAR_COUNT");
    expect(codes).toContain("INVALID_POINT_CHECKER_COUNT");
    expect(codes).toContain("INVALID_POINT_INDEX");
    expect(result.errors.length).toBeGreaterThan(2);
  });
});

describe("createInitialCubeState", () => {
  it("returns a centered cube with value 1 and both players allowed to double", () => {
    expect(createInitialCubeState()).toEqual({
      value: 1,
      owner: "center",
      canDouble: {
        white: true,
        black: true
      }
    });
  });
});
