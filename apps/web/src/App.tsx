import styles from "./App.module.css";
import {
  applyGameMove,
  createGameState,
  getGameStatus,
  getLegalMovesForState,
  passTurn,
  setDice,
  type ApplyGameMoveFailureReason,
  type GameState,
  type PassTurnFailureReason,
  type SetDiceFailureReason,
  type Move
} from "@backgammon-trainer/backgammon-engine";
import { STANDARD_STARTING_POSITION, type DieValue } from "@backgammon-trainer/backgammon-domain";
import { useEffect, useMemo, useState } from "react";

import { BackgammonBoard } from "./features/board/BackgammonBoard";
import { EngineSandboxPanel } from "./features/sandbox/EngineSandboxPanel";
import {
  filterCandidateMoves,
  getSelectableDestinations,
  getSelectableSources,
  getSingleCompletedMove,
  moveStartsWithSelectedSteps,
  type SelectableDestination,
  type SelectableSource,
  type SelectedStep
} from "./features/sandbox/moveSelection";

const createInitialGameState = (): GameState => {
  return createGameState(STANDARD_STARTING_POSITION, "white");
};

const getSetDiceFailureMessage = (reason: SetDiceFailureReason): string => {
  if (reason === "game-complete") {
    return "Cannot set dice because the game is complete.";
  }

  return "Dice are already set for this turn.";
};

const getApplyFailureMessage = (reason: ApplyGameMoveFailureReason): string => {
  if (reason === "game-complete") {
    return "Cannot apply a move because the game is complete.";
  }

  if (reason === "dice-not-set") {
    return "Set dice before applying a move.";
  }

  if (reason === "invalid-step-sequence") {
    return "The selected move shape is invalid for this turn.";
  }

  return "That move is not legal for the current turn.";
};

const getPassFailureMessage = (reason: PassTurnFailureReason): string => {
  if (reason === "game-complete") {
    return "Cannot pass because the game is complete.";
  }

  if (reason === "dice-not-set") {
    return "Set dice before passing the turn.";
  }

  return "Cannot pass while legal moves are available.";
};

interface AppProps {
  initialGameState?: GameState;
}

