import { type PointIndex } from "@backgammon-trainer/backgammon-domain";

import { getPointTone, getPointTriangle, type PointTone } from "./boardGeometry";
import styles from "./BackgammonBoard.module.css";

interface PointProps {
  pointIndex: PointIndex;
}

const getPointClassName = (tone: PointTone): string => {
  return tone === "toneA" ? (styles.pointToneA ?? "") : (styles.pointToneB ?? "");
};

export function Point({ pointIndex }: PointProps): JSX.Element {
  const tone = getPointTone(pointIndex);
  const triangle = getPointTriangle(pointIndex);
  const points = `${triangle.p1.x},${triangle.p1.y} ${triangle.p2.x},${triangle.p2.y} ${triangle.p3.x},${triangle.p3.y}`;

  return (
    <g id={`point-${pointIndex}`} data-point-index={pointIndex.toString()}>
      <polygon className={getPointClassName(tone)} points={points} />
    </g>
  );
}
