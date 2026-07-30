import {
  type BoardPosition,
  type Player,
  type PointIndex
} from "@backgammon-trainer/backgammon-domain";
import type { SelectableDestination, SelectableSource } from "../sandbox/moveSelection";

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
  selectableSources?: readonly SelectableSource[];
  selectableDestinations?: readonly SelectableDestination[];
  selectedSource?: SelectableSource | null;
  onSelectSource?: (source: SelectableSource) => void;
  onSelectDestination?: (destination: SelectableDestination) => void;
  onCancelSelection?: () => void;
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
  isSourceSelectable: boolean;
  isDestinationSelectable: boolean;
  isSelectedSource: boolean;
  onSelectSource?: (source: SelectableSource) => void;
  onSelectDestination?: (destination: SelectableDestination) => void;
}

function PointColumn({
  pointIndex,
  position,
  row,
  isSourceSelectable,
  isDestinationSelectable,
  isSelectedSource,
  onSelectSource,
  onSelectDestination
}: PointColumnProps): JSX.Element {
  const occupancy = position.points[pointIndex];
  const isEven = pointIndex % 2 === 0;
  const visibleCheckerCount =
    occupancy === null ? 0 : Math.min(occupancy.checkerCount, MAX_VISIBLE_STACK_CHECKERS);

  const sourceLabel =
    occupancy === null
      ? `Point ${pointIndex} is not selectable as source`
      : `Select source point ${pointIndex} with ${occupancy.checkerCount} ${occupancy.player} checkers`;
  const destinationLabel = `Select destination point ${pointIndex}`;

  return (
    <div
      className={`${styles.pointColumn} ${
        isSourceSelectable ? styles.selectableSourcePoint : ""
      } ${isDestinationSelectable ? styles.selectableDestinationPoint : ""} ${
        isSelectedSource ? styles.selectedSourcePoint : ""
      }`}
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
      {isSourceSelectable && occupancy !== null ? (
        <button
          type="button"
          className={styles.interactionButton}
          aria-label={sourceLabel}
          aria-selected={isSelectedSource}
          onClick={() => onSelectSource?.(pointIndex)}
        />
      ) : null}
      {isDestinationSelectable ? (
        <button
          type="button"
          className={styles.interactionButton}
          aria-label={destinationLabel}
          aria-selected="false"
          onClick={() => onSelectDestination?.(pointIndex)}
        />
      ) : null}
    </div>
  );
}

function PointRow({
  leftPoints,
  rightPoints,
  position,
  row,
  showBarCounts,
  selectableSources,
  selectableDestinations,
  selectedSource,
  onSelectSource,
  onSelectDestination,
  activePlayer
}: {
  leftPoints: readonly PointIndex[];
  rightPoints: readonly PointIndex[];
  position: BoardPosition;
  row: BoardVisualRow;
  showBarCounts: boolean;
  selectableSources: ReadonlySet<SelectableSource>;
  selectableDestinations: ReadonlySet<SelectableDestination>;
  selectedSource: SelectableSource | null;
  onSelectSource?: (source: SelectableSource) => void;
  onSelectDestination?: (destination: SelectableDestination) => void;
  activePlayer: Player;
}): JSX.Element {
  const barSourceSelectable = selectableSources.has("bar");

  return (
    <div className={`${styles.row} ${row === "top" ? styles.rowTop : styles.rowBottom}`}>
      <div className={styles.halfRow}>
        {leftPoints.map((pointIndex) => (
          <PointColumn
            key={`point-${pointIndex}`}
            pointIndex={pointIndex}
            position={position}
            row={row}
            isSourceSelectable={selectableSources.has(pointIndex)}
            isDestinationSelectable={selectableDestinations.has(pointIndex)}
            isSelectedSource={selectedSource === pointIndex}
            {...(onSelectSource === undefined ? {} : { onSelectSource })}
            {...(onSelectDestination === undefined ? {} : { onSelectDestination })}
          />
        ))}
      </div>
      <div className={`${styles.bar} ${barSourceSelectable ? styles.selectableBar : ""}`}>
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
        {barSourceSelectable && showBarCounts ? (
          <button
            type="button"
            className={styles.barButton}
            aria-label={`Select source bar checker for ${activePlayer}`}
            aria-selected={selectedSource === "bar"}
            onClick={() => onSelectSource?.("bar")}
          >
            Select Bar
          </button>
        ) : null}
      </div>
      <div className={styles.halfRow}>
        {rightPoints.map((pointIndex) => (
          <PointColumn
            key={`point-${pointIndex}`}
            pointIndex={pointIndex}
            position={position}
            row={row}
            isSourceSelectable={selectableSources.has(pointIndex)}
            isDestinationSelectable={selectableDestinations.has(pointIndex)}
            isSelectedSource={selectedSource === pointIndex}
            {...(onSelectSource === undefined ? {} : { onSelectSource })}
            {...(onSelectDestination === undefined ? {} : { onSelectDestination })}
          />
        ))}
      </div>
    </div>
  );
}

