import type { Player, PointIndex } from "@backgammon-trainer/backgammon-domain";

export interface CheckerSelection {
  readonly pointIndex: PointIndex;
  readonly player: Player;
}

export interface ProposedMove {
  readonly origin: CheckerSelection;
  readonly destinationPointIndex: PointIndex;
}

export const areSelectionsEqual = (
  left: CheckerSelection | null,
  right: CheckerSelection | null
): boolean => {
  if (left === null || right === null) {
    return left === right;
  }

  return left.pointIndex === right.pointIndex && left.player === right.player;
};

export const getCheckerSelectionLabel = (
  selection: CheckerSelection,
  isSelected: boolean
): string => {
  if (isSelected) {
    return "Selected " + selection.player + " checker on point " + selection.pointIndex;
  }

  return "Select " + selection.player + " checker on point " + selection.pointIndex;
};

export const getDestinationSelectionLabel = (
  pointIndex: PointIndex,
  isSelected: boolean
): string => {
  if (isSelected) {
    return "Selected destination point " + pointIndex;
  }

  return "Move selected checker to point " + pointIndex;
};
