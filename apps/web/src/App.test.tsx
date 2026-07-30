import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGameState,
  createTurnRecord,
  decodeGameSnapshot,
  encodeGameSnapshot,
  GAME_SNAPSHOT_FORMAT,
  GAME_SNAPSHOT_VERSION,
  type GameSnapshot,
  type GameState
} from "@backgammon-trainer/backgammon-engine";
import {
  STANDARD_STARTING_POSITION,
  type BoardPosition,
  type DieValue
} from "@backgammon-trainer/backgammon-domain";
import { type GameStorage } from "./features/sandbox/gameStorage";

import App from "./App";

type OpeningRollState =
  | {
      readonly phase: "waiting";
    }
  | {
      readonly phase: "tied";
      readonly whiteDie: DieValue;
      readonly blackDie: DieValue;
    }
  | {
      readonly phase: "resolved";
      readonly whiteDie: DieValue;
      readonly blackDie: DieValue;
      readonly startingPlayer: "white" | "black";
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
}): BoardPosition => {
  return {
    points: {
      ...createEmptyPoints(),
      ...(input?.points ?? {})
    },
    bar: {
      white: 0,
      black: 0,
      ...(input?.bar ?? {})
    },
    borneOff: {
      white: 0,
      black: 0,
      ...(input?.borneOff ?? {})
    }
  };
};

const createNoLegalMovePosition = (): BoardPosition =>
  createPosition({
    points: {
      8: { player: "white", checkerCount: 1 },
      7: { player: "black", checkerCount: 2 }
    },
    borneOff: {
      white: 14,
      black: 13
    }
  });

const createHitPreviewPosition = (): BoardPosition =>
  createPosition({
    points: {
      8: { player: "white", checkerCount: 1 },
      7: { player: "black", checkerCount: 1 }
    },
    borneOff: {
      white: 14,
      black: 14
    }
  });

