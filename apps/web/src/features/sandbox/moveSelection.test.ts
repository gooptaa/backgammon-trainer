import { describe, expect, it } from "vitest";
import type { Move } from "@backgammon-trainer/backgammon-engine";

import {
  filterCandidateMoves,
  formatSelectedStep,
  formatSelectedStepsBreadcrumb,
  getSelectableDestinations,
  getSelectableSources,
  getSingleCompletedMove,
  moveStartsWithSelectedSteps,
  type SelectedStep
} from "./moveSelection";

const LEGAL_MOVES: readonly Move[] = [
  {
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
  },
  {
    player: "white",
    steps: [
      {
        kind: "point-to-point",
        fromPoint: 13,
        toPoint: 10,
        dieValue: 3,
        dieIndex: 1,
        hitsBlot: false
      },
      {
        kind: "point-to-point",
        fromPoint: 10,
        toPoint: 5,
        dieValue: 5,
        dieIndex: 0,
        hitsBlot: false
      }
    ]
  },
  {
    player: "white",
    steps: [
      {
        kind: "enter-from-bar",
        fromPoint: "bar",
        toPoint: 22,
        dieValue: 3,
        dieIndex: 0,
        hitsBlot: false
      },
      {
        kind: "point-to-point",
        fromPoint: 13,
        toPoint: 8,
        dieValue: 5,
        dieIndex: 1,
        hitsBlot: false
      }
    ]
  }
];

describe("moveSelection helper", () => {
  it("matches move prefixes by selected step from/to pairs", () => {
    const selectedSteps: readonly SelectedStep[] = [{ fromPoint: 13, toPoint: 8 }];

    expect(moveStartsWithSelectedSteps(LEGAL_MOVES[0] as Move, selectedSteps)).toBe(true);
    expect(moveStartsWithSelectedSteps(LEGAL_MOVES[1] as Move, selectedSteps)).toBe(false);
  });

  it("narrows candidate moves based on selected prefix", () => {
    const selectedSteps: readonly SelectedStep[] = [{ fromPoint: 13, toPoint: 8 }];
    const candidates = filterCandidateMoves(LEGAL_MOVES, selectedSteps);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toEqual(LEGAL_MOVES[0]);
  });

  it("derives selectable sources from next candidate steps", () => {
    const sources = getSelectableSources(LEGAL_MOVES, []);

    expect(sources).toContain(13);
    expect(sources).toContain("bar");
  });

  it("derives selectable destinations for a selected source", () => {
    const destinations = getSelectableDestinations(LEGAL_MOVES, [], 13);

    expect(destinations).toContain(8);
    expect(destinations).toContain(10);
    expect(destinations).not.toContain(22);
  });

  it("returns a unique completed move once no longer alternatives remain", () => {
    const selectedSteps: readonly SelectedStep[] = [
      { fromPoint: 13, toPoint: 8 },
      { fromPoint: 8, toPoint: 5 }
    ];
    const candidates = filterCandidateMoves(LEGAL_MOVES, selectedSteps);

    expect(getSingleCompletedMove(candidates, selectedSteps)).toEqual(LEGAL_MOVES[0]);
  });

  it("completes visibly identical bear-offs that differ only by die order", () => {
    const candidates: readonly Move[] = [
      {
        player: "black",
        steps: [
          {
            kind: "bear-off",
            fromPoint: 23,
            toPoint: "off",
            dieValue: 4,
            dieIndex: 0,
            hitsBlot: false
          },
          {
            kind: "bear-off",
            fromPoint: 23,
            toPoint: "off",
            dieValue: 5,
            dieIndex: 1,
            hitsBlot: false
          }
        ]
      },
      {
        player: "black",
        steps: [
          {
            kind: "bear-off",
            fromPoint: 23,
            toPoint: "off",
            dieValue: 5,
            dieIndex: 1,
            hitsBlot: false
          },
          {
            kind: "bear-off",
            fromPoint: 23,
            toPoint: "off",
            dieValue: 4,
            dieIndex: 0,
            hitsBlot: false
          }
        ]
      }
    ];

    expect(
      getSingleCompletedMove(candidates, [
        { fromPoint: 23, toPoint: "off" },
        { fromPoint: 23, toPoint: "off" }
      ])
    ).toBe(candidates[0]);
  });

  it("does not treat a shorter completion as final when longer candidates remain", () => {
    const syntheticCandidates: readonly Move[] = [
      {
        player: "white",
        steps: [
          {
            kind: "point-to-point",
            fromPoint: 13,
            toPoint: 8,
            dieValue: 5,
            dieIndex: 0,
            hitsBlot: false
          }
        ]
      },
      LEGAL_MOVES[0] as Move
    ];

    const selectedSteps: readonly SelectedStep[] = [{ fromPoint: 13, toPoint: 8 }];

    expect(getSingleCompletedMove(syntheticCandidates, selectedSteps)).toBeNull();
  });

  it("formats breadcrumb preserving selected step order", () => {
    const selectedSteps: readonly SelectedStep[] = [
      { fromPoint: 13, toPoint: 8 },
      { fromPoint: 8, toPoint: 6 }
    ];

    expect(formatSelectedStepsBreadcrumb(selectedSteps)).toBe("13 -> 8 -> 6");
  });

  it("formats bar and off labels for breadcrumb step text", () => {
    expect(formatSelectedStepsBreadcrumb([{ fromPoint: "bar", toPoint: 22 }])).toBe("Bar -> 22");
    expect(formatSelectedStep({ fromPoint: 6, toPoint: "off" })).toBe("6 -> Off");
  });
});
