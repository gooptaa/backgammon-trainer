import { type PointIndex } from "@backgammon-trainer/backgammon-domain";
import type { KeyboardEventHandler } from "react";

import { getPointTone, getPointTriangle, type PointTone } from "./boardGeometry";
import styles from "./BackgammonBoard.module.css";

interface PointProps {
  pointIndex: PointIndex;
  destinationTargetEnabled?: boolean;
  destinationSelected?: boolean;
  destinationLabel?: string;
  onSelectDestination?: (pointIndex: PointIndex) => void;
}

const getPointClassName = (tone: PointTone): string => {
  return tone === "toneA" ? (styles.pointToneA ?? "") : (styles.pointToneB ?? "");
};

export function Point({
  pointIndex,
  destinationTargetEnabled = false,
  destinationSelected = false,
  destinationLabel,
  onSelectDestination
}: PointProps): JSX.Element {
  const tone = getPointTone(pointIndex);
  const triangle = getPointTriangle(pointIndex);
  const points = `${triangle.p1.x},${triangle.p1.y} ${triangle.p2.x},${triangle.p2.y} ${triangle.p3.x},${triangle.p3.y}`;
  const destinationInteractionEnabled =
    destinationTargetEnabled && destinationLabel !== undefined && onSelectDestination !== undefined;

  const handleDestinationSelect = (): void => {
    onSelectDestination?.(pointIndex);
  };

  const onKeyDown: KeyboardEventHandler<SVGGElement> = (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleDestinationSelect();
  };

  return (
    <g id={`point-${pointIndex}`} data-point-index={pointIndex.toString()}>
      <polygon className={getPointClassName(tone)} points={points} />
      {destinationInteractionEnabled ? (
        <g
          aria-label={destinationLabel}
          data-destination-point-index={pointIndex}
          role="button"
          tabIndex={0}
          onClick={handleDestinationSelect}
          onKeyDown={onKeyDown}
        >
          <polygon className={styles.destinationHitArea} points={points} />
          {destinationSelected ? (
            <polygon className={styles.destinationSelectedOverlay} points={points} />
          ) : null}
        </g>
      ) : null}
    </g>
  );
}
