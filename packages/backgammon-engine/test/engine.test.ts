import { describe, expect, it } from "vitest";
import { validateBoardPosition } from "@backgammon-trainer/backgammon-domain";

import {
  applyMove,
  type ApplyMoveFailureReason,
  type DiceRoll,
  getLegalMoves,
  type GetLegalMovesInput,
  type LegalMoveResult,
  type Move,
  type MoveStep
} from "../src/index";
import {
  BLACK_BEAR_OFF_EXACT_FIXTURE,
  BLACK_BEAR_OFF_OVERSIZED_ALLOWED_FIXTURE,
  BLACK_BEAR_OFF_OVERSIZED_BLOCKED_FIXTURE,
  BLACK_BEAR_OFF_SEQUENCE_LEGALITY_SHIFT_FIXTURE,
  BLACK_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
  BLACK_FORWARD_FIXTURE,
  WHITE_BAR_AND_ORDINARY_MIXED_FIXTURE,
  WHITE_BAR_BOTH_DICE_SEQUENCE_FIXTURE,
  WHITE_BAR_BLOCKED_ENTRY_FIXTURE,
  WHITE_BAR_DUPLICATE_DICE_FIXTURE,
  WHITE_BAR_ENTRY_THEN_ORDINARY_MOVE_FIXTURE,
  WHITE_BAR_HIT_ENTRY_FIXTURE,
  WHITE_BAR_ONLY_ONE_DIE_PLAYABLE_FIXTURE,
  WHITE_BAR_SINGLE_CHECKER_FIXTURE,
  WHITE_BAR_TWO_DICE_DIFFERENT_DESTINATIONS_FIXTURE,
  WHITE_BOTH_DICE_BOTH_ORDERS_SEQUENCE_FIXTURE,
  WHITE_BOTH_DICE_INDIVIDUAL_ONLY_FIXTURE,
  WHITE_BOTH_DICE_ONE_ORDER_SEQUENCE_FIXTURE,
  WHITE_BLOCKED_BAR_WITH_ORDINARY_OPPORTUNITY_FIXTURE,
  BAR_ENTRY_EXAMPLE_FIXTURE,
  BEARING_OFF_EXAMPLE_FIXTURE,
  EMPTY_BOARD_FIXTURE,
  INITIAL_POSITION_FIXTURE,
  WHITE_ORDINARY_ONLY_MANDATORY_ENTRY_FIXTURE,
  SINGLE_CHECKER_FIXTURE,
  WHITE_BLOCKED_DESTINATION_FIXTURE,
  WHITE_HIT_AND_BLOCKED_DESTINATIONS_FIXTURE,
  WHITE_MULTIPLE_HIT_OPPORTUNITIES_FIXTURE,
  WHITE_MULTIPLE_BLOCKED_DESTINATIONS_FIXTURE,
  WHITE_MULTIPLE_MOVES_FIXTURE,
  WHITE_ONLY_LARGER_DIE_PLAYABLE_FIXTURE,
  WHITE_ONLY_SMALLER_DIE_PLAYABLE_FIXTURE,
  WHITE_BEAR_OFF_ALL_HOME_FIXTURE,
  WHITE_BEAR_OFF_BAR_PRESENT_FIXTURE,
  WHITE_BEAR_OFF_EXACT_FIXTURE,
  WHITE_BEAR_OFF_FARTHEST_ONLY_FIXTURE,
  WHITE_BEAR_OFF_ONLY_ONE_DIE_PLAYABLE_FIXTURE,
  WHITE_BEAR_OFF_OUTSIDE_HOME_FIXTURE,
  WHITE_BEAR_OFF_OVERSIZED_ALLOWED_FIXTURE,
  WHITE_BEAR_OFF_OVERSIZED_BLOCKED_FIXTURE,
  WHITE_BEAR_OFF_SEQUENCE_LEGALITY_SHIFT_FIXTURE,
  WHITE_BAR_ENTRY_ON_OWN_POINT_FIXTURE,
  WHITE_DOUBLE_BEAR_OFF_FEWER_PLAYS_FIXTURE,
  WHITE_DOUBLE_BEAR_OFF_FOUR_PLAYS_FIXTURE,
  WHITE_DOUBLE_BEAR_OFF_OVERSIZED_SHIFT_FIXTURE,
  WHITE_DOUBLE_BAR_ENTRY_THEN_ORDINARY_FIXTURE,
  WHITE_DOUBLE_DIFFERENT_CHECKERS_SEQUENCE_FIXTURE,
  WHITE_DOUBLE_ENTRY_HIT_SEQUENCE_FIXTURE,
  WHITE_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
  WHITE_DOUBLE_LATER_STEP_BLOCKED_FIXTURE,
  WHITE_DOUBLE_MULTIPLE_BAR_ENTRIES_FIXTURE,
  WHITE_DOUBLE_NO_PLAY_FIXTURE,
  WHITE_DOUBLE_ONE_PLAY_FIXTURE,
  WHITE_DOUBLE_ORDINARY_HIT_SEQUENCE_FIXTURE,
  WHITE_DOUBLE_SAME_CHECKER_FOUR_PLAYS_FIXTURE,
  WHITE_DOUBLE_THREE_PLAYS_FIXTURE,
  WHITE_DOUBLE_TWO_PLAYS_FIXTURE,
  WHITE_OPEN_DESTINATION_FIXTURE,
  WHITE_ONE_ORDER_CONTINUES_OTHER_STOPS_FIXTURE,
  WHITE_ONE_DESTINATION_FIXTURE,
  WHITE_NO_SECOND_STEP_AFTER_VALID_FIRST_FIXTURE,
  WHITE_SINGLE_HIT_DESTINATION_FIXTURE,
  WHITE_TWO_DICE_DIFFERENT_CHECKERS_SEQUENCE_FIXTURE,
  WHITE_TWO_DICE_INDEPENDENT_FIXTURE,
  WHITE_TWO_DICE_INDEPENDENT_HITS_FIXTURE,
  WHITE_TWO_DICE_SAME_CHECKER_SEQUENCE_FIXTURE,
  WHITE_HIT_THEN_SECOND_MOVE_FIXTURE,
  WHITE_ORDERING_AND_DUPLICATE_AUDIT_FIXTURE,
  WHITE_OWN_STACK_MULTIPLE_FIXTURE,
  WHITE_OWN_STACK_SINGLE_FIXTURE,
  createEmptyPoints,
  createPosition
} from "./fixtures/boardFixtures";

const getMoveSemanticKey = (move: Move, includeDieIndex: boolean): string => {
  const stepKey = move.steps
    .map((step) => {
      const hitKey = step.hit === undefined ? "" : `:${step.hit.player}:${step.hit.point}`;
      const dieIndexKey = includeDieIndex ? `:${step.dieIndex}` : "";
      return `${step.kind}:${step.fromPoint}:${step.toPoint}:${step.dieValue}${dieIndexKey}:${step.hitsBlot}${hitKey}`;
    })
    .join("|");

  return `${move.player}::${stepKey}`;
};

const hasSemanticDuplicates = (moves: readonly Move[], includeDieIndex: boolean): boolean => {
  const keys = moves.map((move) => getMoveSemanticKey(move, includeDieIndex));
  return new Set(keys).size !== keys.length;
};

const requireLegalMove = (
  input: GetLegalMovesInput,
  predicate: (move: Move) => boolean,
  label: string
): Move => {
  const legalMoves = getLegalMoves(input).moves;
  const selectedMove = legalMoves.find(predicate);

  if (selectedMove === undefined) {
    throw new Error(`Expected legal move for ${label}`);
  }

  return selectedMove;
};

const expectApplyFailureReason = (
  result: ReturnType<typeof applyMove>,
  reason: ApplyMoveFailureReason
): void => {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.reason).toBe(reason);
  }
};

