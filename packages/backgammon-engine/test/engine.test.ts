import { describe, expect, it } from "vitest";
import { validateBoardPosition } from "@backgammon-trainer/backgammon-domain";

import {
  getLegalMoves,
  type GetLegalMovesInput,
  type LegalMoveResult,
  type Move,
  type MoveStep
} from "../src/index";
import {
  BAR_ENTRY_EXAMPLE_FIXTURE,
  BEARING_OFF_EXAMPLE_FIXTURE,
  EMPTY_BOARD_FIXTURE,
  INITIAL_POSITION_FIXTURE,
  SINGLE_CHECKER_FIXTURE,
  createEmptyPoints,
  createPosition
} from "./fixtures/boardFixtures";

describe("backgammon engine exports", () => {
  it("exports getLegalMoves", () => {
    expect(getLegalMoves).toBeTypeOf("function");
  });

  it("exposes move model types", () => {
    const step: MoveStep = {
      kind: "point-to-point",
      fromPoint: 24,
      toPoint: 18,
      dieValue: 6,
      hitsBlot: false
    };
    const move: Move = {
      player: "white",
      steps: [step]
    };
    const result: LegalMoveResult = {
      moves: [move]
    };

    expect(result.moves[0]?.steps[0]?.kind).toBe("point-to-point");
  });
});

describe("getLegalMoves stub", () => {
  it("returns an empty move collection", () => {
    const input: GetLegalMovesInput = {
      position: INITIAL_POSITION_FIXTURE,
      player: "white"
    };
    const result = getLegalMoves(input);

    expect(result).toEqual({ moves: [] });
    expect(Array.isArray(result.moves)).toBe(true);
    expect(result.moves).toHaveLength(0);
  });
});

describe("engine fixtures", () => {
  it("provides readable named positions", () => {
    const fixtures = [
      INITIAL_POSITION_FIXTURE,
      EMPTY_BOARD_FIXTURE,
      SINGLE_CHECKER_FIXTURE,
      BEARING_OFF_EXAMPLE_FIXTURE,
      BAR_ENTRY_EXAMPLE_FIXTURE
    ];

    expect(fixtures).toHaveLength(5);
  });

  it("produces complete point maps from helper", () => {
    const points = createEmptyPoints();

    expect(Object.keys(points)).toHaveLength(24);
  });

  it("creates valid board positions for current fixture set", () => {
    const fixtures = [
      INITIAL_POSITION_FIXTURE,
      EMPTY_BOARD_FIXTURE,
      SINGLE_CHECKER_FIXTURE,
      BEARING_OFF_EXAMPLE_FIXTURE,
      BAR_ENTRY_EXAMPLE_FIXTURE,
      createPosition({
        points: {
          6: { player: "white", checkerCount: 1 },
          19: { player: "black", checkerCount: 1 }
        },
        borneOff: {
          white: 14,
          black: 14
        }
      })
    ];

    for (const fixture of fixtures) {
      expect(validateBoardPosition(fixture)).toEqual({ valid: true });
    }
  });
});
