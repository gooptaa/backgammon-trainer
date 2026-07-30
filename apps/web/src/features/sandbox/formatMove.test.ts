import { describe, expect, it } from "vitest";

import type { Move } from "@backgammon-trainer/backgammon-engine";
import { formatMove } from "./formatMove";

describe("formatMove", () => {
  it("formats ordinary movement while preserving step order", () => {
    const move: Move = {
      player: "white",
      steps: [
        {
          kind: "point-to-point",
          fromPoint: 13,
          toPoint: 8,
          dieValue: 5,
          dieIndex: 0,
          hitsBlot: false
        },
        {
          kind: "point-to-point",
          fromPoint: 8,
          toPoint: 5,
          dieValue: 3,
          dieIndex: 1,
          hitsBlot: false
        }
      ]
    };

    expect(formatMove(move)).toBe("13 -> 8, 8 -> 5");
  });

  it("formats bar entry", () => {
    const move: Move = {
      player: "white",
      steps: [
        {
          kind: "enter-from-bar",
          fromPoint: "bar",
          toPoint: 22,
          dieValue: 3,
          dieIndex: 0,
          hitsBlot: false
        }
      ]
    };

    expect(formatMove(move)).toBe("Bar -> 22");
  });

  it("formats hit annotation", () => {
    const move: Move = {
      player: "white",
      steps: [
        {
          kind: "point-to-point",
          fromPoint: 13,
          toPoint: 8,
          dieValue: 5,
          dieIndex: 0,
          hitsBlot: true,
          hit: {
            player: "black",
            point: 8
          }
        }
      ]
    };

    expect(formatMove(move)).toBe("13 -> 8 (hit)");
  });

  it("formats bearing off", () => {
    const move: Move = {
      player: "white",
      steps: [
        {
          kind: "bear-off",
          fromPoint: 6,
          toPoint: "off",
          dieValue: 6,
          dieIndex: 0,
          hitsBlot: false
        },
        {
          kind: "bear-off",
          fromPoint: 4,
          toPoint: "off",
          dieValue: 4,
          dieIndex: 1,
          hitsBlot: false
        }
      ]
    };

    expect(formatMove(move)).toBe("6 -> Off, 4 -> Off");
  });
});
