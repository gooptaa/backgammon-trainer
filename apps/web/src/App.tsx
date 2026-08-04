import styles from "./App.module.css";
import type { ChatModel } from "@backgammon-trainer/ai-contracts";
import {
  analyzeLegalMoveOutcomes,
  evaluateLegalMoves,
  type AnalyzeLegalMoveOutcomesResult,
  type EvaluateLegalMovesResult,
  type EvaluationScoreScale,
  type PositionEvaluator
} from "@backgammon-trainer/backgammon-analysis";
import {
  createAnalysisSession,
  getAnalysisSessionGameReference,
  type AnalysisSession
} from "@backgammon-trainer/backgammon-analysis-session";
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
import {
  createLearnerProfile,
  decodeLearnerProfile,
  deriveCurrentTurnContext,
  encodeLearnerProfile,
  getLineageOwnershipMode,
  ingestCommittedLearnerObservation,
  resolveCoachQuestionContext,
  setLineageOwnership,
  summarizeLearnerProgress,
  type CoachRuntime,
  type CoachStagedSelectionSummary,
  type CoachKnowledgeRetriever,
  type CoachQuestionContext,
  type GameReviewTurnHydrationResult,
  type LearnerOwnershipMode,
  type LearnerProfile
} from "@backgammon-trainer/backgammon-coach";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BackgammonBoard } from "./features/board/BackgammonBoard";
import { AnalysisSessionPanel } from "./features/analysis-session/AnalysisSessionPanel";
import { CoachPanel } from "./features/coach/CoachPanel";
import type { CoachProviderStatus } from "./features/coach/serverChatModel";
import {
  captureCommittedTurnAnalysis,
  createFixtureAnalysisSessionMetadata,
  createPendingDecisionAnalysis,
  getAnalysisDecisionKey,
  type AnalysisCaptureFailure,
  type AnalysisCaptureRuntime,
  type AnalysisEvaluatorStatus,
  type FixtureAnalysisSessionMetadataConfig,
  type PendingDecisionAnalysis
} from "./features/analysis-session/analysisCapture";
import { EngineSandboxPanel } from "./features/sandbox/EngineSandboxPanel";
import { LegalMoveOutcomesPanel } from "./features/sandbox/LegalMoveOutcomesPanel";
import { TurnHistoryPanel } from "./features/sandbox/TurnHistoryPanel";
import { getMoveFingerprint } from "./features/sandbox/moveFingerprint";
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
import {
  createLocalLearnerProfileStorage,
  type LearnerProfileStorage
} from "./features/profile/profileStorage";
import {
  createLocalGameLineageStorage,
  decodePersistedGameLineage,
  encodePersistedGameLineage,
  type GameLineageStorage
} from "./features/profile/lineageStorage";
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
let fallbackAnalysisSessionCounter = 0;
let fallbackCoachCounter = 0;
let fallbackLineageCounter = 0;

const createLineageId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  fallbackLineageCounter += 1;
  return `lineage-${fallbackLineageCounter}`;
};

const DEFAULT_ANALYSIS_CAPTURE_RUNTIME: AnalysisCaptureRuntime = {
  createSessionId: () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    fallbackAnalysisSessionCounter += 1;
    return `analysis-session-${fallbackAnalysisSessionCounter}`;
  },
  now: () => new Date().toISOString()
};

const DEFAULT_ANALYSIS_CAPTURE_METADATA: FixtureAnalysisSessionMetadataConfig = {
  analysisFormat: "ranked-legal-move-analysis",
  analysisVersion: 1,
  generatorVersion: "web-analysis-capture/1.0.0",
  evaluatorProvider: "fixture-position-evaluator",
  evaluatorVersion: "0.1.0",
  scoreScale: {
    kind: "relative"
  } satisfies EvaluationScoreScale
};

const DEFAULT_COACH_RUNTIME: CoachRuntime = {
  createId: () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    fallbackCoachCounter += 1;
    return `coach-${fallbackCoachCounter}`;
  },
  now: () => new Date().toISOString()
};

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

interface InitialLearnerProfileState {
  readonly profile: LearnerProfile;
  readonly message: string | null;
  readonly writable: boolean;
}

