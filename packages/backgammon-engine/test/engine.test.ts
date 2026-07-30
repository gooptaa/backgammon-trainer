import { describe, expect, it } from "vitest";

import {
  getLegalMoves,
  type GetLegalMovesInput,
  type LegalMoveResult,
  type Move,
  type MoveStep
} from "../src/index";

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
    const input = null as unknown as GetLegalMovesInput;
    const result = getLegalMoves(input);

    expect(result).toEqual({ moves: [] });
    expect(Array.isArray(result.moves)).toBe(true);
    expect(result.moves).toHaveLength(0);
  });
});
