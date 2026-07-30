import type { Player, PointIndex } from "@backgammon-trainer/backgammon-domain";

export type BoardOrientation = "white-home-right" | "white-home-left";
export type PointRow = "top" | "bottom";
export type BoardHalf = "left" | "right";
export type PointTone = "toneA" | "toneB";

export interface PointCenter {
  readonly x: number;
  readonly y: number;
}

export interface PointTriangle {
  readonly p1: PointCenter;
  readonly p2: PointCenter;
  readonly p3: PointCenter;
}

export interface PointVisualMapping {
  readonly pointIndex: PointIndex;
  readonly row: PointRow;
  readonly half: BoardHalf;
  readonly slot: number;
  readonly localSlot: number;
  readonly center: PointCenter;
}

interface StackRegion {
  readonly minY: number;
  readonly maxY: number;
  readonly direction: "down" | "up";
}

export const VIEWBOX_WIDTH = 1200;
export const VIEWBOX_HEIGHT = 800;

export const LEFT_BEAR_OFF_X0 = 0;
export const LEFT_BEAR_OFF_X1 = 90;
export const LEFT_HALF_X0 = 90;
export const LEFT_HALF_X1 = 560;
export const BAR_X0 = 560;
export const BAR_X1 = 640;
export const RIGHT_HALF_X0 = 640;
export const RIGHT_HALF_X1 = 1110;
export const RIGHT_BEAR_OFF_X0 = 1110;
export const RIGHT_BEAR_OFF_X1 = 1200;

export const HALF_WIDTH = LEFT_HALF_X1 - LEFT_HALF_X0;
export const BAR_WIDTH = BAR_X1 - BAR_X0;
export const BEAR_OFF_WIDTH = LEFT_BEAR_OFF_X1 - LEFT_BEAR_OFF_X0;

export const BOARD_TOP = 40;
export const BOARD_BOTTOM = 760;
export const BOARD_MID_Y = 400;
export const CENTER_GAP_HALF = 80;
export const TOP_POINT_APEX_Y = BOARD_MID_Y - CENTER_GAP_HALF;
export const BOTTOM_POINT_APEX_Y = BOARD_MID_Y + CENTER_GAP_HALF;

export const QUADRANT_POINT_COUNT = 6;
export const QUADRANT_SLOT_WIDTH = HALF_WIDTH / QUADRANT_POINT_COUNT;
export const POINT_X_INSET = 6;

export const CHECKER_DIAMETER = 52;
export const CHECKER_RADIUS = CHECKER_DIAMETER / 2;
export const CHECKER_BASE_GAP = 4;
export const CHECKER_NORMAL_STEP = CHECKER_DIAMETER + CHECKER_BASE_GAP;
export const MAX_NORMAL_STACK = 5;
export const STACK_TOP_MARGIN = 8;

export const BAR_TOP_REGION_Y0 = BOARD_TOP;
export const BAR_TOP_REGION_Y1 = BOARD_MID_Y - 10;
export const BAR_BOTTOM_REGION_Y0 = BOARD_MID_Y + 10;
export const BAR_BOTTOM_REGION_Y1 = BOARD_BOTTOM;

const LEFT_TRAY_CENTER_X = (LEFT_BEAR_OFF_X0 + LEFT_BEAR_OFF_X1) / 2;
const RIGHT_TRAY_CENTER_X = (RIGHT_BEAR_OFF_X0 + RIGHT_BEAR_OFF_X1) / 2;

export const getPointTone = (pointIndex: PointIndex): PointTone => {
  return pointIndex % 2 === 0 ? "toneA" : "toneB";
};

export const getOrientationTransform = (orientation: BoardOrientation): string | undefined => {
  if (orientation === "white-home-right") {
    return undefined;
  }

  return "translate(600 400) rotate(180) translate(-600 -400)";
};

export const mapPointToVisual = (pointIndex: PointIndex): PointVisualMapping => {
  const row: PointRow = pointIndex >= 13 ? "top" : "bottom";
  const slot = row === "top" ? pointIndex - 13 : 12 - pointIndex;
  const half: BoardHalf = slot <= 5 ? "left" : "right";
  const localSlot = half === "left" ? slot : slot - 6;
  const halfX0 = half === "left" ? LEFT_HALF_X0 : RIGHT_HALF_X0;

  const slotX0 = halfX0 + localSlot * QUADRANT_SLOT_WIDTH;
  const slotX1 = slotX0 + QUADRANT_SLOT_WIDTH;
  const xLeft = slotX0 + POINT_X_INSET;
  const xRight = slotX1 - POINT_X_INSET;
  const centerX = (xLeft + xRight) / 2;
  const centerY =
    row === "top" ? (BOARD_TOP + TOP_POINT_APEX_Y) / 2 : (BOARD_BOTTOM + BOTTOM_POINT_APEX_Y) / 2;

  return {
    pointIndex,
    row,
    half,
    slot,
    localSlot,
    center: {
      x: centerX,
      y: centerY
    }
  };
};