interface InitialLineageState {
  readonly lineageId: string;
  readonly message: string | null;
  readonly writable: boolean;
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

const buildGameSnapshot = (
  gameState: GameState,
  turnHistory: readonly TurnRecord[],
  openingRollState: OpeningRollState,
  openingTurnPending: boolean
): GameSnapshot => {
  return {
    savedAt: new Date().toISOString(),
    gameState,
    turnHistory,
    openingState: toSnapshotOpeningState(openingRollState, openingTurnPending)
  };
};

const resolveInitialLearnerProfileState = (
  storage: LearnerProfileStorage,
  now: string
): InitialLearnerProfileState => {
  let savedText: string | null = null;

  try {
    savedText = storage.load();
  } catch {
    return {
      profile: createLearnerProfile({ updatedAt: now }),
      message: "Learner profile storage is unavailable. Progress stays in memory only.",
      writable: false
    };
  }

  if (savedText === null) {
    return {
      profile: createLearnerProfile({ updatedAt: now }),
      message: null,
      writable: true
    };
  }

  const decoded = decodeLearnerProfile(savedText);
  if (!decoded.ok) {
    if (decoded.reason === "unsupported-version") {
      return {
        profile: createLearnerProfile({ updatedAt: now }),
        message: "Stored learner profile version is newer than this app and was left untouched.",
        writable: false
      };
    }

    return {
      profile: createLearnerProfile({ updatedAt: now }),
      message: "Stored learner profile was invalid and has been reset locally.",
      writable: true
    };
  }

  return {
    profile: decoded.profile,
    message: null,
    writable: true
  };
};

const resolveInitialLineageState = (storage: GameLineageStorage): InitialLineageState => {
  let savedText: string | null = null;

  try {
    savedText = storage.load();
  } catch {
    return {
      lineageId: createLineageId(),
      message: "Lineage metadata storage is unavailable. Using in-memory lineage identity.",
      writable: false
    };
  }

  if (savedText === null) {
    return {
      lineageId: createLineageId(),
      message: null,
      writable: true
    };
  }

  const decoded = decodePersistedGameLineage(savedText);
  if (!decoded.ok) {
    return {
      lineageId: createLineageId(),
      message: "Stored lineage metadata was invalid and has been replaced.",
      writable: true
    };
  }

  return {
    lineageId: decoded.value.lineageId,
    message: null,
    writable: true
  };
};

interface AppProps {
  initialGameState?: GameState;
  randomSource?: RandomSource;
  initialOpeningRollState?: OpeningRollState;
  initialOpeningTurnPending?: boolean;
  gameStorage?: GameStorage;
  profileStorage?: LearnerProfileStorage;
  lineageStorage?: GameLineageStorage;
  moveEvaluator?: PositionEvaluator;
  analysisCaptureEnabled?: boolean;
  analysisCaptureRuntime?: AnalysisCaptureRuntime;
  analysisCaptureMetadata?: FixtureAnalysisSessionMetadataConfig;
  coachModel?: ChatModel;
  coachRuntime?: CoachRuntime;
  coachFixtureEnabled?: boolean;
  coachKnowledgeRetriever?: CoachKnowledgeRetriever;
  coachProviderStatus?: CoachProviderStatus;
}

type InspectionView = "before" | "after";

interface HistoryInspectionState {
  readonly turnNumber: number;
  readonly view: InspectionView;
}

const getOutcomeByKey = (
  analysisResult: AnalyzeLegalMoveOutcomesResult | null,
  key: string | null
) => {
  if (analysisResult === null || !analysisResult.ok || key === null) {
    return null;
  }

  return (
    analysisResult.analysis.outcomes.find((outcome) => getMoveFingerprint(outcome.move) === key) ??
    null
  );
};

function App({
  initialGameState,
  randomSource,
  initialOpeningRollState,
  initialOpeningTurnPending,
  gameStorage,
  profileStorage,
  lineageStorage,
  moveEvaluator,
  analysisCaptureEnabled = false,
  analysisCaptureRuntime,
  analysisCaptureMetadata,
  coachModel,
  coachRuntime,
  coachFixtureEnabled = false,
  coachKnowledgeRetriever,
  coachProviderStatus
}: AppProps): JSX.Element {
  const snapshotStorage = useMemo(
    () => gameStorage ?? createLocalGameStorage(DEFAULT_GAME_STORAGE_KEY),
    [gameStorage]
  );
  const learnerProfileStorage = useMemo(
    () => profileStorage ?? createLocalLearnerProfileStorage(),
    [profileStorage]
  );
  const gameLineageStorage = useMemo(
    () => lineageStorage ?? createLocalGameLineageStorage(),
    [lineageStorage]
  );
  const bootstrapNow = useMemo(() => new Date().toISOString(), []);
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
  const initialProfileState = useMemo(
    () => resolveInitialLearnerProfileState(learnerProfileStorage, bootstrapNow),
    [bootstrapNow, learnerProfileStorage]
  );
  const initialLineageState = useMemo(
    () => resolveInitialLineageState(gameLineageStorage),
    [gameLineageStorage]
  );
  const captureRuntime = analysisCaptureRuntime ?? DEFAULT_ANALYSIS_CAPTURE_RUNTIME;
  const captureMetadata = analysisCaptureMetadata ?? DEFAULT_ANALYSIS_CAPTURE_METADATA;
  const resolvedCoachRuntime = coachRuntime ?? DEFAULT_COACH_RUNTIME;

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
  const [selectedOutcomeKey, setSelectedOutcomeKey] = useState<string | null>(null);
  const [moveEvaluationResult, setMoveEvaluationResult] = useState<EvaluateLegalMovesResult | null>(
    null
  );
  const [moveEvaluationPending, setMoveEvaluationPending] = useState(false);
  const [analysisSession, setAnalysisSession] = useState<AnalysisSession | null>(null);
  const [pendingDecisionAnalysis, setPendingDecisionAnalysis] =
    useState<PendingDecisionAnalysis | null>(null);
  const [analysisEvaluatorStatus, setAnalysisEvaluatorStatus] = useState<AnalysisEvaluatorStatus>(
    moveEvaluator === undefined ? "not-configured" : "idle"
  );
  const [lastCaptureFailure, setLastCaptureFailure] = useState<AnalysisCaptureFailure | null>(null);
  const [importText, setImportText] = useState<string>("");
  const [lineageId, setLineageId] = useState<string>(initialLineageState.lineageId);
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile>(initialProfileState.profile);
  const [profileWritable, setProfileWritable] = useState<boolean>(initialProfileState.writable);
  const [lineageWritable, setLineageWritable] = useState<boolean>(initialLineageState.writable);
  const [profileMessage, setProfileMessage] = useState<string | null>(
    initialProfileState.message ?? initialLineageState.message
  );
  const skipInitialPersistRef = useRef(true);
  const skipInitialProfilePersistRef = useRef(true);
  const moveEvaluationRequestIdRef = useRef(0);

  useEffect(() => {
    if (moveEvaluator === undefined) {
      setAnalysisEvaluatorStatus("not-configured");
      return;
    }

    setAnalysisEvaluatorStatus((current) => (current === "not-configured" ? "idle" : current));
  }, [moveEvaluator]);

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
  const legalMoveOutcomesResult = useMemo<AnalyzeLegalMoveOutcomesResult | null>(() => {
    if (
      isInspectingHistory ||
      openingRollState.phase !== "resolved" ||
      gameStatus.state === "complete" ||
      gameState.dice === null
    ) {
      return null;
    }

    return analyzeLegalMoveOutcomes(gameState.position, gameState.activePlayer, gameState.dice);
  }, [
    gameState.activePlayer,
    gameState.dice,
    gameState.position,
    gameStatus.state,
    isInspectingHistory,
    openingRollState.phase
  ]);

  const activeSnapshot = useMemo<GameSnapshot>(() => {
    return buildGameSnapshot(gameState, turnHistory, openingRollState, openingTurnPending);
  }, [gameState, openingRollState, openingTurnPending, turnHistory]);

  const activeGameReference = useMemo(() => {
    const reference = getAnalysisSessionGameReference(activeSnapshot);
    return reference.ok ? reference.gameReference : null;
  }, [activeSnapshot]);

  const learnerOwnershipMode = useMemo<LearnerOwnershipMode>(() => {
    return getLineageOwnershipMode(learnerProfile, lineageId);
  }, [learnerProfile, lineageId]);

  const learnerProgress = useMemo(() => {
    return summarizeLearnerProgress(learnerProfile, { recentWindowSize: 20 });
  }, [learnerProfile]);

  const recentMainPatternSummary = useMemo(() => {
    const mainPattern = learnerProgress.patterns.mainPattern;
    if (mainPattern.status === "supported") {
      return {
        label: mainPattern.displayName,
        detail: `Observed in ${mainPattern.occurrenceCount} of the last ${learnerProgress.recentWindowSize} eligible learner decisions across ${mainPattern.gamesRepresented} game${mainPattern.gamesRepresented === 1 ? "" : "s"}.`
      };
    }

    if (mainPattern.status === "tied") {
      return {
        label: "tied patterns",
        detail: mainPattern.tiedPatterns.map((pattern) => pattern.displayName).join(", ")
      };
    }

    return {
      label: "not enough evidence yet"
    };
  }, [learnerProgress]);

  const progressContext = useMemo<Extract<CoachQuestionContext, { kind: "progress-profile" }>>(
    () => ({
      kind: "progress-profile",
      gameReference: activeGameReference ?? "unresolved-game-reference",
      snapshot: activeSnapshot,
      progress: learnerProgress
    }),
    [activeGameReference, activeSnapshot, learnerProgress]
  );

  useEffect(() => {
    if (
      !analysisCaptureEnabled ||
      activeGameReference === null ||
      openingRollState.phase !== "resolved"
    ) {
      setAnalysisSession(null);
      setPendingDecisionAnalysis(null);
      setLastCaptureFailure(null);
      return;
    }

    if (
      analysisSession !== null &&
      analysisSession.gameSnapshotReference.gameReference === activeGameReference
    ) {
      return;
    }

    const createdAt = captureRuntime.now();
    const created = createAnalysisSession({
      sessionId: captureRuntime.createSessionId(),
      gameSnapshot: activeSnapshot,
      metadata: createFixtureAnalysisSessionMetadata(captureMetadata, createdAt),
      createdAt,
      gameReference: activeGameReference
    });

    if (!created.ok) {
      setAnalysisSession(null);
      setPendingDecisionAnalysis(null);
      setLastCaptureFailure({
        reason: "session-not-initialized",
        message: created.message
      });
      return;
    }

    setAnalysisSession(created.session);
    setPendingDecisionAnalysis(null);
    setLastCaptureFailure(null);
  }, [
    activeGameReference,
    activeSnapshot,
    analysisCaptureEnabled,
    analysisSession,
    captureMetadata,
    captureRuntime,
    openingRollState.phase
  ]);

  const liveDecisionContext = useMemo(() => {
    if (
      analysisSession === null ||
      gameState.dice === null ||
      isInspectingHistory ||
      openingRollState.phase !== "resolved" ||
      gameStatus.state === "complete"
    ) {
      return null;
    }

    const turnNumber = turnHistory.length + 1;
    const gameReference = analysisSession.gameSnapshotReference.gameReference;
    const decisionKey = getAnalysisDecisionKey({
      gameReference,
      turnNumber,
      position: gameState.position,
      player: gameState.activePlayer,
      dice: gameState.dice
    });

    return {
      decisionKey,
      gameReference,
      turnNumber,
      player: gameState.activePlayer,
      dice: gameState.dice,
      snapshotBeforeTurn: activeSnapshot
    };
  }, [
    activeSnapshot,
    analysisSession,
    gameState.activePlayer,
    gameState.dice,
    gameState.position,
    gameStatus.state,
    isInspectingHistory,
    openingRollState.phase,
    turnHistory.length
  ]);

  useEffect(() => {
    if (liveDecisionContext === null) {
      setPendingDecisionAnalysis(null);
      return;
    }

    if (
      pendingDecisionAnalysis !== null &&
      pendingDecisionAnalysis.decisionKey === liveDecisionContext.decisionKey
    ) {
      return;
    }

    setPendingDecisionAnalysis(null);
  }, [liveDecisionContext, pendingDecisionAnalysis]);

  useEffect(() => {
    const canEvaluate =
      moveEvaluator !== undefined &&
      !isInspectingHistory &&
      openingRollState.phase === "resolved" &&
      gameStatus.state !== "complete" &&
      gameState.dice !== null;

    if (!canEvaluate) {
      setMoveEvaluationPending(false);
      setMoveEvaluationResult(null);
      setAnalysisEvaluatorStatus(moveEvaluator === undefined ? "not-configured" : "idle");
      return;
    }

    let disposed = false;
    moveEvaluationRequestIdRef.current += 1;
    const requestId = moveEvaluationRequestIdRef.current;
    setMoveEvaluationPending(true);
    setAnalysisEvaluatorStatus("evaluating");

    void evaluateLegalMoves(
      {
        position: gameState.position,
        player: gameState.activePlayer,
        dice: gameState.dice,
        context: {
          gameMode: "money"
        }
      },
      moveEvaluator
    )
      .then((result) => {
        if (disposed || requestId !== moveEvaluationRequestIdRef.current) {
          return;
        }

        setMoveEvaluationResult(result);
        if (result.ok && liveDecisionContext !== null) {
          setPendingDecisionAnalysis(
            createPendingDecisionAnalysis({
              decisionKey: liveDecisionContext.decisionKey,
              gameReference: liveDecisionContext.gameReference,
              turnNumber: liveDecisionContext.turnNumber,
              snapshotBeforeTurn: liveDecisionContext.snapshotBeforeTurn,
              player: liveDecisionContext.player,
              dice: liveDecisionContext.dice,
              rankedAnalysis: result.analysis,
              evaluatorRequestId: requestId
            })
          );
          setAnalysisEvaluatorStatus("ready");
        } else if (result.ok) {
          setPendingDecisionAnalysis(null);
          setAnalysisEvaluatorStatus("idle");
        } else {
          setPendingDecisionAnalysis(null);
          setAnalysisEvaluatorStatus(
            result.reason === "unavailable"
              ? "unavailable"
              : result.reason === "invalid-provider-result"
                ? "invalid"
                : "failed"
          );
        }
        setMoveEvaluationPending(false);
      })
      .catch(() => {
        if (disposed || requestId !== moveEvaluationRequestIdRef.current) {
          return;
        }

        if (legalMoveOutcomesResult !== null && legalMoveOutcomesResult.ok) {
          setMoveEvaluationResult({
            ok: false,
            reason: "provider-failed",
            message: "Evaluator request failed.",
            factualAnalysis: legalMoveOutcomesResult.analysis
          });
        } else {
          setMoveEvaluationResult(null);
        }
        setPendingDecisionAnalysis(null);
        setAnalysisEvaluatorStatus("failed");
        setMoveEvaluationPending(false);
      });

    return () => {
      disposed = true;
    };
  }, [
    gameState.activePlayer,
    gameState.dice,
    gameState.position,
    gameStatus.state,
    isInspectingHistory,
    legalMoveOutcomesResult,
    liveDecisionContext,
    moveEvaluator,
    openingRollState.phase
  ]);
  const selectedOutcome = useMemo(
    () => getOutcomeByKey(legalMoveOutcomesResult, selectedOutcomeKey),
    [legalMoveOutcomesResult, selectedOutcomeKey]
  );
  const isPreviewingOutcome = selectedOutcome !== null && !isInspectingHistory;
  const isReadOnlyInspection = isInspectingHistory || isPreviewingOutcome;

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

  const coachStagedSelectionSummary = useMemo<CoachStagedSelectionSummary | undefined>(() => {
    if (selectedSteps.length === 0 && candidateMoves.length === 0) {
      return undefined;
    }

    return {
      selectedSteps: selectedSteps.map((step) => `${step.fromPoint}->${step.toPoint}`),
      candidateMoveFingerprints: candidateMoves.map((move) => getMoveFingerprint(move)),
      candidateMoveLabels: candidateMoves.map((move) => formatMoveBreadcrumb(move))
    };
  }, [candidateMoves, selectedSteps]);

  const coachCurrentTurnContext = useMemo(
    () =>
      deriveCurrentTurnContext({
        openingResolved,
        gameComplete: gameStatus.state === "complete",
        activePlayer: gameState.activePlayer,
        dice: gameState.dice,
        legalMoveOutcomesResult: legalMoveOutcomesResult,
        ...(moveEvaluationResult?.ok ? { rankedAnalysis: moveEvaluationResult.analysis } : {}),
        ...(coachStagedSelectionSummary === undefined
          ? {}
          : { stagedSelection: coachStagedSelectionSummary })
      }),
    [
      coachStagedSelectionSummary,
      gameState.activePlayer,
      gameState.dice,
      gameStatus.state,
      legalMoveOutcomesResult,
      moveEvaluationResult,
      openingResolved
    ]
  );

  const selectedAnalysisRecord = useMemo(() => {
    if (analysisSession === null || inspectedTurn === null) {
      return undefined;
    }

    return analysisSession.records.find((record) => record.turnNumber === inspectedTurn.turnNumber);
  }, [analysisSession, inspectedTurn]);

  const coachContext = useMemo(() => {
    const selectedMoveOutcome =
      selectedOutcome === null
        ? undefined
        : {
            moveFingerprint: getMoveFingerprint(selectedOutcome.move),
            outcome: selectedOutcome
          };

    const selectedHistoryTurn =
      inspectedTurn === null
        ? undefined
        : selectedAnalysisRecord === undefined
          ? {
              turnRecord: inspectedTurn
            }
          : {
              turnRecord: inspectedTurn,
              analysisRecord: selectedAnalysisRecord
            };

    return resolveCoachQuestionContext({
      gameReference: activeGameReference ?? "unresolved-game-reference",
      snapshot: activeSnapshot,
      openingResolved,
      gameComplete: gameStatus.state === "complete",
      legalMoveOutcomesResult,
      ...(moveEvaluationResult?.ok ? { rankedAnalysis: moveEvaluationResult.analysis } : {}),
      ...(coachCurrentTurnContext.stagedSelection === undefined
        ? {}
        : { stagedSelection: coachCurrentTurnContext.stagedSelection }),
      ...(selectedMoveOutcome === undefined ? {} : { selectedMoveOutcome }),
      ...(selectedHistoryTurn === undefined ? {} : { selectedHistoryTurn }),
      ...(analysisSession === null ? {} : { analysisSession })
    });
  }, [
    activeGameReference,
    activeSnapshot,
    analysisSession,
    coachCurrentTurnContext.stagedSelection,
    gameStatus.state,
    inspectedTurn,
    legalMoveOutcomesResult,
    moveEvaluationResult,
    openingResolved,
    selectedAnalysisRecord,
    selectedOutcome
  ]);

  const coachLineageKey = activeGameReference ?? `lineage-unavailable-${activeSnapshot.savedAt}`;

  const resolveHistoryTurnAnalysis = useCallback(
    async (input: {
      question: string;
      context: Extract<CoachQuestionContext, { kind: "history-turn" }>;
    }) => {
      if (moveEvaluator === undefined) {
        return undefined;
      }

      if (input.context.turnRecord.outcome.kind !== "move") {
        return undefined;
      }

      const evaluated = await evaluateLegalMoves(
        {
          position: input.context.turnRecord.positionBefore,
          player: input.context.turnRecord.player,
          dice: input.context.turnRecord.dice,
          context: {
            gameMode: "money"
          }
        },
        moveEvaluator
      );

      if (!evaluated.ok || evaluated.analysis.kind !== "evaluated") {
        return undefined;
      }

      return evaluated.analysis;
    },
    [moveEvaluator]
  );

  const resolveGameReviewTurnAnalysis = useCallback(
    async (input: {
      question: string;
      context: Extract<CoachQuestionContext, { kind: "game-review" }>;
      turnRecord: TurnRecord;
    }): Promise<GameReviewTurnHydrationResult> => {
      if (moveEvaluator === undefined) {
        return {
          ok: false,
          status: "unavailable",
          message: "No evaluator is configured."
        };
      }

      if (input.turnRecord.outcome.kind !== "move") {
        return {
          ok: false,
          status: "unavailable",
          message: "Turn is not a checker-play decision."
        };
      }

      const evaluated = await evaluateLegalMoves(
        {
          position: input.turnRecord.positionBefore,
          player: input.turnRecord.player,
          dice: input.turnRecord.dice,
          context: {
            gameMode: "money"
          }
        },
        moveEvaluator
      );

      if (evaluated.ok) {
        return {
          ok: true,
          rankedAnalysis: evaluated.analysis
        };
      }

      if (
        evaluated.reason === "unavailable" ||
        evaluated.reason === "unsupported-position" ||
        evaluated.reason === "timeout"
      ) {
        return {
          ok: false,
          status: "unavailable",
          message: evaluated.message
        };
      }

      return {
        ok: false,
        status: "failed",
        message: evaluated.message
      };
    },
    [moveEvaluator]
  );

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

  const durableSnapshot = activeSnapshot;

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

  useEffect(() => {
    if (skipInitialProfilePersistRef.current) {
      skipInitialProfilePersistRef.current = false;
      return;
    }

    if (!profileWritable) {
      return;
    }

    try {
      learnerProfileStorage.save(encodeLearnerProfile(learnerProfile));
    } catch {
      setProfileWritable(false);
      setProfileMessage("Learner profile could not be saved. Progress remains in memory only.");
    }
  }, [learnerProfile, learnerProfileStorage, profileWritable]);

  useEffect(() => {
    if (!lineageWritable) {
      return;
    }

    try {
      gameLineageStorage.save(
        encodePersistedGameLineage({
          lineageId,
          updatedAt: new Date().toISOString()
        })
      );
    } catch {
      setLineageWritable(false);
      setProfileMessage(
        "Lineage metadata could not be saved. Current session uses in-memory identity."
      );
    }
  }, [gameLineageStorage, lineageId, lineageWritable]);

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

  const onSetLearnerOwnership = (mode: LearnerOwnershipMode): void => {
    const now = new Date().toISOString();
    setLearnerProfile((current) =>
      setLineageOwnership({
        profile: current,
        lineageId,
        mode,
        resolvedAt: now
      })
    );
    setProfileMessage(null);
  };

  const onClearLearnerProfile = (): void => {
    const confirmed = window.confirm(
      "Clear all locally stored learner progress observations and ownership metadata?"
    );

    if (!confirmed) {
      return;
    }

    const now = new Date().toISOString();
    setLearnerProfile(createLearnerProfile({ updatedAt: now }));

    if (profileWritable) {
      try {
        learnerProfileStorage.clear();
        setProfileMessage("Learner profile data cleared locally.");
      } catch {
        setProfileWritable(false);
        setProfileMessage("Learner profile clear failed. In-memory profile was reset.");
      }
    } else {
      setProfileMessage("Learner profile reset in memory for this session.");
    }
  };

  const clearStagedSelection = (): void => {
    setSelectedSteps([]);
    setSelectedSource(null);
    setHoveredDestination(null);
  };

  const createCommittedTurnRecord = (
    input: Omit<CreateTurnRecordInput, "turnNumber">
  ): {
    committedTurn: TurnRecord;
    nextTurnHistory: readonly TurnRecord[];
  } => {
    const nextTurnNumber = turnHistory.length + 1;
    const committedTurn = createTurnRecord({
      ...input,
      turnNumber: nextTurnNumber
    });

    return {
      committedTurn,
      nextTurnHistory: [...turnHistory, committedTurn]
    };
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
    moveEvaluationRequestIdRef.current += 1;
    const playerBefore = gameState.activePlayer;
    const diceBefore = gameState.dice;
    const positionBefore = gameState.position;
    const phaseBefore = openingTurnPending ? "opening" : "normal";
    const snapshotBeforeTurn = durableSnapshot;
    const result = applyGameMove(gameState, move);

    if (!result.ok) {
      setMessage(getApplyFailureMessage(result.reason));
      return;
    }

    if (diceBefore !== null) {
      const observedAt = captureRuntime.now();
      const { committedTurn, nextTurnHistory } = createCommittedTurnRecord({
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

      setTurnHistory(nextTurnHistory);

      const rankedForObservation =
        moveEvaluationResult?.ok &&
        (moveEvaluationResult.analysis.kind === "evaluated" ||
          moveEvaluationResult.analysis.kind === "no-legal-moves")
          ? moveEvaluationResult.analysis
          : undefined;

      setLearnerProfile((current) => {
        const ingested = ingestCommittedLearnerObservation({
          profile: current,
          lineageId,
          ...(activeGameReference === null ? {} : { gameReference: activeGameReference }),
          ownershipMode: learnerOwnershipMode,
          committedTurn,
          ...(rankedForObservation === undefined ? {} : { rankedAnalysis: rankedForObservation }),
          observedAt
        });

        return ingested.profile;
      });

      if (analysisCaptureEnabled) {
        const snapshotAfterTurn = buildGameSnapshot(
          result.state,
          nextTurnHistory,
          openingRollState,
          false
        );
        const captureResult = captureCommittedTurnAnalysis({
          session: analysisSession,
          pendingDecision: pendingDecisionAnalysis,
          snapshotBeforeTurn,
          snapshotAfterTurn,
          committedTurn,
          updatedAt: captureRuntime.now()
        });

        if (captureResult.ok) {
          setAnalysisSession(captureResult.session);
          setLastCaptureFailure(null);
        } else {
          setLastCaptureFailure({
            reason: captureResult.reason,
            message: captureResult.message
          });
          console.error(captureResult.message);
        }

        setPendingDecisionAnalysis(null);
      }
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
    moveEvaluationRequestIdRef.current += 1;
    const playerBefore = gameState.activePlayer;
    const diceBefore = gameState.dice;
    const positionBefore = gameState.position;
    const phaseBefore = openingTurnPending ? "opening" : "normal";
    const snapshotBeforeTurn = durableSnapshot;
    const result = passTurn(gameState);

    if (!result.ok) {
      setMessage(getPassFailureMessage(result.reason));
      return;
    }

    if (diceBefore !== null) {
      const gameStatusAfter = getGameStatus(result.state.position);
      const { committedTurn, nextTurnHistory } = createCommittedTurnRecord({
        player: playerBefore,
        dice: diceBefore,
        outcome: {
          kind: "pass"
        },
        positionBefore,
        positionAfter: result.state.position,
        gameStatusAfter,
        phase: phaseBefore
      });

      setTurnHistory(nextTurnHistory);

      if (analysisCaptureEnabled) {
        const snapshotAfterTurn = buildGameSnapshot(
          result.state,
          nextTurnHistory,
          openingRollState,
          false
        );
        const captureResult = captureCommittedTurnAnalysis({
          session: analysisSession,
          pendingDecision: pendingDecisionAnalysis,
          snapshotBeforeTurn,
          snapshotAfterTurn,
          committedTurn,
          updatedAt: captureRuntime.now()
        });

        if (captureResult.ok) {
          setAnalysisSession(captureResult.session);
          setLastCaptureFailure(null);
        } else {
          setLastCaptureFailure({
            reason: captureResult.reason,
            message: captureResult.message
          });
          console.error(captureResult.message);
        }

        setPendingDecisionAnalysis(null);
      }
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
    moveEvaluationRequestIdRef.current += 1;
    setPendingDecisionAnalysis(null);
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
    moveEvaluationRequestIdRef.current += 1;
    const nextGameState = createInitialGameState();
    const nextOpeningRollState: OpeningRollState = {
      phase: "waiting"
    };
    const nextOpeningTurnPending = false;
    const nextTurnHistory: readonly TurnRecord[] = [];
    let saveFailed = false;

    try {
      snapshotStorage.save(
        encodeGameSnapshot(
          buildGameSnapshot(
            nextGameState,
            nextTurnHistory,
            nextOpeningRollState,
            nextOpeningTurnPending
          )
        )
      );
    } catch {
      saveFailed = true;
    }

    setGameState(nextGameState);
    setLineageId(createLineageId());
    setOpeningRollState(nextOpeningRollState);
    setOpeningTurnPending(nextOpeningTurnPending);
    setDieOne(DEFAULT_MANUAL_DIE_ONE);
    setDieTwo(DEFAULT_MANUAL_DIE_TWO);
    setTurnHistory(nextTurnHistory);
    setHistoryInspection(null);
    setSelectedOutcomeKey(null);
    setPendingDecisionAnalysis(null);
    setLastCaptureFailure(null);
    setMoveEvaluationResult(null);
    setMoveEvaluationPending(false);
    setAnalysisEvaluatorStatus(moveEvaluator === undefined ? "not-configured" : "idle");
    resetTransientState();

    if (saveFailed) {
      setMessage("Local save failed. Game continues in memory only.");
    }
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
    moveEvaluationRequestIdRef.current += 1;
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
    setLineageId(createLineageId());
    setTurnHistory(parsed.snapshot.turnHistory);
    setOpeningRollState(restoredOpening.openingRollState);
    setOpeningTurnPending(restoredOpening.openingTurnPending);
    setHistoryInspection(null);
    setSelectedOutcomeKey(null);
    setPendingDecisionAnalysis(null);
    setLastCaptureFailure(null);
    setMoveEvaluationResult(null);
    setMoveEvaluationPending(false);
    setAnalysisEvaluatorStatus(moveEvaluator === undefined ? "not-configured" : "idle");
    setImportText("");
    resetTransientState();
    setMessage("Snapshot imported.");
  };

  const onClearSavedGame = (): void => {
    try {
      snapshotStorage.clear();
      gameLineageStorage.clear();
      setMessage(
        "Saved game cleared. Reloading now will start fresh unless this game is saved again."
      );
    } catch {
      setMessage("Unable to clear saved game.");
    }
  };

  const onSelectHistoryTurn = (turnNumber: number): void => {
    clearStagedSelection();
    setSelectedOutcomeKey(null);
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
    setSelectedOutcomeKey(null);
  };

  const onSelectOutcome = (outcomeKey: string): void => {
    clearStagedSelection();
    setHistoryInspection(null);
    setSelectedOutcomeKey(outcomeKey);
  };

  const onReturnFromOutcomePreview = (): void => {
    setSelectedOutcomeKey(null);
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
    !isReadOnlyInspection &&
    gameState.dice !== null &&
    gameStatus.state !== "complete" &&
    legalMovesResult.ok
      ? getSelectableSources(candidateMoves, selectedSteps)
      : [];
  const selectableDestinations =
    !isReadOnlyInspection &&
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
    if (isReadOnlyInspection) {
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
    !isReadOnlyInspection;
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
    : isPreviewingOutcome
      ? selectedOutcome.positionAfter
      : stagedPosition;

  const interactionStatus = (() => {
    if (gameStatus.state === "complete") {
      return "Game complete";
    }

    if (isInspectingHistory && historyInspection !== null) {
      return `Inspecting turn ${historyInspection.turnNumber} (${historyInspection.view})`;
    }

    if (isPreviewingOutcome) {
      return "Move Outcome Preview";
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
    if (isReadOnlyInspection) {
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
    !isReadOnlyInspection && (selectedSteps.length > 0 || selectedSource !== null);

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
          {isPreviewingOutcome ? (
            <p className={styles.selectionMeta} data-testid="move-outcome-preview-banner">
              Move Outcome Preview
            </p>
          ) : null}
          <BackgammonBoard
            position={boardPosition}
            activePlayer={boardActivePlayer}
            showActivePlayer={openingResolved && !isReadOnlyInspection}
            selectableSources={selectableSources}
            selectableDestinations={selectableDestinations}
            previewSources={isReadOnlyInspection ? [] : previewSources}
            previewDestinations={isReadOnlyInspection ? [] : previewDestinations}
            hoveredDestination={hoveredDestination}
            selectedSource={selectedSource}
            {...(isReadOnlyInspection ? {} : { onSelectSource })}
            {...(isReadOnlyInspection ? {} : { onSelectDestination })}
            {...(isReadOnlyInspection ? {} : { onHoverDestination })}
            {...(isReadOnlyInspection ? {} : { onClearHoveredDestination })}
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
            {isReadOnlyInspection ? (
              <p className={styles.selectionMeta} data-testid="candidate-panel-locked">
                Candidate previews are hidden while inspecting a read-only position.
              </p>
            ) : null}
            <p
              className={styles.selectionMeta}
              data-testid="continuations-count"
              aria-live="polite"
            >
              Continuations: {isReadOnlyInspection ? 0 : continuationSummaryRows.length}
            </p>
            {!isReadOnlyInspection && continuationSummaryRows.length > 0 ? (
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
              Completed moves: {isReadOnlyInspection ? 0 : completedMoveSummaryRows.length}
            </p>
            {!isReadOnlyInspection && completedMoveSummaryRows.length > 0 ? (
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

          <LegalMoveOutcomesPanel
            openingRollPhase={openingRollState.phase}
            gameComplete={gameStatus.state === "complete"}
            turnDiceAssigned={gameState.dice !== null}
            isInspectingHistory={isInspectingHistory}
            analysisResult={legalMoveOutcomesResult}
            evaluatorConfigured={moveEvaluator !== undefined}
            evaluatorPending={moveEvaluationPending}
            evaluationResult={moveEvaluationResult}
            selectedOutcomeKey={selectedOutcomeKey}
            previewActive={isPreviewingOutcome}
            onSelectOutcome={onSelectOutcome}
            onReturnToCurrentGame={onReturnFromOutcomePreview}
          />

          <AnalysisSessionPanel
            session={analysisSession}
            evaluatorStatus={analysisEvaluatorStatus}
            lastCaptureFailure={lastCaptureFailure}
          />
        </section>

        <section className={styles.sidebarSection}>
          <CoachPanel
            lineageKey={coachLineageKey}
            context={coachContext}
            progressContext={progressContext}
            runtime={resolvedCoachRuntime}
            fixtureEnabled={coachFixtureEnabled}
            evaluatorConfigured={moveEvaluator !== undefined}
            analysisPending={moveEvaluationPending}
            resolveHistoryTurnAnalysis={resolveHistoryTurnAnalysis}
            resolveGameReviewTurnAnalysis={resolveGameReviewTurnAnalysis}
            {...(analysisSession === null ? {} : { analysisSession })}
            {...(coachProviderStatus === undefined ? {} : { providerStatus: coachProviderStatus })}
            {...(coachModel === undefined ? {} : { model: coachModel })}
            {...(coachKnowledgeRetriever === undefined
              ? {}
              : { knowledgeRetriever: coachKnowledgeRetriever })}
          />

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
            interactionLocked={isReadOnlyInspection}
            canRollDice={canRollDice}
            canSetDiceManually={canSetDiceManually}
            exportSnapshotText={exportSnapshotText}
            importText={importText}
            canCopySnapshot={canCopySnapshot}
            snapshotFormat={GAME_SNAPSHOT_FORMAT}
            snapshotVersion={GAME_SNAPSHOT_VERSION}
            learnerOwnershipMode={learnerOwnershipMode}
            recentWindowSize={learnerProgress.recentWindowSize}
            recentBestOrReasonableCount={learnerProgress.counts.recentWindow.bestOrReasonable}
            recentMistakeCount={learnerProgress.counts.recentWindow.mistake}
            recentMajorMistakeCount={learnerProgress.counts.recentWindow.majorMistake}
            recentUnclassifiedCount={learnerProgress.counts.recentWindow.unclassified}
            recentMainPatternLabel={recentMainPatternSummary.label}
            {...(recentMainPatternSummary.detail === undefined
              ? {}
              : { recentMainPatternDetail: recentMainPatternSummary.detail })}
            profileGamesRepresented={learnerProgress.gamesRepresented.fullProfile}
            profileStorageStatus={
              profileWritable ? (lineageWritable ? "ready" : "lineage-memory-only") : "memory-only"
            }
            profileMessage={profileMessage}
            onRollForOpening={onRollForOpening}
            onRollDice={onRollDice}
            onSetDice={onSetDice}
            onPassTurn={onPassTurn}
            onNewGame={onNewGame}
            onSetLearnerOwnership={onSetLearnerOwnership}
            onClearLearnerProfile={onClearLearnerProfile}
            onCopyExportSnapshot={onCopyExportSnapshot}
            onImportTextChange={setImportText}
            onValidateAndImportSnapshot={onValidateAndImportSnapshot}
            onClearSavedGame={onClearSavedGame}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
