import { type PointIndex } from "@backgammon-trainer/backgammon-domain";

export type BoardVisualRow = "top" | "bottom";
export type BoardVisualSide = "left" | "right";

export interface VisualPointSlot {
  readonly pointIndex: PointIndex;
  readonly row: BoardVisualRow;
  readonly side: BoardVisualSide;
  readonly slot: number;
}

export const TOP_LEFT_POINTS: readonly PointIndex[] = [13, 14, 15, 16, 17, 18];
export const TOP_RIGHT_POINTS: readonly PointIndex[] = [19, 20, 21, 22, 23, 24];
export const BOTTOM_LEFT_POINTS: readonly PointIndex[] = [12, 11, 10, 9, 8, 7];
export const BOTTOM_RIGHT_POINTS: readonly PointIndex[] = [6, 5, 4, 3, 2, 1];

export const getVisualPointSlot = (pointIndex: PointIndex): VisualPointSlot => {
  const row: BoardVisualRow = pointIndex >= 13 ? "top" : "bottom";
  const slot = row === "top" ? pointIndex - 13 : 12 - pointIndex;

  return {
    pointIndex,
    row,
    side: slot < 6 ? "left" : "right",
    slot
  };
};