describe("backgammon engine exports", () => {
  it("exports getLegalMoves", () => {
    expect(getLegalMoves).toBeTypeOf("function");
  });

  it("exports applyMove", () => {
    expect(applyMove).toBeTypeOf("function");
  });

  it("exposes move model types", () => {
    const step: MoveStep = {
      kind: "point-to-point",
      fromPoint: 24,
      toPoint: 18,
      dieValue: 6,
      dieIndex: 0,
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

describe("getLegalMoves basic forward generation", () => {
  it("supports dice-aware input shape", () => {
    const roll: DiceRoll = {
      dice: [6, 1]
    };

    expect(roll.dice[0]).toBe(6);
    expect(roll.dice[1]).toBe(1);
  });

  it("generates a legal move to an empty destination", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_OPEN_DESTINATION_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.fromPoint === 24 &&
          move.steps[0]?.toPoint === 23 &&
          move.steps[0]?.dieValue === 1
      )
    ).toBe(true);
  });

  it("excludes moves that land on blocked destinations", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BLOCKED_DESTINATION_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toEqual([]);
  });

  it("excludes moves when multiple destinations are blocked", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_MULTIPLE_BLOCKED_DESTINATIONS_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toEqual([]);
  });

  it("generates a hit move against a single opposing checker", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_SINGLE_HIT_DESTINATION_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(
      result.moves.some((move) => move.steps[0]?.hitsBlot && move.steps[0]?.toPoint === 23)
    ).toBe(true);
  });

  it("includes hit metadata on generated hit moves", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_SINGLE_HIT_DESTINATION_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);
    const firstStep = result.moves[0]?.steps[0];

    expect(firstStep?.hitsBlot).toBe(true);
    expect(firstStep?.hit).toEqual({
      player: "black",
      point: 23
    });
  });

  it("keeps blocked destinations excluded when hit and blocked options coexist", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_HIT_AND_BLOCKED_DESTINATIONS_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(1);
    expect(result.moves[0]?.steps[0]?.toPoint).toBe(23);
    expect(result.moves[0]?.steps[0]?.hitsBlot).toBe(true);
  });

  it("preserves die association across ordered non-double hit sequences", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_HIT_THEN_SECOND_MOVE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.some((move) => move.steps[0]?.hitsBlot)).toBe(true);
    expect(
      result.moves.some(
        (move) =>
          move.steps.length === 2 && move.steps[0]?.dieIndex === 0 && move.steps[1]?.dieIndex === 1
      )
    ).toBe(true);
  });

  it("generates multiple independent hit opportunities", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_MULTIPLE_HIT_OPPORTUNITIES_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(2);
    expect(result.moves.every((move) => move.steps[0]?.hitsBlot)).toBe(true);
    expect(
      result.moves.some((move) => move.steps[0]?.toPoint === 23 && move.steps[0]?.dieValue === 1)
    ).toBe(true);
    expect(
      result.moves.some((move) => move.steps[0]?.toPoint === 22 && move.steps[0]?.dieValue === 2)
    ).toBe(true);
  });

  it("supports both dice producing independent hits from different starting points", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_TWO_DICE_INDEPENDENT_HITS_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThanOrEqual(2);
    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.fromPoint === 24 &&
          move.steps[0]?.toPoint === 23 &&
          move.steps[0]?.dieValue === 1 &&
          move.steps[0]?.hitsBlot
      )
    ).toBe(true);
    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.fromPoint === 13 &&
          move.steps[0]?.toPoint === 11 &&
          move.steps[0]?.dieValue === 2 &&
          move.steps[0]?.hitsBlot
      )
    ).toBe(true);
  });

  it("generates moves from one die when the other die has no legal destination", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_NO_SECOND_STEP_AFTER_VALID_FIRST_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };
    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(1);
    expect(result.moves[0]?.steps[0]?.fromPoint).toBe(2);
    expect(result.moves[0]?.steps[0]?.toPoint).toBe(1);
    expect(result.moves[0]?.steps[0]?.dieValue).toBe(1);
    expect(result.moves[0]?.steps[0]?.dieIndex).toBe(0);
  });

  it("generates both dice as independent moves", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_TWO_DICE_INDEPENDENT_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };
    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(2);
    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.fromPoint === 24 &&
          move.steps[0]?.toPoint === 23 &&
          move.steps[0]?.dieValue === 1 &&
          move.steps[0]?.dieIndex === 0
      )
    ).toBe(true);
    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.fromPoint === 24 &&
          move.steps[0]?.toPoint === 22 &&
          move.steps[0]?.dieValue === 2 &&
          move.steps[0]?.dieIndex === 1
      )
    ).toBe(true);
  });

  it("preserves die association for non-double two-die sequences", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_TWO_DICE_SAME_CHECKER_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };
    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(
      result.moves.some(
        (move) =>
          move.steps.length === 2 && move.steps[0]?.dieIndex === 0 && move.steps[1]?.dieIndex === 1
      )
    ).toBe(true);
  });

  it("returns empty when no simple move exists", () => {
    const noCheckerInput: GetLegalMovesInput = {
      position: EMPTY_BOARD_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    expect(getLegalMoves(noCheckerInput)).toEqual({ moves: [] });
  });

  it("generates black forward movement", () => {
    const input: GetLegalMovesInput = {
      position: BLACK_FORWARD_FIXTURE,
      player: "black",
      roll: {
        dice: [1, 6]
      }
    };
    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(2);
    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.fromPoint === 1 &&
          move.steps[0]?.toPoint === 2 &&
          move.steps[0]?.dieValue === 1
      )
    ).toBe(true);
    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.fromPoint === 1 &&
          move.steps[0]?.toPoint === 7 &&
          move.steps[0]?.dieValue === 6
      )
    ).toBe(true);
  });

  it("supports multiple independent starting points with dice-aware generation", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_MULTIPLE_MOVES_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };
    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThanOrEqual(4);
    expect(
      result.moves.some((move) => move.steps[0]?.fromPoint === 24 && move.steps[0]?.toPoint === 23)
    ).toBe(true);
    expect(
      result.moves.some((move) => move.steps[0]?.fromPoint === 13 && move.steps[0]?.toPoint === 11)
    ).toBe(true);
  });

  it("keeps API shape compatible with move result container", () => {
    const input: GetLegalMovesInput = {
      position: INITIAL_POSITION_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };
    const result = getLegalMoves(input);

    expect(Array.isArray(result.moves)).toBe(true);
    expect(result).toHaveProperty("moves");
  });

  it("generates legal entry moves onto empty points", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_SINGLE_CHECKER_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(2);
    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.kind === "enter-from-bar" &&
          move.steps[0]?.fromPoint === "bar" &&
          move.steps[0]?.toPoint === 24 &&
          move.steps[0]?.dieValue === 1
      )
    ).toBe(true);
    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.kind === "enter-from-bar" &&
          move.steps[0]?.fromPoint === "bar" &&
          move.steps[0]?.toPoint === 23 &&
          move.steps[0]?.dieValue === 2
      )
    ).toBe(true);
  });

  it("excludes blocked bar entry destinations", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_BLOCKED_ENTRY_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toEqual([]);
  });

  it("generates hit moves on bar entry against a single opposing checker", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_HIT_ENTRY_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.kind === "enter-from-bar" &&
          move.steps[0]?.hitsBlot &&
          move.steps[0]?.hit?.point === 24
      )
    ).toBe(true);
  });

  it("preserves die association for non-double bar entry sequencing", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_BOTH_DICE_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps[0]?.kind === "enter-from-bar")).toBe(true);
    expect(
      result.moves.some(
        (move) =>
          move.steps.length === 2 && move.steps[0]?.dieIndex === 0 && move.steps[1]?.dieIndex === 1
      )
    ).toBe(true);
  });

  it("keeps ordinary move generation unchanged when no bar checker exists", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_ORDINARY_ONLY_MANDATORY_ENTRY_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(2);
    expect(result.moves.every((move) => move.steps[0]?.kind === "point-to-point")).toBe(true);
  });

  it("suppresses ordinary moves when bar checkers exist", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_AND_ORDINARY_MIXED_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThanOrEqual(2);
    expect(result.moves.every((move) => move.steps[0]?.kind === "enter-from-bar")).toBe(true);
  });

  it("returns only entry moves while checkers remain on the bar", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_SINGLE_CHECKER_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(2);
    expect(result.moves.every((move) => move.steps[0]?.kind === "enter-from-bar")).toBe(true);
  });

  it("returns no moves when bar entry is blocked even if ordinary moves exist", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BLOCKED_BAR_WITH_ORDINARY_OPPORTUNITY_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toEqual([]);
  });

  it("supports mixed ordinary and bar-entry positions by returning only legal entries", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_AND_ORDINARY_MIXED_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) => move.steps[0]?.kind === "enter-from-bar" && move.steps[0]?.toPoint === 24
      )
    ).toBe(true);
    expect(result.moves.some((move) => move.steps[0]?.kind === "point-to-point")).toBe(false);
  });

  it("supports both dice producing different bar-entry destinations", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_TWO_DICE_DIFFERENT_DESTINATIONS_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThanOrEqual(2);
    expect(
      result.moves.some(
        (move) => move.steps[0]?.kind === "enter-from-bar" && move.steps[0]?.toPoint === 24
      )
    ).toBe(true);
    expect(
      result.moves.some(
        (move) => move.steps[0]?.kind === "enter-from-bar" && move.steps[0]?.toPoint === 23
      )
    ).toBe(true);
  });

  it("assembles two legal steps into one turn-level move", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_TWO_DICE_SAME_CHECKER_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThanOrEqual(2);
    expect(result.moves.every((move) => move.steps.length === 2)).toBe(true);
  });

  it("preserves ordered step sequence and explores both die orders", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_TWO_DICE_SAME_CHECKER_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some((move) => move.steps[0]?.dieIndex === 0 && move.steps[1]?.dieIndex === 1)
    ).toBe(true);
    expect(
      result.moves.some((move) => move.steps[0]?.dieIndex === 1 && move.steps[1]?.dieIndex === 0)
    ).toBe(true);
  });

  it("moves the same checker twice across a two-step candidate", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_TWO_DICE_SAME_CHECKER_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.toPoint !== "off" && move.steps[0]?.toPoint === move.steps[1]?.fromPoint
      )
    ).toBe(true);
  });

  it("can move different checkers across two ordered steps", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_TWO_DICE_DIFFERENT_CHECKERS_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.fromPoint !== "bar" &&
          move.steps[1]?.fromPoint !== "bar" &&
          move.steps[0]?.fromPoint !== move.steps[1]?.fromPoint
      )
    ).toBe(true);
  });

  it("applies hit effects in temporary state for second-step generation", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_HIT_THEN_SECOND_MOVE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.hitsBlot === true &&
          move.steps[0]?.fromPoint === 8 &&
          move.steps[0]?.toPoint === 7 &&
          move.steps[1]?.fromPoint === 7 &&
          move.steps[1]?.toPoint === 5
      )
    ).toBe(true);
  });

  it("applies bar-entry effects in temporary state for second-step generation", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_ENTRY_THEN_ORDINARY_MOVE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.kind === "enter-from-bar" &&
          move.steps[0]?.toPoint === 24 &&
          move.steps[1]?.kind === "point-to-point" &&
          move.steps[1]?.fromPoint === 24 &&
          move.steps[1]?.toPoint === 22
      )
    ).toBe(true);
  });

  it("preserves one-step candidates when no legal continuation exists", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_NO_SECOND_STEP_AFTER_VALID_FIRST_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.some((move) => move.steps.length === 1)).toBe(true);
    expect(
      result.moves.some(
        (move) =>
          move.steps.length === 1 &&
          move.steps[0]?.fromPoint === 2 &&
          move.steps[0]?.toPoint === 1 &&
          move.steps[0]?.dieIndex === 0
      )
    ).toBe(true);
  });

  it("keeps one die order continuation while preserving one-step for the other order", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_ONE_ORDER_CONTINUES_OTHER_STOPS_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 2)).toBe(true);
  });

  it("suppresses one-step turns when at least one two-step turn exists", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BOTH_DICE_ONE_ORDER_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 2)).toBe(true);
  });

  it("keeps both die orders when each order yields a complete turn", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BOTH_DICE_BOTH_ORDERS_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.every((move) => move.steps.length === 2)).toBe(true);
    expect(
      result.moves.some((move) => move.steps[0]?.dieIndex === 0 && move.steps[1]?.dieIndex === 1)
    ).toBe(true);
    expect(
      result.moves.some((move) => move.steps[0]?.dieIndex === 1 && move.steps[1]?.dieIndex === 0)
    ).toBe(true);
  });

  it("selects larger-die candidates when no two-step turn exists and larger die is playable", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_ONLY_LARGER_DIE_PLAYABLE_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 3]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 1)).toBe(true);
    expect(result.moves.every((move) => move.steps[0]?.dieValue === 6)).toBe(true);
  });

  it("returns smaller-die candidates when larger die cannot be played", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_ONLY_SMALLER_DIE_PLAYABLE_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 3]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 1)).toBe(true);
    expect(result.moves.every((move) => move.steps[0]?.dieValue === 3)).toBe(true);
  });

  it("keeps only larger-die moves when both dice are individually playable but no two-step exists", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BOTH_DICE_INDIVIDUAL_ONLY_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 3]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 1)).toBe(true);
    expect(result.moves.every((move) => move.steps[0]?.dieValue === 6)).toBe(true);
  });

  it("preserves hit metadata after dice-usage filtering", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_HIT_THEN_SECOND_MOVE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some((move) => move.steps[0]?.hitsBlot && move.steps[0]?.hit?.point === 7)
    ).toBe(true);
  });

  it("preserves mandatory bar-entry and entry metadata through filtering", () => {
    const completeTurnInput: GetLegalMovesInput = {
      position: WHITE_BAR_BOTH_DICE_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };
    const oneDieInput: GetLegalMovesInput = {
      position: WHITE_BAR_ONLY_ONE_DIE_PLAYABLE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const completeTurnResult = getLegalMoves(completeTurnInput);
    const oneDieResult = getLegalMoves(oneDieInput);

    expect(completeTurnResult.moves.every((move) => move.steps[0]?.kind === "enter-from-bar")).toBe(
      true
    );
    expect(completeTurnResult.moves.every((move) => move.steps.length === 2)).toBe(true);
    expect(oneDieResult.moves.every((move) => move.steps[0]?.kind === "enter-from-bar")).toBe(true);
    expect(oneDieResult.moves.every((move) => move.steps[0]?.dieValue === 1)).toBe(true);
  });

  it("generates exact bearing-off steps when all checkers are in home board", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_EXACT_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.some((move) => move.steps[0]?.kind === "bear-off")).toBe(true);
    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.kind === "bear-off" &&
          move.steps[0]?.fromPoint === 6 &&
          move.steps[0]?.toPoint === "off" &&
          move.steps[0]?.dieValue === 6
      )
    ).toBe(true);
  });

  it("prohibits bearing off when any checker remains outside the home board", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_OUTSIDE_HOME_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 3]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.some((move) => move.steps[0]?.kind === "bear-off")).toBe(false);
  });

  it("prohibits bearing off while a checker is on the bar", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_BAR_PRESENT_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps[0]?.kind === "enter-from-bar")).toBe(true);
    expect(result.moves.some((move) => move.steps[0]?.kind === "bear-off")).toBe(false);
  });

  it("allows oversized bearing off when no checker is on a higher point", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_OVERSIZED_ALLOWED_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.kind === "bear-off" &&
          move.steps[0]?.fromPoint === 5 &&
          move.steps[0]?.toPoint === "off" &&
          move.steps[0]?.dieValue === 6
      )
    ).toBe(true);
  });

  it("prohibits oversized bearing off when a checker remains on a higher point", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_OVERSIZED_BLOCKED_FIXTURE,
      player: "white",
      roll: {
        dice: [4, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.kind === "bear-off" &&
          move.steps[0]?.fromPoint === 3 &&
          move.steps[0]?.dieValue === 4
      )
    ).toBe(false);
  });

  it("uses only the farthest eligible point for oversized bearing off", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_FARTHEST_ONLY_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) => move.steps[0]?.kind === "bear-off" && move.steps[0]?.fromPoint === 5
      )
    ).toBe(true);
    expect(
      result.moves.some(
        (move) => move.steps[0]?.kind === "bear-off" && move.steps[0]?.fromPoint === 4
      )
    ).toBe(false);
  });

  it("preserves die value and dieIndex on bearing-off steps", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_ONLY_ONE_DIE_PLAYABLE_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 3]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps[0]?.kind === "bear-off")).toBe(true);
    expect(result.moves.every((move) => move.steps[0]?.dieValue === 6)).toBe(true);
    expect(result.moves.every((move) => move.steps[0]?.dieIndex === 0)).toBe(true);
  });

  it("supports bearing-off legality for both player directions", () => {
    const whiteInput: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_EXACT_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 1]
      }
    };
    const blackInput: GetLegalMovesInput = {
      position: BLACK_BEAR_OFF_EXACT_FIXTURE,
      player: "black",
      roll: {
        dice: [6, 1]
      }
    };

    const whiteResult = getLegalMoves(whiteInput);
    const blackResult = getLegalMoves(blackInput);

    expect(
      whiteResult.moves.some(
        (move) =>
          move.steps[0]?.kind === "bear-off" &&
          move.steps[0]?.fromPoint === 6 &&
          move.steps[0]?.dieValue === 6
      )
    ).toBe(true);
    expect(
      blackResult.moves.some(
        (move) =>
          move.steps[0]?.kind === "bear-off" &&
          move.steps[0]?.fromPoint === 19 &&
          move.steps[0]?.dieValue === 6
      )
    ).toBe(true);
  });

  it("applies bearing-off steps in temporary state for second-step generation", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_SEQUENCE_LEGALITY_SHIFT_FIXTURE,
      player: "white",
      roll: {
        dice: [3, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps.length === 2 &&
          move.steps[0]?.kind === "bear-off" &&
          move.steps[0]?.fromPoint === 3 &&
          move.steps[1]?.kind === "bear-off" &&
          move.steps[1]?.fromPoint === 1
      )
    ).toBe(true);
  });

  it("supports black bearing-off sequence shifts and oversized legality", () => {
    const sequenceInput: GetLegalMovesInput = {
      position: BLACK_BEAR_OFF_SEQUENCE_LEGALITY_SHIFT_FIXTURE,
      player: "black",
      roll: {
        dice: [3, 2]
      }
    };
    const oversizedAllowedInput: GetLegalMovesInput = {
      position: BLACK_BEAR_OFF_OVERSIZED_ALLOWED_FIXTURE,
      player: "black",
      roll: {
        dice: [6, 1]
      }
    };
    const oversizedBlockedInput: GetLegalMovesInput = {
      position: BLACK_BEAR_OFF_OVERSIZED_BLOCKED_FIXTURE,
      player: "black",
      roll: {
        dice: [4, 1]
      }
    };

    const sequenceResult = getLegalMoves(sequenceInput);
    const oversizedAllowedResult = getLegalMoves(oversizedAllowedInput);
    const oversizedBlockedResult = getLegalMoves(oversizedBlockedInput);

    expect(sequenceResult.moves.some((move) => move.steps.length === 2)).toBe(true);
    expect(
      oversizedAllowedResult.moves.some(
        (move) => move.steps[0]?.kind === "bear-off" && move.steps[0]?.fromPoint === 20
      )
    ).toBe(true);
    expect(
      oversizedBlockedResult.moves.some(
        (move) => move.steps[0]?.kind === "bear-off" && move.steps[0]?.dieValue === 4
      )
    ).toBe(false);
  });

  it("assembles two legal bearing-off steps into one move and suppresses incomplete turns", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BOTH_DICE_ONE_ORDER_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 2)).toBe(true);
  });

  it("keeps larger-die preference in bearing-off positions when only one die can be used", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_ONLY_ONE_DIE_PLAYABLE_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 3]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 1)).toBe(true);
    expect(result.moves.every((move) => move.steps[0]?.dieValue === 6)).toBe(true);
  });

  it("expands doubles to four ordered steps when four plays are legal", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 4)).toBe(true);
  });

  it("assigns doubles die uses with ordered dieIndex values 0..3", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    for (const move of result.moves) {
      expect(move.steps).toHaveLength(4);
      expect(move.steps.map((step) => step.dieValue)).toEqual([1, 1, 1, 1]);
      expect(move.steps.map((step) => step.dieIndex)).toEqual([0, 1, 2, 3]);
    }
  });

  it("returns only three-step doubles candidates when four plays are impossible", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_THREE_PLAYS_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 3)).toBe(true);
  });

  it("returns only two-step doubles candidates when three plays are impossible", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_TWO_PLAYS_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 2)).toBe(true);
  });

  it("returns one-step doubles candidates when no second play exists", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_ONE_PLAY_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 1)).toBe(true);
  });

  it("returns no moves when doubles are fully blocked", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_NO_PLAY_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    expect(getLegalMoves(input).moves).toEqual([]);
  });

  it("allows moving the same checker repeatedly in a doubles sequence", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_SAME_CHECKER_FOUR_PLAYS_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some((move) => {
        if (move.steps.length !== 4) {
          return false;
        }

        return move.steps.every((step, index) => {
          if (index === 0) {
            return step.fromPoint === 8 && step.toPoint === 7;
          }

          return step.fromPoint === move.steps[index - 1]?.toPoint;
        });
      })
    ).toBe(true);
  });

  it("allows moving different checkers within one doubles sequence", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_DIFFERENT_CHECKERS_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some((move) => {
        const fromPoints = move.steps
          .map((step) => step.fromPoint)
          .filter((fromPoint) => fromPoint !== "bar");
        return new Set(fromPoints).size > 1;
      })
    ).toBe(true);
  });

  it("recalculates legality after each doubles step", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_LATER_STEP_BLOCKED_FIXTURE,
      player: "white",
      roll: {
        dice: [2, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(1);
    expect(result.moves[0]?.steps).toHaveLength(1);
    expect(result.moves[0]?.steps[0]?.fromPoint).toBe(8);
    expect(result.moves[0]?.steps[0]?.toPoint).toBe(6);
    expect(result.moves[0]?.steps[0]?.dieIndex).toBe(0);
  });

  it("enforces mandatory bar entry at each depth for doubles", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_MULTIPLE_BAR_ENTRIES_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length >= 2)).toBe(true);
    expect(result.moves.every((move) => move.steps[0]?.kind === "enter-from-bar")).toBe(true);
    expect(result.moves.every((move) => move.steps[1]?.kind === "enter-from-bar")).toBe(true);
  });

  it("supports bar entry followed by ordinary movement on doubles", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_BAR_ENTRY_THEN_ORDINARY_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps.length === 4 &&
          move.steps[0]?.kind === "enter-from-bar" &&
          move.steps.slice(1).some((step) => step.kind === "point-to-point")
      )
    ).toBe(true);
  });

  it("updates temporary position after entry hits in doubles sequences", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_ENTRY_HIT_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps.length === 4 &&
          move.steps[0]?.kind === "enter-from-bar" &&
          move.steps[0]?.hitsBlot &&
          move.steps[0]?.hit?.point === 24 &&
          move.steps[1]?.fromPoint === 24
      )
    ).toBe(true);
  });

  it("updates temporary position after ordinary hits in doubles sequences", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_ORDINARY_HIT_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps.length === 4 &&
          move.steps[0]?.kind === "point-to-point" &&
          move.steps[0]?.hitsBlot &&
          move.steps[0]?.hit?.point === 7 &&
          move.steps[1]?.fromPoint === 7
      )
    ).toBe(true);
  });

  it("supports four-step doubles bearing-off turns", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_BEAR_OFF_FOUR_PLAYS_FIXTURE,
      player: "white",
      roll: {
        dice: [4, 4]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 4)).toBe(true);
    expect(result.moves.every((move) => move.steps.every((step) => step.kind === "bear-off"))).toBe(
      true
    );
  });

  it("returns maximum playable doubles step count in bearing-off positions", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_BEAR_OFF_FEWER_PLAYS_FIXTURE,
      player: "white",
      roll: {
        dice: [2, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 2)).toBe(true);
  });

  it("recalculates exact and oversized bearing-off legality after each doubles step", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_BEAR_OFF_OVERSIZED_SHIFT_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 6]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps.length === 4 &&
          move.steps.every((step) => step.kind === "bear-off") &&
          move.steps.map((step) => step.fromPoint).join(",") === "6,5,4,3"
      )
    ).toBe(true);
  });

  it("supports equivalent doubles expansion behavior for black movement direction", () => {
    const input: GetLegalMovesInput = {
      position: BLACK_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
      player: "black",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps.length === 4)).toBe(true);
    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.fromPoint === 17 &&
          move.steps[0]?.toPoint === 18 &&
          move.steps[3]?.toPoint === 21
      )
    ).toBe(true);
  });

  it("does not mutate the original input position during candidate expansion", () => {
    const original = WHITE_DOUBLE_ENTRY_HIT_SEQUENCE_FIXTURE;
    const snapshot = structuredClone(original);

    const input: GetLegalMovesInput = {
      position: original,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    getLegalMoves(input);

    expect(original).toEqual(snapshot);
  });
});

