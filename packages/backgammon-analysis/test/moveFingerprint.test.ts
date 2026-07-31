import { describe, expect, it } from "vitest";
import type { Move } from "@backgammon-trainer/backgammon-engine";

import { getMoveFingerprint } from "../src/index";

const createMove = (overrides?: Partial<Move>): Move => {
  return {
    player: "white",
    steps: [
      {
        kind: "point-to-point",
        fromPoint: 8,
        toPoint: 7,
        dieValue: 1,
        dieIndex: 0,
        hitsBlot: false
      },
      {
        kind: "point-to-point",
        fromPoint: 7,
        toPoint: 5,
        dieValue: 2,
        dieIndex: 1,
        hitsBlot: false
      }
    ],
    ...overrides
  };
};

describe("getMoveFingerprint", () => {
  it("returns identical fingerprints for identical canonical moves", () => {
    const left = createMove();
    const right = createMove();

    expect(getMoveFingerprint(left)).toBe(getMoveFingerprint(right));
  });

  it("changes when step order changes", () => {
    const move = createMove();
    const reordered = createMove({
      steps: [move.steps[1]!, move.steps[0]!]
    });

    expect(getMoveFingerprint(move)).not.toBe(getMoveFingerprint(reordered));
  });

  it("changes when point coordinates change", () => {
    const move = createMove();
    const moved = createMove({
      steps: [
        {
          ...move.steps[0]!,
          toPoint: 6
        },
        move.steps[1]!
      ]
    });

    expect(getMoveFingerprint(move)).not.toBe(getMoveFingerprint(moved));
  });

  it("changes when step kind changes", () => {
    const move = createMove();
    const changed = createMove({
      steps: [
        {
          ...move.steps[0]!,
          kind: "enter-from-bar",
          fromPoint: "bar"
        },
        move.steps[1]!
      ]
    });

    expect(getMoveFingerprint(move)).not.toBe(getMoveFingerprint(changed));
  });

  it("changes when die value changes", () => {
    const move = createMove();
    const changed = createMove({
      steps: [
        {
          ...move.steps[0]!,
          dieValue: 2
        },
        move.steps[1]!
      ]
    });

    expect(getMoveFingerprint(move)).not.toBe(getMoveFingerprint(changed));
  });

  it("changes when die index changes", () => {
    const move = createMove();
    const changed = createMove({
      steps: [
        {
          ...move.steps[0]!,
          dieIndex: 1
        },
        move.steps[1]!
      ]
    });

    expect(getMoveFingerprint(move)).not.toBe(getMoveFingerprint(changed));
  });

  it("changes when hit metadata changes", () => {
    const move = createMove();
    const changed = createMove({
      steps: [
        {
          ...move.steps[0]!,
          hitsBlot: true,
          hit: {
            player: "black",
            point: 7
          }
        },
        move.steps[1]!
      ]
    });

    expect(getMoveFingerprint(move)).not.toBe(getMoveFingerprint(changed));
  });

  it("keeps coordinate-equivalent canonical moves distinguishable", () => {
    const moveA = createMove({
      steps: [
        {
          kind: "point-to-point",
          fromPoint: 8,
          toPoint: 7,
          dieValue: 1,
          dieIndex: 0,
          hitsBlot: false
        },
        {
          kind: "point-to-point",
          fromPoint: 7,
          toPoint: 6,
          dieValue: 1,
          dieIndex: 1,
          hitsBlot: false
        }
      ]
    });
    const moveB = createMove({
      steps: [
        {
          kind: "point-to-point",
          fromPoint: 8,
          toPoint: 7,
          dieValue: 1,
          dieIndex: 2,
          hitsBlot: false
        },
        {
          kind: "point-to-point",
          fromPoint: 7,
          toPoint: 6,
          dieValue: 1,
          dieIndex: 3,
          hitsBlot: false
        }
      ]
    });

    expect(getMoveFingerprint(moveA)).not.toBe(getMoveFingerprint(moveB));
  });

  it("is deterministic", () => {
    const move = createMove();

    expect(getMoveFingerprint(move)).toBe(getMoveFingerprint(move));
  });

  it("does not mutate moves", () => {
    const move = createMove();
    const before = JSON.parse(JSON.stringify(move)) as Move;

    void getMoveFingerprint(move);

    expect(move).toEqual(before);
  });
});
