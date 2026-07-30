import {
  type BoardPosition,
  type Player,
  type PointIndex
} from "@backgammon-trainer/backgammon-domain";

import {
  BOTTOM_LEFT_POINTS,
  BOTTOM_RIGHT_POINTS,
  TOP_LEFT_POINTS,
  TOP_RIGHT_POINTS,
  getVisualPointSlot,
  type BoardVisualRow
} from "./pointToVisual";
import styles from "./BackgammonBoard.module.css";

export interface BackgammonBoardProps {
  position: BoardPosition;
  activePlayer?: Player;
}

const MAX_VISIBLE_STACK_CHECKERS = 5;

const getPointLabel = (pointIndex: PointIndex, position: BoardPosition): string => {
  const occupancy = position.points[pointIndex];
  const mapping = getVisualPointSlot(pointIndex);

  if (occupancy === null) {
    return `Point ${pointIndex} (${mapping.row} ${mapping.side}) is empty`;
  }

  return `Point ${pointIndex} (${mapping.row} ${mapping.side}) has ${occupancy.checkerCount} ${occupancy.player} checkers`;
};

interface PointColumnProps {
  pointIndex: PointIndex;
  position: BoardPosition;
  row: BoardVisualRow;
}

function PointColumn({ pointIndex, position, row }: PointColumnProps): JSX.Element {
  const occupancy = position.points[pointIndex];
  const isEven = pointIndex % 2 === 0;
  const visibleCheckerCount =
    occupancy === null ? 0 : Math.min(occupancy.checkerCount, MAX_VISIBLE_STACK_CHECKERS);

  return (
    <div
      className={styles.pointColumn}
      data-point-index={pointIndex}
      data-testid={`board-point-${pointIndex}`}
      aria-label={getPointLabel(pointIndex, position)}
      role="group"
    >
      <div
        className={`${styles.pointTriangle} ${isEven ? styles.pointToneA : styles.pointToneB} ${
          row === "top" ? styles.pointTop : styles.pointBottom
        }`}
        aria-hidden="true"
      />
      <div
        className={`${styles.stackArea} ${row === "top" ? styles.stackTop : styles.stackBottom}`}
        data-testid={`point-stack-${pointIndex}`}
      >
        {occupancy !== null
          ? Array.from({ length: visibleCheckerCount }, (_, index) => (
              <span
                key={`checker-${pointIndex}-${index}`}
                className={`${styles.checker} ${
                  occupancy.player === "white" ? styles.checkerWhite : styles.checkerBlack
                }`}
                data-checker-kind="point"
                data-player={occupancy.player}
                aria-hidden="true"
              >
                <span className={styles.checkerGlyph}>
                  {occupancy.player === "white" ? "W" : "B"}
                </span>
              </span>
            ))
          : null}
        {occupancy !== null && occupancy.checkerCount > MAX_VISIBLE_STACK_CHECKERS ? (
          <span
            className={styles.stackCountBadge}
            aria-label={`Point ${pointIndex} total checkers ${occupancy.checkerCount}`}
          >
            x{occupancy.checkerCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PointRow({
  leftPoints,
  rightPoints,
  position,
  row,
  showBarCounts
}: {
  leftPoints: readonly PointIndex[];
  rightPoints: readonly PointIndex[];
  position: BoardPosition;
  row: BoardVisualRow;
  showBarCounts: boolean;
}): JSX.Element {
  return (
    <div className={`${styles.row} ${row === "top" ? styles.rowTop : styles.rowBottom}`}>
      <div className={styles.halfRow}>
        {leftPoints.map((pointIndex) => (
          <PointColumn
            key={`point-${pointIndex}`}
            pointIndex={pointIndex}
            position={position}
            row={row}
          />
        ))}
      </div>
      <div className={styles.bar}>
        {showBarCounts ? (
          <>
            <p className={styles.barLabel}>Bar</p>
            <p className={styles.barCount} aria-label={`White bar checkers ${position.bar.white}`}>
              W: {position.bar.white}
            </p>
            <p className={styles.barCount} aria-label={`Black bar checkers ${position.bar.black}`}>
              B: {position.bar.black}
            </p>
          </>
        ) : (
          <p className={styles.barLabel} aria-hidden="true">
            Bar
          </p>
        )}
      </div>
      <div className={styles.halfRow}>
        {rightPoints.map((pointIndex) => (
          <PointColumn
            key={`point-${pointIndex}`}
            pointIndex={pointIndex}
            position={position}
            row={row}
          />
        ))}
      </div>
    </div>
  );
}

export function BackgammonBoard({
  position,
  activePlayer = "white"
}: BackgammonBoardProps): JSX.Element {
  return (
    <section className={styles.boardRoot} aria-label="Graphical backgammon board" role="region">
      <header className={styles.boardHeader}>
        <p className={styles.activePlayer} aria-live="polite">
          Active player: {activePlayer}
        </p>
        <p className={styles.orientationNote}>Orientation: white home board on the right</p>
      </header>

      <div className={styles.boardSurface}>
        <PointRow
          leftPoints={TOP_LEFT_POINTS}
          rightPoints={TOP_RIGHT_POINTS}
          position={position}
          row="top"
          showBarCounts
        />
        <PointRow
          leftPoints={BOTTOM_LEFT_POINTS}
          rightPoints={BOTTOM_RIGHT_POINTS}
          position={position}
          row="bottom"
          showBarCounts={false}
        />
      </div>

      <footer className={styles.borneOffPanel}>
        <p aria-label={`White borne off checkers ${position.borneOff.white}`}>
          White borne off: {position.borneOff.white}
        </p>
        <p aria-label={`Black borne off checkers ${position.borneOff.black}`}>
          Black borne off: {position.borneOff.black}
        </p>
      </footer>
    </section>
  );
}
