import {
  POINT_INDEXES,
  type BoardPosition,
  type Player
} from "@backgammon-trainer/backgammon-domain";

import styles from "./BackgammonBoard.module.css";
import { CheckerStack } from "./CheckerStack";
import { Point } from "./Point";
import {
  BAR_X0,
  BAR_X1,
  BOARD_BOTTOM,
  BOARD_TOP,
  LEFT_BEAR_OFF_X0,
  LEFT_BEAR_OFF_X1,
  RIGHT_BEAR_OFF_X0,
  RIGHT_BEAR_OFF_X1,
  VIEWBOX_WIDTH,
  VIEWBOX_HEIGHT,
  getBarCheckerCenters,
  getBearOffCheckerCenters,
  getOrientationTransform,
  mapPointToVisual,
  getPointCheckerCenters,
  type BoardOrientation
} from "./boardGeometry";

export interface BackgammonBoardProps {
  position: BoardPosition;
  orientation?: BoardOrientation;
  accessibleLabel?: string;
  showCoordinates?: boolean;
}

const players: readonly Player[] = ["white", "black"];
const INSET_OFFSET = 12;
const INSET_BORDER_OFFSET = 2;

const diePips: Record<1 | 2 | 3 | 4 | 5 | 6, readonly [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-16, -16],
    [16, 16]
  ],
  3: [
    [-16, -16],
    [0, 0],
    [16, 16]
  ],
  4: [
    [-16, -16],
    [16, -16],
    [-16, 16],
    [16, 16]
  ],
  5: [
    [-16, -16],
    [16, -16],
    [0, 0],
    [-16, 16],
    [16, 16]
  ],
  6: [
    [-16, -16],
    [16, -16],
    [-16, 0],
    [16, 0],
    [-16, 16],
    [16, 16]
  ]
};

interface StaticDieProps {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  x: number;
  y: number;
}

function StaticDie({ value, x, y }: StaticDieProps): JSX.Element {
  return (
    <g aria-hidden="true" className={styles.die} transform={`translate(${x} ${y})`}>
      <rect className={styles.dieBody} height={58} rx={12} ry={12} width={58} x={-29} y={-29} />
      {diePips[value].map(([dx, dy], index) => (
        <circle key={`pip-${value}-${index}`} className={styles.diePip} cx={dx} cy={dy} r={4.6} />
      ))}
    </g>
  );
}

export function BackgammonBoard({
  position,
  orientation = "white-home-right",
  accessibleLabel = "Backgammon board",
  showCoordinates = false
}: BackgammonBoardProps): JSX.Element {
  const orientationTransform = getOrientationTransform(orientation);
  const shouldShowCoordinates = showCoordinates && orientation === "white-home-right";

  return (
    <div className={styles.boardRoot}>
      <svg
        aria-label={accessibleLabel}
        className={styles.boardSvg}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox="0 0 1200 800"
      >
        <g transform={orientationTransform}>
          <g aria-hidden="true">
            <rect
              className={styles.boardFrame}
              height={VIEWBOX_HEIGHT}
              width={VIEWBOX_WIDTH}
              x={0}
              y={0}
            />
            <rect
              className={styles.boardInset}
              height={VIEWBOX_HEIGHT - INSET_OFFSET * 2}
              width={VIEWBOX_WIDTH - INSET_OFFSET * 2}
              x={INSET_OFFSET}
              y={INSET_OFFSET}
            />
            <rect
              className={styles.boardSurface}
              height={BOARD_BOTTOM - BOARD_TOP - INSET_BORDER_OFFSET * 2}
              width={RIGHT_BEAR_OFF_X0 - LEFT_BEAR_OFF_X1 - INSET_BORDER_OFFSET * 2}
              x={LEFT_BEAR_OFF_X1 + INSET_BORDER_OFFSET}
              y={BOARD_TOP + INSET_BORDER_OFFSET}
            />
          </g>

          <g aria-hidden="true">
            <rect
              className={styles.bearOffSurface}
              height={BOARD_BOTTOM - BOARD_TOP}
              width={LEFT_BEAR_OFF_X1 - LEFT_BEAR_OFF_X0}
              x={LEFT_BEAR_OFF_X0}
              y={BOARD_TOP}
            />
            <rect
              className={styles.bearOffSurface}
              height={BOARD_BOTTOM - BOARD_TOP}
              width={RIGHT_BEAR_OFF_X1 - RIGHT_BEAR_OFF_X0}
              x={RIGHT_BEAR_OFF_X0}
              y={BOARD_TOP}
            />
          </g>

          <g aria-hidden="true">
            {POINT_INDEXES.map((pointIndex) => (
              <Point key={pointIndex} pointIndex={pointIndex} />
            ))}
          </g>

          <g aria-hidden="true">
            <rect
              className={styles.barSurface}
              height={BOARD_BOTTOM - BOARD_TOP}
              width={BAR_X1 - BAR_X0}
              x={BAR_X0}
              y={BOARD_TOP}
            />
            <line
              className={styles.barDivider}
              x1={BAR_X0}
              x2={BAR_X0}
              y1={BOARD_TOP}
              y2={BOARD_BOTTOM}
            />
            <line
              className={styles.barDivider}
              x1={BAR_X1}
              x2={BAR_X1}
              y1={BOARD_TOP}
              y2={BOARD_BOTTOM}
            />
          </g>

          <g aria-hidden="true">
            <StaticDie value={6} x={510} y={400} />
            <StaticDie value={3} x={690} y={400} />
          </g>

          <g aria-hidden="true">
            {POINT_INDEXES.map((pointIndex) => {
              const occupancy = position.points[pointIndex];
              if (!occupancy) {
                return null;
              }

              return (
                <CheckerStack
                  key={`point-checkers-${pointIndex}`}
                  centers={getPointCheckerCenters(pointIndex, occupancy.checkerCount)}
                  kind="point"
                  player={occupancy.player}
                  stackPrefix={`point-${pointIndex}`}
                />
              );
            })}
          </g>

          <g aria-hidden="true">
            {players.map((player) => (
              <CheckerStack
                key={`bar-${player}`}
                centers={getBarCheckerCenters(player, position.bar[player])}
                kind="bar"
                player={player}
                stackPrefix={`bar-${player}`}
              />
            ))}
          </g>

          <g aria-hidden="true">
            {players.map((player) => (
              <CheckerStack
                key={`borne-off-${player}`}
                centers={getBearOffCheckerCenters(player, position.borneOff[player])}
                kind="borne-off"
                player={player}
                stackPrefix={`borne-off-${player}`}
              />
            ))}
          </g>

          {shouldShowCoordinates ? (
            <g aria-hidden="true">
              {POINT_INDEXES.map((pointIndex) => {
                const mapping = mapPointToVisual(pointIndex);
                const labelY = mapping.row === "top" ? BOARD_TOP - 10 : BOARD_BOTTOM + 22;

                return (
                  <text
                    key={`point-label-${pointIndex}`}
                    className={styles.pointLabel}
                    textAnchor="middle"
                    x={mapping.center.x}
                    y={labelY}
                  >
                    {pointIndex}
                  </text>
                );
              })}
            </g>
          ) : null}
        </g>
      </svg>
    </div>
  );
}