const createBarEntryPreviewPosition = (): BoardPosition =>
  createPosition({
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

const createBearOffPreviewPosition = (): BoardPosition =>
  createPosition({
    points: {
      6: { player: "white", checkerCount: 1 },
      5: { player: "white", checkerCount: 1 }
    },
    borneOff: {
      white: 13,
      black: 14
    }
  });

const createBlackDirectionPreviewPosition = (): BoardPosition =>
  createPosition({
    points: {
      1: { player: "black", checkerCount: 1 }
    },
    borneOff: {
      white: 14,
      black: 14
    }
  });

const createUndoPreviewPosition = (): BoardPosition =>
  createPosition({
    points: {
      8: { player: "white", checkerCount: 1 }
    },
    borneOff: {
      white: 14,
      black: 14
    }
  });

const createTwoPassHistoryPosition = (): BoardPosition =>
  createPosition({
    points: {
      24: { player: "black", checkerCount: 2 },
      23: { player: "black", checkerCount: 2 },
      1: { player: "white", checkerCount: 2 },
      2: { player: "white", checkerCount: 2 }
    },
    bar: {
      white: 1,
      black: 1
    },
    borneOff: {
      white: 10,
      black: 10
    }
  });

const resolvedOpeningState = (
  startingPlayer: "white" | "black",
  whiteDie: DieValue = 5,
  blackDie: DieValue = 2
): OpeningRollState => ({
  phase: "resolved",
  whiteDie,
  blackDie,
  startingPlayer
});

const createSavedSnapshotText = (): string => {
  const positionBefore = createPosition({
    points: {
      8: { player: "white", checkerCount: 1 },
      1: { player: "black", checkerCount: 1 }
    },
    borneOff: {
      white: 14,
      black: 14
    }
  });
  const positionAfter = createPosition({
    points: {
      7: { player: "white", checkerCount: 1 },
      1: { player: "black", checkerCount: 1 }
    },
    borneOff: {
      white: 14,
      black: 14
    }
  });

  const openingMoveRecord = createTurnRecord({
    turnNumber: 1,
    player: "white",
    dice: {
      dice: [1, 2]
    },
    outcome: {
      kind: "move",
      move: {
        player: "white",
        steps: [
          {
            kind: "point-to-point",
            fromPoint: 8,
            toPoint: 7,
            dieValue: 1,
            dieIndex: 0,
            hitsBlot: false
          }
        ]
      }
    },
    positionBefore,
    positionAfter,
    gameStatusAfter: {
      state: "in-progress"
    },
    phase: "opening"
  });

  const snapshot: GameSnapshot = {
    savedAt: "2026-07-30T18:45:00.000Z",
    gameState: {
      position: positionAfter,
      activePlayer: "black",
      dice: {
        dice: [3, 4]
      }
    },
    turnHistory: [openingMoveRecord],
    openingState: {
      phase: "resolved",
      whiteDie: 2,
      blackDie: 1,
      startingPlayer: "white",
      openingTurnPending: false
    }
  };

  return encodeGameSnapshot(snapshot);
};

const createRandomSource = (values: readonly number[]): (() => number) => {
  let index = 0;
  return vi.fn(() => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  });
};

const createMemoryGameStorage = (initialValue: string | null = null): GameStorage => {
  let value = initialValue;

  return {
    load: () => value,
    save: (nextValue) => {
      value = nextValue;
    },
    clear: () => {
      value = null;
    }
  };
};

const createInspectableMemoryGameStorage = (
  initialValue: string | null = null
): {
  storage: GameStorage;
  getValue: () => string | null;
  saveCalls: () => number;
} => {
  let value = initialValue;
  const save = vi.fn((nextValue: string) => {
    value = nextValue;
  });

  return {
    storage: {
      load: () => value,
      save,
      clear: () => {
        value = null;
      }
    },
    getValue: () => value,
    saveCalls: () => save.mock.calls.length
  };
};

const renderApp = (options?: {
  initialGameState?: GameState;
  randomSource?: () => number;
  initialOpeningRollState?: OpeningRollState;
  initialOpeningTurnPending?: boolean;
  gameStorage?: GameStorage;
}): void => {
  const storage = options?.gameStorage ?? createMemoryGameStorage();

  render(
    <App
      {...(options?.initialGameState === undefined
        ? {}
        : { initialGameState: options.initialGameState })}
      {...(options?.randomSource === undefined ? {} : { randomSource: options.randomSource })}
      {...(options?.initialOpeningRollState === undefined
        ? {}
        : { initialOpeningRollState: options.initialOpeningRollState })}
      {...(options?.initialOpeningTurnPending === undefined
        ? {}
        : { initialOpeningTurnPending: options.initialOpeningTurnPending })}
      gameStorage={storage}
    />
  );
};

const openDevelopmentControls = (): void => {
  fireEvent.click(screen.getByText("Development controls"));
};

const setDiceManually = (dieOne: string, dieTwo: string): void => {
  openDevelopmentControls();
  fireEvent.change(screen.getByLabelText("Die 1"), { target: { value: dieOne } });
  fireEvent.change(screen.getByLabelText("Die 2"), { target: { value: dieTwo } });
  fireEvent.click(screen.getByRole("button", { name: "Set Dice Manually" }));
};

const clickOpeningRoll = (): void => {
  fireEvent.click(screen.getByRole("button", { name: /Roll for Opening|Roll Again/i }));
};

const openExportSection = (): void => {
  fireEvent.click(screen.getByText("Export Game"));
};

const openImportSection = (): void => {
  fireEvent.click(screen.getByText("Import Game"));
};

const selectSourcePoint = (point: number): void => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`Select source point ${point}`) }));
};

const selectDestinationPoint = (point: number): void => {
  fireEvent.click(
    screen.getByRole("button", { name: new RegExp(`Select destination point ${point}`) })
  );
};

const getHistoryCount = (): string => {
  return screen.getByTestId("turn-history-count").textContent ?? "";
};

