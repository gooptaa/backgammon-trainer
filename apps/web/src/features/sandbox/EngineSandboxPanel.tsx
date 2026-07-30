import type {
  GameState,
  GameStatus,
  GetLegalMovesForStateResult,
  Move
} from "@backgammon-trainer/backgammon-engine";
import { POINT_INDEXES, type DieValue } from "@backgammon-trainer/backgammon-domain";

import styles from "./EngineSandboxPanel.module.css";

interface EngineSandboxPanelProps {
  gameState: GameState;
  gameStatus: GameStatus;
  dieOne: DieValue;
  dieTwo: DieValue;
  message: string | null;
  legalMovesResult: GetLegalMovesForStateResult;
  formatMove: (move: Move) => string;
  onDieOneChange: (value: DieValue) => void;
  onDieTwoChange: (value: DieValue) => void;
  onSetDice: () => void;
  onApplyMove: (move: Move) => void;
  onPassTurn: () => void;
}

const DIE_VALUES: readonly DieValue[] = [1, 2, 3, 4, 5, 6];

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
  formatMove,
  onDieOneChange,
  onDieTwoChange,
  onSetDice,
  onApplyMove,
  onPassTurn
}: EngineSandboxPanelProps): JSX.Element {
  const isComplete = gameStatus.state === "complete";
  const canSetDice = !isComplete && gameState.dice === null;
  const legalMoves = legalMovesResult.ok ? legalMovesResult.moves : [];
  const canPass =
    !isComplete && gameState.dice !== null && legalMovesResult.ok && legalMoves.length === 0;
  const occupiedPointRows = getOccupiedPointRows(gameState);

  return (
    <section aria-labelledby="engine-sandbox-title" className={styles.panel}>
      <h2 id="engine-sandbox-title">Engine Game Sandbox</h2>
      <p className={styles.meta}>Status: {isComplete ? "complete" : "in-progress"}</p>
      <p className={styles.meta}>Active player: {gameState.activePlayer}</p>
      {isComplete && gameStatus.state === "complete" ? (
        <p className={styles.meta}>Winner: {gameStatus.winner}</p>
      ) : null}
      <p className={styles.meta} data-testid="turn-dice-value">
        Turn dice:{" "}
        {gameState.dice === null
          ? "not set"
          : `${gameState.dice.dice[0]}, ${gameState.dice.dice[1]}`}
      </p>

      <div className={styles.controls}>
        <div className={styles.diceRow}>
          <div className={styles.field}>
            <label htmlFor="die-one">Die 1</label>
            <select
              id="die-one"
              value={dieOne}
              disabled={!canSetDice}
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
              disabled={!canSetDice}
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

        <button type="button" onClick={onSetDice} disabled={!canSetDice}>
          Set Dice
        </button>

        <button type="button" onClick={onPassTurn} disabled={!canPass}>
          Pass Turn
        </button>

        <p aria-live="polite" className={styles.message}>
          {message ?? ""}
        </p>
      </div>

      {gameState.dice !== null && !isComplete ? (
        legalMoves.length > 0 ? (
          <ul className={styles.moveList} aria-label="Legal moves">
            {legalMoves.map((move, index) => {
              const label = formatMove(move);

              return (
                <li key={`${label}-${index}`}>
                  <span className={styles.moveText}>{label}</span>
                  <button type="button" onClick={() => onApplyMove(move)}>
                    Apply: {label}
                  </button>
                </li>
              );
            })}
          </ul>
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
