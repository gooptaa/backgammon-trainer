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
  showActivePlayer?: boolean;
  selectableSources?: readonly SelectableSource[];
  selectableDestinations?: readonly SelectableDestination[];
  previewSources?: readonly SelectableSource[];
  previewDestinations?: readonly SelectableDestination[];
  hoveredDestination?: SelectableDestination | null;
  selectedSource?: SelectableSource | null;
  onSelectSource?: (source: SelectableSource) => void;
  onSelectDestination?: (destination: SelectableDestination) => void;
  onHoverDestination?: (destination: SelectableDestination) => void;
  onClearHoveredDestination?: () => void;
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
  isPreviewSource: boolean;
  isPreviewDestination: boolean;
  isHoveredDestination: boolean;
  isSelectedSource: boolean;
  onSelectSource?: (source: SelectableSource) => void;
  onSelectDestination?: (destination: SelectableDestination) => void;
  onHoverDestination?: (destination: SelectableDestination) => void;
  onClearHoveredDestination?: () => void;
}

function PointColumn({
  pointIndex,
  position,
  row,
  isSourceSelectable,
  isDestinationSelectable,
  isPreviewSource,
  isPreviewDestination,
  isHoveredDestination,
  isSelectedSource,
  onSelectSource,
  onSelectDestination,
  onHoverDestination,
  onClearHoveredDestination
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
        isPreviewSource ? styles.previewSourcePoint : ""
      } ${isPreviewDestination ? styles.previewDestinationPoint : ""} ${
        isHoveredDestination ? styles.hoveredDestinationPoint : ""
      } ${isSelectedSource ? styles.selectedSourcePoint : ""}`}
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
          onMouseEnter={() => onHoverDestination?.(pointIndex)}
          onMouseLeave={() => onClearHoveredDestination?.()}
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
  previewSources,
  previewDestinations,
  hoveredDestination,
  selectedSource,
  onSelectSource,
  onSelectDestination,
  onHoverDestination,
  onClearHoveredDestination,
  activePlayer
}: {
  leftPoints: readonly PointIndex[];
  rightPoints: readonly PointIndex[];
  position: BoardPosition;
  row: BoardVisualRow;
  showBarCounts: boolean;
  selectableSources: ReadonlySet<SelectableSource>;
  selectableDestinations: ReadonlySet<SelectableDestination>;
  previewSources: ReadonlySet<SelectableSource>;
  previewDestinations: ReadonlySet<SelectableDestination>;
  hoveredDestination: SelectableDestination | null;
  selectedSource: SelectableSource | null;
  onSelectSource?: (source: SelectableSource) => void;
  onSelectDestination?: (destination: SelectableDestination) => void;
  onHoverDestination?: (destination: SelectableDestination) => void;
  onClearHoveredDestination?: () => void;
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
            isPreviewSource={previewSources.has(pointIndex)}
            isPreviewDestination={previewDestinations.has(pointIndex)}
            isHoveredDestination={hoveredDestination === pointIndex}
            isSelectedSource={selectedSource === pointIndex}
            {...(onSelectSource === undefined ? {} : { onSelectSource })}
            {...(onSelectDestination === undefined ? {} : { onSelectDestination })}
            {...(onHoverDestination === undefined ? {} : { onHoverDestination })}
            {...(onClearHoveredDestination === undefined ? {} : { onClearHoveredDestination })}
          />
        ))}
      </div>
      <div
        className={`${styles.bar} ${barSourceSelectable ? styles.selectableBar : ""} ${
          previewSources.has("bar") ? styles.previewSourcePoint : ""
        }`}
      >
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
            isPreviewSource={previewSources.has(pointIndex)}
            isPreviewDestination={previewDestinations.has(pointIndex)}
            isHoveredDestination={hoveredDestination === pointIndex}
            isSelectedSource={selectedSource === pointIndex}
            {...(onSelectSource === undefined ? {} : { onSelectSource })}
            {...(onSelectDestination === undefined ? {} : { onSelectDestination })}
            {...(onHoverDestination === undefined ? {} : { onHoverDestination })}
            {...(onClearHoveredDestination === undefined ? {} : { onClearHoveredDestination })}
          />
        ))}
      </div>
    </div>
  );
}

export function BackgammonBoard({
  position,
  activePlayer = "white",
  showActivePlayer = true,
  selectableSources = [],
  selectableDestinations = [],
  previewSources = [],
  previewDestinations = [],
  hoveredDestination = null,
  selectedSource = null,
  onSelectSource,
  onSelectDestination,
  onHoverDestination,
  onClearHoveredDestination,
  onCancelSelection
}: BackgammonBoardProps): JSX.Element {
  const effectiveActivePlayer = activePlayer;
  const selectableSourceSet = new Set<SelectableSource>(selectableSources);
  const selectableDestinationSet = new Set<SelectableDestination>(selectableDestinations);
  const previewSourceSet = new Set<SelectableSource>(previewSources);
  const previewDestinationSet = new Set<SelectableDestination>(previewDestinations);
  const offDestinationSelectable = selectableDestinationSet.has("off");

  return (
    <section className={styles.boardRoot} aria-label="Graphical backgammon board" role="region">
      <header className={styles.boardHeader}>
        {showActivePlayer ? (
          <p className={styles.activePlayer} aria-live="polite">
            Active player: {effectiveActivePlayer}
          </p>
        ) : null}
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
          previewSources={previewSourceSet}
          previewDestinations={previewDestinationSet}
          hoveredDestination={hoveredDestination}
          selectedSource={selectedSource}
          {...(onSelectSource === undefined ? {} : { onSelectSource })}
          {...(onSelectDestination === undefined ? {} : { onSelectDestination })}
          {...(onHoverDestination === undefined ? {} : { onHoverDestination })}
          {...(onClearHoveredDestination === undefined ? {} : { onClearHoveredDestination })}
          activePlayer={effectiveActivePlayer}
        />
        <PointRow
          leftPoints={BOTTOM_LEFT_POINTS}
          rightPoints={BOTTOM_RIGHT_POINTS}
          position={position}
          row="bottom"
          showBarCounts={false}
          selectableSources={selectableSourceSet}
          selectableDestinations={selectableDestinationSet}
          previewSources={previewSourceSet}
          previewDestinations={previewDestinationSet}
          hoveredDestination={hoveredDestination}
          selectedSource={selectedSource}
          {...(onSelectSource === undefined ? {} : { onSelectSource })}
          {...(onSelectDestination === undefined ? {} : { onSelectDestination })}
          {...(onHoverDestination === undefined ? {} : { onHoverDestination })}
          {...(onClearHoveredDestination === undefined ? {} : { onClearHoveredDestination })}
          activePlayer={effectiveActivePlayer}
        />
      </div>

      <footer className={styles.borneOffPanel}>
        <p
          aria-label={`White borne off checkers ${position.borneOff.white}`}
          className={
            offDestinationSelectable && effectiveActivePlayer === "white"
              ? styles.selectableOff
              : ""
          }
        >
          White borne off: {position.borneOff.white}
          {offDestinationSelectable && effectiveActivePlayer === "white" ? (
            <button
              type="button"
              className={styles.offButton}
              aria-label="Select destination off for white"
              onClick={() => onSelectDestination?.("off")}
              onMouseEnter={() => onHoverDestination?.("off")}
              onMouseLeave={() => onClearHoveredDestination?.()}
            >
              Select Off
            </button>
          ) : null}
        </p>
        <p
          aria-label={`Black borne off checkers ${position.borneOff.black}`}
          className={
            offDestinationSelectable && effectiveActivePlayer === "black"
              ? styles.selectableOff
              : ""
          }
        >
          Black borne off: {position.borneOff.black}
          {offDestinationSelectable && effectiveActivePlayer === "black" ? (
            <button
              type="button"
              className={styles.offButton}
              aria-label="Select destination off for black"
              onClick={() => onSelectDestination?.("off")}
              onMouseEnter={() => onHoverDestination?.("off")}
              onMouseLeave={() => onClearHoveredDestination?.()}
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
            Undo Last Step
          </button>
        </div>
      ) : null}
    </section>
  );
}
