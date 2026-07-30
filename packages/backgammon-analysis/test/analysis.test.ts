import {
  applyMove,
  getLegalMoves,
  type DiceRoll,
  type Move
} from "@backgammon-trainer/backgammon-engine";
import * as engineModule from "@backgammon-trainer/backgammon-engine";
import { describe, expect, it, vi } from "vitest";
import type { Position as AnalysisPosition } from "../src/index";

import { analyzeLegalMoveOutcomes, analyzePosition, comparePositions } from "../src/index";

type BoardPosition = AnalysisPosition;
type Position = AnalysisPosition;

const STANDARD_STARTING_POSITION: Position = {
  points: {
    1: { player: "black", checkerCount: 2 },
    2: null,
    3: null,
    4: null,
    5: null,
    6: { player: "white", checkerCount: 5 },
    7: null,
    8: { player: "white", checkerCount: 3 },
    9: null,
    10: null,
    11: null,
    12: { player: "black", checkerCount: 5 },
    13: { player: "white", checkerCount: 5 },
    14: null,
    15: null,
    16: null,
    17: { player: "black", checkerCount: 3 },
    18: null,
    19: { player: "black", checkerCount: 5 },
    20: null,
    21: null,
    22: null,
    23: null,
    24: { player: "white", checkerCount: 2 }
  },
  bar: {
    white: 0,
    black: 0
  },
  borneOff: {
    white: 0,
    black: 0
  }
};

const createEmptyPoints = (): BoardPosition["points"] => ({
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
  7: null,
  8: null,
  9: null,
  10: null,
  11: null,
  12: null,
  13: null,
  14: null,
  15: null,
  16: null,
  17: null,
  18: null,
  19: null,
  20: null,
  21: null,
  22: null,
  23: null,
  24: null
});

const createPosition = (input?: {
  points?: Partial<BoardPosition["points"]>;
  bar?: Partial<BoardPosition["bar"]>;
  borneOff?: Partial<BoardPosition["borneOff"]>;
}): Position => {
  const points = {
    ...createEmptyPoints(),
    ...(input?.points ?? {})
  } as BoardPosition["points"];
  const bar = {
    white: input?.bar?.white ?? 0,
    black: input?.bar?.black ?? 0
  };

  let whiteOnBoard = 0;
  let blackOnBoard = 0;

  for (const point of Object.values(points)) {
    if (point === null) {
      continue;
    }

    if (point.player === "white") {
      whiteOnBoard += point.checkerCount;
    } else {
      blackOnBoard += point.checkerCount;
    }
  }

  const borneOff = {
    white: input?.borneOff?.white ?? 15 - whiteOnBoard - bar.white,
    black: input?.borneOff?.black ?? 15 - blackOnBoard - bar.black
  };

  return {
    points,
    bar,
    borneOff
  };
};

