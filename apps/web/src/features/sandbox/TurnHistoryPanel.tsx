import type { TurnRecord } from "@backgammon-trainer/backgammon-engine";

import { formatMove } from "./formatMove";
import styles from "./TurnHistoryPanel.module.css";

type InspectionView = "before" | "after";

interface TurnHistoryPanelProps {
  history: readonly TurnRecord[];
  inspectionTurnNumber: number | null;
  inspectionView: InspectionView;
  inspectionActive: boolean;
  onSelectTurn: (turnNumber: number) => void;
  onSelectView: (view: InspectionView) => void;
  onSelectPreviousTurn: () => void;
  onSelectNextTurn: () => void;
  onReturnToCurrentGame: () => void;
}

const getPlayerLabel = (player: TurnRecord["player"]): string => {
  return player === "white" ? "White" : "Black";
};

const formatTurnDice = (record: TurnRecord): string => {
  return `${record.dice.dice[0]}-${record.dice.dice[1]}`;
};

const formatTurnOutcome = (record: TurnRecord): string => {
  return record.outcome.kind === "pass" ? "Pass" : formatMove(record.outcome.move);
};

const formatMoveStepMetadata = (record: TurnRecord): string => {
  if (record.outcome.kind === "pass") {
    return "No step metadata for pass.";
  }

  const stepMetadata = record.outcome.move.steps
    .map(
      (step, index) =>
        `step ${index + 1}: ${step.kind}, die ${step.dieValue}, die index ${step.dieIndex}`
    )
    .join(" | ");

  return stepMetadata;
};

const formatPositionSummary = (position: TurnRecord["positionBefore"]): string => {
  return `Bar W:${position.bar.white} B:${position.bar.black} | Off W:${position.borneOff.white} B:${position.borneOff.black}`;
};

const formatViewedPositionSummary = (record: TurnRecord, view: InspectionView): string => {
  const position = view === "before" ? record.positionBefore : record.positionAfter;

  return formatPositionSummary(position);
};

export function TurnHistoryPanel({
  history,
  inspectionTurnNumber,
  inspectionView,
  inspectionActive,
  onSelectTurn,
  onSelectView,
  onSelectPreviousTurn,
  onSelectNextTurn,
  onReturnToCurrentGame
}: TurnHistoryPanelProps): JSX.Element {
  const selectedRecord =
    inspectionTurnNumber === null
      ? null
      : (history.find((record) => record.turnNumber === inspectionTurnNumber) ?? null);

  const selectedRecordIndex =
    selectedRecord === null
      ? -1
      : history.findIndex((record) => record.turnNumber === selectedRecord.turnNumber);

  const canNavigatePrevious = selectedRecordIndex > 0;
  const canNavigateNext =
    selectedRecordIndex >= 0 && selectedRecordIndex < Math.max(history.length - 1, 0);

  return (
    <section aria-labelledby="turn-history-title" className={styles.panel}>
      <h2 id="turn-history-title">Turn History</h2>
      <p className={styles.meta} data-testid="turn-history-count">
        Recorded turns: {history.length}
      </p>

      {history.length === 0 ? (
        <p className={styles.meta}>No completed turns recorded yet.</p>
      ) : (
        <ol className={styles.historyList} data-testid="turn-history-list">
          {history.map((record) => {
            const summary = `${record.turnNumber}. ${getPlayerLabel(record.player)} - ${record.phase === "opening" ? "Opening" : "Normal"} - ${formatTurnDice(record)} - ${formatTurnOutcome(record)}`;
            const selected = record.turnNumber === inspectionTurnNumber;

            return (
              <li key={`turn-record-${record.turnNumber}`}>
                <button
                  type="button"
                  className={styles.historyRowButton}
                  aria-pressed={selected}
                  onClick={() => onSelectTurn(record.turnNumber)}
                >
                  {summary}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {selectedRecord !== null && inspectionActive ? (
        <section
          aria-label={`Inspection turn ${selectedRecord.turnNumber}`}
          className={styles.inspectionBox}
          data-testid="history-inspection-panel"
        >
          <p className={styles.meta} data-testid="history-inspection-mode">
            Inspecting turn {selectedRecord.turnNumber}
          </p>
          <p className={styles.meta} data-testid="history-selected-turn-details">
            Player: {getPlayerLabel(selectedRecord.player)} | Dice: {formatTurnDice(selectedRecord)}
          </p>
          <p className={styles.meta} data-testid="history-selected-outcome">
            Outcome: {formatTurnOutcome(selectedRecord)}
          </p>
          <p className={styles.meta} data-testid="history-selected-step-metadata">
            Step metadata: {formatMoveStepMetadata(selectedRecord)}
          </p>
          <p className={styles.meta} data-testid="history-selected-view">
            Viewing: {inspectionView === "before" ? "Before" : "After"}
          </p>
          <p className={styles.meta} data-testid="history-position-before-summary">
            Position before: {formatPositionSummary(selectedRecord.positionBefore)}
          </p>
          <p className={styles.meta} data-testid="history-position-after-summary">
            Position after: {formatPositionSummary(selectedRecord.positionAfter)}
          </p>
          <p className={styles.meta} data-testid="history-selected-position-summary">
            Viewed position: {formatViewedPositionSummary(selectedRecord, inspectionView)}
          </p>

          <div className={styles.controls}>
            <button
              type="button"
              aria-pressed={inspectionView === "before"}
              onClick={() => onSelectView("before")}
            >
              View Before
            </button>
            <button
              type="button"
              aria-pressed={inspectionView === "after"}
              onClick={() => onSelectView("after")}
            >
              View After
            </button>
            <button type="button" disabled={!canNavigatePrevious} onClick={onSelectPreviousTurn}>
              Previous Turn
            </button>
            <button type="button" disabled={!canNavigateNext} onClick={onSelectNextTurn}>
              Next Turn
            </button>
            <button type="button" onClick={onReturnToCurrentGame}>
              Return to Current Game
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
