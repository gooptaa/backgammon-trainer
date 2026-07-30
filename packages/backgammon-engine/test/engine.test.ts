import { describe, expect, it } from "vitest";

import { getLegalMoves, type GetLegalMovesInput, type LegalMove } from "../src/index";

describe("backgammon engine exports", () => {
  it("exports getLegalMoves", () => {
    expect(getLegalMoves).toBeTypeOf("function");
  });

  it("exposes engine input and output types", () => {
    const moves = getLegalMoves(null as unknown as GetLegalMovesInput);
    const isReadonlyMoveList: readonly LegalMove[] = moves;

    expect(Array.isArray(isReadonlyMoveList)).toBe(true);
  });
});

describe("getLegalMoves stub", () => {
  it("returns an empty move list", () => {
    const input = null as unknown as GetLegalMovesInput;

    expect(getLegalMoves(input)).toEqual([]);
  });
});
