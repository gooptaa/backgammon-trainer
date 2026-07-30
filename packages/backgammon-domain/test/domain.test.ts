import { describe, expect, it } from "vitest";

import { createInitialCubeState } from "../src/index";

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
