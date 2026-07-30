import type {
  GameState,
  GameStatus,
  GetLegalMovesForStateResult
} from "@backgammon-trainer/backgammon-engine";
import { POINT_INDEXES, type DieValue, type Player } from "@backgammon-trainer/backgammon-domain";

import { DiceDisplay } from "./DiceDisplay";
import styles from "./EngineSandboxPanel.module.css";

interface EngineSandboxPanelProps {
  gameState: GameState;
  gameStatus: GameStatus;
  dieOne: DieValue;
  dieTwo: DieValue;
  message: string | null;
  legalMovesResult: GetLegalMovesForStateResult;
  openingRollState: OpeningRollState;
  openingTurnPending: boolean;
  interactionLocked: boolean;
  canRollDice: boolean;
  canSetDiceManually: boolean;
  exportSnapshotText: string;
  importText: string;
  canCopySnapshot: boolean;
  snapshotFormat: string;
  snapshotVersion: number;
  onDieOneChange: (value: DieValue) => void;
  onDieTwoChange: (value: DieValue) => void;
  onRollForOpening: () => void;
  onRollDice: () => void;
  onSetDice: () => void;
  onPassTurn: () => void;
  onNewGame: () => void;
  onCopyExportSnapshot: () => void;
  onImportTextChange: (value: string) => void;
  onValidateAndImportSnapshot: () => void;
  onClearSavedGame: () => void;
}

type OpeningRollState =
  | {
      readonly phase: "waiting";
    }
  | {
      readonly phase: "tied";
      readonly whiteDie: DieValue;
      readonly blackDie: DieValue;
    }
  | {
      readonly phase: "resolved";
      readonly whiteDie: DieValue;
      readonly blackDie: DieValue;
      readonly startingPlayer: Player;
    };

const DIE_VALUES: readonly DieValue[] = [1, 2, 3, 4, 5, 6];

const getPlayerLabel = (player: Player): string => {
  return player === "white" ? "White" : "Black";
};

const getOccupiedPointRows = (gameState: GameState): readonly string[] => {
  return POINT_INDEXES.flatMap((point) => {
    const occupancy = gameState.position.points[point];

    if (occupancy === null) {
      return [];
    }

    return [`${point}: ${occupancy.player} x${occupancy.checkerCount}`];
  });
};

