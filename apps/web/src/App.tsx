import styles from "./App.module.css";
import {
  applyGameMove,
  createGameState,
  getGameStatus,
  getLegalMovesForState,
  passTurn,
  previewMovePrefix,
  setDice,
  type ApplyGameMoveFailureReason,
  type GameState,
  type MoveStep,
  type PassTurnFailureReason,
  type SetDiceFailureReason,
  type Move
} from "@backgammon-trainer/backgammon-engine";
import {
  STANDARD_STARTING_POSITION,
  type DieValue,
  type Player
} from "@backgammon-trainer/backgammon-domain";
import { useEffect, useMemo, useState } from "react";

import { BackgammonBoard } from "./features/board/BackgammonBoard";
import { EngineSandboxPanel } from "./features/sandbox/EngineSandboxPanel";
import {
  formatSelectablePoint,
  formatSelectedStep,
  formatSelectedStepsBreadcrumb,
  getSelectableDestinations,
  getSelectableSources,
  getSingleCompletedMove,
  type SelectableDestination,
  type SelectableSource,
  type SelectedStep
} from "./features/sandbox/moveSelection";
import { rollDice, type RandomSource } from "./features/sandbox/rollDice";
import { rollOpeningDice } from "./features/sandbox/rollOpeningDice";

const createInitialGameState = (): GameState => {
  return createGameState(STANDARD_STARTING_POSITION, "white");
};

const DEFAULT_MANUAL_DIE_ONE: DieValue = 1;
const DEFAULT_MANUAL_DIE_TWO: DieValue = 2;

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

const DEFAULT_TEST_OPENING_DIE: DieValue = 1;
const SECOND_TEST_OPENING_DIE: DieValue = 2;

const getInitialOpeningRollState = (initialGameState?: GameState): OpeningRollState => {
  if (initialGameState === undefined) {
    return {
      phase: "waiting"
    };
  }

  return {
    phase: "resolved",
    whiteDie: DEFAULT_TEST_OPENING_DIE,
    blackDie: SECOND_TEST_OPENING_DIE,
    startingPlayer: initialGameState.activePlayer
  };
};

const getPlayerLabel = (player: Player): string => {
  return player === "white" ? "White" : "Black";
};

const formatMoveBreadcrumb = (move: Move): string => {
  const selectedSteps: readonly SelectedStep[] = move.steps.map((step) => ({
    fromPoint: step.fromPoint,
    toPoint: step.toPoint
  }));

  return formatSelectedStepsBreadcrumb(selectedSteps);
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
  randomSource?: RandomSource;
  initialOpeningRollState?: OpeningRollState;
  initialOpeningTurnPending?: boolean;
}

