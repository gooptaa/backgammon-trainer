import styles from "./App.module.css";
import {
  applyGameMove,
  decodeGameSnapshot,
  encodeGameSnapshot,
  GAME_SNAPSHOT_FORMAT,
  GAME_SNAPSHOT_VERSION,
  createTurnRecord,
  createGameState,
  getGameStatus,
  getLegalMovesForState,
  passTurn,
  previewMovePrefix,
  setDice,
  type ApplyGameMoveFailureReason,
  type GameSnapshot,
  type GameState,
  type CreateTurnRecordInput,
  type MoveStep,
  type ParseGameSnapshotFailureReason,
  type PassTurnFailureReason,
  type SnapshotOpeningState,
  type SetDiceFailureReason,
  type Move,
  type TurnRecord
} from "@backgammon-trainer/backgammon-engine";
import {
  STANDARD_STARTING_POSITION,
  type DieValue,
  type Player
} from "@backgammon-trainer/backgammon-domain";
import { useEffect, useMemo, useRef, useState } from "react";

import { BackgammonBoard } from "./features/board/BackgammonBoard";
import { EngineSandboxPanel } from "./features/sandbox/EngineSandboxPanel";
import { TurnHistoryPanel } from "./features/sandbox/TurnHistoryPanel";
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
import {
  DEFAULT_GAME_STORAGE_KEY,
  createLocalGameStorage,
  type GameStorage
} from "./features/sandbox/gameStorage";
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

const getSnapshotFailureMessage = (reason: ParseGameSnapshotFailureReason): string => {
  if (reason === "invalid-json") {
    return "Snapshot text is not valid JSON.";
  }

  if (reason === "wrong-format") {
    return "Snapshot format is not recognized.";
  }

  if (reason === "unsupported-version") {
    return "Snapshot version is not supported.";
  }

  if (reason === "invalid-structure") {
    return "Snapshot structure is malformed.";
  }

  return "Snapshot game state is inconsistent.";
};

const toSnapshotOpeningState = (
  openingRollState: OpeningRollState,
  openingTurnPending: boolean
): SnapshotOpeningState => {
  if (openingRollState.phase === "waiting") {
    return {
      phase: "waiting",
      openingTurnPending: false
    };
  }

  if (openingRollState.phase === "tied") {
    return {
      phase: "tied",
      whiteDie: openingRollState.whiteDie,
      blackDie: openingRollState.blackDie,
      openingTurnPending: false
    };
  }

  return {
    phase: "resolved",
    whiteDie: openingRollState.whiteDie,
    blackDie: openingRollState.blackDie,
    startingPlayer: openingRollState.startingPlayer,
    openingTurnPending
  };
};

const fromSnapshotOpeningState = (
  openingState: SnapshotOpeningState
): {
  openingRollState: OpeningRollState;
  openingTurnPending: boolean;
} => {
  if (openingState.phase === "waiting") {
    return {
      openingRollState: {
        phase: "waiting"
      },
      openingTurnPending: false
    };
  }

  if (openingState.phase === "tied") {
    return {
      openingRollState: {
        phase: "tied",
        whiteDie: openingState.whiteDie,
        blackDie: openingState.blackDie
      },
      openingTurnPending: false
    };
  }

  return {
    openingRollState: {
      phase: "resolved",
      whiteDie: openingState.whiteDie,
      blackDie: openingState.blackDie,
      startingPlayer: openingState.startingPlayer
    },
    openingTurnPending: openingState.openingTurnPending
  };
};

const isStartingPosition = (gameState: GameState): boolean => {
  return (
    gameState.activePlayer === "white" &&
    gameState.dice === null &&
    JSON.stringify(gameState.position) === JSON.stringify(STANDARD_STARTING_POSITION)
  );
};

