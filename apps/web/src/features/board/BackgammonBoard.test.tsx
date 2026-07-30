import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { validateBoardPosition } from "@backgammon-trainer/backgammon-domain";

import { BackgammonBoard } from "./BackgammonBoard";
import {
  BAR_CHECKERS_FIXTURE,
  EMPTY_BOARD_GEOMETRY_FIXTURE,
  NEARLY_BEAR_OFF_FIXTURE,
  STANDARD_STARTING_POSITION
} from "./boardFixtures";

describe("BackgammonBoard", () => {
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

  it("does not mutate supplied domain position", () => {
    const snapshot = JSON.stringify(STANDARD_STARTING_POSITION);
    render(<BackgammonBoard position={STANDARD_STARTING_POSITION} />);

    expect(JSON.stringify(STANDARD_STARTING_POSITION)).toBe(snapshot);
  });

  it("documents that empty geometry fixture is intentionally invalid", () => {
    const result = validateBoardPosition(EMPTY_BOARD_GEOMETRY_FIXTURE);

    expect(result.valid).toBe(false);
  });
});