describe("analyzePosition", () => {
  it("computes starting position checker accounting and tied pip counts with contact", () => {
    const analysis = analyzePosition(STANDARD_STARTING_POSITION);

    expect(analysis.white.checkersOnBoard).toBe(15);
    expect(analysis.white.checkersOnBar).toBe(0);
    expect(analysis.white.checkersBorneOff).toBe(0);
    expect(analysis.white.totalCheckersAccountedFor).toBe(15);

    expect(analysis.black.checkersOnBoard).toBe(15);
    expect(analysis.black.checkersOnBar).toBe(0);
    expect(analysis.black.checkersBorneOff).toBe(0);
    expect(analysis.black.totalCheckersAccountedFor).toBe(15);

    expect(analysis.white.pipCount).toBe(167);
    expect(analysis.black.pipCount).toBe(167);
    expect(analysis.relationship.pipCountLeader).toBe("tied");
    expect(analysis.relationship.pipCountDifferenceWhiteMinusBlack).toBe(0);
    expect(analysis.relationship.contactStatus).toBe("contact");
  });

  it("counts white bar checkers as 25 pips each", () => {
    const position = createPosition({
      bar: { white: 1 },
      points: {
        1: { player: "black", checkerCount: 1 }
      }
    });

    const analysis = analyzePosition(position);
    expect(analysis.white.pipCount).toBe(25);
  });

  it("counts black bar checkers as 25 pips each", () => {
    const position = createPosition({
      bar: { black: 1 },
      points: {
        24: { player: "white", checkerCount: 1 }
      }
    });

    const analysis = analyzePosition(position);
    expect(analysis.black.pipCount).toBe(25);
  });

  it("treats borne-off checkers as zero pip contribution", () => {
    const position = createPosition();
    const analysis = analyzePosition(position);

    expect(analysis.white.pipCount).toBe(0);
    expect(analysis.black.pipCount).toBe(0);
  });

  it("detects white and black blot points with deterministic ordering", () => {
    const position = createPosition({
      points: {
        3: { player: "white", checkerCount: 1 },
        8: { player: "white", checkerCount: 1 },
        6: { player: "white", checkerCount: 2 },
        20: { player: "black", checkerCount: 1 },
        22: { player: "black", checkerCount: 1 },
        19: { player: "black", checkerCount: 2 }
      }
    });

    const analysis = analyzePosition(position);

    expect(analysis.white.blotCount).toBe(2);
    expect(analysis.white.blotPoints).toEqual([3, 8]);
    expect(analysis.black.blotCount).toBe(2);
    expect(analysis.black.blotPoints).toEqual([20, 22]);
  });

  it("classifies stacks of two or more as made points", () => {
    const position = createPosition({
      points: {
        5: { player: "white", checkerCount: 2 },
        7: { player: "white", checkerCount: 4 },
        19: { player: "black", checkerCount: 2 },
        21: { player: "black", checkerCount: 5 }
      }
    });

    const analysis = analyzePosition(position);

    expect(analysis.white.madePointCount).toBe(2);
    expect(analysis.white.madePoints).toEqual([5, 7]);
    expect(analysis.black.madePointCount).toBe(2);
    expect(analysis.black.madePoints).toEqual([19, 21]);
  });

  it("does not classify empty points as blots or made points", () => {
    const position = createPosition({
      points: {
        6: { player: "white", checkerCount: 2 },
        19: { player: "black", checkerCount: 2 }
      }
    });

    const analysis = analyzePosition(position);

    expect(analysis.white.blotCount).toBe(0);
    expect(analysis.black.blotCount).toBe(0);
    expect(analysis.white.madePoints).toEqual([6]);
    expect(analysis.black.madePoints).toEqual([19]);
  });

  it("detects made home-board points for white and black", () => {
    const position = createPosition({
      points: {
        1: { player: "white", checkerCount: 2 },
        6: { player: "white", checkerCount: 2 },
        8: { player: "white", checkerCount: 2 },
        19: { player: "black", checkerCount: 2 },
        24: { player: "black", checkerCount: 2 },
        17: { player: "black", checkerCount: 2 }
      }
    });

    const analysis = analyzePosition(position);

    expect(analysis.white.madeHomeBoardPointCount).toBe(2);
    expect(analysis.white.madeHomeBoardPoints).toEqual([1, 6]);
    expect(analysis.black.madeHomeBoardPointCount).toBe(2);
    expect(analysis.black.madeHomeBoardPoints).toEqual([19, 24]);
  });

  it("computes checkers in and outside home board", () => {
    const position = createPosition({
      points: {
        1: { player: "white", checkerCount: 3 },
        4: { player: "white", checkerCount: 2 },
        10: { player: "white", checkerCount: 4 },
        19: { player: "black", checkerCount: 3 },
        22: { player: "black", checkerCount: 1 },
        12: { player: "black", checkerCount: 3 }
      }
    });

    const analysis = analyzePosition(position);

    expect(analysis.white.checkersInHomeBoard).toBe(5);
    expect(analysis.white.checkersOutsideHomeBoard).toBe(4);
    expect(analysis.black.checkersInHomeBoard).toBe(4);
    expect(analysis.black.checkersOutsideHomeBoard).toBe(3);
  });

  it("computes occupied-point counts and ordered identifiers", () => {
    const position = createPosition({
      points: {
        2: { player: "white", checkerCount: 1 },
        8: { player: "white", checkerCount: 1 },
        14: { player: "white", checkerCount: 2 },
        11: { player: "black", checkerCount: 1 },
        19: { player: "black", checkerCount: 4 }
      }
    });

    const analysis = analyzePosition(position);

    expect(analysis.white.occupiedPointCount).toBe(3);
    expect(analysis.white.occupiedPoints).toEqual([2, 8, 14]);
    expect(analysis.black.occupiedPointCount).toBe(2);
    expect(analysis.black.occupiedPoints).toEqual([11, 19]);
  });

  it("detects white and black pip leaders with explicit sign convention", () => {
    const whiteLeading = createPosition({
      points: {
        1: { player: "white", checkerCount: 1 },
        20: { player: "black", checkerCount: 1 }
      }
    });
    const blackLeading = createPosition({
      points: {
        24: { player: "white", checkerCount: 1 },
        20: { player: "black", checkerCount: 1 }
      }
    });

    const whiteLeadAnalysis = analyzePosition(whiteLeading);
    const blackLeadAnalysis = analyzePosition(blackLeading);

    expect(whiteLeadAnalysis.relationship.pipCountLeader).toBe("white");
    expect(whiteLeadAnalysis.relationship.pipCountDifferenceWhiteMinusBlack).toBeLessThan(0);
    expect(blackLeadAnalysis.relationship.pipCountLeader).toBe("black");
    expect(blackLeadAnalysis.relationship.pipCountDifferenceWhiteMinusBlack).toBeGreaterThan(0);
  });

  it("classifies mirrored race positions as race", () => {
    const raceA = createPosition({
      points: {
        1: { player: "white", checkerCount: 1 },
        2: { player: "white", checkerCount: 1 },
        23: { player: "black", checkerCount: 1 },
        24: { player: "black", checkerCount: 1 }
      }
    });
    const raceB = createPosition({
      points: {
        1: { player: "white", checkerCount: 1 },
        2: { player: "white", checkerCount: 1 },
        23: { player: "black", checkerCount: 1 },
        24: { player: "black", checkerCount: 1 }
      }
    });

    expect(analyzePosition(raceA).relationship.contactStatus).toBe("race");
    expect(analyzePosition(raceB).relationship.contactStatus).toBe("race");
  });

  it("classifies any position with bar checkers as contact", () => {
    const whiteBar = createPosition({ bar: { white: 1 } });
    const blackBar = createPosition({ bar: { black: 1 } });

    expect(analyzePosition(whiteBar).relationship.contactStatus).toBe("contact");
    expect(analyzePosition(blackBar).relationship.contactStatus).toBe("contact");
  });

  it("does not infer contact status from pip difference alone", () => {
    const race = createPosition({
      points: {
        1: { player: "white", checkerCount: 1 },
        24: { player: "black", checkerCount: 1 }
      }
    });
    const contact = createPosition({
      points: {
        13: { player: "white", checkerCount: 1 },
        12: { player: "black", checkerCount: 1 }
      }
    });

    expect(analyzePosition(race).relationship.contactStatus).toBe("race");
    expect(analyzePosition(contact).relationship.contactStatus).toBe("contact");
  });

  it("does not mutate input and returns stable deterministic results", () => {
    const position = createPosition({
      points: {
        6: { player: "white", checkerCount: 3 },
        19: { player: "black", checkerCount: 3 }
      }
    });
    const before = JSON.parse(JSON.stringify(position)) as Position;

    const first = analyzePosition(position);
    const second = analyzePosition(position);

    expect(position).toEqual(before);
    expect(first).toEqual(second);
  });

  it("produces mirrored results for mirrored white/black fixtures", () => {
    const whiteFixture = createPosition({
      points: {
        2: { player: "white", checkerCount: 1 },
        5: { player: "white", checkerCount: 2 },
        20: { player: "black", checkerCount: 1 },
        23: { player: "black", checkerCount: 2 }
      },
      bar: {
        white: 1,
        black: 0
      }
    });

    const mirroredFixture = createPosition({
      points: {
        2: { player: "white", checkerCount: 2 },
        5: { player: "white", checkerCount: 1 },
        20: { player: "black", checkerCount: 2 },
        23: { player: "black", checkerCount: 1 }
      },
      bar: {
        white: 0,
        black: 1
      }
    });

    const left = analyzePosition(whiteFixture);
    const right = analyzePosition(mirroredFixture);

    expect(left.white.pipCount).toBe(right.black.pipCount);
    expect(left.black.pipCount).toBe(right.white.pipCount);
    expect(left.white.madePointCount).toBe(right.black.madePointCount);
    expect(left.black.blotCount).toBe(right.white.blotCount);
  });
});