const hasAnyProgress = (
  gameState: GameState,
  openingRollState: OpeningRollState,
  openingTurnPending: boolean,
  turnHistory: readonly TurnRecord[]
): boolean => {
  if (turnHistory.length > 0) {
    return true;
  }

  if (openingRollState.phase !== "waiting" || openingTurnPending) {
    return true;
  }

  return !isStartingPosition(gameState);
};

interface DurableAppState {
  readonly gameState: GameState;
  readonly openingRollState: OpeningRollState;
  readonly openingTurnPending: boolean;
  readonly turnHistory: readonly TurnRecord[];
  readonly message: string | null;
}

const createFreshDurableAppState = (
  initialGameState?: GameState,
  initialOpeningRollState?: OpeningRollState,
  initialOpeningTurnPending?: boolean
): DurableAppState => {
  return {
    gameState: initialGameState ?? createInitialGameState(),
    openingRollState: initialOpeningRollState ?? getInitialOpeningRollState(initialGameState),
    openingTurnPending: initialOpeningTurnPending ?? false,
    turnHistory: [],
    message: null
  };
};

const resolveInitialDurableAppState = (
  storage: GameStorage,
  initialGameState?: GameState,
  initialOpeningRollState?: OpeningRollState,
  initialOpeningTurnPending?: boolean
): DurableAppState => {
  if (
    initialGameState !== undefined ||
    initialOpeningRollState !== undefined ||
    initialOpeningTurnPending !== undefined
  ) {
    return createFreshDurableAppState(
      initialGameState,
      initialOpeningRollState,
      initialOpeningTurnPending
    );
  }

  let savedText: string | null = null;

  try {
    savedText = storage.load();
  } catch {
    return {
      ...createFreshDurableAppState(),
      message: "Saved game could not be loaded. Starting a fresh game."
    };
  }

  if (savedText === null) {
    return createFreshDurableAppState();
  }

  const decoded = decodeGameSnapshot(savedText);

  if (!decoded.ok) {
    return {
      ...createFreshDurableAppState(),
      message: `Saved game restore failed: ${getSnapshotFailureMessage(decoded.reason)}`
    };
  }

  const restoredOpening = fromSnapshotOpeningState(decoded.snapshot.openingState);

  return {
    gameState: decoded.snapshot.gameState,
    openingRollState: restoredOpening.openingRollState,
    openingTurnPending: restoredOpening.openingTurnPending,
    turnHistory: decoded.snapshot.turnHistory,
    message: "Saved game restored."
  };
};

interface AppProps {
  initialGameState?: GameState;
  randomSource?: RandomSource;
  initialOpeningRollState?: OpeningRollState;
  initialOpeningTurnPending?: boolean;
  gameStorage?: GameStorage;
}

type InspectionView = "before" | "after";

interface HistoryInspectionState {
  readonly turnNumber: number;
  readonly view: InspectionView;
}

