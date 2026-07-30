import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type BoardPosition } from "@backgammon-trainer/backgammon-domain";

import { BackgammonBoard } from "./BackgammonBoard";
import {
  BAR_CHECKERS_FIXTURE,
  EIGHT_STACK_FIXTURE,
  NEARLY_BEAR_OFF_FIXTURE,
  STANDARD_STARTING_POSITION
} from "./boardFixtures";

afterEach(() => {
  cleanup();
});

describe("BackgammonBoard", () => {
  const createCompletedPosition = (): BoardPosition => ({
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

  it("renders a labeled board region", () => {
    render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);

    expect(screen.getByRole("region", { name: "Graphical backgammon board" })).toBeInTheDocument();
  });

  it("renders all 24 point groups", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);

    expect(container.querySelectorAll("[data-testid^='board-point-']")).toHaveLength(24);
  });

  it("renders standard starting-position checker counts", () => {
    render(<BackgammonBoard position={STANDARD_STARTING_POSITION} activePlayer="white" />);

    expect(
      screen.getByRole("group", {
        name: "Point 24 (top right) has 2 white checkers"
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", {
        name: "Point 13 (top left) has 5 white checkers"
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", {
        name: "Point 1 (bottom right) has 2 black checkers"
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", {
        name: "Point 12 (bottom left) has 5 black checkers"
      })
    ).toBeInTheDocument();
  });

  it("distinguishes white and black checkers by labels and attributes", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);

    const labels = screen
      .getAllByRole("group")
      .map((element) => element.getAttribute("aria-label"))
      .filter((value): value is string => value !== null);

    expect(labels.some((label) => label.includes("white checkers"))).toBe(true);
    expect(labels.some((label) => label.includes("black checkers"))).toBe(true);
    expect(
      container.querySelectorAll("[data-checker-kind='point'][data-player='white']").length
    ).toBeGreaterThan(0);
    expect(
      container.querySelectorAll("[data-checker-kind='point'][data-player='black']").length
    ).toBeGreaterThan(0);
  });

  it("occupied points expose checker counts", () => {
    render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);

    expect(
      screen.getByRole("group", {
        name: "Point 8 (bottom left) has 3 white checkers"
      })
    ).toBeInTheDocument();
  });

  it("empty points render without checkers", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);

    expect(
      (container.querySelector("[data-testid='point-stack-2']") as HTMLElement).querySelectorAll(
        "[data-checker-kind='point']"
      )
    ).toHaveLength(0);
  });

  it("renders bar counts from position.bar", () => {
    render(<BackgammonBoard position={BAR_CHECKERS_FIXTURE} />);

    expect(screen.getByLabelText("White bar checkers 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Black bar checkers 1")).toBeInTheDocument();
  });

  it("renders borne-off counts from position.borneOff", () => {
    render(<BackgammonBoard position={NEARLY_BEAR_OFF_FIXTURE} />);

    expect(screen.getByLabelText("White borne off checkers 13")).toBeInTheDocument();
    expect(screen.getByLabelText("Black borne off checkers 12")).toBeInTheDocument();
  });

  it("handles large stacks without losing checker count", () => {
    const { container } = render(<BackgammonBoard position={EIGHT_STACK_FIXTURE} />);

    expect(
      screen.getByRole("group", {
        name: "Point 6 (bottom right) has 8 white checkers"
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Point 6 total checkers 8")).toBeInTheDocument();
    expect(
      container.querySelectorAll("[data-testid='point-stack-6'] [data-checker-kind='point']")
    ).toHaveLength(5);
  });

  it("shows active player indication", () => {
    render(<BackgammonBoard position={STANDARD_STARTING_POSITION} activePlayer="black" />);

    expect(screen.getByText("Active player: black")).toBeInTheDocument();
  });

  it("renders completed-game positions correctly", () => {
    render(<BackgammonBoard position={createCompletedPosition()} activePlayer="white" />);

    expect(screen.getByLabelText("White borne off checkers 15")).toBeInTheDocument();
    expect(screen.getByLabelText("Black borne off checkers 14")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Point 1 (bottom right) is empty" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Point 24 (top right) is empty" })
    ).toBeInTheDocument();
  });

  it("renders selectable source controls and emits selection callbacks", () => {
    const onSelectSource = vi.fn();
    render(
      <BackgammonBoard
        position={STANDARD_STARTING_POSITION}
        selectableSources={[13]}
        onSelectSource={onSelectSource}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Select source point 13 with 5 white checkers" })
    );

    expect(onSelectSource).toHaveBeenCalledWith(13);
  });

  it("renders selectable destination controls and emits destination callbacks", () => {
    const onSelectDestination = vi.fn();
    render(
      <BackgammonBoard
        position={STANDARD_STARTING_POSITION}
        selectableDestinations={[8]}
        onSelectDestination={onSelectDestination}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Select destination point 8" }));

    expect(onSelectDestination).toHaveBeenCalledWith(8);
  });

  it("supports bar source selection and bearing-off destination selection", () => {
    const onSelectSource = vi.fn();
    const onSelectDestination = vi.fn();

    render(
      <BackgammonBoard
        position={STANDARD_STARTING_POSITION}
        activePlayer="white"
        selectableSources={["bar"]}
        selectableDestinations={["off"]}
        onSelectSource={onSelectSource}
        onSelectDestination={onSelectDestination}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Select source bar checker for white" }));
    fireEvent.click(screen.getByRole("button", { name: "Select destination off for white" }));

    expect(onSelectSource).toHaveBeenCalledWith("bar");
    expect(onSelectDestination).toHaveBeenCalledWith("off");
  });

  it("renders a cancel selection control when cancel handler is provided", () => {
    const onCancelSelection = vi.fn();
    render(
      <BackgammonBoard
        position={STANDARD_STARTING_POSITION}
        onCancelSelection={onCancelSelection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel Selection" }));

    expect(onCancelSelection).toHaveBeenCalledTimes(1);
  });
});