function App({
  initialGameState,
  randomSource,
  initialOpeningRollState,
  initialOpeningTurnPending
}: AppProps): JSX.Element {
  const [gameState, setGameState] = useState<GameState>(
    () => initialGameState ?? createInitialGameState()
  );
  const [openingRollState, setOpeningRollState] = useState<OpeningRollState>(
    () => initialOpeningRollState ?? getInitialOpeningRollState(initialGameState)
  );
  const [openingTurnPending, setOpeningTurnPending] = useState<boolean>(
    initialOpeningTurnPending ?? false
  );
  const [dieOne, setDieOne] = useState<DieValue>(DEFAULT_MANUAL_DIE_ONE);
  const [dieTwo, setDieTwo] = useState<DieValue>(DEFAULT_MANUAL_DIE_TWO);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedSteps, setSelectedSteps] = useState<readonly SelectedStep[]>([]);
  const [selectedSource, setSelectedSource] = useState<SelectableSource | null>(null);
  const [hoveredDestination, setHoveredDestination] = useState<SelectableDestination | null>(null);
  const gameStatus = useMemo(() => getGameStatus(gameState.position), [gameState]);
  const legalMovesResult = useMemo(() => getLegalMovesForState(gameState), [gameState]);
  const openingResolved = openingRollState.phase === "resolved";

  const stagedPrefixResult = useMemo(() => {
    if (
      selectedSteps.length === 0 ||
      gameState.dice === null ||
      !legalMovesResult.ok ||
      gameStatus.state === "complete"
    ) {
      return null;
    }

    return previewMovePrefix(
      gameState.position,
      gameState.activePlayer,
      gameState.dice,
      selectedSteps
    );
  }, [gameState, gameStatus.state, legalMovesResult, selectedSteps]);

  const candidateMoves = useMemo<readonly Move[]>(() => {
    if (!legalMovesResult.ok || gameStatus.state === "complete" || gameState.dice === null) {
      return [];
    }

    if (selectedSteps.length === 0) {
      return legalMovesResult.moves;
    }

    if (stagedPrefixResult !== null && stagedPrefixResult.ok) {
      return stagedPrefixResult.candidateMoves;
    }

    return [];
  }, [
    gameState.dice,
    gameStatus.state,
    legalMovesResult,
    selectedSteps.length,
    stagedPrefixResult
  ]);

  const stagedPosition =
    stagedPrefixResult !== null && stagedPrefixResult.ok
      ? stagedPrefixResult.position
      : gameState.position;

  useEffect(() => {
    if (gameState.dice === null || !legalMovesResult.ok || gameStatus.state === "complete") {
      if (selectedSteps.length > 0) {
        setSelectedSteps([]);
      }

      if (selectedSource !== null) {
        setSelectedSource(null);
      }

      if (hoveredDestination !== null) {
        setHoveredDestination(null);
      }

      return;
    }

    if (stagedPrefixResult !== null && !stagedPrefixResult.ok) {
      if (selectedSteps.length > 0 || selectedSource !== null || hoveredDestination !== null) {
        setSelectedSteps([]);
        setSelectedSource(null);
        setHoveredDestination(null);
        setMessage(
          stagedPrefixResult.reason === "ambiguous-prefix"
            ? "Move selection reset because staged projection was ambiguous."
            : "Move selection reset because legal options changed."
        );
      }
    }
  }, [
    gameState.dice,
    gameStatus.state,
    hoveredDestination,
    legalMovesResult,
    selectedSource,
    selectedSteps,
    stagedPrefixResult
  ]);

  const resetTransientState = (): void => {
    setSelectedSteps([]);
    setSelectedSource(null);
    setHoveredDestination(null);
    setMessage(null);
  };

  const resetForNewTurn = (): void => {
    setSelectedSteps([]);
    setSelectedSource(null);
    setHoveredDestination(null);
  };

  const onUndoLastStep = (): void => {
    setMessage(null);
    setHoveredDestination(null);

    if (selectedSteps.length === 0) {
      if (selectedSource !== null) {
        setSelectedSource(null);
      }

      return;
    }

    const nextSelectedSteps = selectedSteps.slice(0, -1);
    setSelectedSteps(nextSelectedSteps);
    setSelectedSource(null);
  };

  const onSetDice = (): void => {
    if (!openingResolved) {
      setMessage("Finish opening roll before setting turn dice manually.");
      return;
    }

    const result = setDice(gameState, {
      dice: [dieOne, dieTwo]
    });

    if (!result.ok) {
      setMessage(getSetDiceFailureMessage(result.reason));
      return;
    }

    setGameState(result.state);
    resetForNewTurn();
    setMessage(null);
  };

  const onRollDice = (): void => {
    if (!openingResolved) {
      setMessage("Finish opening roll before rolling turn dice.");
      return;
    }

    const result = setDice(gameState, rollDice(randomSource));

    if (!result.ok) {
      setMessage(getSetDiceFailureMessage(result.reason));
      return;
    }

    setGameState(result.state);
    resetForNewTurn();
    setMessage(null);
  };

  const onApplyMove = (move: Parameters<typeof applyGameMove>[1]): void => {
    const result = applyGameMove(gameState, move);

    if (!result.ok) {
      setMessage(getApplyFailureMessage(result.reason));
      return;
    }

    setGameState(result.state);
    resetForNewTurn();
    if (openingTurnPending) {
      setOpeningTurnPending(false);
    }

    if (result.status.state === "complete") {
      setMessage(`Game complete: ${result.status.winner} wins.`);
      return;
    }

    setMessage(
      openingTurnPending ? "Opening turn complete. Roll dice for the next turn." : "Move applied."
    );
  };

  const onPassTurn = (): void => {
    const result = passTurn(gameState);

    if (!result.ok) {
      setMessage(getPassFailureMessage(result.reason));
      return;
    }

    setGameState(result.state);
    resetForNewTurn();
    if (openingTurnPending) {
      setOpeningTurnPending(false);
    }

    setMessage(
      openingTurnPending ? "Opening turn passed. Roll dice for the next turn." : "Turn passed."
    );
  };

  const onRollForOpening = (): void => {
    const openingResult = rollOpeningDice(randomSource);

    if (openingResult.outcome === "tie") {
      setOpeningRollState({
        phase: "tied",
        whiteDie: openingResult.whiteDie,
        blackDie: openingResult.blackDie
      });
      resetForNewTurn();
      setMessage("Opening roll tied. Roll again.");
      return;
    }

    const openingState = createGameState(STANDARD_STARTING_POSITION, openingResult.startingPlayer);
    const assignedOpeningDice = setDice(openingState, openingResult.dice);

    if (!assignedOpeningDice.ok) {
      setOpeningRollState({ phase: "waiting" });
      resetForNewTurn();
      setMessage("Unable to start opening turn. Try rolling for opening again.");
      return;
    }

    setOpeningRollState({
      phase: "resolved",
      whiteDie: openingResult.whiteDie,
      blackDie: openingResult.blackDie,
      startingPlayer: openingResult.startingPlayer
    });
    setGameState(assignedOpeningDice.state);
    setOpeningTurnPending(true);
    resetForNewTurn();
    setMessage(
      `White rolled ${openingResult.whiteDie}. Black rolled ${openingResult.blackDie}. ${getPlayerLabel(openingResult.startingPlayer)} starts with ${openingResult.whiteDie}-${openingResult.blackDie}.`
    );
  };

  const onNewGame = (): void => {
    setGameState(createInitialGameState());
    setOpeningRollState({ phase: "waiting" });
    setOpeningTurnPending(false);
    setDieOne(DEFAULT_MANUAL_DIE_ONE);
    setDieTwo(DEFAULT_MANUAL_DIE_TWO);
    resetTransientState();
  };

  const onSelectSource = (source: SelectableSource): void => {
    setSelectedSource(source);
    setHoveredDestination(null);
    setMessage(null);
  };

  const onSelectDestination = (destination: SelectableDestination): void => {
    if (selectedSource === null) {
      return;
    }

    setHoveredDestination(null);

    const nextSelectedSteps: readonly SelectedStep[] = [
      ...selectedSteps,
      {
        fromPoint: selectedSource,
        toPoint: destination
      }
    ];

    if (gameState.dice === null) {
      return;
    }

    const nextPreview = previewMovePrefix(
      gameState.position,
      gameState.activePlayer,
      gameState.dice,
      nextSelectedSteps
    );

    if (!nextPreview.ok) {
      setMessage(
        nextPreview.reason === "ambiguous-prefix"
          ? "That step is ambiguous for staged projection. Choose a different step."
          : "That step is not part of any legal move sequence."
      );
      setSelectedSource(null);
      return;
    }

    setSelectedSteps(nextSelectedSteps);
    setSelectedSource(null);

    const completedMove = getSingleCompletedMove(nextPreview.candidateMoves, nextSelectedSteps);

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

  const getUniqueContinuationStep = (
    moves: readonly Move[],
    stepIndex: number
  ): SelectedStep | null => {
    let candidateStep: MoveStep | null = null;

    for (const move of moves) {
      const step = move.steps[stepIndex];

      if (step === undefined) {
        continue;
      }

      if (candidateStep === null) {
        candidateStep = step;
        continue;
      }

      if (candidateStep.fromPoint !== step.fromPoint || candidateStep.toPoint !== step.toPoint) {
        return null;
      }
    }

    if (candidateStep === null) {
      return null;
    }

    return {
      fromPoint: candidateStep.fromPoint,
      toPoint: candidateStep.toPoint
    };
  };

  const hoveredStep: SelectedStep | null =
    selectedSource !== null && hoveredDestination !== null
      ? {
          fromPoint: selectedSource,
          toPoint: hoveredDestination
        }
      : null;
  const hoveredStepPrefix: readonly SelectedStep[] =
    hoveredStep === null ? selectedSteps : [...selectedSteps, hoveredStep];
  const hoveredPrefixResult =
    hoveredStep === null || gameState.dice === null
      ? null
      : previewMovePrefix(
          gameState.position,
          gameState.activePlayer,
          gameState.dice,
          hoveredStepPrefix
        );
  const hoveredCandidates: readonly Move[] =
    hoveredPrefixResult !== null && hoveredPrefixResult.ok
      ? hoveredPrefixResult.candidateMoves
      : [];
  const hoverCompletesAutomatically =
    hoveredStep !== null && getSingleCompletedMove(hoveredCandidates, hoveredStepPrefix) !== null;
  const uniquePreviewStep =
    hoveredStep === null
      ? null
      : getUniqueContinuationStep(hoveredCandidates, hoveredStepPrefix.length);
  const previewSources: readonly SelectableSource[] =
    hoveredStep === null ? [] : getSelectableSources(hoveredCandidates, hoveredStepPrefix);
  const singlePreviewSource = previewSources.length === 1 ? (previewSources[0] ?? null) : null;
  const previewDestinations: readonly SelectableDestination[] =
    hoveredStep === null || singlePreviewSource === null
      ? []
      : getSelectableDestinations(hoveredCandidates, hoveredStepPrefix, singlePreviewSource);

  const continuationSummaryRows = useMemo(() => {
    const continuationStepIndex = selectedSteps.length;
    const continuationCounts = new Map<string, number>();

    for (const move of candidateMoves) {
      const continuationStep = move.steps[continuationStepIndex];

      if (continuationStep === undefined) {
        continue;
      }

      const key = formatSelectedStep({
        fromPoint: continuationStep.fromPoint,
        toPoint: continuationStep.toPoint
      });
      continuationCounts.set(key, (continuationCounts.get(key) ?? 0) + 1);
    }

    return [...continuationCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([stepText, count]) => ({
        stepText,
        count
      }));
  }, [candidateMoves, selectedSteps.length]);

  const completedMoveSummaryRows = useMemo(() => {
    const completedMoves = candidateMoves.filter(
      (move) => move.steps.length === selectedSteps.length
    );
    const completionCounts = new Map<string, number>();

    for (const move of completedMoves) {
      const key = formatMoveBreadcrumb(move);
      completionCounts.set(key, (completionCounts.get(key) ?? 0) + 1);
    }

    return [...completionCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([moveText, count]) => ({
        moveText,
        count
      }));
  }, [candidateMoves, selectedSteps.length]);

  const breadcrumb = (() => {
    if (selectedSource === null) {
      return formatSelectedStepsBreadcrumb(selectedSteps);
    }

    const sourceLabel = formatSelectablePoint(selectedSource);

    if (selectedSteps.length === 0) {
      return `${sourceLabel} -> [select destination]`;
    }

    const lastSelectedStep = selectedSteps[selectedSteps.length - 1];

    if (
      lastSelectedStep !== undefined &&
      formatSelectablePoint(lastSelectedStep.toPoint) === sourceLabel
    ) {
      return `${formatSelectedStepsBreadcrumb(selectedSteps)} -> [select destination]`;
    }

    return `${formatSelectedStepsBreadcrumb(selectedSteps)} | ${sourceLabel} -> [select destination]`;
  })();

  const canRollDice =
    openingResolved &&
    !openingTurnPending &&
    gameStatus.state !== "complete" &&
    gameState.dice === null;
  const canSetDiceManually = canRollDice;
  const boardActivePlayer = gameState.activePlayer;

  const interactionStatus = (() => {
    if (gameStatus.state === "complete") {
      return "Game complete";
    }

    if (openingRollState.phase === "waiting") {
      return "Roll for opening to start game";
    }

    if (openingRollState.phase === "tied") {
      return "Opening roll tied. Roll again";
    }

    if (gameState.dice === null) {
      return "Roll dice to start turn";
    }

    if (!legalMovesResult.ok) {
      return "Roll dice to start turn";
    }

    if (selectedSource !== null) {
      return "Select a destination";
    }

    if (selectedSteps.length === 0) {
      return "Select a checker";
    }

    if (candidateMoves.length === 1) {
      return "Move will complete automatically";
    }

    return `${candidateMoves.length} legal continuations remain`;
  })();

  const hoverPreviewText = (() => {
    if (hoveredStep === null) {
      return "";
    }

    if (hoverCompletesAutomatically) {
      return "Move will complete automatically";
    }

    if (uniquePreviewStep !== null) {
      return `Preview next step: ${formatSelectedStep(uniquePreviewStep)}`;
    }

    return `${hoveredCandidates.length} legal continuations remain`;
  })();

  const onHoverDestination = (destination: SelectableDestination): void => {
    setHoveredDestination(destination);
  };

  const onClearHoveredDestination = (): void => {
    setHoveredDestination(null);
  };

  const shouldShowUndoSelection = selectedSteps.length > 0 || selectedSource !== null;

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
            position={stagedPosition}
            activePlayer={boardActivePlayer}
            showActivePlayer={openingResolved}
            selectableSources={selectableSources}
            selectableDestinations={selectableDestinations}
            previewSources={previewSources}
            previewDestinations={previewDestinations}
            hoveredDestination={hoveredDestination}
            selectedSource={selectedSource}
            onSelectSource={onSelectSource}
            onSelectDestination={onSelectDestination}
            onHoverDestination={onHoverDestination}
            onClearHoveredDestination={onClearHoveredDestination}
            {...(shouldShowUndoSelection ? { onCancelSelection: onUndoLastStep } : {})}
          />
          <p className={styles.selectionMeta} data-testid="interaction-status" aria-live="polite">
            {interactionStatus}
          </p>
          <p className={styles.selectionMeta} data-testid="selection-breadcrumb" aria-live="polite">
            {breadcrumb === "" ? "" : `Move: ${breadcrumb}`}
          </p>
          <p className={styles.selectionMeta} data-testid="hover-preview" aria-live="polite">
            {hoverPreviewText}
          </p>
          <section className={styles.candidatePanel} aria-label="Remaining move candidates">
            <h3>Remaining candidates</h3>
            <p
              className={styles.selectionMeta}
              data-testid="continuations-count"
              aria-live="polite"
            >
              Continuations: {continuationSummaryRows.length}
            </p>
            {continuationSummaryRows.length > 0 ? (
              <ul className={styles.candidateList} data-testid="candidate-continuations">
                {continuationSummaryRows.map((row) => (
                  <li key={`continuation-${row.stepText}`}>
                    {row.stepText}
                    {row.count > 1 ? ` (${row.count} matches)` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.selectionMeta} data-testid="candidate-continuations">
                No continuation steps remain.
              </p>
            )}
            <p
              className={styles.selectionMeta}
              data-testid="completed-moves-count"
              aria-live="polite"
            >
              Completed moves: {completedMoveSummaryRows.length}
            </p>
            {completedMoveSummaryRows.length > 0 ? (
              <ul className={styles.candidateList} data-testid="candidate-completed-moves">
                {completedMoveSummaryRows.map((row) => (
                  <li key={`completed-${row.moveText}`}>
                    {row.moveText}
                    {row.count > 1 ? ` (${row.count} matches)` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.selectionMeta} data-testid="candidate-completed-moves">
                No completed move candidates for the current prefix.
              </p>
            )}
          </section>
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
          openingRollState={openingRollState}
          openingTurnPending={openingTurnPending}
          canRollDice={canRollDice}
          canSetDiceManually={canSetDiceManually}
          onRollForOpening={onRollForOpening}
          onRollDice={onRollDice}
          onSetDice={onSetDice}
          onPassTurn={onPassTurn}
          onNewGame={onNewGame}
        />
      </main>
    </div>
  );
}

export default App;
