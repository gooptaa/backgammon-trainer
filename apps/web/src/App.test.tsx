import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

const setDice = (dieOne: string, dieTwo: string): void => {
  fireEvent.change(screen.getByLabelText("Die 1"), { target: { value: dieOne } });
  fireEvent.change(screen.getByLabelText("Die 2"), { target: { value: dieTwo } });
  fireEvent.click(screen.getByRole("button", { name: "Set Dice" }));
};

const renderApp = (initialGameState?: GameState): void => {
  render(<App {...(initialGameState === undefined ? {} : { initialGameState })} />);
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

const selectFirstDestination = (): void => {
  const offDestination = screen.queryByRole("button", {
    name: /Select destination off/i
  });

  if (offDestination !== null) {
    fireEvent.click(offDestination);
    return;
  }

  const destinationButtons = screen.getAllByRole("button", {
    name: /Select destination point/i
  });

  fireEvent.click(destinationButtons[0] as HTMLElement);
};

afterEach(() => {
  cleanup();
});

describe("App engine game sandbox", () => {
  it("renders sandbox with no dice set", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "Engine Game Sandbox" })).toBeInTheDocument();
    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
    expect(screen.getByRole("button", { name: "Set Dice" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Pass Turn" })).toBeDisabled();
  });

  it("displays active player", () => {
    renderApp();

    const boardRegion = screen.getByRole("region", { name: "Graphical backgammon board" });
    expect(within(boardRegion).getByText("Active player: white")).toBeInTheDocument();
  });

  it("sets dice through user controls", () => {
    renderApp();

    setDice("1", "2");

    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: 1, 2");
  });

  it("shows legal moves after dice are set", () => {
    renderApp();

    setDice("1", "2");

    expect(
      screen.getAllByRole("button", { name: /Select source (point|bar)/i }).length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Legal completed moves:/i)).toBeInTheDocument();
  });

  it("applying a legal move updates position", () => {
    renderApp();

    const beforePointLabels = screen
      .getAllByRole("group")
      .map((element) => element.getAttribute("aria-label"))
      .filter((value): value is string => value !== null)
      .filter((value) => value.startsWith("Point "));

    setDice("1", "2");
    applyFirstInteractiveMove();

    const afterPointLabels = screen
      .getAllByRole("group")
      .map((element) => element.getAttribute("aria-label"))
      .filter((value): value is string => value !== null)
      .filter((value) => value.startsWith("Point "));

    expect(afterPointLabels).not.toEqual(beforePointLabels);
  });

  it("applying a move switches active player", () => {
    renderApp();

    setDice("1", "2");
    applyFirstInteractiveMove();

    const boardRegion = screen.getByRole("region", { name: "Graphical backgammon board" });
    expect(within(boardRegion).getByText("Active player: black")).toBeInTheDocument();
  });

  it("dice and legal moves clear after completed turn", () => {
    renderApp();

    setDice("1", "2");
    applyFirstInteractiveMove();

    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
    expect(
      screen.queryByRole("button", { name: /Select source (point|bar)/i })
    ).not.toBeInTheDocument();
  });

  it("pass is available only when no legal move exists", () => {
    renderApp();

    setDice("1", "2");
    expect(screen.getByRole("button", { name: "Pass Turn" })).toBeDisabled();

    cleanup();

    const noLegalMoveState = createGameState(createNoLegalMovePosition(), "white");
    render(<App initialGameState={noLegalMoveState} />);
    setDice("1", "1");

    expect(
      screen.getByText("No legal moves for this roll. You may pass the turn.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pass Turn" })).toBeEnabled();
  });

  it("passing switches active player", () => {
    const initialGameState = createGameState(createNoLegalMovePosition(), "white");

    renderApp(initialGameState);

    setDice("1", "1");
    fireEvent.click(screen.getByRole("button", { name: "Pass Turn" }));

    const boardRegion = screen.getByRole("region", { name: "Graphical backgammon board" });
    expect(within(boardRegion).getByText("Active player: black")).toBeInTheDocument();
    expect(screen.getByTestId("turn-dice-value")).toHaveTextContent("Turn dice: not set");
  });

  it("completed game shows winner and disables actions", () => {
    const completed = createGameState(createCompletePosition(), "white");

    renderApp(completed);

    expect(screen.getByText("Status: complete")).toBeInTheDocument();
    expect(screen.getByText("Winner: white")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set Dice" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pass Turn" })).toBeDisabled();
    expect(screen.getByLabelText("Die 1")).toBeDisabled();
    expect(screen.getByLabelText("Die 2")).toBeDisabled();
  });

  it("keeps board workspace visible", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Backgammon Trainer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Board Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Graphical backgammon board" })).toBeInTheDocument();
  });

  it("updates breadcrumb after each selected step", () => {
    renderApp();

    setDice("1", "1");
    selectFirstSource();
    selectFirstDestination();

    const firstBreadcrumb = screen.getByTestId("selection-breadcrumb").textContent ?? "";
    expect(firstBreadcrumb).toContain("Move:");
    expect(firstBreadcrumb).toContain("->");

    selectFirstSource();
    selectFirstDestination();

    const secondBreadcrumb = screen.getByTestId("selection-breadcrumb").textContent ?? "";
    expect(secondBreadcrumb).toContain("Move:");
    expect(secondBreadcrumb).toContain("->");
    expect(secondBreadcrumb).not.toEqual(firstBreadcrumb);
  });

  it("clears breadcrumb after move application", () => {
    renderApp();

    setDice("1", "2");
    applyFirstInteractiveMove();

    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent("");
  });

  it("clears breadcrumb after cancellation", () => {
    renderApp();

    setDice("1", "1");
    selectFirstSource();
    selectFirstDestination();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Selection" }));

    expect(screen.getByTestId("selection-breadcrumb")).toHaveTextContent("");
  });

  it("shows and clears hover preview without mutating selection", () => {
    renderApp();

    setDice("1", "2");
    selectFirstSource();

    const destinationButton = screen.getAllByRole("button", {
      name: /Select destination point/i
    })[0] as HTMLElement;

    fireEvent.mouseEnter(destinationButton);

    expect(screen.getByTestId("hover-preview").textContent?.trim().length).toBeGreaterThan(0);

    const breadcrumbBeforeLeave = screen.getByTestId("selection-breadcrumb").textContent;
    fireEvent.mouseLeave(destinationButton);

    expect(screen.getByTestId("hover-preview")).toHaveTextContent("");
    expect(screen.getByTestId("selection-breadcrumb").textContent).toEqual(breadcrumbBeforeLeave);
  });
});
