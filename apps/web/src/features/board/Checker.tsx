import styles from "./BackgammonBoard.module.css";

interface CheckerProps {
  cx: number;
  cy: number;
  player: "white" | "black";
  kind: "point" | "bar" | "borne-off";
  stackIndex: number;
}

export function Checker({ cx, cy, player, kind, stackIndex }: CheckerProps): JSX.Element {
  const className = player === "white" ? styles.checkerWhite : styles.checkerBlack;
  const strokeWidth = player === "white" ? 2.6 : 1.8;

  return (
    <circle
      className={className}
      cx={cx}
      cy={cy}
      r={26}
      data-player={player}
      data-stack-index={stackIndex}
      data-checker-kind={kind}
      strokeWidth={strokeWidth}
    />
  );
}