function App({ initialGameState }: AppProps): JSX.Element {
  const [gameState, setGameState] = useState<GameState>(
    () => initialGameState ?? createInitialGameState()
  );
  const [dieOne, setDieOne] = useState<DieValue>(1);
  const [dieTwo, setDieTwo] = useState<DieValue>(2);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedSteps, setSelectedSteps] = useState<readonly SelectedStep[]>([]);
  const [selectedSource, setSelectedSource] = useState<SelectableSource | null>(null);
  const gameStatus = useMemo(() => getGameStatus(gameState.position), [gameState]);
  const legalMovesResult = useMemo(() => getLegalMovesForState(gameState), [gameState]);
  const legalMoves = legalMovesResult.ok ? legalMovesResult.moves : [];
  const candidateMoves = useMemo<readonly Move[]>(() => {
    if (!legalMovesResult.ok || gameStatus.state === "complete" || gameState.dice === null) {
      return [];
    }

    return filterCandidateMoves(legalMovesResult.moves, selectedSteps);
  }, [gameState.dice, gameStatus.state, legalMovesResult, selectedSteps]);

  useEffect(() => {
    if (gameState.dice === null || !legalMovesResult.ok || gameStatus.state === "complete") {
      if (selectedSteps.length > 0) {
        setSelectedSteps([]);
      }

      if (selectedSource !== null) {
        setSelectedSource(null);
      }

      return;
    }

    if (!legalMovesResult.moves.some((move) => moveStartsWithSelectedSteps(move, selectedSteps))) {
      if (selectedSteps.length > 0 || selectedSource !== null) {
        setSelectedSteps([]);
        setSelectedSource(null);
        setMessage("Move selection reset because legal options changed.");
      }
    }
  }, [gameState.dice, gameStatus.state, legalMovesResult, selectedSource, selectedSteps]);

  const resetMoveSelection = (): void => {
    setSelectedSteps([]);
    setSelectedSource(null);
  };

  const onSetDice = (): void => {
    const result = setDice(gameState, {
      dice: [dieOne, dieTwo]
    });

    if (!result.ok) {
      setMessage(getSetDiceFailureMessage(result.reason));
      return;
    }

    setGameState(result.state);
    resetMoveSelection();
    setMessage(null);
  };

  const onApplyMove = (move: Parameters<typeof applyGameMove>[1]): void => {
    const result = applyGameMove(gameState, move);

    if (!result.ok) {
      setMessage(getApplyFailureMessage(result.reason));
      return;
    }

    setGameState(result.state);
    resetMoveSelection();
    if (result.status.state === "complete") {
      setMessage(`Game complete: ${result.status.winner} wins.`);
      return;
    }

    setMessage("Move applied.");
  };

  const onPassTurn = (): void => {
    const result = passTurn(gameState);

    if (!result.ok) {
      setMessage(getPassFailureMessage(result.reason));
      return;
    }

    setGameState(result.state);
    resetMoveSelection();
    setMessage("Turn passed.");
  };

  const onSelectSource = (source: SelectableSource): void => {
    setSelectedSource(source);
    setMessage(null);
  };

  const onSelectDestination = (destination: SelectableDestination): void => {
    if (selectedSource === null) {
      return;
    }

    const nextSelectedSteps: readonly SelectedStep[] = [
      ...selectedSteps,
      {
        fromPoint: selectedSource,
        toPoint: destination
      }
    ];

    const nextCandidates = filterCandidateMoves(legalMoves, nextSelectedSteps);

    if (nextCandidates.length === 0) {
      setMessage("That step is not part of any legal move sequence.");
      setSelectedSource(null);
      return;
    }

    setSelectedSteps(nextSelectedSteps);
    setSelectedSource(null);

    const completedMove = getSingleCompletedMove(nextCandidates, nextSelectedSteps);

    if (completedMove !== null) {
      onApplyMove(completedMove);
      return;
    }

    setMessage("Step selected. Choose the next source point.");
  };

  const selectableSources =
    gameState.dice !== null && gameStatus.state !== "complete" && legalMovesResult.ok
      ? getSelectableSources(candidateMoves, selectedSteps)
      : [];
  const selectableDestinations =
    selectedSource !== null &&
    gameState.dice !== null &&
    gameStatus.state !== "complete" &&
    legalMovesResult.ok
      ? getSelectableDestinations(candidateMoves, selectedSteps, selectedSource)
      : [];
  const shouldShowCancelSelection = selectedSteps.length > 0 || selectedSource !== null;

  return (
    <div className={styles.appFrame}>
      <header className={styles.header}>
        <div>
          <h1>Backgammon Trainer</h1>
          <p>
            Study-oriented board view with deterministic position rendering and coaching panel
            placeholders.
          </p>
        </div>
        <p className={styles.status} aria-live="polite">
          Server status: <span>mock-connected</span>
        </p>
      </header>

      <main className={styles.mainLayout}>
        <section aria-labelledby="board-workspace-title" className={styles.boardSection}>
          <h2 id="board-workspace-title">Board Workspace</h2>
          <BackgammonBoard
            position={gameState.position}
            activePlayer={gameState.activePlayer}
            selectableSources={selectableSources}
            selectableDestinations={selectableDestinations}
            selectedSource={selectedSource}
            onSelectSource={onSelectSource}
            onSelectDestination={onSelectDestination}
            {...(shouldShowCancelSelection ? { onCancelSelection: resetMoveSelection } : {})}
          />
          <div className={styles.controlsRow}>
            <button type="button" disabled>
              Hint
            </button>
            <button type="button" disabled>
              Show Best Move
            </button>
          </div>
        </section>

        <EngineSandboxPanel
          gameState={gameState}
          gameStatus={gameStatus}
          dieOne={dieOne}
          dieTwo={dieTwo}
          message={message}
          legalMovesResult={legalMovesResult}
          onDieOneChange={setDieOne}
          onDieTwoChange={setDieTwo}
          onSetDice={onSetDice}
          onPassTurn={onPassTurn}
        />
      </main>
    </div>
  );
}

export default App;
