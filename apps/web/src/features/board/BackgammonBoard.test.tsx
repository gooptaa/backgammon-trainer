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
  it("has no destination controls active before selecting a checker", () => {
    render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);

    expect(
      screen.queryByRole("button", { name: "Move selected checker to point 18" })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear Destination" })).not.toBeInTheDocument();
  });

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

  it("selecting a checker exposes destination targets", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));

    expect(
      board.getByRole("button", { name: "Selected white checker on point 24" })
    ).toBeInTheDocument();
    expect(
      board.getByRole("button", { name: "Move selected checker to point 18" })
    ).toBeInTheDocument();
    expect(board.getByRole("button", { name: "Cancel Selection" })).toBeInTheDocument();
  });

  it("selecting an empty point creates a proposal", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 18" }));

    expect(board.getByText("Proposed move: 24 -> 18")).toBeInTheDocument();
    expect(
      board.getByRole("button", { name: "Selected destination point 18" })
    ).toBeInTheDocument();
  });

  it("selecting an occupied point creates a proposal", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 13" }));

    expect(board.getByText("Proposed move: 24 -> 13")).toBeInTheDocument();
  });

  it("proposal contains canonical origin and destination indexes", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 18" }));

    expect(board.getByText("Proposed move: 24 -> 18")).toBeInTheDocument();
  });

  it("selecting a second destination replaces the first", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 18" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 17" }));

    expect(board.getByText("Proposed move: 24 -> 17")).toBeInTheDocument();
    expect(board.queryByText("Proposed move: 24 -> 18")).not.toBeInTheDocument();
  });

  it("clear destination removes destination and preserves origin", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 18" }));
    fireEvent.click(board.getByRole("button", { name: "Clear Destination" }));

    expect(
      board.getByRole("button", { name: "Selected white checker on point 24" })
    ).toBeInTheDocument();
    expect(board.queryByText("Proposed move: 24 -> 18")).not.toBeInTheDocument();
    expect(board.getByText("Choose a destination for point 24.")).toBeInTheDocument();
  });

  it("selecting another checker clears the previous destination", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 18" }));
    fireEvent.click(board.getByRole("button", { name: "Select black checker on point 1" }));

    expect(board.queryByText("Proposed move: 24 -> 18")).not.toBeInTheDocument();
    expect(board.getByText("Choose a destination for point 1.")).toBeInTheDocument();
  });

  it("clicking the selected checker again clears origin and destination", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 18" }));
    fireEvent.click(board.getByRole("button", { name: "Selected white checker on point 24" }));

    expect(board.queryByText(/Proposed move:/)).not.toBeInTheDocument();
    expect(board.queryByRole("button", { name: "Clear Destination" })).not.toBeInTheDocument();
    expect(board.queryByRole("button", { name: /^Selected / })).not.toBeInTheDocument();
  });

  it("Escape clears origin and destination", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 18" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(board.queryByText(/Proposed move:/)).not.toBeInTheDocument();
    expect(board.queryByRole("button", { name: "Cancel Selection" })).not.toBeInTheDocument();
  });

  it("Cancel Selection clears origin and destination", () => {
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 18" }));
    fireEvent.click(board.getByRole("button", { name: "Cancel Selection" }));

    expect(board.queryByText(/Proposed move:/)).not.toBeInTheDocument();
    expect(board.queryByRole("button", { name: /^Selected / })).not.toBeInTheDocument();
  });

  it("calls onProposedMoveChange with proposal and null transitions", () => {
    const onProposedMoveChange = vi.fn();
    const { container } = render(
      <BackgammonBoard
        onProposedMoveChange={onProposedMoveChange}
        position={STANDARD_STARTING_POSITION}
      />
    );
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 18" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 17" }));
    fireEvent.click(board.getByRole("button", { name: "Clear Destination" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onProposedMoveChange).toHaveBeenNthCalledWith(1, {
      origin: { pointIndex: 24, player: "white" },
      destinationPointIndex: 18
    });
    expect(onProposedMoveChange).toHaveBeenNthCalledWith(2, {
      origin: { pointIndex: 24, player: "white" },
      destinationPointIndex: 17
    });
    expect(onProposedMoveChange).toHaveBeenNthCalledWith(3, null);
    expect(onProposedMoveChange).toHaveBeenCalledTimes(3);
  });

  it("selecting a destination does not mutate supplied position", () => {
    const snapshot = JSON.stringify(STANDARD_STARTING_POSITION);
    const { container } = render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 18" }));

    expect(JSON.stringify(STANDARD_STARTING_POSITION)).toBe(snapshot);
  });

  it("flipped orientation still emits canonical point indexes", () => {
    const onProposedMoveChange = vi.fn();
    const { container } = render(
      <BackgammonBoard
        onProposedMoveChange={onProposedMoveChange}
        orientation="white-home-left"
        position={STANDARD_STARTING_POSITION}
      />
    );
    const board = within(container);

    fireEvent.click(board.getByRole("button", { name: "Select white checker on point 24" }));
    fireEvent.click(board.getByRole("button", { name: "Move selected checker to point 18" }));

    expect(onProposedMoveChange).toHaveBeenCalledWith({
      origin: { pointIndex: 24, player: "white" },
      destinationPointIndex: 18
    });
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

  it("static board rendering remains valid with no callbacks supplied", () => {
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
