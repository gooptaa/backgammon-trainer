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
  canSetDiceManually: boolean;
  exportSnapshotText: string;
  importText: string;
  canCopySnapshot: boolean;
  snapshotFormat: string;
  snapshotVersion: number;
  learnerOwnershipMode: "white" | "black" | "both" | "unknown";
  recentWindowSize: number;
  recentBestOrReasonableCount: number;
  recentMistakeCount: number;
  recentMajorMistakeCount: number;
  recentUnclassifiedCount: number;
  recentMainPatternLabel: string;
  recentMainPatternDetail?: string;
  profileGamesRepresented: number;
  profileStorageStatus: "ready" | "memory-only" | "lineage-memory-only";
  profileMessage: string | null;
  onDieOneChange: (value: DieValue) => void;
  onDieTwoChange: (value: DieValue) => void;
  onSetDice: () => void;
  onSetLearnerOwnership: (value: "white" | "black" | "both" | "unknown") => void;
  onClearLearnerProfile: () => void;
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
  canSetDiceManually,
  exportSnapshotText,
  importText,
  canCopySnapshot,
  snapshotFormat,
  snapshotVersion,
  learnerOwnershipMode,
  recentWindowSize,
  recentBestOrReasonableCount,
  recentMistakeCount,
  recentMajorMistakeCount,
  recentUnclassifiedCount,
  recentMainPatternLabel,
  recentMainPatternDetail,
  profileGamesRepresented,
  profileStorageStatus,
  profileMessage,
  onDieOneChange,
  onDieTwoChange,
  onSetDice,
  onSetLearnerOwnership,
  onClearLearnerProfile,
  onCopyExportSnapshot,
  onImportTextChange,
  onValidateAndImportSnapshot,
  onClearSavedGame
}: EngineSandboxPanelProps): JSX.Element {
  const isComplete = gameStatus.state === "complete";
  const legalMoves = legalMovesResult.ok ? legalMovesResult.moves : [];
  const occupiedPointRows = getOccupiedPointRows(gameState);

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

      <p className={styles.meta}>Opening phase: {openingRollState.phase}</p>
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
        <p className={styles.meta}>
          {getPlayerLabel(openingRollState.startingPlayer)} starts with {openingRollState.whiteDie}-
          {openingRollState.blackDie}
          {openingTurnPending ? " (opening turn in progress)" : ""}
        </p>
      ) : null}

      <DiceDisplay dice={gameState.dice} />
      <p className={styles.meta}>
        Turn dice:{" "}
        {gameState.dice === null
          ? "not set"
          : `${gameState.dice.dice[0]}, ${gameState.dice.dice[1]}`}
      </p>

      <div className={styles.controls}>
        <details className={styles.devControls}>
          <summary>Learner Profile</summary>
          <p className={styles.meta}>
            Local-only progress profile. Data stays in this browser unless you export it manually in
            a future milestone.
          </p>
          <div className={styles.field}>
            <label htmlFor="learner-ownership">Learner side for this game</label>
            <select
              id="learner-ownership"
              value={learnerOwnershipMode}
              onChange={(event) =>
                onSetLearnerOwnership(
                  event.currentTarget.value as "white" | "black" | "both" | "unknown"
                )
              }
            >
              <option value="unknown">Unknown (no learner attribution)</option>
              <option value="white">Learner plays White</option>
              <option value="black">Learner plays Black</option>
              <option value="both">Both sides explored</option>
            </select>
          </div>
          <p className={styles.meta} data-testid="recent-progress-heading">
            Recent {recentWindowSize} learner decisions
          </p>
          <p className={styles.meta} data-testid="recent-progress-best-reasonable">
            Best/reasonable: {recentBestOrReasonableCount}
          </p>
          <p className={styles.meta} data-testid="recent-progress-mistakes">
            Mistakes: {recentMistakeCount}
          </p>
          <p className={styles.meta} data-testid="recent-progress-major-mistakes">
            Major mistakes: {recentMajorMistakeCount}
          </p>
          <p className={styles.meta} data-testid="recent-progress-unclassified">
            Unclassified: {recentUnclassifiedCount}
          </p>
          <p className={styles.meta} data-testid="recent-progress-main-pattern">
            Main pattern: {recentMainPatternLabel}
          </p>
          {recentMainPatternDetail !== undefined ? (
            <p className={styles.meta} data-testid="recent-progress-main-pattern-detail">
              {recentMainPatternDetail}
            </p>
          ) : null}
          <p className={styles.meta} data-testid="profile-games-represented">
            Games represented: {profileGamesRepresented}
          </p>
          <p className={styles.meta} data-testid="profile-storage-status">
            Profile storage: {profileStorageStatus === "ready" ? "local persisted" : "memory only"}
          </p>
          {profileMessage !== null ? (
            <p className={styles.message} data-testid="profile-message" aria-live="polite">
              {profileMessage}
            </p>
          ) : null}
          <button type="button" onClick={onClearLearnerProfile}>
            Clear Learner Profile
          </button>
        </details>

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
          Live controls are disabled while inspecting a read-only position.
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
