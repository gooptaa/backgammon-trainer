import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { validateBoardPosition } from "@backgammon-trainer/backgammon-domain";

import { BackgammonBoard } from "./BackgammonBoard";
import {
  BAR_CHECKERS_FIXTURE,
  EMPTY_BOARD_GEOMETRY_FIXTURE,
  NEARLY_BEAR_OFF_FIXTURE,
  STANDARD_STARTING_POSITION
} from "./boardFixtures";

describe("BackgammonBoard", () => {
  it("has no selected checker initially", () => {
    render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);

    expect(screen.queryByRole("button", { name: /^Selected / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel Selection" })).not.toBeInTheDocument();
  });

  it("has an accessible name", () => {
    render(
      <BackgammonBoard accessibleLabel="Training board" position={STANDARD_STARTING_POSITION} />
    );

    expect(screen.getByRole("img", { name: "Training board" })).toBeInTheDocument();
  });

  it("renders all 24 point groups", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);

    expect(container.querySelectorAll("g[id^='point-']")).toHaveLength(24);
  });

  it("renders 30 point checkers for the standard starting position", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);

    expect(container.querySelectorAll("circle[data-checker-kind='point']")).toHaveLength(30);
  });

  it("renders bar fixture checker counts from position.bar", () => {
    const { container } = render(<BackgammonBoard position={BAR_CHECKERS_FIXTURE} />);

    expect(
      container.querySelectorAll("circle[data-checker-kind='bar'][data-player='white']")
    ).toHaveLength(1);
    expect(
      container.querySelectorAll("circle[data-checker-kind='bar'][data-player='black']")
    ).toHaveLength(1);
  });

  it("renders borne-off fixture checker counts from position.borneOff", () => {
    const { container } = render(<BackgammonBoard position={NEARLY_BEAR_OFF_FIXTURE} />);

    expect(
      container.querySelectorAll("circle[data-checker-kind='borne-off'][data-player='white']")
    ).toHaveLength(13);
    expect(
      container.querySelectorAll("circle[data-checker-kind='borne-off'][data-player='black']")
    ).toHaveLength(12);
  });

  it("selects an exposed checker when clicked", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));

    expect(
      board.getByRole("button", { name: "Selected white checker on point 24" })
    ).toBeInTheDocument();
    expect(board.getByRole("button", { name: "Cancel Selection" })).toBeInTheDocument();
  });

  it("deselects when the selected checker is clicked again", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    const checker = board.getByRole("button", { name: "Select white checker on point 24" });
    fireEvent.click(checker);
    fireEvent.click(board.getByRole("button", { name: "Selected white checker on point 24" }));

    expect(board.queryByRole("button", { name: /^Selected / })).not.toBeInTheDocument();
  });

  it("transfers selection when a different exposed checker is clicked", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Select black checker on point 1" }));

    expect(
      board.getByRole("button", { name: "Selected black checker on point 1" })
    ).toBeInTheDocument();
    expect(
      board.queryByRole("button", { name: "Selected white checker on point 24" })
    ).not.toBeInTheDocument();
  });

  it("selects the exposed checker when a covered checker in the same stack is clicked", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);
    const coveredChecker = container.querySelector(
      "circle[data-checker-kind='point'][data-player='white'][data-point-index='24'][data-stack-index='0']"
    );

    expect(coveredChecker).toBeInTheDocument();
    fireEvent.click(coveredChecker as SVGCircleElement);

    expect(
      board.getByRole("button", { name: "Selected white checker on point 24" })
    ).toBeInTheDocument();
  });

  it("does not expose covered checkers as independently selectable", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);

    expect(
      container.querySelectorAll("[data-selectable-checker='true'][data-point-index='24']")
    ).toHaveLength(1);
    expect(
      container.querySelector(
        "[data-selectable-checker='true'][data-point-index='24'][data-stack-index='0']"
      )
    ).not.toBeInTheDocument();
  });

  it("does not allow selecting empty points", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    expect(board.queryByRole("button", { name: /point 2$/ })).not.toBeInTheDocument();
    expect(board.queryByRole("button", { name: /point 11$/ })).not.toBeInTheDocument();
  });

  it("does not allow selecting bar or borne-off checkers", () => {
    const { container } = render(<BackgammonBoard position={NEARLY_BEAR_OFF_FIXTURE} />);

    expect(container.querySelectorAll("circle[data-checker-kind='bar']")).toHaveLength(0);
    expect(container.querySelectorAll("circle[data-checker-kind='borne-off']")).toHaveLength(25);
    expect(container.querySelectorAll("[data-selectable-checker='true']")).toHaveLength(2);
  });

  it("clears selection when Escape is pressed", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(board.queryByRole("button", { name: /^Selected / })).not.toBeInTheDocument();
  });

  it("clears selection via Cancel Selection control", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Cancel Selection" }));

    expect(board.queryByRole("button", { name: /^Selected / })).not.toBeInTheDocument();
    expect(board.queryByRole("button", { name: "Cancel Selection" })).not.toBeInTheDocument();
  });

  it("does not mutate supplied domain position", () => {
    const snapshot = JSON.stringify(STANDARD_STARTING_POSITION);
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(JSON.stringify(STANDARD_STARTING_POSITION)).toBe(snapshot);
  });

  it("calls onSelectionChange with selection and null transitions", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <BackgammonBoard
        onSelectionChange={onSelectionChange}
        position={STANDARD_STARTING_POSITION}
      />
    );
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Select black checker on point 1" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onSelectionChange).toHaveBeenNthCalledWith(1, { pointIndex: 24, player: "white" });
    expect(onSelectionChange).toHaveBeenNthCalledWith(2, { pointIndex: 1, player: "black" });
    expect(onSelectionChange).toHaveBeenNthCalledWith(3, null);
  });

  it("still renders statically without interaction callback", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    expect(container.querySelectorAll("circle[data-checker-kind='point']")).toHaveLength(30);
    expect(board.getByRole("img", { name: "Backgammon board" })).toBeInTheDocument();
  });

  it("documents that empty geometry fixture is intentionally invalid", () => {
    const result = validateBoardPosition(EMPTY_BOARD_GEOMETRY_FIXTURE);

    expect(result.valid).toBe(false);
  });
});
