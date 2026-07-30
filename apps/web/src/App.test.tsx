import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGameState, type GameState } from "@backgammon-trainer/backgammon-engine";
import { type BoardPosition } from "@backgammon-trainer/backgammon-domain";

import App from "./App";

const createCompletePosition = (): BoardPosition => ({
  points: {
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
  },
  bar: {
    white: 0,
    black: 0
  },
  borneOff: {
    white: 15,
    black: 14
  }
});

const createNoLegalMovePosition = (): BoardPosition => ({
  points: {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
    7: { player: "black", checkerCount: 2 },
    8: { player: "white", checkerCount: 1 },
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
  },
  bar: {
    white: 0,
    black: 0
  },
  borneOff: {
    white: 14,
    black: 13
  }
});

const renderApp = (options?: {
  initialGameState?: GameState;
  randomSource?: () => number;
}): void => {
  render(
    <App
      {...(options?.initialGameState === undefined
        ? {}
        : { initialGameState: options.initialGameState })}
      {...(options?.randomSource === undefined ? {} : { randomSource: options.randomSource })}
    />
  );
};

const rollDice = (): void => {
  fireEvent.click(screen.getByRole("button", { name: "Roll Dice" }));
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

const applyFirstInteractiveMove = (): void => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const sourceButtons = screen.queryAllByRole("button", {
      name: /Select source (point|bar)/i
    });

    if (sourceButtons.length === 0) {
      return;
    }

    fireEvent.click(sourceButtons[0] as HTMLElement);

    const offDestination = screen.queryByRole("button", {
      name: /Select destination off/i
    });

    if (offDestination !== null) {
      fireEvent.click(offDestination);
    } else {
      const destinationButtons = screen.queryAllByRole("button", {
        name: /Select destination point/i
      });

      if (destinationButtons.length === 0) {
        return;
      }

      fireEvent.click(destinationButtons[0] as HTMLElement);
    }

    if (screen.getByTestId("turn-dice-value").textContent?.includes("not set") === true) {
      return;
    }
  }
};

const selectFirstSource = (): void => {
  const sourceButtons = screen.getAllByRole("button", {
    name: /Select source (point|bar)/i
  });

  fireEvent.click(sourceButtons[0] as HTMLElement);
};

const hoverFirstDestination = (): HTMLElement => {
  const destinationButton = screen.getAllByRole("button", {
    name: /Select destination point/i
  })[0] as HTMLElement;

  fireEvent.mouseEnter(destinationButton);
  return destinationButton;
};

afterEach(() => {
  cleanup();
});

