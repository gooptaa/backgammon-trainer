import { describe, expect, it, vi } from "vitest";

import { rollDice } from "./rollDice";

describe("rollDice", () => {
  it("supports deterministic injection", () => {
    const random = vi.fn<() => number>().mockReturnValueOnce(0.0).mockReturnValueOnce(0.99);

    expect(rollDice(random)).toEqual({ dice: [1, 6] });
  });

  it("always returns die values in range 1..6", () => {
    const randomValues = [-1, 0, 0.2, 0.7, 0.999999, 1, Number.NaN, Number.POSITIVE_INFINITY];

    for (const randomValue of randomValues) {
      const result = rollDice(() => randomValue);

      expect(result.dice[0]).toBeGreaterThanOrEqual(1);
      expect(result.dice[0]).toBeLessThanOrEqual(6);
      expect(result.dice[1]).toBeGreaterThanOrEqual(1);
      expect(result.dice[1]).toBeLessThanOrEqual(6);
    }
  });

  it("generates both dice independently", () => {
    const random = vi.fn<() => number>().mockReturnValueOnce(0.0).mockReturnValueOnce(0.5);

    const result = rollDice(random);

    expect(random).toHaveBeenCalledTimes(2);
    expect(result.dice).toEqual([1, 4]);
  });
});
