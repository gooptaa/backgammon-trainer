import type { KeyboardEventHandler } from "react";
import type { PointIndex } from "@backgammon-trainer/backgammon-domain";

import styles from "./BackgammonBoard.module.css";

interface CheckerProps {
  cx: number;
  cy: number;
  player: "white" | "black";
  kind: "point" | "bar" | "borne-off";
  stackIndex: number;
  pointIndex?: PointIndex;
  selectable?: boolean;
  selected?: boolean;
  selectionLabel?: string;
  onSelect?: () => void;
}

export function Checker({
  cx,
  cy,
  player,
  kind,
  stackIndex,
  pointIndex,
  selectable = false,
  selected = false,
  selectionLabel,
  onSelect
}: CheckerProps): JSX.Element {
  const className = player === "white" ? styles.checkerWhite : styles.checkerBlack;
  const strokeWidth = player === "white" ? 2.6 : 1.8;
  const selectionRing = selected ? (
    <>
      <circle className={styles.selectedCheckerRing} cx={cx} cy={cy} r={30} />
      <circle className={styles.selectedCheckerMarker} cx={cx} cy={cy} r={5.5} />
    </>
  ) : null;

  const checkerCircle = (
    <>
      <circle
        className={className}
        cx={cx}
        cy={cy}
        r={26}
        data-player={player}
        data-point-index={pointIndex}
        data-stack-index={stackIndex}
        data-checker-kind={kind}
        strokeWidth={strokeWidth}
      />
      {selectionRing}
    </>
  );

  if (!onSelect) {
    return checkerCircle;
  }

  if (!selectable || !selectionLabel || pointIndex === undefined) {
    return <g onClick={onSelect}>{checkerCircle}</g>;
  }

  const onKeyDown: KeyboardEventHandler<SVGGElement> = (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onSelect();
  };

  return (
    <g
      aria-label={selectionLabel}
      data-selectable-checker="true"
      data-player={player}
      data-point-index={pointIndex}
      data-stack-index={stackIndex}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      {checkerCircle}
    </g>
  );
}