describe("comparePositions", () => {
  it("uses after-minus-before sign convention for all tracked deltas", () => {
    const before = createPosition({
      points: {
        8: { player: "white", checkerCount: 1 },
        13: { player: "white", checkerCount: 2 },
        12: { player: "black", checkerCount: 1 },
        19: { player: "black", checkerCount: 2 }
      },
      bar: {
        white: 1,
        black: 0
      }
    });

    const after = createPosition({
      points: {
        6: { player: "white", checkerCount: 2 },
        13: { player: "white", checkerCount: 1 },
        21: { player: "black", checkerCount: 2 }
      },
      bar: {
        white: 0,
        black: 0
      },
      borneOff: {
        white: 12,
        black: 13
      }
    });

    const delta = comparePositions(before, after);

    expect(delta.white.pipCountDelta).toBe(
      analyzePosition(after).white.pipCount - analyzePosition(before).white.pipCount
    );
    expect(delta.black.pipCountDelta).toBe(
      analyzePosition(after).black.pipCount - analyzePosition(before).black.pipCount
    );
    expect(delta.white.blotCountDelta).toBe(
      analyzePosition(after).white.blotCount - analyzePosition(before).white.blotCount
    );
    expect(delta.white.madePointCountDelta).toBe(
      analyzePosition(after).white.madePointCount - analyzePosition(before).white.madePointCount
    );
    expect(delta.white.madeHomeBoardPointCountDelta).toBe(
      analyzePosition(after).white.madeHomeBoardPointCount -
        analyzePosition(before).white.madeHomeBoardPointCount
    );
    expect(delta.white.barCountDelta).toBe(
      analyzePosition(after).white.checkersOnBar - analyzePosition(before).white.checkersOnBar
    );
    expect(delta.black.barCountDelta).toBe(
      analyzePosition(after).black.checkersOnBar - analyzePosition(before).black.checkersOnBar
    );
    expect(delta.white.borneOffCountDelta).toBe(
      analyzePosition(after).white.checkersBorneOff - analyzePosition(before).white.checkersBorneOff
    );
    expect(delta.black.borneOffCountDelta).toBe(
      analyzePosition(after).black.checkersBorneOff - analyzePosition(before).black.checkersBorneOff
    );
    expect(delta.white.occupiedPointCountDelta).toBe(
      analyzePosition(after).white.occupiedPointCount -
        analyzePosition(before).white.occupiedPointCount
    );
    expect(delta.relationship.contactStatusBefore).toBe("contact");
    expect(delta.relationship.contactStatusAfter).toBe("race");
  });

  it("reports contact-to-race transition deterministically", () => {
    const before = createPosition({
      points: {
        13: { player: "white", checkerCount: 1 },
        12: { player: "black", checkerCount: 1 }
      }
    });

    const after = createPosition({
      points: {
        1: { player: "white", checkerCount: 1 },
        24: { player: "black", checkerCount: 1 }
      }
    });

    const delta = comparePositions(before, after);

    expect(delta.relationship.contactStatusBefore).toBe("contact");
    expect(delta.relationship.contactStatusAfter).toBe("race");
  });
});