export function BackgammonBoard({
  position,
  activePlayer = "white",
  selectableSources = [],
  selectableDestinations = [],
  selectedSource = null,
  onSelectSource,
  onSelectDestination,
  onCancelSelection
}: BackgammonBoardProps): JSX.Element {
  const selectableSourceSet = new Set<SelectableSource>(selectableSources);
  const selectableDestinationSet = new Set<SelectableDestination>(selectableDestinations);
  const offDestinationSelectable = selectableDestinationSet.has("off");

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
          selectableSources={selectableSourceSet}
          selectableDestinations={selectableDestinationSet}
          selectedSource={selectedSource}
          {...(onSelectSource === undefined ? {} : { onSelectSource })}
          {...(onSelectDestination === undefined ? {} : { onSelectDestination })}
          activePlayer={activePlayer}
        />
        <PointRow
          leftPoints={BOTTOM_LEFT_POINTS}
          rightPoints={BOTTOM_RIGHT_POINTS}
          position={position}
          row="bottom"
          showBarCounts={false}
          selectableSources={selectableSourceSet}
          selectableDestinations={selectableDestinationSet}
          selectedSource={selectedSource}
          {...(onSelectSource === undefined ? {} : { onSelectSource })}
          {...(onSelectDestination === undefined ? {} : { onSelectDestination })}
          activePlayer={activePlayer}
        />
      </div>

      <footer className={styles.borneOffPanel}>
        <p
          aria-label={`White borne off checkers ${position.borneOff.white}`}
          className={
            offDestinationSelectable && activePlayer === "white" ? styles.selectableOff : ""
          }
        >
          White borne off: {position.borneOff.white}
          {offDestinationSelectable && activePlayer === "white" ? (
            <button
              type="button"
              className={styles.offButton}
              aria-label="Select destination off for white"
              onClick={() => onSelectDestination?.("off")}
            >
              Select Off
            </button>
          ) : null}
        </p>
        <p
          aria-label={`Black borne off checkers ${position.borneOff.black}`}
          className={
            offDestinationSelectable && activePlayer === "black" ? styles.selectableOff : ""
          }
        >
          Black borne off: {position.borneOff.black}
          {offDestinationSelectable && activePlayer === "black" ? (
            <button
              type="button"
              className={styles.offButton}
              aria-label="Select destination off for black"
              onClick={() => onSelectDestination?.("off")}
            >
              Select Off
            </button>
          ) : null}
        </p>
      </footer>

      {onCancelSelection !== undefined ? (
        <div className={styles.selectionControls}>
          <button
            type="button"
            className={styles.cancelSelectionButton}
            onClick={onCancelSelection}
          >
            Cancel Selection
          </button>
        </div>
      ) : null}
    </section>
  );
}
