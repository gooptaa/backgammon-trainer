import type { PointIndex } from "@backgammon-trainer/backgammon-domain";

import { Checker } from "./Checker";

interface CheckerStackProps {
  centers: readonly { x: number; y: number }[];
  player: "white" | "black";
  kind: "point" | "bar" | "borne-off";
  stackPrefix: string;
  pointIndex?: PointIndex;
  selectableStackIndex?: number;
  isSelected?: boolean;
  selectionLabel?: string;
  onSelectExposedChecker?: () => void;
}

export function CheckerStack({
  centers,
  player,
  kind,
  stackPrefix,
  pointIndex,
  selectableStackIndex,
  isSelected = false,
  selectionLabel,
  onSelectExposedChecker
}: CheckerStackProps): JSX.Element {
  return (
    <g>
      {centers.map((center, index) => {
        const isPointStackSelectable =
          pointIndex !== undefined && onSelectExposedChecker !== undefined;
        const isExposedSelectable =
          pointIndex !== undefined &&
          index === selectableStackIndex &&
          selectionLabel !== undefined &&
          onSelectExposedChecker !== undefined;

        return (
          <Checker
            key={`${stackPrefix}-${index}`}
            cx={center.x}
            cy={center.y}
            player={player}
            kind={kind}
            stackIndex={index}
            {...(pointIndex !== undefined ? { pointIndex } : {})}
            {...(isPointStackSelectable ? { onSelect: onSelectExposedChecker } : {})}
            {...(isExposedSelectable
              ? {
                  selectable: true,
                  selected: isSelected,
                  selectionLabel,
                  onSelect: onSelectExposedChecker
                }
              : {})}
          />
        );
      })}
    </g>
  );
}