const selectHistoryTurn = (turnNumber: number): void => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${turnNumber}\\.`) }));
};

const expectPointCheckerCount = (point: number, player: "white" | "black", count: number): void => {
  expect(
    screen.getByRole("group", {
      name: new RegExp(`Point ${point} .* has ${count} ${player} checkers`)
    })
  ).toBeInTheDocument();
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("App opening roll lifecycle", () => {
  it("starts in opening phase on fresh load", () => {
    renderApp();

    expect(screen.getByTestId("opening-phase")).toHaveTextContent("Opening phase: waiting");
    expect(screen.getByRole("button", { name: "Roll for Opening" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Roll Dice" })).toBeDisabled();
    expect(screen.queryByText(/Active player:/i)).not.toBeInTheDocument();
  });

  it("disables move interaction and manual dice assignment before opening resolves", () => {
    renderApp();

    expect(screen.queryAllByRole("button", { name: /Select source (point|bar)/i })).toHaveLength(0);
    openDevelopmentControls();
    expect(screen.getByRole("button", { name: "Set Dice Manually" })).toBeDisabled();
    expect(screen.getByLabelText("Die 1")).toBeDisabled();
    expect(screen.getByLabelText("Die 2")).toBeDisabled();
  });

  it("shows deterministic opening dice results and starts white when white die is higher", () => {
    renderApp({ randomSource: createRandomSource([0.8, 0.2]) });

    clickOpeningRoll();

    expect(screen.getByLabelText("White opening die 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Black opening die 2")).toBeInTheDocument();
    expect(screen.getByTestId("opening-resolution")).toHaveTextContent("White starts with 5-2");
    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: 5, 2");
  });

  it("starts black when black opening die is higher and preserves white-black dice order", () => {
    renderApp({ randomSource: createRandomSource([0.0, 0.99]) });

    clickOpeningRoll();

    expect(screen.getByTestId("opening-resolution")).toHaveTextContent("Black starts with 1-6");
    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: 1, 6");
  });

  it("handles opening ties by requiring explicit reroll", () => {
    renderApp({ randomSource: createRandomSource([0.3, 0.3, 0.99, 0.1]) });

    clickOpeningRoll();

    expect(screen.getByTestId("opening-phase")).toHaveTextContent("Opening phase: tied");
    expect(screen.getByRole("button", { name: "Roll Again" })).toBeInTheDocument();
    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
    expect(screen.queryAllByRole("button", { name: /Select source (point|bar)/i })).toHaveLength(0);

    clickOpeningRoll();

    expect(screen.getByTestId("opening-phase")).toHaveTextContent("Opening phase: resolved");
    expect(screen.getByTestId("opening-resolution")).toHaveTextContent("White starts with 6-1");
  });

  it("exposes legal opening turn interactions immediately after opening resolves", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();

    expect(
      screen.getAllByRole("button", { name: /Select source (point|bar)/i }).length
    ).toBeGreaterThan(0);
  });
});

describe("App turn history and inspection", () => {
  it("starts with no turn history and does not record opening ties", () => {
    renderApp({ randomSource: createRandomSource([0.3, 0.3]) });

    expect(getHistoryCount()).toContain("Recorded turns: 0");

    clickOpeningRoll();

    expect(screen.getByTestId("opening-phase")).toHaveTextContent("Opening phase: tied");
    expect(getHistoryCount()).toContain("Recorded turns: 0");
  });

  it("creates opening turn record one after successful opening move", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);
    selectSourcePoint(8);
    selectDestinationPoint(5);

    expect(getHistoryCount()).toContain("Recorded turns: 1");
    expect(
      screen.getByRole("button", { name: /^1\. White - Opening - 5-3 -/ })
    ).toBeInTheDocument();
  });

  it("creates opening pass record with resolved opening dice", () => {
    const initialGameState: GameState = {
      position: createNoLegalMovePosition(),
      activePlayer: "white",
      dice: {
        dice: [1, 1]
      }
    };

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white", 1, 1),
      initialOpeningTurnPending: true
    });

    fireEvent.click(screen.getByRole("button", { name: "Pass Turn" }));

    expect(getHistoryCount()).toContain("Recorded turns: 1");
    expect(
      screen.getByRole("button", { name: /^1\. White - Opening - 1-1 - Pass$/ })
    ).toBeInTheDocument();
  });

  it("appends ordinary move records exactly once", () => {
    const initialGameState = createGameState(createUndoPreviewPosition(), "white");

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white")
    });

    setDiceManually("1", "2");
    selectSourcePoint(8);
    selectDestinationPoint(7);
    selectSourcePoint(7);
    selectDestinationPoint(5);

    expect(getHistoryCount()).toContain("Recorded turns: 1");
    expect(screen.getByRole("button", { name: /^1\. White - Normal - 1-2 -/ })).toBeInTheDocument();
  });

  it("does not append history for staged steps, undo, or blocked pass", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);

    expect(getHistoryCount()).toContain("Recorded turns: 0");

    fireEvent.click(screen.getByRole("button", { name: "Undo Last Step" }));

    expect(getHistoryCount()).toContain("Recorded turns: 0");

    const passButton = screen.getByRole("button", { name: "Pass Turn" });
    expect(passButton).toBeDisabled();
    fireEvent.click(passButton);
    expect(getHistoryCount()).toContain("Recorded turns: 0");
  });

  it("preserves canonical move step metadata including die indices", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);
    selectSourcePoint(8);
    selectDestinationPoint(5);

    selectHistoryTurn(1);

    expect(screen.getByTestId("history-selected-step-metadata")).toHaveTextContent(
      "step 1: point-to-point, die 5, die index 0"
    );
    expect(screen.getByTestId("history-selected-step-metadata")).toHaveTextContent(
      "step 2: point-to-point, die 3, die index 1"
    );
  });

  it("shows recorded before and after positions and supports view toggling", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);
    selectSourcePoint(8);
    selectDestinationPoint(5);

    selectHistoryTurn(1);
    fireEvent.click(screen.getByRole("button", { name: "View Before" }));

    expectPointCheckerCount(13, "white", 5);
    expect(screen.getByTestId("history-position-before-summary")).toBeInTheDocument();
    expect(screen.getByTestId("history-position-after-summary")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View After" }));
    expectPointCheckerCount(13, "white", 4);
  });

  it("enters explicit inspection mode and disables live controls", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);
    selectSourcePoint(8);
    selectDestinationPoint(5);

    selectHistoryTurn(1);

    expect(screen.getByTestId("history-inspection-banner")).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /Select source (point|bar)/i })).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Roll Dice" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pass Turn" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Roll for Opening|Roll Again/i })
    ).not.toBeInTheDocument();

    openDevelopmentControls();
    expect(screen.getByRole("button", { name: "Set Dice Manually" })).toBeDisabled();
  });

  it("supports previous/next navigation with boundary disabling", () => {
    const initialGameState: GameState = {
      position: createTwoPassHistoryPosition(),
      activePlayer: "white",
      dice: {
        dice: [1, 1]
      }
    };

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white"),
      initialOpeningTurnPending: false
    });

    fireEvent.click(screen.getByRole("button", { name: "Pass Turn" }));
    const firstRecordSnapshot = screen.getByRole("button", {
      name: /^1\. White - Normal - 1-1 - Pass$/
    }).textContent;
    setDiceManually("1", "1");
    fireEvent.click(screen.getByRole("button", { name: "Pass Turn" }));

    expect(getHistoryCount()).toContain("Recorded turns: 2");
    expect(
      screen.getByRole("button", { name: /^1\. White - Normal - 1-1 - Pass$/ }).textContent
    ).toBe(firstRecordSnapshot);

    selectHistoryTurn(1);
    expect(screen.getByRole("button", { name: "Previous Turn" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next Turn" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Next Turn" }));
    expect(screen.getByTestId("history-inspection-mode")).toHaveTextContent("Inspecting turn 2");
    expect(screen.getByRole("button", { name: "Next Turn" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous Turn" })).toBeEnabled();
  });

  it("returns to current game without mutating live committed state", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);
    selectSourcePoint(8);
    selectDestinationPoint(5);

    selectHistoryTurn(1);
    fireEvent.click(screen.getByRole("button", { name: "View Before" }));
    expectPointCheckerCount(13, "white", 5);

    fireEvent.click(screen.getByRole("button", { name: "Return to Current Game" }));

    expect(screen.queryByTestId("history-inspection-banner")).not.toBeInTheDocument();
    expectPointCheckerCount(13, "white", 4);
    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
  });

  it("clears history on new game and restarts numbering at one", () => {
    const initialGameState: GameState = {
      position: createNoLegalMovePosition(),
      activePlayer: "white",
      dice: {
        dice: [1, 1]
      }
    };

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white", 1, 1),
      initialOpeningTurnPending: true,
      randomSource: createRandomSource([0.7, 0.4])
    });

    fireEvent.click(screen.getByRole("button", { name: "Pass Turn" }));
    expect(
      screen.getByRole("button", { name: /^1\. White - Opening - 1-1 - Pass$/ })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New Game" }));
    expect(getHistoryCount()).toContain("Recorded turns: 0");

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);
    selectSourcePoint(8);
    selectDestinationPoint(5);

    expect(screen.getByRole("button", { name: /^1\. White - Opening -/ })).toBeInTheDocument();
  });
});

describe("App staged move projection", () => {
  it("renders staged position after first selected step while committed snapshot remains unchanged", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);

    expectPointCheckerCount(13, "white", 4);
    expectPointCheckerCount(8, "white", 4);

    const snapshot = screen.getByTestId("occupied-points");
    expect(within(snapshot).getByText("13: white x5")).toBeInTheDocument();
    expect(within(snapshot).getByText("8: white x3")).toBeInTheDocument();
  });

  it("allows selecting a tentatively moved checker again for the second step", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);

    expect(screen.getByRole("button", { name: /Select source point 8/i })).toBeInTheDocument();
  });

  it("applies a complete same-checker-twice move and clears staged state", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);
    selectSourcePoint(8);
    selectDestinationPoint(5);

    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent("");
    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
    expect(screen.getByRole("button", { name: "Roll Dice" })).toBeEnabled();
    const boardRegion = screen.getByRole("region", { name: "Graphical backgammon board" });
    expect(within(boardRegion).getByText("Active player: black")).toBeInTheDocument();
  });

  it("stages a hit immediately and cancellation restores the committed board", () => {
    const initialGameState = createGameState(createHitPreviewPosition(), "white");

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white")
    });

    setDiceManually("1", "2");
    selectSourcePoint(8);
    selectDestinationPoint(7);

    expectPointCheckerCount(7, "white", 1);
    expect(screen.getByTestId("bar-counts")).toHaveTextContent("Bar: white 0, black 0");
    expect(screen.getByLabelText("Black bar checkers 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo Last Step" }));

    expectPointCheckerCount(8, "white", 1);
    expectPointCheckerCount(7, "black", 1);
    expect(screen.getByLabelText("Black bar checkers 0")).toBeInTheDocument();
  });

  it("stages bar entry and allows selecting the entered checker for continuation", () => {
    const initialGameState = createGameState(createBarEntryPreviewPosition(), "white");

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white")
    });

    setDiceManually("1", "2");
    fireEvent.click(screen.getByRole("button", { name: /Select source bar checker for white/i }));
    selectDestinationPoint(24);

    expect(screen.getByLabelText("White bar checkers 0")).toBeInTheDocument();
    expectPointCheckerCount(24, "white", 1);
    expect(screen.getByRole("button", { name: /Select source point 24/i })).toBeInTheDocument();
  });

  it("stages bearing off updates without committing until move completion", () => {
    const initialGameState = createGameState(createBearOffPreviewPosition(), "white");

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white")
    });

    setDiceManually("6", "1");
    selectSourcePoint(6);
    fireEvent.click(screen.getByRole("button", { name: /Select destination off for white/i }));

    expect(screen.getByLabelText("White borne off checkers 14")).toBeInTheDocument();
    const snapshot = screen.getByTestId("borne-off-counts");
    expect(snapshot).toHaveTextContent("Borne off: white 13, black 14");
  });

  it("renders staged black-direction movement", () => {
    const initialGameState = createGameState(createBlackDirectionPreviewPosition(), "black");

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("black")
    });

    setDiceManually("1", "6");
    selectSourcePoint(1);
    selectDestinationPoint(2);

    expectPointCheckerCount(2, "black", 1);
  });

  it("keeps hover preview separate from staged position", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);
    const beforeHover = screen.getByRole("group", {
      name: /Point 8 .* has 4 white checkers/
    });

    selectSourcePoint(8);
    const destination = screen.getByRole("button", { name: /Select destination point 5/i });
    fireEvent.mouseEnter(destination);
    fireEvent.mouseLeave(destination);

    expect(beforeHover).toBeInTheDocument();
    expect(screen.getByTestId("hover-preview")).toHaveTextContent("");
    expect(
      screen.getByRole("group", { name: /Point 8 .* has 4 white checkers/ })
    ).toBeInTheDocument();
  });

  it("undoes only the most recent staged step and preserves earlier steps", () => {
    const initialGameState = createGameState(createUndoPreviewPosition(), "white");

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white")
    });

    setDiceManually("1", "1");
    selectSourcePoint(8);
    selectDestinationPoint(7);
    selectSourcePoint(7);
    selectDestinationPoint(6);

    expectPointCheckerCount(6, "white", 1);
    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent("Move: 8 -> 7 -> 6");

    fireEvent.click(screen.getByRole("button", { name: "Undo Last Step" }));

    expectPointCheckerCount(7, "white", 1);
    expect(
      screen.getByRole("group", {
        name: /Point 6 .* is empty/
      })
    ).toBeInTheDocument();
    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent("Move: 8 -> 7");
  });

  it("undoes back to empty selection after repeated clicks", () => {
    const initialGameState = createGameState(createUndoPreviewPosition(), "white");

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white")
    });

    setDiceManually("1", "1");
    selectSourcePoint(8);
    selectDestinationPoint(7);

    fireEvent.click(screen.getByRole("button", { name: "Undo Last Step" }));

    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent("");
    expect(screen.queryByRole("button", { name: "Undo Last Step" })).not.toBeInTheDocument();
    expectPointCheckerCount(8, "white", 1);
  });

  it("recalculates remaining continuation candidates after undo", () => {
    const initialGameState = createGameState(createUndoPreviewPosition(), "white");

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white")
    });

    setDiceManually("1", "1");
    selectSourcePoint(8);
    selectDestinationPoint(7);
    selectSourcePoint(7);
    selectDestinationPoint(6);

    expect(screen.getByTestId("candidate-continuations")).toHaveTextContent("6 -> 5");

    fireEvent.click(screen.getByRole("button", { name: "Undo Last Step" }));

    expect(screen.getByTestId("candidate-continuations")).toHaveTextContent("7 -> 6");
    expect(screen.getByTestId("candidate-continuations")).not.toHaveTextContent("6 -> 5");
  });

  it("clears hover preview when undoing a staged step", () => {
    const initialGameState = createGameState(createUndoPreviewPosition(), "white");

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white")
    });

    setDiceManually("1", "1");
    selectSourcePoint(8);
    selectDestinationPoint(7);
    selectSourcePoint(7);

    const hoveredDestination = screen.getByRole("button", { name: /Select destination point 6/i });
    fireEvent.mouseEnter(hoveredDestination);

    expect(screen.getByTestId("hover-preview")).not.toHaveTextContent("");

    fireEvent.click(screen.getByRole("button", { name: "Undo Last Step" }));

    expect(screen.getByTestId("hover-preview")).toHaveTextContent("");
  });

  it("shows pending destination in breadcrumb while source is selected", () => {
    const initialGameState = createGameState(createUndoPreviewPosition(), "white");

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white")
    });

    setDiceManually("1", "1");
    selectSourcePoint(8);
    selectDestinationPoint(7);
    selectSourcePoint(7);

    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent(
      "Move: 8 -> 7 -> [select destination]"
    );
  });
});

describe("App turn transitions and reset behavior", () => {
  it("clears staged selection and hover state after successful move application", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);
    selectSourcePoint(8);

    const destination = screen.getByRole("button", { name: /Select destination point 5/i });
    fireEvent.mouseEnter(destination);
    fireEvent.click(destination);

    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent("");
    expect(screen.getByTestId("hover-preview")).toHaveTextContent("");
    expect(screen.queryByRole("button", { name: "Undo Last Step" })).not.toBeInTheDocument();
  });

  it("allows pass on an unplayable opening turn and transitions to normal rolling", () => {
    const initialGameState: GameState = {
      position: createNoLegalMovePosition(),
      activePlayer: "white",
      dice: {
        dice: [1, 1]
      }
    };

    renderApp({
      initialGameState,
      initialOpeningRollState: resolvedOpeningState("white", 1, 1),
      initialOpeningTurnPending: true
    });

    fireEvent.click(screen.getByRole("button", { name: "Pass Turn" }));

    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
    expect(screen.getByRole("button", { name: "Roll Dice" })).toBeEnabled();
    expect(screen.getByTestId("opening-resolution")).not.toHaveTextContent(
      "opening turn in progress"
    );
  });

  it("new game resets to opening phase and clears transient interaction state", () => {
    renderApp({ randomSource: createRandomSource([0.7, 0.4]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);
    selectSourcePoint(8);
    const destination = screen.getByRole("button", { name: /Select destination point 5/i });
    fireEvent.mouseEnter(destination);

    fireEvent.click(screen.getByRole("button", { name: "New Game" }));

    expect(screen.getByTestId("opening-phase")).toHaveTextContent("Opening phase: waiting");
    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent("");
    expect(screen.getByTestId("hover-preview")).toHaveTextContent("");
    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
    expect(screen.getByRole("button", { name: "Roll for Opening" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo Last Step" })).not.toBeInTheDocument();
  });
});

describe("App game snapshot persistence", () => {
  it("starts fresh when no saved snapshot exists", () => {
    renderApp({ gameStorage: createMemoryGameStorage(null) });

    expect(screen.getByTestId("opening-phase")).toHaveTextContent("Opening phase: waiting");
    expect(screen.getByTestId("turn-history-count")).toHaveTextContent("Recorded turns: 0");
  });

  it("restores a valid saved snapshot on initialization", () => {
    const saved = createSavedSnapshotText();
    renderApp({ gameStorage: createMemoryGameStorage(saved) });

    expect(screen.getByTestId("turn-history-count")).toHaveTextContent("Recorded turns: 1");
    expect(screen.getByTestId("opening-phase")).toHaveTextContent("Opening phase: resolved");
    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: 3, 4");
    expectPointCheckerCount(7, "white", 1);
  });

  it("restores tied opening state with Roll Again available", () => {
    const tiedSnapshot: GameSnapshot = {
      savedAt: "2026-07-30T18:50:00.000Z",
      gameState: createGameState(STANDARD_STARTING_POSITION, "white"),
      turnHistory: [],
      openingState: {
        phase: "tied",
        whiteDie: 4,
        blackDie: 4,
        openingTurnPending: false
      }
    };

    renderApp({ gameStorage: createMemoryGameStorage(encodeGameSnapshot(tiedSnapshot)) });

    expect(screen.getByRole("button", { name: "Roll Again" })).toBeEnabled();
    expect(screen.getByTestId("opening-phase")).toHaveTextContent("Opening phase: tied");
  });

  it("shows concise feedback and stays safe on invalid stored JSON", () => {
    renderApp({ gameStorage: createMemoryGameStorage("not-json") });

    expect(screen.getByText(/Saved game restore failed/i)).toBeInTheDocument();
    expect(screen.getByTestId("opening-phase")).toHaveTextContent("Opening phase: waiting");
  });

  it("updates durable save after opening roll, move, and new game but not staged-only selection", () => {
    const inspectable = createInspectableMemoryGameStorage();

    renderApp({ randomSource: createRandomSource([0.8, 0.2]), gameStorage: inspectable.storage });

    const baselineSaves = inspectable.saveCalls();
    clickOpeningRoll();
    expect(inspectable.saveCalls()).toBeGreaterThan(baselineSaves);

    const savesAfterOpening = inspectable.saveCalls();
    selectSourcePoint(13);
    selectDestinationPoint(8);
    expect(inspectable.saveCalls()).toBe(savesAfterOpening);

    selectSourcePoint(8);
    selectDestinationPoint(6);
    expect(inspectable.saveCalls()).toBeGreaterThan(savesAfterOpening);

    const savesAfterMove = inspectable.saveCalls();
    fireEvent.click(screen.getByRole("button", { name: "New Game" }));
    expect(inspectable.saveCalls()).toBeGreaterThan(savesAfterMove);
  });

  it("replaces previously saved progress with a fresh snapshot on New Game", () => {
    const inspectable = createInspectableMemoryGameStorage(createSavedSnapshotText());

    renderApp({ gameStorage: inspectable.storage });

    fireEvent.click(screen.getByRole("button", { name: "New Game" }));

    const persistedValue = inspectable.getValue();
    expect(persistedValue).not.toBeNull();

    const decoded = decodeGameSnapshot(persistedValue ?? "");
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      return;
    }

    expect(decoded.snapshot.turnHistory).toHaveLength(0);
    expect(decoded.snapshot.gameState.dice).toBeNull();
    expect(decoded.snapshot.gameState.activePlayer).toBe("white");
    expect(decoded.snapshot.openingState).toEqual({
      phase: "waiting",
      openingTurnPending: false
    });
  });

  it("exports snapshot text with format/version and excludes transient selection state", () => {
    renderApp({ randomSource: createRandomSource([0.8, 0.2]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);

    openExportSection();

    expect(screen.getByTestId("snapshot-version-label")).toHaveTextContent(
      `${GAME_SNAPSHOT_FORMAT} v${GAME_SNAPSHOT_VERSION}`
    );

    const exportedTextElement = screen.getByTestId("export-snapshot-text");
    if (!(exportedTextElement instanceof HTMLTextAreaElement)) {
      throw new Error("Expected export snapshot control to be a textarea");
    }
    const exportedText = exportedTextElement.value;
    const exportedObject = JSON.parse(exportedText) as Record<string, unknown>;

    expect(exportedObject.format).toBe(GAME_SNAPSHOT_FORMAT);
    expect(exportedObject.version).toBe(GAME_SNAPSHOT_VERSION);
    expect(exportedText).not.toContain("selectedSteps");
    expect(exportedText).not.toContain("hoveredDestination");
  });

  it("imports valid snapshots atomically and preserves current state on invalid import", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderApp({ randomSource: createRandomSource([0.8, 0.2]) });

    clickOpeningRoll();
    selectSourcePoint(13);
    selectDestinationPoint(8);

    openImportSection();
    fireEvent.change(screen.getByTestId("import-snapshot-text"), {
      target: { value: createSavedSnapshotText() }
    });
    fireEvent.click(screen.getByRole("button", { name: "Validate and Import" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByTestId("turn-history-count")).toHaveTextContent("Recorded turns: 1");
    expect(screen.queryByTestId("history-inspection-banner")).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId("import-snapshot-text"), {
      target: { value: "{bad" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Validate and Import" }));

    expect(screen.getByText(/Import failed/i)).toBeInTheDocument();
    expect(screen.getByTestId("turn-history-count")).toHaveTextContent("Recorded turns: 1");

    confirmSpy.mockRestore();
  });

  it("clears saved snapshot without mutating the in-memory game", () => {
    const inspectable = createInspectableMemoryGameStorage(createSavedSnapshotText());
    renderApp({ gameStorage: inspectable.storage });

    openImportSection();
    fireEvent.click(screen.getByRole("button", { name: "Clear Saved Game" }));

    expect(inspectable.getValue()).toBeNull();
    expect(screen.getByTestId("turn-history-count")).toHaveTextContent("Recorded turns: 1");
  });
});
