import { describe, expect, it, vi } from "vitest";

import { rollOpeningDice } from "./rollOpeningDice";

describe("rollOpeningDice", () => {
  it("returns tie outcomes explicitly without rerolling", () => {
    const random = vi.fn<() => number>().mockReturnValueOnce(0.4).mockReturnValueOnce(0.4);

    expect(rollOpeningDice(random)).toEqual({
      outcome: "tie",
      whiteDie: 3,
      blackDie: 3
    });
    expect(random).toHaveBeenCalledTimes(2);
  });

  it("resolves white start with white and black dice preserved", () => {
    const random = vi.fn<() => number>().mockReturnValueOnce(0.99).mockReturnValueOnce(0.0);

    expect(rollOpeningDice(random)).toEqual({
      outcome: "resolved",
      whiteDie: 6,
      blackDie: 1,
      startingPlayer: "white",
      dice: {
        dice: [6, 1]
      }
    });
  });

  it("resolves black start with white and black dice preserved", () => {
    const random = vi.fn<() => number>().mockReturnValueOnce(0.0).mockReturnValueOnce(0.99);

    expect(rollOpeningDice(random)).toEqual({
      outcome: "resolved",
      whiteDie: 1,
      blackDie: 6,
      startingPlayer: "black",
      dice: {
        dice: [1, 6]
      }
    });
  });

  it("clamps generated values into 1..6", () => {
    const pairs: ReadonlyArray<readonly [number, number]> = [
      [-1, 1],
      [Number.NaN, Number.POSITIVE_INFINITY],
      [0.5, 0.99999]
    ];

    for (const [first, second] of pairs) {
      const random = vi.fn<() => number>().mockReturnValueOnce(first).mockReturnValueOnce(second);
      const result = rollOpeningDice(random);

      expect(result.whiteDie).toBeGreaterThanOrEqual(1);
      expect(result.whiteDie).toBeLessThanOrEqual(6);
      expect(result.blackDie).toBeGreaterThanOrEqual(1);
      expect(result.blackDie).toBeLessThanOrEqual(6);
    }
  });
});