describe("App game loop controls", () => {
  it("shows Roll Dice before dice are set", () => {
    renderApp();

    expect(screen.getByRole("button", { name: "Roll Dice" })).toBeEnabled();
    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
  });

  it("uses injected randomness to produce deterministic roll values", () => {
    const random = vi.fn<() => number>().mockReturnValueOnce(0.0).mockReturnValueOnce(0.5);

    renderApp({ randomSource: random });
    rollDice();

    expect(random).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: 1, 4");
    expect(screen.getByLabelText("Dice: 1 and 4")).toBeInTheDocument();
  });

  it("rolling dice enables board interaction through legal-move state transition", () => {
    renderApp();

    rollDice();

    expect(
      screen.getAllByRole("button", { name: /Select source (point|bar)/i }).length
    ).toBeGreaterThan(0);
  });

  it("disables Roll Dice after a successful roll", () => {
    renderApp();

    rollDice();

    expect(screen.getByRole("button", { name: "Roll Dice" })).toBeDisabled();
  });

  it("clears dice after a successful move and enables next-turn roll", () => {
    renderApp();

    rollDice();
    applyFirstInteractiveMove();

    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
    expect(screen.getByRole("button", { name: "Roll Dice" })).toBeEnabled();

    const boardRegion = screen.getByRole("region", { name: "Graphical backgammon board" });
    expect(within(boardRegion).getByText("Active player: black")).toBeInTheDocument();
  });

  it("clears dice after legal pass and enables next-turn roll", () => {
    const initialGameState = createGameState(createNoLegalMovePosition(), "white");

    renderApp({ initialGameState });

    setDiceManually("1", "1");
    fireEvent.click(screen.getByRole("button", { name: "Pass Turn" }));

    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
    expect(screen.getByRole("button", { name: "Roll Dice" })).toBeEnabled();
  });

  it("keeps Roll Dice disabled after completion", () => {
    const completed = createGameState(createCompletePosition(), "white");

    renderApp({ initialGameState: completed });

    expect(screen.getByRole("button", { name: "Roll Dice" })).toBeDisabled();
    expect(screen.getByText("Status: complete")).toBeInTheDocument();
  });

  it("restores starting position and player on New Game", () => {
    renderApp();

    rollDice();
    applyFirstInteractiveMove();
    fireEvent.click(screen.getByRole("button", { name: "New Game" }));

    const boardRegion = screen.getByRole("region", { name: "Graphical backgammon board" });
    expect(within(boardRegion).getByText("Active player: white")).toBeInTheDocument();
    expect(
      within(boardRegion).getByRole("group", {
        name: "Point 24 (top right) has 2 white checkers"
      })
    ).toBeInTheDocument();
    expect(
      within(boardRegion).getByRole("group", {
        name: "Point 12 (bottom left) has 5 black checkers"
      })
    ).toBeInTheDocument();
  });

  it("new game clears dice, selection, hover preview, and messages", () => {
    renderApp();

    rollDice();
    selectFirstSource();
    hoverFirstDestination();

    expect(screen.getByTestId("hover-preview").textContent?.trim().length).toBeGreaterThan(0);
    expect(screen.getByTestId("interaction-status")).toHaveTextContent("Select a destination");

    fireEvent.click(screen.getByRole("button", { name: "New Game" }));

    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent("");
    expect(screen.getByTestId("hover-preview")).toHaveTextContent("");
    expect(screen.getByTestId("interaction-status")).toHaveTextContent("Roll dice to start turn");
  });

  it("manual dice controls remain functional for development", () => {
    renderApp();

    setDiceManually("6", "3");

    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: 6, 3");
  });

  it("prevents manual and random dice assignment during the same turn", () => {
    renderApp();

    rollDice();
    openDevelopmentControls();

    expect(screen.getByRole("button", { name: "Set Dice Manually" })).toBeDisabled();
    expect(screen.getByLabelText("Die 1")).toBeDisabled();
    expect(screen.getByLabelText("Die 2")).toBeDisabled();
  });

  it("preserves state when dice transition is unavailable", () => {
    const completed = createGameState(createCompletePosition(), "white");

    renderApp({ initialGameState: completed });

    const before = screen.getByTestId("turn-dice-value").textContent;

    expect(before).toBe("Turn dice: not set");
    expect(screen.getByRole("button", { name: "Roll Dice" })).toBeDisabled();
  });
});

describe("App interactive move feedback", () => {
  it("updates breadcrumb after each selected step", () => {
    renderApp();

    setDiceManually("1", "1");
    selectFirstSource();
    fireEvent.click(screen.getAllByRole("button", { name: /Select destination point/i })[0]!);

    const firstBreadcrumb = screen.getByTestId("selection-breadcrumb").textContent ?? "";
    expect(firstBreadcrumb).toContain("Move:");
    expect(firstBreadcrumb).toContain("->");

    selectFirstSource();
    fireEvent.click(screen.getAllByRole("button", { name: /Select destination point/i })[0]!);

    const secondBreadcrumb = screen.getByTestId("selection-breadcrumb").textContent ?? "";
    expect(secondBreadcrumb).toContain("Move:");
    expect(secondBreadcrumb).toContain("->");
    expect(secondBreadcrumb).not.toEqual(firstBreadcrumb);
  });

  it("clears breadcrumb after move application", () => {
    renderApp();

    rollDice();
    applyFirstInteractiveMove();

    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent("");
  });

  it("clears breadcrumb after cancellation", () => {
    renderApp();

    setDiceManually("1", "1");
    selectFirstSource();
    fireEvent.click(screen.getAllByRole("button", { name: /Select destination point/i })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Cancel Selection" }));

    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent("");
  });

  it("shows hover preview and clears it on pointer leave", () => {
    renderApp();

    rollDice();
    selectFirstSource();

    const destinationButton = hoverFirstDestination();

    expect(screen.getByTestId("hover-preview").textContent?.trim().length).toBeGreaterThan(0);

    const breadcrumbBeforeLeave = screen.getByTestId("selection-breadcrumb").textContent;
    fireEvent.mouseLeave(destinationButton);

    expect(screen.getByTestId("hover-preview")).toHaveTextContent("");
    expect(screen.getByTestId("selection-breadcrumb").textContent).toEqual(breadcrumbBeforeLeave);
  });
});