export function EngineSandboxPanel({
  gameState,
  gameStatus,
  dieOne,
  dieTwo,
  message,
  legalMovesResult,
  openingRollState,
  openingTurnPending,
  interactionLocked,
  canRollDice,
  canSetDiceManually,
  exportSnapshotText,
  importText,
  canCopySnapshot,
  snapshotFormat,
  snapshotVersion,
  onDieOneChange,
  onDieTwoChange,
  onRollForOpening,
  onRollDice,
  onSetDice,
  onPassTurn,
  onNewGame,
  onCopyExportSnapshot,
  onImportTextChange,
  onValidateAndImportSnapshot,
  onClearSavedGame
}: EngineSandboxPanelProps): JSX.Element {
  const isComplete = gameStatus.state === "complete";
  const legalMoves = legalMovesResult.ok ? legalMovesResult.moves : [];
  const canPass =
    !interactionLocked &&
    !isComplete &&
    gameState.dice !== null &&
    legalMovesResult.ok &&
    legalMoves.length === 0;
  const occupiedPointRows = getOccupiedPointRows(gameState);
  const canRollForOpening =
    !interactionLocked && !isComplete && openingRollState.phase !== "resolved";

  return (
    <section aria-labelledby="engine-sandbox-title" className={styles.panel}>
      <h2 id="engine-sandbox-title">Engine Game Sandbox</h2>
      <p className={styles.meta}>Status: {isComplete ? "complete" : "in-progress"}</p>
      {openingRollState.phase === "resolved" ? (
        <p className={styles.meta}>Active player: {gameState.activePlayer}</p>
      ) : null}
      {isComplete && gameStatus.state === "complete" ? (
        <p className={styles.meta}>Winner: {gameStatus.winner}</p>
      ) : null}

      <p className={styles.meta} data-testid="opening-phase">
        Opening phase: {openingRollState.phase}
      </p>
      {openingRollState.phase !== "waiting" ? (
        <>
          <p className={styles.meta} aria-label={`White opening die ${openingRollState.whiteDie}`}>
            White opening die: {openingRollState.whiteDie}
          </p>
          <p className={styles.meta} aria-label={`Black opening die ${openingRollState.blackDie}`}>
            Black opening die: {openingRollState.blackDie}
          </p>
        </>
      ) : null}
      {openingRollState.phase === "resolved" ? (
        <p className={styles.meta} data-testid="opening-resolution">
          {getPlayerLabel(openingRollState.startingPlayer)} starts with {openingRollState.whiteDie}-
          {openingRollState.blackDie}
          {openingTurnPending ? " (opening turn in progress)" : ""}
        </p>
      ) : null}

      <DiceDisplay dice={gameState.dice} />
      <p className={styles.meta} data-testid="turn-dice-value">
        Turn dice:{" "}
        {gameState.dice === null
          ? "not set"
          : `${gameState.dice.dice[0]}, ${gameState.dice.dice[1]}`}
      </p>

      <div className={styles.controls}>
        {canRollForOpening ? (
          <button type="button" onClick={onRollForOpening}>
            {openingRollState.phase === "tied" ? "Roll Again" : "Roll for Opening"}
          </button>
        ) : null}

        <button type="button" onClick={onRollDice} disabled={!canRollDice || interactionLocked}>
          Roll Dice
        </button>

        <button type="button" onClick={onPassTurn} disabled={!canPass}>
          Pass Turn
        </button>

        <button type="button" onClick={onNewGame}>
          New Game
        </button>

        <details className={styles.devControls}>
          <summary>Development controls</summary>
          <p className={styles.meta}>Manual dice assignment for deterministic UI testing.</p>
          <div className={styles.diceRow}>
            <div className={styles.field}>
              <label htmlFor="die-one">Die 1</label>
              <select
                id="die-one"
                value={dieOne}
                disabled={!canSetDiceManually || interactionLocked}
                onChange={(event) => onDieOneChange(Number(event.currentTarget.value) as DieValue)}
              >
                {DIE_VALUES.map((value) => (
                  <option key={`die-one-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="die-two">Die 2</label>
              <select
                id="die-two"
                value={dieTwo}
                disabled={!canSetDiceManually || interactionLocked}
                onChange={(event) => onDieTwoChange(Number(event.currentTarget.value) as DieValue)}
              >
                {DIE_VALUES.map((value) => (
                  <option key={`die-two-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={onSetDice}
            disabled={!canSetDiceManually || interactionLocked}
          >
            Set Dice Manually
          </button>
        </details>

        <details className={styles.devControls}>
          <summary>Export Game</summary>
          <p className={styles.meta} data-testid="snapshot-version-label">
            Format: {snapshotFormat} v{snapshotVersion}
          </p>
          <textarea
            aria-label="Exported game snapshot"
            className={styles.snapshotTextArea}
            data-testid="export-snapshot-text"
            readOnly
            value={exportSnapshotText}
          />
          <button type="button" onClick={onCopyExportSnapshot} disabled={!canCopySnapshot}>
            Copy Snapshot
          </button>
        </details>

        <details className={styles.devControls}>
          <summary>Import Game</summary>
          <p className={styles.meta}>
            Paste a previously exported snapshot and validate before import.
          </p>
          <textarea
            aria-label="Import game snapshot"
            className={styles.snapshotTextArea}
            data-testid="import-snapshot-text"
            value={importText}
            onChange={(event) => onImportTextChange(event.currentTarget.value)}
          />
          <button type="button" onClick={onValidateAndImportSnapshot}>
            Validate and Import
          </button>
          <button type="button" onClick={onClearSavedGame}>
            Clear Saved Game
          </button>
        </details>

        <p aria-live="polite" className={styles.message}>
          {message ?? ""}
        </p>
      </div>

      {interactionLocked ? (
        <p className={styles.meta} data-testid="controls-locked-notice">
          Live controls are disabled while inspecting history.
        </p>
      ) : null}

      {gameState.dice !== null && !isComplete && !interactionLocked ? (
        legalMoves.length > 0 ? (
          <p className={styles.meta}>
            Legal completed moves: {legalMoves.length}. Select source and destination points on the
            board to construct a legal move.
          </p>
        ) : (
          <p className={styles.meta}>No legal moves for this roll. You may pass the turn.</p>
        )
      ) : null}

      <div className={styles.positionBox}>
        <h3>Position Snapshot</h3>
        <ul className={styles.positionList} data-testid="occupied-points">
          {occupiedPointRows.map((row) => (
            <li key={row}>{row}</li>
          ))}
        </ul>
        <p className={styles.meta} data-testid="bar-counts">
          Bar: white {gameState.position.bar.white}, black {gameState.position.bar.black}
        </p>
        <p className={styles.meta} data-testid="borne-off-counts">
          Borne off: white {gameState.position.borneOff.white}, black{" "}
          {gameState.position.borneOff.black}
        </p>
      </div>
    </section>
  );
}