function App({
  initialGameState,
  randomSource,
  initialOpeningRollState,
  initialOpeningTurnPending,
  gameStorage
}: AppProps): JSX.Element {
  const snapshotStorage = useMemo(
    () => gameStorage ?? createLocalGameStorage(DEFAULT_GAME_STORAGE_KEY),
    [gameStorage]
  );
  const initialDurableState = useMemo(
    () =>
      resolveInitialDurableAppState(
        snapshotStorage,
        initialGameState,
        initialOpeningRollState,
        initialOpeningTurnPending
      ),
    [initialGameState, initialOpeningRollState, initialOpeningTurnPending, snapshotStorage]
  );

  const [gameState, setGameState] = useState<GameState>(() => initialDurableState.gameState);
  const [openingRollState, setOpeningRollState] = useState<OpeningRollState>(
    () => initialDurableState.openingRollState
  );
  const [openingTurnPending, setOpeningTurnPending] = useState<boolean>(
    initialDurableState.openingTurnPending
  );
  const [dieOne, setDieOne] = useState<DieValue>(DEFAULT_MANUAL_DIE_ONE);
  const [dieTwo, setDieTwo] = useState<DieValue>(DEFAULT_MANUAL_DIE_TWO);
  const [message, setMessage] = useState<string | null>(initialDurableState.message);
  const [selectedSteps, setSelectedSteps] = useState<readonly SelectedStep[]>([]);
  const [selectedSource, setSelectedSource] = useState<SelectableSource | null>(null);
  const [hoveredDestination, setHoveredDestination] = useState<SelectableDestination | null>(null);
  const [turnHistory, setTurnHistory] = useState<readonly TurnRecord[]>(
    () => initialDurableState.turnHistory
  );
  const [historyInspection, setHistoryInspection] = useState<HistoryInspectionState | null>(null);
  const [importText, setImportText] = useState<string>("");
  const skipInitialPersistRef = useRef(true);
  const gameStatus = useMemo(() => getGameStatus(gameState.position), [gameState]);
  const legalMovesResult = useMemo(() => getLegalMovesForState(gameState), [gameState]);
  const openingResolved = openingRollState.phase === "resolved";
  const inspectedTurn = useMemo(
    () =>
      historyInspection === null
        ? null
        : (turnHistory.find((record) => record.turnNumber === historyInspection.turnNumber) ??
          null),
    [historyInspection, turnHistory]
  );
  const isInspectingHistory = historyInspection !== null && inspectedTurn !== null;

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

  const durableSnapshot = useMemo<GameSnapshot>(() => {
    return {
      savedAt: new Date().toISOString(),
      gameState,
      turnHistory,
      openingState: toSnapshotOpeningState(openingRollState, openingTurnPending)
    };
  }, [gameState, openingRollState, openingTurnPending, turnHistory]);

  const exportSnapshotText = useMemo(() => {
    return encodeGameSnapshot(durableSnapshot);
  }, [durableSnapshot]);

  useEffect(() => {
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false;
      return;
    }

    try {
      snapshotStorage.save(exportSnapshotText);
    } catch {
      setMessage("Local save failed. Game continues in memory only.");
    }
  }, [exportSnapshotText, snapshotStorage]);

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

  const clearStagedSelection = (): void => {
    setSelectedSteps([]);
    setSelectedSource(null);
    setHoveredDestination(null);
  };

  const appendTurnRecord = (input: Omit<CreateTurnRecordInput, "turnNumber">): void => {
    setTurnHistory((previousHistory) => {
      const nextTurnNumber = previousHistory.length + 1;

      return [
        ...previousHistory,
        createTurnRecord({
          ...input,
          turnNumber: nextTurnNumber
        })
      ];
    });
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
    const playerBefore = gameState.activePlayer;
    const diceBefore = gameState.dice;
    const positionBefore = gameState.position;
    const phaseBefore = openingTurnPending ? "opening" : "normal";
    const result = applyGameMove(gameState, move);

    if (!result.ok) {
      setMessage(getApplyFailureMessage(result.reason));
      return;
    }

    if (diceBefore !== null) {
      appendTurnRecord({
        player: playerBefore,
        dice: diceBefore,
        outcome: {
          kind: "move",
          move
        },
        positionBefore,
        positionAfter: result.state.position,
        gameStatusAfter: result.status,
        phase: phaseBefore
      });
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
    const playerBefore = gameState.activePlayer;
    const diceBefore = gameState.dice;
    const positionBefore = gameState.position;
    const phaseBefore = openingTurnPending ? "opening" : "normal";
    const result = passTurn(gameState);

    if (!result.ok) {
      setMessage(getPassFailureMessage(result.reason));
      return;
    }

    if (diceBefore !== null) {
      appendTurnRecord({
        player: playerBefore,
        dice: diceBefore,
        outcome: {
          kind: "pass"
        },
        positionBefore,
        positionAfter: result.state.position,
        gameStatusAfter: getGameStatus(result.state.position),
        phase: phaseBefore
      });
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
    setTurnHistory([]);
    setHistoryInspection(null);
    resetTransientState();
  };

  const copyExportSnapshot = async (): Promise<void> => {
    if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
      setMessage("Clipboard copy is not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(exportSnapshotText);
      setMessage("Snapshot copied to clipboard.");
    } catch {
      setMessage("Unable to copy snapshot to clipboard.");
    }
  };

  const onCopyExportSnapshot = (): void => {
    void copyExportSnapshot();
  };

  const onValidateAndImportSnapshot = (): void => {
    const parsed = decodeGameSnapshot(importText);

    if (!parsed.ok) {
      setMessage(`Import failed: ${getSnapshotFailureMessage(parsed.reason)}`);
      return;
    }

    if (hasAnyProgress(gameState, openingRollState, openingTurnPending, turnHistory)) {
      const confirmed = window.confirm(
        "Importing will replace the current game and history. Continue?"
      );

      if (!confirmed) {
        return;
      }
    }

    const restoredOpening = fromSnapshotOpeningState(parsed.snapshot.openingState);

    setGameState(parsed.snapshot.gameState);
    setTurnHistory(parsed.snapshot.turnHistory);
    setOpeningRollState(restoredOpening.openingRollState);
    setOpeningTurnPending(restoredOpening.openingTurnPending);
    setHistoryInspection(null);
    setImportText("");
    resetTransientState();
    setMessage("Snapshot imported.");
  };

  const onClearSavedGame = (): void => {
    try {
      snapshotStorage.clear();
      setMessage(
        "Saved game cleared. Reloading now will start fresh unless this game is saved again."
      );
    } catch {
      setMessage("Unable to clear saved game.");
    }
  };

  const onSelectHistoryTurn = (turnNumber: number): void => {
    clearStagedSelection();
    setHistoryInspection({
      turnNumber,
      view: "after"
    });
  };

  const onSelectInspectionView = (view: InspectionView): void => {
    if (historyInspection === null) {
      return;
    }

    setHistoryInspection({
      turnNumber: historyInspection.turnNumber,
      view
    });
  };

  const onSelectPreviousInspectionTurn = (): void => {
    if (historyInspection === null) {
      return;
    }

    const inspectionIndex = turnHistory.findIndex(
      (record) => record.turnNumber === historyInspection.turnNumber
    );

    if (inspectionIndex <= 0) {
      return;
    }

    const previousTurn = turnHistory[inspectionIndex - 1];
    if (previousTurn === undefined) {
      return;
    }

    setHistoryInspection({
      turnNumber: previousTurn.turnNumber,
      view: historyInspection.view
    });
  };

  const onSelectNextInspectionTurn = (): void => {
    if (historyInspection === null) {
      return;
    }

    const inspectionIndex = turnHistory.findIndex(
      (record) => record.turnNumber === historyInspection.turnNumber
    );

    if (inspectionIndex < 0 || inspectionIndex >= turnHistory.length - 1) {
      return;
    }

    const nextTurn = turnHistory[inspectionIndex + 1];
    if (nextTurn === undefined) {
      return;
    }

    setHistoryInspection({
      turnNumber: nextTurn.turnNumber,
      view: historyInspection.view
    });
  };

  const onReturnToCurrentGame = (): void => {
    setHistoryInspection(null);
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
    !isInspectingHistory &&
    gameState.dice !== null &&
    gameStatus.state !== "complete" &&
    legalMovesResult.ok
      ? getSelectableSources(candidateMoves, selectedSteps)
      : [];
  const selectableDestinations =
    !isInspectingHistory &&
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
    if (isInspectingHistory) {
      return "";
    }

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
    gameState.dice === null &&
    !isInspectingHistory;
  const canSetDiceManually = canRollDice;
  const canCopySnapshot =
    typeof navigator !== "undefined" &&
    navigator.clipboard !== undefined &&
    typeof navigator.clipboard.writeText === "function";
  const boardActivePlayer = isInspectingHistory ? inspectedTurn.player : gameState.activePlayer;
  const boardPosition = isInspectingHistory
    ? historyInspection?.view === "before"
      ? inspectedTurn.positionBefore
      : inspectedTurn.positionAfter
    : stagedPosition;

  const interactionStatus = (() => {
    if (gameStatus.state === "complete") {
      return "Game complete";
    }

    if (isInspectingHistory && historyInspection !== null) {
      return `Inspecting turn ${historyInspection.turnNumber} (${historyInspection.view})`;
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
    if (isInspectingHistory) {
      return "";
    }

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

  const shouldShowUndoSelection =
    !isInspectingHistory && (selectedSteps.length > 0 || selectedSource !== null);

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
          {isInspectingHistory && historyInspection !== null ? (
            <p className={styles.selectionMeta} data-testid="history-inspection-banner">
              History inspection mode: turn {historyInspection.turnNumber} ({historyInspection.view}
              )
            </p>
          ) : null}
          <BackgammonBoard
            position={boardPosition}
            activePlayer={boardActivePlayer}
            showActivePlayer={openingResolved && !isInspectingHistory}
            selectableSources={selectableSources}
            selectableDestinations={selectableDestinations}
            previewSources={isInspectingHistory ? [] : previewSources}
            previewDestinations={isInspectingHistory ? [] : previewDestinations}
            hoveredDestination={hoveredDestination}
            selectedSource={selectedSource}
            {...(isInspectingHistory ? {} : { onSelectSource })}
            {...(isInspectingHistory ? {} : { onSelectDestination })}
            {...(isInspectingHistory ? {} : { onHoverDestination })}
            {...(isInspectingHistory ? {} : { onClearHoveredDestination })}
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
            {isInspectingHistory ? (
              <p className={styles.selectionMeta} data-testid="candidate-panel-locked">
                Candidate previews are hidden while inspecting history.
              </p>
            ) : null}
            <p
              className={styles.selectionMeta}
              data-testid="continuations-count"
              aria-live="polite"
            >
              Continuations: {isInspectingHistory ? 0 : continuationSummaryRows.length}
            </p>
            {!isInspectingHistory && continuationSummaryRows.length > 0 ? (
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
              Completed moves: {isInspectingHistory ? 0 : completedMoveSummaryRows.length}
            </p>
            {!isInspectingHistory && completedMoveSummaryRows.length > 0 ? (
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

          <TurnHistoryPanel
            history={turnHistory}
            inspectionTurnNumber={historyInspection?.turnNumber ?? null}
            inspectionView={historyInspection?.view ?? "after"}
            inspectionActive={isInspectingHistory}
            onSelectTurn={onSelectHistoryTurn}
            onSelectView={onSelectInspectionView}
            onSelectPreviousTurn={onSelectPreviousInspectionTurn}
            onSelectNextTurn={onSelectNextInspectionTurn}
            onReturnToCurrentGame={onReturnToCurrentGame}
          />
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
          interactionLocked={isInspectingHistory}
          canRollDice={canRollDice}
          canSetDiceManually={canSetDiceManually}
          exportSnapshotText={exportSnapshotText}
          importText={importText}
          canCopySnapshot={canCopySnapshot}
          snapshotFormat={GAME_SNAPSHOT_FORMAT}
          snapshotVersion={GAME_SNAPSHOT_VERSION}
          onRollForOpening={onRollForOpening}
          onRollDice={onRollDice}
          onSetDice={onSetDice}
          onPassTurn={onPassTurn}
          onNewGame={onNewGame}
          onCopyExportSnapshot={onCopyExportSnapshot}
          onImportTextChange={setImportText}
          onValidateAndImportSnapshot={onValidateAndImportSnapshot}
          onClearSavedGame={onClearSavedGame}
        />
      </main>
    </div>
  );
}

export default App;