describe("applyMove public API", () => {
  it("applies an ordinary one-checker movement", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_NO_SECOND_STEP_AFTER_VALID_FIRST_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const move = requireLegalMove(
      input,
      (candidate) =>
        candidate.steps.length === 1 &&
        candidate.steps[0]?.fromPoint === 2 &&
        candidate.steps[0]?.toPoint === 1,
      "ordinary one-checker move"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.position.points[2]).toBeNull();
      expect(result.position.points[1]).toEqual({ player: "white", checkerCount: 1 });
    }
  });

  it("applies movement onto an own occupied point", () => {
    const input: GetLegalMovesInput = {
      position: createPosition({
        points: {
          8: { player: "white", checkerCount: 1 },
          7: { player: "white", checkerCount: 1 },
          6: { player: "black", checkerCount: 2 },
          5: { player: "black", checkerCount: 2 }
        },
        borneOff: {
          white: 13,
          black: 11
        }
      }),
      player: "white",
      roll: { dice: [2, 1] }
    };
    const move = requireLegalMove(
      input,
      (candidate) =>
        candidate.steps.length === 1 &&
        candidate.steps[0]?.fromPoint === 8 &&
        candidate.steps[0]?.toPoint === 7,
      "stack onto one own checker"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.position.points[8]).toBeNull();
      expect(result.position.points[7]).toEqual({ player: "white", checkerCount: 2 });
    }
  });

  it("applies a two-step non-double turn", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_TWO_DICE_SAME_CHECKER_SEQUENCE_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const move = requireLegalMove(
      input,
      (candidate) => candidate.steps.length === 2,
      "two-step turn"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.position.points[8]).toBeNull();
      expect(result.position.points[5]).toEqual({ player: "white", checkerCount: 1 });
    }
  });

  it("applies both legal die orders according to each move step order", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BOTH_DICE_BOTH_ORDERS_SEQUENCE_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const firstOrderMove = requireLegalMove(
      input,
      (candidate) =>
        candidate.steps.length === 2 &&
        candidate.steps[0]?.dieIndex === 0 &&
        candidate.steps[1]?.dieIndex === 1,
      "die order 0->1"
    );
    const secondOrderMove = requireLegalMove(
      input,
      (candidate) =>
        candidate.steps.length === 2 &&
        candidate.steps[0]?.dieIndex === 1 &&
        candidate.steps[1]?.dieIndex === 0,
      "die order 1->0"
    );

    const firstOrderResult = applyMove(input.position, input.player, input.roll, firstOrderMove);
    const secondOrderResult = applyMove(input.position, input.player, input.roll, secondOrderMove);

    expect(firstOrderResult.ok).toBe(true);
    expect(secondOrderResult.ok).toBe(true);
  });

  it("applies an ordinary hit and transfers the opposing checker to bar", () => {
    const input: GetLegalMovesInput = {
      position: createPosition({
        points: {
          8: { player: "white", checkerCount: 1 },
          7: { player: "black", checkerCount: 1 },
          6: { player: "black", checkerCount: 2 },
          5: { player: "black", checkerCount: 2 }
        },
        borneOff: {
          white: 14,
          black: 10
        }
      }),
      player: "white",
      roll: { dice: [1, 2] }
    };
    const move = requireLegalMove(
      input,
      (candidate) => candidate.steps[0]?.hitsBlot === true,
      "ordinary hit sequence"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.position.bar.black).toBe(1);
      expect(result.position.points[7]).toEqual({ player: "white", checkerCount: 1 });
    }
  });

  it("applies bar entry and removes a checker from the active player's bar", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_SINGLE_CHECKER_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const move = requireLegalMove(
      input,
      (candidate) => candidate.steps[0]?.kind === "enter-from-bar",
      "bar entry"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.position.bar.white).toBe(0);
    }
  });

  it("applies entry hit and transfers the opposing checker to bar", () => {
    const input: GetLegalMovesInput = {
      position: createPosition({
        points: {
          24: { player: "black", checkerCount: 1 },
          23: { player: "black", checkerCount: 2 },
          22: { player: "black", checkerCount: 2 }
        },
        bar: {
          white: 1
        },
        borneOff: {
          white: 14,
          black: 10
        }
      }),
      player: "white",
      roll: { dice: [1, 2] }
    };
    const move = requireLegalMove(
      input,
      (candidate) => candidate.steps[0]?.kind === "enter-from-bar" && candidate.steps[0]?.hitsBlot,
      "entry hit"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.position.bar.white).toBe(0);
      expect(result.position.bar.black).toBe(1);
      expect(result.position.points[24]).toEqual({ player: "white", checkerCount: 1 });
    }
  });

  it("applies exact bearing off and increments borne-off count", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_EXACT_FIXTURE,
      player: "white",
      roll: { dice: [6, 1] }
    };
    const move = requireLegalMove(
      input,
      (candidate) => candidate.steps[0]?.kind === "bear-off" && candidate.steps[0]?.fromPoint === 6,
      "exact bear-off"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.position.borneOff.white).toBe(input.position.borneOff.white + 1);
      expect(result.position.points[6]).toBeNull();
    }
  });

  it("applies oversized bearing off correctly", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BEAR_OFF_OVERSIZED_ALLOWED_FIXTURE,
      player: "white",
      roll: { dice: [6, 1] }
    };
    const move = requireLegalMove(
      input,
      (candidate) => candidate.steps[0]?.kind === "bear-off" && candidate.steps[0]?.fromPoint === 5,
      "oversized bear-off"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.position.borneOff.white).toBe(input.position.borneOff.white + 1);
      expect(result.position.points[5]).toBeNull();
    }
  });

  it("applies a four-step doubles turn", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
      player: "white",
      roll: { dice: [1, 1] }
    };
    const move = requireLegalMove(
      input,
      (candidate) => candidate.steps.length === 4,
      "four-step doubles turn"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.position.borneOff.white).toBe(input.position.borneOff.white);
      expect(result.position.bar.white).toBe(input.position.bar.white);
      expect(result.position.bar.black).toBe(input.position.bar.black);
    }
  });

  it("applies doubles turns with fewer than four mandatory plays", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_TWO_PLAYS_FIXTURE,
      player: "white",
      roll: { dice: [1, 1] }
    };
    const move = requireLegalMove(
      input,
      (candidate) => candidate.steps.length === 2,
      "short mandatory doubles turn"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.position.borneOff.white).toBe(input.position.borneOff.white);
    }
  });

  it("applies black-direction movement", () => {
    const input: GetLegalMovesInput = {
      position: createPosition({
        points: {
          1: { player: "black", checkerCount: 1 },
          7: { player: "white", checkerCount: 2 },
          8: { player: "white", checkerCount: 2 }
        },
        borneOff: {
          white: 11,
          black: 14
        }
      }),
      player: "black",
      roll: { dice: [6, 1] }
    };
    const move = requireLegalMove(
      input,
      (candidate) => candidate.steps[0]?.fromPoint === 1 && candidate.steps[0]?.toPoint === 2,
      "black forward movement"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.position.points[1]).toBeNull();
      expect(result.position.points[2]).toEqual({ player: "black", checkerCount: 1 });
    }
  });

  it("does not mutate input position on successful apply", () => {
    const original = structuredClone(WHITE_HIT_THEN_SECOND_MOVE_FIXTURE);
    const snapshot = structuredClone(original);
    const input: GetLegalMovesInput = {
      position: original,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const move = requireLegalMove(
      input,
      (candidate) => candidate.steps.length === 2,
      "immutability"
    );

    const result = applyMove(input.position, input.player, input.roll, move);

    expect(result.ok).toBe(true);
    expect(original).toEqual(snapshot);
  });

  it("rejects a fabricated illegal move", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_OPEN_DESTINATION_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const fabricatedMove: Move = {
      player: "white",
      steps: [
        {
          kind: "point-to-point",
          fromPoint: 24,
          toPoint: 20,
          dieValue: 4,
          dieIndex: 0,
          hitsBlot: false
        }
      ]
    };

    const result = applyMove(input.position, input.player, input.roll, fabricatedMove);

    expectApplyFailureReason(result, "illegal-move");
  });

  it("rejects a move generated from a different position", () => {
    const sourceInput: GetLegalMovesInput = {
      position: WHITE_OPEN_DESTINATION_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const targetInput: GetLegalMovesInput = {
      position: EMPTY_BOARD_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const sourceMove = requireLegalMove(
      sourceInput,
      (candidate) => candidate.steps[0]?.toPoint === 23,
      "source move"
    );

    const result = applyMove(
      targetInput.position,
      targetInput.player,
      targetInput.roll,
      sourceMove
    );

    expectApplyFailureReason(result, "illegal-move");
  });

  it("rejects a legal move when provided dice are wrong", () => {
    const sourceInput: GetLegalMovesInput = {
      position: WHITE_OPEN_DESTINATION_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const sourceMove = requireLegalMove(
      sourceInput,
      (candidate) => candidate.steps[0]?.toPoint === 23,
      "wrong dice move"
    );

    const result = applyMove(
      sourceInput.position,
      sourceInput.player,
      { dice: [6, 5] },
      sourceMove
    );

    expectApplyFailureReason(result, "illegal-move");
  });

  it("rejects a legal move when provided player is wrong", () => {
    const sourceInput: GetLegalMovesInput = {
      position: WHITE_OPEN_DESTINATION_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const sourceMove = requireLegalMove(
      sourceInput,
      (candidate) => candidate.steps[0]?.toPoint === 23,
      "wrong player move"
    );

    const result = applyMove(sourceInput.position, "black", sourceInput.roll, sourceMove);

    expectApplyFailureReason(result, "illegal-move");
  });

  it("rejects reordered steps", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BOTH_DICE_ONE_ORDER_SEQUENCE_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const orderedMove = requireLegalMove(
      input,
      (candidate) => candidate.steps.length === 2,
      "ordered two-step move"
    );
    const reorderedMove: Move = {
      player: orderedMove.player,
      steps: [orderedMove.steps[1] as MoveStep, orderedMove.steps[0] as MoveStep]
    };

    const result = applyMove(input.position, input.player, input.roll, reorderedMove);

    expectApplyFailureReason(result, "illegal-move");
  });

  it("rejects truncated one-step move when both dice are required", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BOTH_DICE_ONE_ORDER_SEQUENCE_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const completeMove = requireLegalMove(
      input,
      (candidate) => candidate.steps.length === 2,
      "complete two-step move"
    );
    const truncatedMove: Move = {
      player: completeMove.player,
      steps: [completeMove.steps[0] as MoveStep]
    };

    const result = applyMove(input.position, input.player, input.roll, truncatedMove);

    expectApplyFailureReason(result, "illegal-move");
  });

  it("rejects smaller-die move when larger-die rule applies", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BOTH_DICE_INDIVIDUAL_ONLY_FIXTURE,
      player: "white",
      roll: { dice: [6, 3] }
    };
    const smallerDieMove: Move = {
      player: "white",
      steps: [
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

    const result = applyMove(input.position, input.player, input.roll, smallerDieMove);

    expectApplyFailureReason(result, "illegal-move");
  });

  it("rejects short doubles move when longer sequence is available", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
      player: "white",
      roll: { dice: [1, 1] }
    };
    const fullMove = requireLegalMove(
      input,
      (candidate) => candidate.steps.length === 4,
      "full doubles move"
    );
    const shortenedMove: Move = {
      player: fullMove.player,
      steps: [
        fullMove.steps[0] as MoveStep,
        fullMove.steps[1] as MoveStep,
        fullMove.steps[2] as MoveStep
      ]
    };

    const result = applyMove(input.position, input.player, input.roll, shortenedMove);

    expectApplyFailureReason(result, "illegal-move");
  });

  it("rejects ordinary move while bar entry is mandatory", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_SINGLE_CHECKER_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const ordinaryMove: Move = {
      player: "white",
      steps: [
        {
          kind: "point-to-point",
          fromPoint: 13,
          toPoint: 12,
          dieValue: 1,
          dieIndex: 0,
          hitsBlot: false
        }
      ]
    };

    const result = applyMove(input.position, input.player, input.roll, ordinaryMove);

    expectApplyFailureReason(result, "illegal-move");
  });

  it("rejects fabricated hit metadata", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_OPEN_DESTINATION_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const legalMove = requireLegalMove(
      input,
      (candidate) => candidate.steps[0]?.toPoint === 23,
      "non-hit move"
    );
    const forgedHitMove: Move = {
      player: legalMove.player,
      steps: [
        {
          ...(legalMove.steps[0] as MoveStep),
          hitsBlot: true,
          hit: {
            player: "black",
            point: 23
          }
        }
      ]
    };

    const result = applyMove(input.position, input.player, input.roll, forgedHitMove);

    expectApplyFailureReason(result, "illegal-move");
  });

  it("rejects fabricated bearing-off step", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_OPEN_DESTINATION_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const fabricatedBearOffMove: Move = {
      player: "white",
      steps: [
        {
          kind: "bear-off",
          fromPoint: 24,
          toPoint: "off",
          dieValue: 1,
          dieIndex: 0,
          hitsBlot: false
        }
      ]
    };

    const result = applyMove(input.position, input.player, input.roll, fabricatedBearOffMove);

    expectApplyFailureReason(result, "illegal-move");
  });

  it("rejects malformed step sequences", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_OPEN_DESTINATION_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const malformedMove = {
      player: "white",
      steps: []
    } as Move;

    const result = applyMove(input.position, input.player, input.roll, malformedMove);

    expectApplyFailureReason(result, "invalid-step-sequence");
  });

  it("does not mutate input position on failure", () => {
    const original = structuredClone(WHITE_OPEN_DESTINATION_FIXTURE);
    const snapshot = structuredClone(original);
    const illegalMove: Move = {
      player: "white",
      steps: [
        {
          kind: "point-to-point",
          fromPoint: 24,
          toPoint: 20,
          dieValue: 4,
          dieIndex: 0,
          hitsBlot: false
        }
      ]
    };

    const result = applyMove(original, "white", { dice: [1, 2] }, illegalMove);

    expectApplyFailureReason(result, "illegal-move");
    expect(original).toEqual(snapshot);
  });

  it("requires exact dieIndex match when validating supplied moves", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BOTH_DICE_BOTH_ORDERS_SEQUENCE_FIXTURE,
      player: "white",
      roll: { dice: [1, 2] }
    };
    const legalMove = requireLegalMove(
      input,
      (candidate) => candidate.steps.length === 2 && candidate.steps[0]?.dieIndex === 0,
      "dieIndex strictness"
    );
    const wrongDieIndexMove: Move = {
      player: legalMove.player,
      steps: legalMove.steps.map((step) => ({
        ...step,
        dieIndex: step.dieIndex === 0 ? 1 : 0
      }))
    };

    const result = applyMove(input.position, input.player, input.roll, wrongDieIndexMove);

    expectApplyFailureReason(result, "illegal-move");
  });
});