export const getPointTriangle = (pointIndex: PointIndex): PointTriangle => {
  const mapping = mapPointToVisual(pointIndex);
  const halfX0 = mapping.half === "left" ? LEFT_HALF_X0 : RIGHT_HALF_X0;
  const slotX0 = halfX0 + mapping.localSlot * QUADRANT_SLOT_WIDTH;
  const slotX1 = slotX0 + QUADRANT_SLOT_WIDTH;
  const xLeft = slotX0 + POINT_X_INSET;
  const xRight = slotX1 - POINT_X_INSET;
  const xCenter = (xLeft + xRight) / 2;

  if (mapping.row === "top") {
    return {
      p1: { x: xLeft, y: BOARD_TOP },
      p2: { x: xRight, y: BOARD_TOP },
      p3: { x: xCenter, y: TOP_POINT_APEX_Y }
    };
  }

  return {
    p1: { x: xLeft, y: BOARD_BOTTOM },
    p2: { x: xRight, y: BOARD_BOTTOM },
    p3: { x: xCenter, y: BOTTOM_POINT_APEX_Y }
  };
};

const getStackRegionForPoint = (row: PointRow): StackRegion => {
  if (row === "top") {
    return {
      minY: BOARD_TOP + STACK_TOP_MARGIN,
      maxY: TOP_POINT_APEX_Y - STACK_TOP_MARGIN,
      direction: "down"
    };
  }

  return {
    minY: BOTTOM_POINT_APEX_Y + STACK_TOP_MARGIN,
    maxY: BOARD_BOTTOM - STACK_TOP_MARGIN,
    direction: "up"
  };
};

const getStackStep = (count: number, region: StackRegion): number => {
  if (count <= 1) {
    return 0;
  }

  if (count <= MAX_NORMAL_STACK) {
    return CHECKER_NORMAL_STEP;
  }

  const availableHeight = region.maxY - region.minY;
  const availableTravel = availableHeight - CHECKER_DIAMETER;

  return Math.min(CHECKER_NORMAL_STEP, availableTravel / (count - 1));
};

export const getCheckerCentersForRegion = (
  centerX: number,
  checkerCount: number,
  region: StackRegion
): readonly PointCenter[] => {
  if (checkerCount <= 0) {
    return [];
  }

  const step = getStackStep(checkerCount, region);
  const firstY =
    region.direction === "down" ? region.minY + CHECKER_RADIUS : region.maxY - CHECKER_RADIUS;

  return Array.from({ length: checkerCount }, (_, index) => ({
    x: centerX,
    y: region.direction === "down" ? firstY + index * step : firstY - index * step
  }));
};

export const getPointCheckerCenters = (
  pointIndex: PointIndex,
  checkerCount: number
): readonly PointCenter[] => {
  const mapping = mapPointToVisual(pointIndex);
  const region = getStackRegionForPoint(mapping.row);

  return getCheckerCentersForRegion(mapping.center.x, checkerCount, region);
};

export const getBarCheckerCenters = (
  player: Player,
  checkerCount: number
): readonly PointCenter[] => {
  const centerX = (BAR_X0 + BAR_X1) / 2;
  const region: StackRegion =
    player === "white"
      ? {
          minY: BAR_TOP_REGION_Y0,
          maxY: BAR_TOP_REGION_Y1,
          direction: "down"
        }
      : {
          minY: BAR_BOTTOM_REGION_Y0,
          maxY: BAR_BOTTOM_REGION_Y1,
          direction: "up"
        };

  return getCheckerCentersForRegion(centerX, checkerCount, region);
};

export const getBearOffCheckerCenters = (
  player: Player,
  checkerCount: number
): readonly PointCenter[] => {
  const centerX = player === "white" ? RIGHT_TRAY_CENTER_X : LEFT_TRAY_CENTER_X;
  const region: StackRegion =
    player === "white"
      ? {
          minY: BAR_BOTTOM_REGION_Y0,
          maxY: BOARD_BOTTOM,
          direction: "up"
        }
      : {
          minY: BOARD_TOP,
          maxY: BAR_TOP_REGION_Y1,
          direction: "down"
        };

  return getCheckerCentersForRegion(centerX, checkerCount, region);
};
