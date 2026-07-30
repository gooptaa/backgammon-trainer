import { describe, expect, it } from "vitest";

import {
  BOARD_BOTTOM,
  BOARD_TOP,
  BOTTOM_POINT_APEX_Y,
  CHECKER_NORMAL_STEP,
  CHECKER_RADIUS,
  STACK_TOP_MARGIN,
  TOP_POINT_APEX_Y,
  getOrientationTransform,
  getPointCheckerCenters,
  getPointTone,
  mapPointToVisual
} from "./boardGeometry";

describe("boardGeometry", () => {
  it("maps all 24 point indices to unique visual locations", () => {
    const uniqueLocations = new Set(
      Array.from({ length: 24 }, (_, index) => index + 1)
        .map((point) => mapPointToVisual(point as 1).center)
        .map((center) => `${center.x},${center.y}`)
    );

    expect(uniqueLocations.size).toBe(24);
  });

  it("matches the default mapping for top and bottom rows", () => {
    const top = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(
      (point) => mapPointToVisual(point as 13).slot
    );
    const bottom = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(
      (point) => mapPointToVisual(point as 12).slot
    );

    expect(top).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(bottom).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("maps point 1 to the lower-rightmost slot", () => {
    const mapping = mapPointToVisual(1);

    expect(mapping.row).toBe("bottom");
    expect(mapping.half).toBe("right");
    expect(mapping.slot).toBe(11);
    expect(mapping.localSlot).toBe(5);
  });

  it("maps point 24 to the upper-rightmost slot", () => {
    const mapping = mapPointToVisual(24);

    expect(mapping.row).toBe("top");
    expect(mapping.half).toBe("right");
    expect(mapping.slot).toBe(11);
    expect(mapping.localSlot).toBe(5);
  });

  it("alternates point tone by point-index parity", () => {
    expect(getPointTone(1)).toBe("toneB");
    expect(getPointTone(2)).toBe("toneA");
    expect(getPointTone(23)).toBe("toneB");
    expect(getPointTone(24)).toBe("toneA");
  });

  it("returns one center for a one-checker stack", () => {
    const centers = getPointCheckerCenters(24, 1);

    expect(centers).toHaveLength(1);
    expect(centers[0]?.y).toBe(BOARD_TOP + STACK_TOP_MARGIN + CHECKER_RADIUS);
  });

  it("uses normal spacing for five-checker stacks", () => {
    const centers = getPointCheckerCenters(24, 5);
    const steps = centers.slice(1).map((center, index) => center.y - centers[index]!.y);

    expect(steps.every((step) => step === CHECKER_NORMAL_STEP)).toBe(true);
  });

  it("compresses eight-checker stacks to remain inside point bounds", () => {
    const centers = getPointCheckerCenters(24, 8);

    expect(centers).toHaveLength(8);
    const first = centers[0]!;
    const last = centers[centers.length - 1]!;
    const step = centers[1]!.y - centers[0]!.y;

    expect(step).toBeLessThan(CHECKER_NORMAL_STEP);
    expect(first.y - CHECKER_RADIUS).toBeGreaterThanOrEqual(BOARD_TOP + STACK_TOP_MARGIN);
    expect(last.y + CHECKER_RADIUS).toBeLessThanOrEqual(TOP_POINT_APEX_Y - STACK_TOP_MARGIN);
  });

  it("grows top and bottom stacks in opposite vertical directions", () => {
    const topCenters = getPointCheckerCenters(24, 3);
    const bottomCenters = getPointCheckerCenters(1, 3);

    expect(topCenters[1]!.y).toBeGreaterThan(topCenters[0]!.y);
    expect(bottomCenters[1]!.y).toBeLessThan(bottomCenters[0]!.y);
    expect(bottomCenters[2]!.y - CHECKER_RADIUS).toBeGreaterThanOrEqual(
      BOTTOM_POINT_APEX_Y + STACK_TOP_MARGIN
    );
    expect(bottomCenters[0]!.y + CHECKER_RADIUS).toBeLessThanOrEqual(
      BOARD_BOTTOM - STACK_TOP_MARGIN
    );
  });

  it("returns the expected transform for flipped orientation", () => {
    expect(getOrientationTransform("white-home-right")).toBeUndefined();
    expect(getOrientationTransform("white-home-left")).toBe(
      "translate(600 400) rotate(180) translate(-600 -400)"
    );
  });
});