describe("legal-move output contract audit", () => {
  it("does not emit semantic duplicates in a branching non-double scenario", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_ORDERING_AND_DUPLICATE_AUDIT_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(1);
    expect(hasSemanticDuplicates(result.moves, false)).toBe(false);
  });

  it("does not emit semantic duplicates in a branching doubles scenario", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_DIFFERENT_CHECKERS_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(1);
    expect(hasSemanticDuplicates(result.moves, false)).toBe(false);
    expect(hasSemanticDuplicates(result.moves, true)).toBe(false);
  });

  it("currently preserves deterministic traversal order for repeated calls", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_ORDERING_AND_DUPLICATE_AUDIT_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const first = getLegalMoves(input);
    const second = getLegalMoves(input);

    expect(second).toEqual(first);
  });

  it("currently traverses non-double die orders as 0->1 then 1->0", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BOTH_DICE_BOTH_ORDERS_SEQUENCE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    const result = getLegalMoves(input);
    const orderSignatures = result.moves.map((move) => move.steps.map((step) => step.dieIndex));
    const firstReverseOrderIndex = orderSignatures.findIndex(
      (signature) => signature[0] === 1 && signature[1] === 0
    );

    expect(firstReverseOrderIndex).toBeGreaterThanOrEqual(0);
    expect(
      orderSignatures.slice(0, firstReverseOrderIndex).every((signature) => signature[0] === 0)
    ).toBe(true);
  });
});