const moveKey = (move: Move): string => {
  return move.steps
    .map((step) => {
      const hitKey = step.hit === undefined ? "" : `:${step.hit.player}:${step.hit.point}`;
      return `${step.kind}:${step.fromPoint}:${step.toPoint}:${step.dieValue}:${step.dieIndex}:${step.hitsBlot}${hitKey}`;
    })
    .join("|");
};

const findMoveBySteps = (
  moves: readonly Move[],
  steps: ReadonlyArray<{ fromPoint: number | "bar"; toPoint: number | "off" }>
): Move => {
  const found = moves.find(
    (move) =>
      move.steps.length === steps.length &&
      steps.every(
        (step, index) =>
          move.steps[index]?.fromPoint === step.fromPoint &&
          move.steps[index]?.toPoint === step.toPoint
      )
  );

  if (found === undefined) {
    throw new Error(`Expected move with steps ${JSON.stringify(steps)}`);
  }

  return found;
};

describe("analyzeLegalMoveOutcomes", () => {
  it("returns one outcome per complete legal move and preserves engine ordering", () => {
    const dice: DiceRoll = { dice: [5, 3] };
    const legalMoves = getLegalMoves({
      position: STANDARD_STARTING_POSITION,
      player: "white",
      roll: dice
    }).moves;

    const result = analyzeLegalMoveOutcomes(STANDARD_STARTING_POSITION, "white", dice);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.analysis.outcomes).toHaveLength(legalMoves.length);
    expect(result.analysis.outcomes.map((outcome) => moveKey(outcome.move))).toEqual(
      legalMoves.map((move) => moveKey(move))
    );
  });

  it("returns an empty outcomes list when no legal move exists", () => {
    const noMovePosition = createPosition({
      points: {
        8: { player: "white", checkerCount: 1 },
        7: { player: "black", checkerCount: 2 }
      },
      borneOff: {
        white: 14,
        black: 13
      }
    });
    const result = analyzeLegalMoveOutcomes(noMovePosition, "white", { dice: [1, 1] });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.analysis.outcomes).toHaveLength(0);
  });

  it("does not mutate input position or dice", () => {
    const positionBefore = JSON.parse(JSON.stringify(STANDARD_STARTING_POSITION)) as Position;
    const dice: DiceRoll = { dice: [5, 3] };
    const diceBefore = JSON.parse(JSON.stringify(dice)) as DiceRoll;

    const result = analyzeLegalMoveOutcomes(STANDARD_STARTING_POSITION, "white", dice);

    expect(result.ok).toBe(true);
    expect(STANDARD_STARTING_POSITION).toEqual(positionBefore);
    expect(dice).toEqual(diceBefore);
  });

  it("preserves canonical move metadata including die indices and hit metadata", () => {
    const hitPosition = createPosition({
      points: {
        8: { player: "white", checkerCount: 1 },
        7: { player: "black", checkerCount: 1 },
        5: { player: "white", checkerCount: 1 }
      },
      borneOff: {
        white: 13,
        black: 14
      }
    });
    const dice: DiceRoll = { dice: [1, 2] };
    const legalMoves = getLegalMoves({ position: hitPosition, player: "white", roll: dice }).moves;
    const hitMove = findMoveBySteps(legalMoves, [
      { fromPoint: 8, toPoint: 7 },
      { fromPoint: 5, toPoint: 3 }
    ]);

    const result = analyzeLegalMoveOutcomes(hitPosition, "white", dice);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const outcome = result.analysis.outcomes.find(
      (entry) => moveKey(entry.move) === moveKey(hitMove)
    );
    expect(outcome).toBeDefined();
    expect(outcome?.move.steps[0]?.dieIndex).toBe(hitMove.steps[0]?.dieIndex);
    expect(outcome?.move.steps[0]?.hitsBlot).toBe(true);
    expect(outcome?.move.steps[0]?.hit).toEqual({ player: "black", point: 7 });
  });

  it("keeps distinct canonical moves distinct even when results can coincide", () => {
    const position = createPosition({
      points: {
        8: { player: "white", checkerCount: 2 }
      },
      borneOff: {
        white: 13,
        black: 15
      }
    });
    const dice: DiceRoll = { dice: [1, 1] };
    const legalMoves = getLegalMoves({ position, player: "white", roll: dice }).moves;

    const result = analyzeLegalMoveOutcomes(position, "white", dice);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(new Set(result.analysis.outcomes.map((outcome) => moveKey(outcome.move))).size).toBe(
      legalMoves.length
    );
  });

  it("matches direct engine application and direct feature computations for each outcome", () => {
    const position = STANDARD_STARTING_POSITION;
    const dice: DiceRoll = { dice: [5, 3] };
    const result = analyzeLegalMoveOutcomes(position, "white", dice);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    for (const outcome of result.analysis.outcomes) {
      const applied = applyMove(position, "white", dice, outcome.move);
      expect(applied.ok).toBe(true);
      if (!applied.ok) {
        continue;
      }

      expect(outcome.positionAfter).toEqual(applied.position);
      expect(outcome.analysisAfter).toEqual(analyzePosition(applied.position));
      expect(outcome.featureDelta).toEqual(comparePositions(position, applied.position));
      expect(outcome.featureDelta.white.pipCountDelta).toBe(
        outcome.analysisAfter.white.pipCount - result.analysis.positionBefore.white.pipCount
      );
      expect(outcome.featureDelta.black.pipCountDelta).toBe(
        outcome.analysisAfter.black.pipCount - result.analysis.positionBefore.black.pipCount
      );
    }
  });

  it("reports hit outcomes with opponent bar increase", () => {
    const position = createPosition({
      points: {
        8: { player: "white", checkerCount: 1 },
        7: { player: "black", checkerCount: 1 },
        5: { player: "white", checkerCount: 1 }
      },
      borneOff: {
        white: 13,
        black: 14
      }
    });
    const result = analyzeLegalMoveOutcomes(position, "white", { dice: [1, 2] });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const hitOutcome = result.analysis.outcomes.find((outcome) => outcome.move.steps[0]?.hitsBlot);
    expect(hitOutcome).toBeDefined();
    expect(hitOutcome?.featureDelta.black.barCountDelta).toBe(1);
  });

  it("reports point-making and blot-leaving deltas", () => {
    const position = createPosition({
      points: {
        8: { player: "white", checkerCount: 2 },
        7: { player: "white", checkerCount: 1 }
      },
      borneOff: {
        white: 12,
        black: 15
      }
    });
    const result = analyzeLegalMoveOutcomes(position, "white", { dice: [1, 2] });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const makePoint = result.analysis.outcomes.find((outcome) =>
      outcome.move.steps.some((step) => step.toPoint === 6)
    );
    const leaveBlot = result.analysis.outcomes.find((outcome) =>
      outcome.move.steps.some((step) => step.fromPoint === 7)
    );

    expect(makePoint).toBeDefined();
    expect(makePoint?.featureDelta.white.madePointCountDelta).toBeGreaterThanOrEqual(0);
    expect(leaveBlot).toBeDefined();
    expect(leaveBlot?.featureDelta.white.blotCountDelta).toBeGreaterThanOrEqual(0);
  });

  it("analyzes bar-entry, bearing-off, same-checker-twice, and black-direction outcomes", () => {
    const barEntryPosition = createPosition({
      points: {
        8: { player: "white", checkerCount: 1 }
      },
      bar: {
        white: 1
      },
      borneOff: {
        white: 13,
        black: 14
      }
    });
    const barResult = analyzeLegalMoveOutcomes(barEntryPosition, "white", { dice: [1, 2] });
    expect(barResult.ok).toBe(true);
    if (barResult.ok) {
      const entryOutcome = barResult.analysis.outcomes.find((outcome) =>
        outcome.move.steps.some((step) => step.kind === "enter-from-bar")
      );
      expect(entryOutcome).toBeDefined();
      expect(entryOutcome?.featureDelta.white.barCountDelta).toBeLessThan(0);
    }

    const bearOffPosition = createPosition({
      points: {
        6: { player: "white", checkerCount: 1 },
        5: { player: "white", checkerCount: 1 }
      },
      borneOff: {
        white: 13,
        black: 14
      }
    });
    const bearOffResult = analyzeLegalMoveOutcomes(bearOffPosition, "white", { dice: [6, 1] });
    expect(bearOffResult.ok).toBe(true);
    if (bearOffResult.ok) {
      const offOutcome = bearOffResult.analysis.outcomes.find((outcome) =>
        outcome.move.steps.some((step) => step.kind === "bear-off")
      );
      expect(offOutcome).toBeDefined();
      expect(offOutcome?.featureDelta.white.borneOffCountDelta).toBeGreaterThan(0);
      expect(offOutcome?.featureDelta.white.pipCountDelta).toBeLessThan(0);
    }

    const sameCheckerPosition = createPosition({
      points: {
        8: { player: "white", checkerCount: 1 }
      },
      borneOff: {
        white: 14,
        black: 14
      }
    });
    const sameCheckerResult = analyzeLegalMoveOutcomes(sameCheckerPosition, "white", {
      dice: [1, 2]
    });
    expect(sameCheckerResult.ok).toBe(true);
    if (sameCheckerResult.ok) {
      const twoStepOutcome = sameCheckerResult.analysis.outcomes.find(
        (outcome) =>
          outcome.move.steps.length === 2 &&
          outcome.move.steps[0]?.fromPoint === 8 &&
          outcome.move.steps[0]?.toPoint === 7 &&
          outcome.move.steps[1]?.fromPoint === 7 &&
          outcome.move.steps[1]?.toPoint === 5
      );
      expect(twoStepOutcome).toBeDefined();
    }

    const blackPosition = createPosition({
      points: {
        1: { player: "black", checkerCount: 1 }
      },
      borneOff: {
        white: 14,
        black: 14
      }
    });
    const blackResult = analyzeLegalMoveOutcomes(blackPosition, "black", { dice: [1, 6] });
    expect(blackResult.ok).toBe(true);
    if (blackResult.ok) {
      expect(
        blackResult.analysis.outcomes.some((outcome) => outcome.analysisAfter.black.pipCount >= 0)
      ).toBe(true);
    }
  });

  it("reports relationship transitions including contact-to-race and race-to-race", () => {
    const contactPosition = createPosition({
      points: {
        13: { player: "white", checkerCount: 1 },
        12: { player: "black", checkerCount: 1 }
      },
      borneOff: {
        white: 14,
        black: 14
      }
    });
    const contactResult = analyzeLegalMoveOutcomes(contactPosition, "white", { dice: [6, 1] });

    expect(contactResult.ok).toBe(true);
    if (contactResult.ok) {
      expect(
        contactResult.analysis.outcomes.some(
          (outcome) =>
            outcome.featureDelta.relationship.contactStatusBefore === "contact" &&
            outcome.featureDelta.relationship.contactStatusAfter === "race"
        )
      ).toBe(true);
    }

    const racePosition = createPosition({
      points: {
        1: { player: "white", checkerCount: 1 },
        24: { player: "black", checkerCount: 1 }
      },
      borneOff: {
        white: 14,
        black: 14
      }
    });
    const raceResult = analyzeLegalMoveOutcomes(racePosition, "white", { dice: [1, 1] });

    expect(raceResult.ok).toBe(true);
    if (raceResult.ok) {
      expect(
        raceResult.analysis.outcomes.every(
          (outcome) =>
            outcome.featureDelta.relationship.contactStatusBefore === "race" &&
            outcome.featureDelta.relationship.contactStatusAfter === "race"
        )
      ).toBe(true);
    }
  });

  it("returns stable results across repeated calls and isolates nested references", () => {
    const dice: DiceRoll = { dice: [5, 3] };
    const first = analyzeLegalMoveOutcomes(STANDARD_STARTING_POSITION, "white", dice);
    const second = analyzeLegalMoveOutcomes(STANDARD_STARTING_POSITION, "white", dice);

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    expect(first.analysis.outcomes.length).toBeGreaterThan(1);
    const firstOutcome = first.analysis.outcomes[0];
    const secondOutcome = first.analysis.outcomes[1];
    if (firstOutcome === undefined || secondOutcome === undefined) {
      throw new Error("Expected at least two outcomes.");
    }

    const originalSecondPip = secondOutcome.analysisAfter.white.pipCount;
    const mutableFirst = firstOutcome as unknown as {
      analysisAfter: { white: { pipCount: number } };
      move: { steps: Array<{ dieIndex: number }> };
    };
    mutableFirst.analysisAfter.white.pipCount = -999;
    mutableFirst.move.steps[0]!.dieIndex = 3;

    expect(secondOutcome.analysisAfter.white.pipCount).toBe(originalSecondPip);
    expect(secondOutcome.move.steps[0]?.dieIndex).not.toBe(3);
  });

  it("surfaces engine/legal-move invariant failures through the explicit failure contract", () => {
    const applyMoveSpy = vi.spyOn(engineModule, "applyMove");
    applyMoveSpy.mockReturnValueOnce({ ok: false, reason: "illegal-move" });

    const result = analyzeLegalMoveOutcomes(STANDARD_STARTING_POSITION, "white", {
      dice: [5, 3]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("engine-transition-failed");
      expect(result.message).toContain("legal move");
    }

    applyMoveSpy.mockRestore();
  });
});
