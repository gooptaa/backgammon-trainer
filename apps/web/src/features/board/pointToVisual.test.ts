import { describe, expect, it } from "vitest";

import {
  BOTTOM_LEFT_POINTS,
  BOTTOM_RIGHT_POINTS,
  TOP_LEFT_POINTS,
  TOP_RIGHT_POINTS,
  getVisualPointSlot
} from "./pointToVisual";

describe("pointToVisual", () => {
  it("documents fixed board orientation grouping", () => {
    expect(TOP_LEFT_POINTS).toEqual([13, 14, 15, 16, 17, 18]);
    expect(TOP_RIGHT_POINTS).toEqual([19, 20, 21, 22, 23, 24]);
    expect(BOTTOM_LEFT_POINTS).toEqual([12, 11, 10, 9, 8, 7]);
    expect(BOTTOM_RIGHT_POINTS).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it("maps key points to expected visual row and side", () => {
    expect(getVisualPointSlot(24)).toMatchObject({ row: "top", side: "right" });
    expect(getVisualPointSlot(13)).toMatchObject({ row: "top", side: "left" });
    expect(getVisualPointSlot(12)).toMatchObject({ row: "bottom", side: "left" });
    expect(getVisualPointSlot(1)).toMatchObject({ row: "bottom", side: "right" });
  });
});