describe("own-point stacking regression checks", () => {
  it("allows ordinary movement onto one own checker", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_OWN_STACK_SINGLE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 6]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.kind === "point-to-point" &&
          move.steps[0]?.fromPoint === 8 &&
          move.steps[0]?.toPoint === 7
      )
    ).toBe(true);
  });

  it("allows ordinary movement onto multiple own checkers", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_OWN_STACK_MULTIPLE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 6]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps[0]?.kind === "point-to-point" &&
          move.steps[0]?.fromPoint === 8 &&
          move.steps[0]?.toPoint === 7
      )
    ).toBe(true);
  });

  it("allows bar entry onto an own occupied point", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_ENTRY_ON_OWN_POINT_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 6]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.every((move) => move.steps[0]?.kind === "enter-from-bar")).toBe(true);
    expect(result.moves.some((move) => move.steps[0]?.toPoint === 24)).toBe(true);
  });

  it("supports doubles sequencing through own occupied points", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(
      result.moves.some(
        (move) =>
          move.steps.length === 4 &&
          move.steps[0]?.toPoint === 7 &&
          move.steps[1]?.toPoint === 7 &&
          move.steps[2]?.toPoint === 7
      )
    ).toBe(true);
  });

  it("keeps blocked opposing points illegal while own-point stacking is enabled", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BLOCKED_DESTINATION_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    expect(getLegalMoves(input).moves).toEqual([]);
  });
});

