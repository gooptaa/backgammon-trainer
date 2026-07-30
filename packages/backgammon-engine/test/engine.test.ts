import { describe, expect, it } from "vitest";
import { validateBoardPosition } from "@backgammon-trainer/backgammon-domain";

import {
  type DiceRoll,
  getLegalMoves,
  type GetLegalMovesInput,
  type LegalMoveResult,
  type Move,
  type MoveStep
} from "../src/index";
import {
  BLACK_FORWARD_FIXTURE,
  WHITE_BAR_AND_ORDINARY_MIXED_FIXTURE,
  WHITE_BAR_BLOCKED_ENTRY_FIXTURE,
  WHITE_BAR_DUPLICATE_DICE_FIXTURE,
  WHITE_BAR_ENTRY_THEN_ORDINARY_MOVE_FIXTURE,
  WHITE_BAR_HIT_ENTRY_FIXTURE,
  WHITE_BAR_SINGLE_CHECKER_FIXTURE,
  WHITE_BAR_TWO_DICE_DIFFERENT_DESTINATIONS_FIXTURE,
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
  createEmptyPoints,
  createPosition
} from "./fixtures/boardFixtures";

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
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(2);
    expect(result.moves[0]?.steps[0]?.hitsBlot).toBe(true);
    expect(result.moves[0]?.steps[0]?.toPoint).toBe(23);
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

  it("preserves die association when duplicate dice generate hits", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_SINGLE_HIT_DESTINATION_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(2);
    expect(result.moves[0]?.steps[0]?.dieIndex).toBe(0);
    expect(result.moves[1]?.steps[0]?.dieIndex).toBe(1);
    expect(result.moves[0]?.steps[0]?.hitsBlot).toBe(true);
    expect(result.moves[1]?.steps[0]?.hitsBlot).toBe(true);
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
      position: WHITE_ONE_DESTINATION_FIXTURE,
      player: "white",
      roll: {
        dice: [6, 1]
      }
    };
    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(1);
    expect(result.moves[0]?.steps[0]?.fromPoint).toBe(24);
    expect(result.moves[0]?.steps[0]?.toPoint).toBe(18);
    expect(result.moves[0]?.steps[0]?.dieValue).toBe(6);
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

  it("preserves die association for duplicate die values", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_TWO_DICE_INDEPENDENT_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };
    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(2);
    expect(result.moves[0]?.steps[0]?.dieIndex).toBe(0);
    expect(result.moves[1]?.steps[0]?.dieIndex).toBe(1);
    expect(result.moves[0]?.steps[0]?.toPoint).toBe(23);
    expect(result.moves[1]?.steps[0]?.toPoint).toBe(23);
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
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(2);
    expect(result.moves[0]?.steps[0]?.kind).toBe("enter-from-bar");
    expect(result.moves[0]?.steps[0]?.hitsBlot).toBe(true);
    expect(result.moves[0]?.steps[0]?.hit).toEqual({
      player: "black",
      point: 24
    });
  });

  it("preserves die association for duplicate dice on bar entry", () => {
    const input: GetLegalMovesInput = {
      position: WHITE_BAR_DUPLICATE_DICE_FIXTURE,
      player: "white",
      roll: {
        dice: [1, 1]
      }
    };

    const result = getLegalMoves(input);

    expect(result.moves).toHaveLength(2);
    expect(result.moves[0]?.steps[0]?.kind).toBe("enter-from-bar");
    expect(result.moves[0]?.steps[0]?.dieIndex).toBe(0);
    expect(result.moves[1]?.steps[0]?.dieIndex).toBe(1);
    expect(result.moves[0]?.steps[0]?.toPoint).toBe(24);
    expect(result.moves[1]?.steps[0]?.toPoint).toBe(24);
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

    expect(result.moves.some((move) => move.steps.length === 2)).toBe(true);
    expect(
      result.moves.some(
        (move) =>
          move.steps.length === 1 &&
          move.steps[0]?.kind === "enter-from-bar" &&
          move.steps[0]?.dieIndex === 1
      )
    ).toBe(true);
  });

  it("does not mutate the original input position during candidate expansion", () => {
    const original = WHITE_HIT_THEN_SECOND_MOVE_FIXTURE;
    const snapshot = structuredClone(original);

    const input: GetLegalMovesInput = {
      position: original,
      player: "white",
      roll: {
        dice: [1, 2]
      }
    };

    getLegalMoves(input);

    expect(original).toEqual(snapshot);
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
      WHITE_NO_SECOND_STEP_AFTER_VALID_FIRST_FIXTURE
    ];

    expect(fixtures).toHaveLength(30);
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