describe("engine fixtures", () => {
  it("provides readable named positions", () => {
    const fixtures = [
      INITIAL_POSITION_FIXTURE,
      EMPTY_BOARD_FIXTURE,
      SINGLE_CHECKER_FIXTURE,
      BEARING_OFF_EXAMPLE_FIXTURE,
      BAR_ENTRY_EXAMPLE_FIXTURE,
      WHITE_ONE_DESTINATION_FIXTURE,
      WHITE_MULTIPLE_MOVES_FIXTURE,
      BLACK_FORWARD_FIXTURE,
      WHITE_TWO_DICE_INDEPENDENT_FIXTURE,
      WHITE_OPEN_DESTINATION_FIXTURE,
      WHITE_BLOCKED_DESTINATION_FIXTURE,
      WHITE_MULTIPLE_BLOCKED_DESTINATIONS_FIXTURE,
      WHITE_SINGLE_HIT_DESTINATION_FIXTURE,
      WHITE_MULTIPLE_HIT_OPPORTUNITIES_FIXTURE,
      WHITE_HIT_AND_BLOCKED_DESTINATIONS_FIXTURE,
      WHITE_TWO_DICE_INDEPENDENT_HITS_FIXTURE,
      WHITE_BAR_SINGLE_CHECKER_FIXTURE,
      WHITE_BAR_BLOCKED_ENTRY_FIXTURE,
      WHITE_BAR_HIT_ENTRY_FIXTURE,
      WHITE_BAR_TWO_DICE_DIFFERENT_DESTINATIONS_FIXTURE,
      WHITE_BAR_DUPLICATE_DICE_FIXTURE,
      WHITE_BAR_AND_ORDINARY_MIXED_FIXTURE,
      WHITE_ORDINARY_ONLY_MANDATORY_ENTRY_FIXTURE,
      WHITE_BLOCKED_BAR_WITH_ORDINARY_OPPORTUNITY_FIXTURE,
      WHITE_TWO_DICE_SAME_CHECKER_SEQUENCE_FIXTURE,
      WHITE_TWO_DICE_DIFFERENT_CHECKERS_SEQUENCE_FIXTURE,
      WHITE_HIT_THEN_SECOND_MOVE_FIXTURE,
      WHITE_BAR_ENTRY_THEN_ORDINARY_MOVE_FIXTURE,
      WHITE_ONE_ORDER_CONTINUES_OTHER_STOPS_FIXTURE,
      WHITE_NO_SECOND_STEP_AFTER_VALID_FIRST_FIXTURE,
      WHITE_BOTH_DICE_ONE_ORDER_SEQUENCE_FIXTURE,
      WHITE_BOTH_DICE_BOTH_ORDERS_SEQUENCE_FIXTURE,
      WHITE_ONLY_LARGER_DIE_PLAYABLE_FIXTURE,
      WHITE_ONLY_SMALLER_DIE_PLAYABLE_FIXTURE,
      WHITE_BOTH_DICE_INDIVIDUAL_ONLY_FIXTURE,
      WHITE_BAR_BOTH_DICE_SEQUENCE_FIXTURE,
      WHITE_BAR_ONLY_ONE_DIE_PLAYABLE_FIXTURE,
      WHITE_BEAR_OFF_ALL_HOME_FIXTURE,
      WHITE_BEAR_OFF_OUTSIDE_HOME_FIXTURE,
      WHITE_BEAR_OFF_BAR_PRESENT_FIXTURE,
      WHITE_BEAR_OFF_EXACT_FIXTURE,
      WHITE_BEAR_OFF_OVERSIZED_ALLOWED_FIXTURE,
      WHITE_BEAR_OFF_OVERSIZED_BLOCKED_FIXTURE,
      WHITE_BEAR_OFF_FARTHEST_ONLY_FIXTURE,
      WHITE_BEAR_OFF_SEQUENCE_LEGALITY_SHIFT_FIXTURE,
      WHITE_BEAR_OFF_ONLY_ONE_DIE_PLAYABLE_FIXTURE,
      BLACK_BEAR_OFF_EXACT_FIXTURE,
      BLACK_BEAR_OFF_OVERSIZED_ALLOWED_FIXTURE,
      BLACK_BEAR_OFF_OVERSIZED_BLOCKED_FIXTURE,
      BLACK_BEAR_OFF_SEQUENCE_LEGALITY_SHIFT_FIXTURE,
      WHITE_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
      WHITE_DOUBLE_THREE_PLAYS_FIXTURE,
      WHITE_DOUBLE_TWO_PLAYS_FIXTURE,
      WHITE_DOUBLE_ONE_PLAY_FIXTURE,
      WHITE_DOUBLE_NO_PLAY_FIXTURE,
      WHITE_DOUBLE_SAME_CHECKER_FOUR_PLAYS_FIXTURE,
      WHITE_DOUBLE_DIFFERENT_CHECKERS_SEQUENCE_FIXTURE,
      WHITE_DOUBLE_LATER_STEP_BLOCKED_FIXTURE,
      WHITE_DOUBLE_MULTIPLE_BAR_ENTRIES_FIXTURE,
      WHITE_DOUBLE_BAR_ENTRY_THEN_ORDINARY_FIXTURE,
      WHITE_DOUBLE_ENTRY_HIT_SEQUENCE_FIXTURE,
      WHITE_DOUBLE_ORDINARY_HIT_SEQUENCE_FIXTURE,
      WHITE_DOUBLE_BEAR_OFF_FOUR_PLAYS_FIXTURE,
      WHITE_DOUBLE_BEAR_OFF_FEWER_PLAYS_FIXTURE,
      WHITE_DOUBLE_BEAR_OFF_OVERSIZED_SHIFT_FIXTURE,
      BLACK_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
      WHITE_OWN_STACK_SINGLE_FIXTURE,
      WHITE_OWN_STACK_MULTIPLE_FIXTURE,
      WHITE_BAR_ENTRY_ON_OWN_POINT_FIXTURE,
      WHITE_ORDERING_AND_DUPLICATE_AUDIT_FIXTURE
    ];

    expect(fixtures).toHaveLength(70);
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
      WHITE_ONE_DESTINATION_FIXTURE,
      WHITE_MULTIPLE_MOVES_FIXTURE,
      BLACK_FORWARD_FIXTURE,
      WHITE_TWO_DICE_INDEPENDENT_FIXTURE,
      WHITE_OPEN_DESTINATION_FIXTURE,
      WHITE_BLOCKED_DESTINATION_FIXTURE,
      WHITE_MULTIPLE_BLOCKED_DESTINATIONS_FIXTURE,
      WHITE_SINGLE_HIT_DESTINATION_FIXTURE,
      WHITE_MULTIPLE_HIT_OPPORTUNITIES_FIXTURE,
      WHITE_HIT_AND_BLOCKED_DESTINATIONS_FIXTURE,
      WHITE_TWO_DICE_INDEPENDENT_HITS_FIXTURE,
      WHITE_BAR_SINGLE_CHECKER_FIXTURE,
      WHITE_BAR_BLOCKED_ENTRY_FIXTURE,
      WHITE_BAR_HIT_ENTRY_FIXTURE,
      WHITE_BAR_TWO_DICE_DIFFERENT_DESTINATIONS_FIXTURE,
      WHITE_BAR_DUPLICATE_DICE_FIXTURE,
      WHITE_BAR_AND_ORDINARY_MIXED_FIXTURE,
      WHITE_ORDINARY_ONLY_MANDATORY_ENTRY_FIXTURE,
      WHITE_BLOCKED_BAR_WITH_ORDINARY_OPPORTUNITY_FIXTURE,
      WHITE_TWO_DICE_SAME_CHECKER_SEQUENCE_FIXTURE,
      WHITE_TWO_DICE_DIFFERENT_CHECKERS_SEQUENCE_FIXTURE,
      WHITE_HIT_THEN_SECOND_MOVE_FIXTURE,
      WHITE_BAR_ENTRY_THEN_ORDINARY_MOVE_FIXTURE,
      WHITE_ONE_ORDER_CONTINUES_OTHER_STOPS_FIXTURE,
      WHITE_NO_SECOND_STEP_AFTER_VALID_FIRST_FIXTURE,
      WHITE_BOTH_DICE_ONE_ORDER_SEQUENCE_FIXTURE,
      WHITE_BOTH_DICE_BOTH_ORDERS_SEQUENCE_FIXTURE,
      WHITE_ONLY_LARGER_DIE_PLAYABLE_FIXTURE,
      WHITE_ONLY_SMALLER_DIE_PLAYABLE_FIXTURE,
      WHITE_BOTH_DICE_INDIVIDUAL_ONLY_FIXTURE,
      WHITE_BAR_BOTH_DICE_SEQUENCE_FIXTURE,
      WHITE_BAR_ONLY_ONE_DIE_PLAYABLE_FIXTURE,
      WHITE_BEAR_OFF_ALL_HOME_FIXTURE,
      WHITE_BEAR_OFF_OUTSIDE_HOME_FIXTURE,
      WHITE_BEAR_OFF_BAR_PRESENT_FIXTURE,
      WHITE_BEAR_OFF_EXACT_FIXTURE,
      WHITE_BEAR_OFF_OVERSIZED_ALLOWED_FIXTURE,
      WHITE_BEAR_OFF_OVERSIZED_BLOCKED_FIXTURE,
      WHITE_BEAR_OFF_FARTHEST_ONLY_FIXTURE,
      WHITE_BEAR_OFF_SEQUENCE_LEGALITY_SHIFT_FIXTURE,
      WHITE_BEAR_OFF_ONLY_ONE_DIE_PLAYABLE_FIXTURE,
      BLACK_BEAR_OFF_EXACT_FIXTURE,
      BLACK_BEAR_OFF_OVERSIZED_ALLOWED_FIXTURE,
      BLACK_BEAR_OFF_OVERSIZED_BLOCKED_FIXTURE,
      BLACK_BEAR_OFF_SEQUENCE_LEGALITY_SHIFT_FIXTURE,
      WHITE_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
      WHITE_DOUBLE_THREE_PLAYS_FIXTURE,
      WHITE_DOUBLE_TWO_PLAYS_FIXTURE,
      WHITE_DOUBLE_ONE_PLAY_FIXTURE,
      WHITE_DOUBLE_NO_PLAY_FIXTURE,
      WHITE_DOUBLE_SAME_CHECKER_FOUR_PLAYS_FIXTURE,
      WHITE_DOUBLE_DIFFERENT_CHECKERS_SEQUENCE_FIXTURE,
      WHITE_DOUBLE_LATER_STEP_BLOCKED_FIXTURE,
      WHITE_DOUBLE_MULTIPLE_BAR_ENTRIES_FIXTURE,
      WHITE_DOUBLE_BAR_ENTRY_THEN_ORDINARY_FIXTURE,
      WHITE_DOUBLE_ENTRY_HIT_SEQUENCE_FIXTURE,
      WHITE_DOUBLE_ORDINARY_HIT_SEQUENCE_FIXTURE,
      WHITE_DOUBLE_BEAR_OFF_FOUR_PLAYS_FIXTURE,
      WHITE_DOUBLE_BEAR_OFF_FEWER_PLAYS_FIXTURE,
      WHITE_DOUBLE_BEAR_OFF_OVERSIZED_SHIFT_FIXTURE,
      BLACK_DOUBLE_FOUR_ORDINARY_PLAYS_FIXTURE,
      WHITE_OWN_STACK_SINGLE_FIXTURE,
      WHITE_OWN_STACK_MULTIPLE_FIXTURE,
      WHITE_BAR_ENTRY_ON_OWN_POINT_FIXTURE,
      WHITE_ORDERING_AND_DUPLICATE_AUDIT_FIXTURE,
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
