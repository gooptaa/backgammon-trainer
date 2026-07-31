import { describe, expect, it } from "vitest";
import {
  analyzeLegalMoveOutcomes,
  analyzePosition,
  getMoveFingerprint,
  type RankedLegalMoveAnalysis
} from "@backgammon-trainer/backgammon-analysis";
import {
  applyMove,
  createGameState,
  createTurnRecord,
  getGameStatus,
  getLegalMoves,
  setDice,
  type DiceRoll,
  type GameSnapshot,
  type Move,
  type TurnRecord
} from "@backgammon-trainer/backgammon-engine";
import {
  ANALYSIS_SESSION_FORMAT,
  ANALYSIS_SESSION_VERSION,
  appendAnalysisRecord,
  createAnalysisRecord,
  createAnalysisSession,
  decodeAnalysisSession,
  encodeAnalysisSession,
  getAnalysisSessionGameReference,
  getDecisionPositionFingerprint,
  parseAnalysisSession,
  reconcileAnalysisSession,
  serializeAnalysisSession,
  summarizeAnalysisSession,
  type AnalysisMetadata,
  type AnalysisSession,
  type AnalysisSummary
} from "../src/index";

type Position = Parameters<typeof analyzeLegalMoveOutcomes>[0];

type PreparedTurn = {
  readonly snapshotBeforeTurn: GameSnapshot;
  readonly snapshotAfterTurn: GameSnapshot;
  readonly committedTurn: TurnRecord;
  readonly rankedAnalysis: RankedLegalMoveAnalysis;
};

const createEmptyPoints = (): Position["points"] => ({
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
  7: null,
  8: null,
  9: null,
  10: null,
  11: null,
  12: null,
  13: null,
  14: null,
  15: null,
  16: null,
  17: null,
  18: null,
  19: null,
  20: null,
  21: null,
  22: null,
  23: null,
  24: null
});

const createPosition = (input?: {
  points?: Partial<Position["points"]>;
  bar?: Partial<Position["bar"]>;
  borneOff?: Partial<Position["borneOff"]>;
}): Position => ({
  points: {
    ...createEmptyPoints(),
    ...(input?.points ?? {})
  },
  bar: {
    white: 0,
    black: 0,
    ...(input?.bar ?? {})
  },
  borneOff: {
    white: 0,
    black: 0,
    ...(input?.borneOff ?? {})
  }
});

const SESSION_METADATA: AnalysisMetadata = {
  analysisFormat: "ranked-legal-move-analysis",
  analysisVersion: 1,
  generatorVersion: "analysis-session-builder/1.0.0",
  evaluatorProvider: "fixture-provider",
  evaluatorVersion: "2026.07",
  scoreScale: { kind: "relative" },
  createdAt: "2026-07-31T08:50:00.000Z"
};

const buildRankedAnalysis = (
  position: Position,
  player: "white" | "black",
  dice: DiceRoll,
  coverage: "complete" | "partial" = "complete"
): RankedLegalMoveAnalysis => {
  const factual = analyzeLegalMoveOutcomes(position, player, dice);
  if (!factual.ok) {
    throw new Error("Expected factual outcomes in test fixture");
  }

  if (factual.analysis.outcomes.length === 0) {
    return {
      kind: "no-legal-moves",
      player,
      dice,
      positionBefore: factual.analysis.positionBefore,
      factualOutcomes: [],
      coverage: "complete",
      rankedMoves: [],
      unevaluatedMoves: [],
      warnings: []
    };
  }

  const scoredOutcomes =
    coverage === "complete" ? factual.analysis.outcomes : factual.analysis.outcomes.slice(0, 1);

  const rankedMoves = scoredOutcomes
    .map((outcome, index) => ({
      rank: index + 1,
      normalizedScore: 100 - index,
      lossFromBest: index,
      moveFingerprint: getMoveFingerprint(outcome.move),
      providerRank: index + 1,
      outcome
    }))
    .sort((left, right) => {
      if (left.normalizedScore !== right.normalizedScore) {
        return right.normalizedScore - left.normalizedScore;
      }
      return left.moveFingerprint.localeCompare(right.moveFingerprint);
    })
    .map((entry, index, rows) => ({
      ...entry,
      rank:
        index === 0 || rows[index - 1]!.normalizedScore !== entry.normalizedScore
          ? index === 0
            ? 1
            : rows[index - 1]!.rank + 1
          : rows[index - 1]!.rank,
      lossFromBest: rows[0]!.normalizedScore - entry.normalizedScore
    }));

  const scoredFingerprints = new Set(rankedMoves.map((row) => row.moveFingerprint));

  return {
    kind: "evaluated",
    player,
    dice,
    positionBefore: factual.analysis.positionBefore,
    factualOutcomes: factual.analysis.outcomes,
    scoreScale: { kind: "relative" },
    provenance: {
      provider: SESSION_METADATA.evaluatorProvider,
      providerVersion: SESSION_METADATA.evaluatorVersion,
      adapterVersion: "adapter-1",
      settings: {
        rollout: false,
        depth: 2
      }
    },
    coverage,
    rankedMoves,
    unevaluatedMoves: factual.analysis.outcomes.filter(
      (outcome) => !scoredFingerprints.has(getMoveFingerprint(outcome.move))
    ),
    warnings: coverage === "partial" ? ["partial coverage fixture"] : []
  };
};

const getOpponent = (player: "white" | "black"): "white" | "black" =>
  player === "white" ? "black" : "white";

const pickLegalMove = (position: Position, player: "white" | "black", dice: DiceRoll): Move => {
  const legalMoves = getLegalMoves({ position, player, roll: dice }).moves;
  const first = legalMoves[0];
  if (first === undefined) {
    throw new Error("Expected at least one legal move in fixture");
  }

  return first;
};

const createSnapshot = (input: {
  savedAt: string;
  gameState: ReturnType<typeof createGameState>;
  turnHistory: readonly TurnRecord[];
}): GameSnapshot => ({
  savedAt: input.savedAt,
  gameState: input.gameState,
  turnHistory: input.turnHistory,
  openingState: {
    phase: "resolved",
    whiteDie: 6,
    blackDie: 1,
    startingPlayer: "white",
    openingTurnPending: false
  }
});

const createOpeningPendingSnapshot = (input: {
  savedAt: string;
  gameState: ReturnType<typeof createGameState>;
  whiteDie: 1 | 2 | 3 | 4 | 5 | 6;
  blackDie: 1 | 2 | 3 | 4 | 5 | 6;
}): GameSnapshot => ({
  savedAt: input.savedAt,
  gameState: input.gameState,
  turnHistory: [],
  openingState: {
    phase: "resolved",
    whiteDie: input.whiteDie,
    blackDie: input.blackDie,
    startingPlayer: input.whiteDie > input.blackDie ? "white" : "black",
    openingTurnPending: true
  }
});

const prepareSecondTurn = (): PreparedTurn => {
  const positionZero = createPosition({
    points: {
      8: { player: "white", checkerCount: 1 },
      1: { player: "black", checkerCount: 1 }
    },
    borneOff: {
      white: 14,
      black: 14
    }
  });

  const turn1Dice: DiceRoll = { dice: [1, 1] };
  const turn1Move = pickLegalMove(positionZero, "white", turn1Dice);
  const turn1Applied = applyMove(positionZero, "white", turn1Dice, turn1Move);
  if (!turn1Applied.ok) {
    throw new Error("Expected first fixture move to apply");
  }

  const turn1Record = createTurnRecord({
    turnNumber: 1,
    player: "white",
    dice: turn1Dice,
    outcome: {
      kind: "move",
      move: turn1Move
    },
    positionBefore: positionZero,
    positionAfter: turn1Applied.position,
    gameStatusAfter: getGameStatus(turn1Applied.position),
    phase: "opening"
  });

  const beforeTurn2BaseState = createGameState(turn1Applied.position, "black");
  const turn2Dice: DiceRoll = { dice: [1, 2] };
  const beforeTurn2WithDice = setDice(beforeTurn2BaseState, turn2Dice);
  if (!beforeTurn2WithDice.ok) {
    throw new Error("Expected turn2 dice assignment");
  }

  const turn2Move = pickLegalMove(beforeTurn2WithDice.state.position, "black", turn2Dice);
  const turn2Applied = applyMove(beforeTurn2WithDice.state.position, "black", turn2Dice, turn2Move);
  if (!turn2Applied.ok) {
    throw new Error("Expected second fixture move to apply");
  }

  const turn2Status = getGameStatus(turn2Applied.position);
  const turn2Record = createTurnRecord({
    turnNumber: 2,
    player: "black",
    dice: turn2Dice,
    outcome: {
      kind: "move",
      move: turn2Move
    },
    positionBefore: beforeTurn2WithDice.state.position,
    positionAfter: turn2Applied.position,
    gameStatusAfter: turn2Status,
    phase: "normal"
  });

  const snapshotBeforeTurn = createSnapshot({
    savedAt: "2026-07-31T09:00:00.000Z",
    gameState: beforeTurn2WithDice.state,
    turnHistory: [turn1Record]
  });

  const snapshotAfterTurn = createSnapshot({
    savedAt: "2026-07-31T09:01:00.000Z",
    gameState: createGameState(
      turn2Applied.position,
      turn2Status.state === "complete" ? "black" : getOpponent("black")
    ),
    turnHistory: [turn1Record, turn2Record]
  });

  const rankedAnalysis = buildRankedAnalysis(
    turn2Record.positionBefore,
    turn2Record.player,
    turn2Dice,
    "complete"
  );

  return {
    snapshotBeforeTurn,
    snapshotAfterTurn,
    committedTurn: turn2Record,
    rankedAnalysis
  };
};

const createSessionFixture = (): AnalysisSession => {
  const prepared = prepareSecondTurn();
  const created = createAnalysisSession({
    sessionId: "session-001",
    gameSnapshot: prepared.snapshotBeforeTurn,
    metadata: SESSION_METADATA,
    createdAt: "2026-07-31T09:10:00.000Z"
  });

  if (!created.ok) {
    throw new Error(created.message);
  }

  return created.session;
};

describe("createAnalysisSession", () => {
  it("creates an empty valid session with explicit session id and timestamp", () => {
    const prepared = prepareSecondTurn();
    const result = createAnalysisSession({
      sessionId: "session-empty",
      gameSnapshot: prepared.snapshotBeforeTurn,
      metadata: SESSION_METADATA,
      createdAt: "2026-07-31T09:12:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.session.sessionId).toBe("session-empty");
    expect(result.session.records).toEqual([]);
    expect(result.session.createdAt).toBe("2026-07-31T09:12:00.000Z");
    expect(result.session.updatedAt).toBe("2026-07-31T09:12:00.000Z");
    expect(result.session.gameSnapshotReference.snapshotFormat).toBe("backgammon-trainer-game");
    expect(result.session.gameSnapshotReference.snapshotVersion).toBe(1);

    const parsed = parseAnalysisSession(serializeAnalysisSession(result.session));
    expect(parsed.ok).toBe(true);
  });

  it("derives stable game references for equivalent snapshots and different references for different games", () => {
    const prepared = prepareSecondTurn();
    const equivalentSnapshot = {
      ...prepared.snapshotBeforeTurn,
      savedAt: "2026-07-31T09:22:00.000Z"
    };

    const first = getAnalysisSessionGameReference(prepared.snapshotBeforeTurn);
    const second = getAnalysisSessionGameReference(equivalentSnapshot);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    expect(first.gameReference).toBe(second.gameReference);

    const differentGame = {
      ...prepared.snapshotBeforeTurn,
      turnHistory: [],
      gameState: createGameState(
        createPosition({
          points: {
            6: { player: "white", checkerCount: 1 }
          },
          borneOff: { white: 14, black: 14 }
        }),
        "white"
      )
    };

    const third = getAnalysisSessionGameReference(differentGame);
    expect(third.ok).toBe(true);
    if (!third.ok) {
      return;
    }

    expect(third.gameReference).not.toBe(first.gameReference);
  });

  it("fails closed on invalid metadata or invalid timestamps", () => {
    const prepared = prepareSecondTurn();

    const invalidMetadata = createAnalysisSession({
      sessionId: "session-invalid-metadata",
      gameSnapshot: prepared.snapshotBeforeTurn,
      metadata: {
        ...SESSION_METADATA,
        evaluatorProvider: ""
      },
      createdAt: "2026-07-31T09:12:00.000Z"
    });

    expect(invalidMetadata.ok).toBe(false);
    if (!invalidMetadata.ok) {
      expect(invalidMetadata.reason).toBe("invalid-session-metadata");
    }

    const invalidTimestamp = createAnalysisSession({
      sessionId: "session-invalid-time",
      gameSnapshot: prepared.snapshotBeforeTurn,
      metadata: SESSION_METADATA,
      createdAt: "not-a-time"
    });

    expect(invalidTimestamp.ok).toBe(false);
    if (!invalidTimestamp.ok) {
      expect(invalidTimestamp.reason).toBe("invalid-timestamp");
    }
  });

  it("is deterministic and does not mutate snapshot or metadata inputs", () => {
    const prepared = prepareSecondTurn();
    const snapshotCopy = structuredClone(prepared.snapshotBeforeTurn);
    const metadataCopy = structuredClone(SESSION_METADATA);

    const first = createAnalysisSession({
      sessionId: "session-deterministic",
      gameSnapshot: prepared.snapshotBeforeTurn,
      metadata: SESSION_METADATA,
      createdAt: "2026-07-31T09:50:00.000Z"
    });
    const second = createAnalysisSession({
      sessionId: "session-deterministic",
      gameSnapshot: prepared.snapshotBeforeTurn,
      metadata: SESSION_METADATA,
      createdAt: "2026-07-31T09:50:00.000Z"
    });

    expect(first).toEqual(second);
    expect(prepared.snapshotBeforeTurn).toEqual(snapshotCopy);
    expect(SESSION_METADATA).toEqual(metadataCopy);

    if (!first.ok) {
      return;
    }

    const roundTrip = decodeAnalysisSession(encodeAnalysisSession(first.session));
    expect(roundTrip.ok).toBe(true);
  });
});

describe("getDecisionPositionFingerprint", () => {
  it("is deterministic and includes player and dice identity", () => {
    const position = createPosition({
      points: {
        8: { player: "white", checkerCount: 2 },
        1: { player: "black", checkerCount: 2 }
      },
      borneOff: {
        white: 13,
        black: 13
      }
    });

    const a = getDecisionPositionFingerprint({
      position,
      player: "white",
      dice: { dice: [2, 5] }
    });
    const b = getDecisionPositionFingerprint({
      position: structuredClone(position),
      player: "white",
      dice: { dice: [2, 5] }
    });
    const swappedDice = getDecisionPositionFingerprint({
      position,
      player: "white",
      dice: { dice: [5, 2] }
    });
    const differentPlayer = getDecisionPositionFingerprint({
      position,
      player: "black",
      dice: { dice: [2, 5] }
    });

    expect(a).toBe(b);
    expect(a).not.toBe(swappedDice);
    expect(a).not.toBe(differentPlayer);
  });

  it("changes with occupancy, bar, and borne-off differences without mutating input", () => {
    const base = createPosition({
      points: {
        8: { player: "white", checkerCount: 1 }
      },
      borneOff: {
        white: 14,
        black: 14
      }
    });

    const copy = structuredClone(base);
    const baseFingerprint = getDecisionPositionFingerprint({
      position: base,
      player: "white",
      dice: { dice: [1, 2] }
    });

    const occupancyFingerprint = getDecisionPositionFingerprint({
      position: {
        ...base,
        points: {
          ...base.points,
          8: { player: "white", checkerCount: 2 }
        }
      },
      player: "white",
      dice: { dice: [1, 2] }
    });

    const barFingerprint = getDecisionPositionFingerprint({
      position: {
        ...base,
        bar: {
          white: 1,
          black: 0
        }
      },
      player: "white",
      dice: { dice: [1, 2] }
    });

    const borneOffFingerprint = getDecisionPositionFingerprint({
      position: {
        ...base,
        borneOff: {
          white: 13,
          black: 14
        }
      },
      player: "white",
      dice: { dice: [1, 2] }
    });

    expect(baseFingerprint).not.toBe(occupancyFingerprint);
    expect(baseFingerprint).not.toBe(barFingerprint);
    expect(baseFingerprint).not.toBe(borneOffFingerprint);
    expect(base).toEqual(copy);
  });
});

describe("createAnalysisRecord", () => {
  it("builds a record linked to committed canonical move and resulting position", () => {
    const session = createSessionFixture();
    const prepared = prepareSecondTurn();

    const result = createAnalysisRecord({
      session,
      snapshotBeforeTurn: prepared.snapshotBeforeTurn,
      snapshotAfterTurn: prepared.snapshotAfterTurn,
      committedTurn: prepared.committedTurn,
      rankedAnalysis: prepared.rankedAnalysis,
      annotations: ["  review candidate  ", "review candidate"],
      tags: ["turn-2", "turn-2", "  black  "],
      createdAt: "2026-07-31T09:20:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.record.turnNumber).toBe(2);
    expect(result.record.player).toBe("black");
    expect(result.record.snapshotReference.turnNumber).toBe(2);
    expect(result.record.snapshotReference.position).toBe("before-turn");
    expect(result.record.chosenMove).not.toBeNull();
    expect(result.record.tags).toEqual(["turn-2", "black"]);
    expect(result.record.annotations).toEqual(["review candidate"]);

    if (result.record.chosenMove === null) {
      return;
    }

    const chosenFingerprint = getMoveFingerprint(result.record.chosenMove);
    const turnFingerprint =
      prepared.committedTurn.outcome.kind === "move"
        ? getMoveFingerprint(prepared.committedTurn.outcome.move)
        : "";
    expect(chosenFingerprint).toBe(turnFingerprint);

    if (result.record.rankedMoveAnalysis.kind !== "evaluated") {
      return;
    }

    const chosenOutcome = result.record.rankedMoveAnalysis.factualOutcomes.find(
      (outcome) => getMoveFingerprint(outcome.move) === chosenFingerprint
    );
    expect(chosenOutcome).toBeDefined();
    if (chosenOutcome === undefined) {
      return;
    }

    expect(chosenOutcome.positionAfter).toEqual(prepared.committedTurn.positionAfter);
  });

  it("allows unevaluated chosen moves for partial coverage", () => {
    const position = createPosition({
      points: {
        8: { player: "white", checkerCount: 1 },
        1: { player: "black", checkerCount: 1 }
      },
      borneOff: {
        white: 14,
        black: 14
      }
    });
    const dice: DiceRoll = { dice: [2, 1] };
    const withDice = setDice(createGameState(position, "white"), dice);
    if (!withDice.ok) {
      throw new Error("Expected opening pending state");
    }

    const legalMoves = getLegalMoves({ position, player: "white", roll: dice }).moves;
    const chosenMove = legalMoves[1] ?? legalMoves[0];
    if (chosenMove === undefined) {
      throw new Error("Expected legal moves for partial coverage test");
    }

    const applied = applyMove(position, "white", dice, chosenMove);
    if (!applied.ok) {
      throw new Error("Expected chosen move to apply");
    }

    const turn = createTurnRecord({
      turnNumber: 1,
      player: "white",
      dice,
      outcome: {
        kind: "move",
        move: chosenMove
      },
      positionBefore: position,
      positionAfter: applied.position,
      gameStatusAfter: getGameStatus(applied.position),
      phase: "opening"
    });

    const snapshotBeforeTurn = createOpeningPendingSnapshot({
      savedAt: "2026-07-31T09:20:00.000Z",
      gameState: withDice.state,
      whiteDie: 2,
      blackDie: 1
    });

    const snapshotAfterTurn = createSnapshot({
      savedAt: "2026-07-31T09:21:00.000Z",
      gameState: createGameState(
        applied.position,
        getGameStatus(applied.position).state === "complete" ? "white" : "black"
      ),
      turnHistory: [turn]
    });

    const sessionResult = createAnalysisSession({
      sessionId: "session-partial",
      gameSnapshot: snapshotBeforeTurn,
      metadata: SESSION_METADATA,
      createdAt: "2026-07-31T09:19:00.000Z"
    });
    if (!sessionResult.ok) {
      throw new Error(sessionResult.message);
    }

    const full = buildRankedAnalysis(position, "white", dice, "complete");
    if (full.kind !== "evaluated") {
      throw new Error("Expected evaluated full analysis");
    }

    const chosenFingerprint = getMoveFingerprint(chosenMove);
    const forcedUnevaluated = {
      ...full,
      coverage: "partial" as const,
      rankedMoves: full.rankedMoves.filter((row) => row.moveFingerprint !== chosenFingerprint),
      unevaluatedMoves: full.factualOutcomes.filter(
        (outcome) => getMoveFingerprint(outcome.move) === chosenFingerprint
      ),
      warnings: ["partial coverage fixture"] as const
    };

    const result = createAnalysisRecord({
      session: sessionResult.session,
      snapshotBeforeTurn,
      snapshotAfterTurn,
      committedTurn: turn,
      rankedAnalysis: forcedUnevaluated,
      createdAt: "2026-07-31T09:21:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.record.rankedMoveAnalysis.kind !== "evaluated") {
      return;
    }

    const chosen = result.record.chosenMove;
    expect(chosen).not.toBeNull();
    if (chosen === null) {
      return;
    }

    const chosenFingerprintInResult = getMoveFingerprint(chosen);
    expect(
      result.record.rankedMoveAnalysis.rankedMoves.some(
        (row) => row.moveFingerprint === chosenFingerprintInResult
      )
    ).toBe(false);
    expect(
      result.record.rankedMoveAnalysis.unevaluatedMoves.some(
        (outcome) => getMoveFingerprint(outcome.move) === chosenFingerprintInResult
      )
    ).toBe(true);
  });

  it("rejects mismatches across player, dice, turn number, game identity, and resulting position", () => {
    const session = createSessionFixture();
    const prepared = prepareSecondTurn();

    const wrongPlayer = {
      ...prepared.rankedAnalysis,
      player: "white" as const
    };
    const playerResult = createAnalysisRecord({
      session,
      snapshotBeforeTurn: prepared.snapshotBeforeTurn,
      snapshotAfterTurn: prepared.snapshotAfterTurn,
      committedTurn: prepared.committedTurn,
      rankedAnalysis: wrongPlayer,
      createdAt: "2026-07-31T09:24:00.000Z"
    });
    expect(playerResult.ok).toBe(false);
    if (!playerResult.ok) {
      expect(playerResult.reason).toBe("player-mismatch");
    }

    const wrongDice = {
      ...prepared.rankedAnalysis,
      dice: { dice: [6, 6] as const }
    };
    const diceResult = createAnalysisRecord({
      session,
      snapshotBeforeTurn: prepared.snapshotBeforeTurn,
      snapshotAfterTurn: prepared.snapshotAfterTurn,
      committedTurn: prepared.committedTurn,
      rankedAnalysis: wrongDice,
      createdAt: "2026-07-31T09:24:01.000Z"
    });
    expect(diceResult.ok).toBe(false);
    if (!diceResult.ok) {
      expect(diceResult.reason).toBe("dice-mismatch");
    }

    const wrongTurn = createTurnRecord({
      ...prepared.committedTurn,
      turnNumber: 3
    });
    const turnResult = createAnalysisRecord({
      session,
      snapshotBeforeTurn: prepared.snapshotBeforeTurn,
      snapshotAfterTurn: prepared.snapshotAfterTurn,
      committedTurn: wrongTurn,
      rankedAnalysis: prepared.rankedAnalysis,
      createdAt: "2026-07-31T09:24:02.000Z"
    });
    expect(turnResult.ok).toBe(false);
    if (!turnResult.ok) {
      expect(turnResult.reason).toBe("turn-number-mismatch");
    }

    const differentGamePosition = createPosition({
      points: {
        12: { player: "white", checkerCount: 1 },
        1: { player: "black", checkerCount: 1 }
      },
      borneOff: {
        white: 14,
        black: 14
      }
    });
    const otherState = setDice(createGameState(differentGamePosition, "white"), { dice: [1, 2] });
    if (!otherState.ok) {
      throw new Error("Expected other state dice assignment");
    }
    const otherSnapshot = createSnapshot({
      savedAt: "2026-07-31T09:24:03.000Z",
      gameState: otherState.state,
      turnHistory: []
    });

    const gameResult = createAnalysisRecord({
      session,
      snapshotBeforeTurn: otherSnapshot,
      snapshotAfterTurn: prepared.snapshotAfterTurn,
      committedTurn: prepared.committedTurn,
      rankedAnalysis: prepared.rankedAnalysis,
      createdAt: "2026-07-31T09:24:04.000Z"
    });
    expect(gameResult.ok).toBe(false);
    if (!gameResult.ok) {
      expect(gameResult.reason).toBe("game-mismatch");
    }

    const modifiedAfterTurn = createTurnRecord({
      ...prepared.committedTurn,
      positionAfter: createPosition({
        points: {
          4: { player: "black", checkerCount: 1 }
        },
        borneOff: {
          white: 14,
          black: 14
        }
      })
    });
    const afterResult = createAnalysisRecord({
      session,
      snapshotBeforeTurn: prepared.snapshotBeforeTurn,
      snapshotAfterTurn: prepared.snapshotAfterTurn,
      committedTurn: modifiedAfterTurn,
      rankedAnalysis: prepared.rankedAnalysis,
      createdAt: "2026-07-31T09:24:05.000Z"
    });
    expect(afterResult.ok).toBe(false);
    if (!afterResult.ok) {
      expect(afterResult.reason).toBe("resulting-position-mismatch");
    }
  });

  it("supports pass records from canonical pass turns and rejects mismatched pass/evaluated pairings", () => {
    const passPosition = createPosition({
      points: {
        24: { player: "black", checkerCount: 2 },
        23: { player: "black", checkerCount: 2 }
      },
      bar: {
        white: 1
      },
      borneOff: {
        white: 14,
        black: 11
      }
    });

    const passTurnNumber = 1;
    const passDice: DiceRoll = { dice: [2, 1] };

    const beforeState = setDice(createGameState(passPosition, "white"), passDice);
    if (!beforeState.ok) {
      throw new Error("Expected pass state dice assignment");
    }

    const passTurn = createTurnRecord({
      turnNumber: passTurnNumber,
      player: "white",
      dice: passDice,
      outcome: {
        kind: "pass"
      },
      positionBefore: passPosition,
      positionAfter: passPosition,
      gameStatusAfter: { state: "in-progress" },
      phase: "normal"
    });

    const beforeSnapshot = createOpeningPendingSnapshot({
      savedAt: "2026-07-31T09:33:00.000Z",
      gameState: beforeState.state,
      whiteDie: 2,
      blackDie: 1
    });

    const afterSnapshot = createSnapshot({
      savedAt: "2026-07-31T09:34:00.000Z",
      gameState: createGameState(passPosition, "black"),
      turnHistory: [passTurn]
    });

    const sessionResult = createAnalysisSession({
      sessionId: "session-pass",
      gameSnapshot: beforeSnapshot,
      metadata: SESSION_METADATA,
      createdAt: "2026-07-31T09:31:00.000Z"
    });
    if (!sessionResult.ok) {
      throw new Error(sessionResult.message);
    }

    const noLegalAnalysis = buildRankedAnalysis(passPosition, "white", passDice);
    const passRecordResult = createAnalysisRecord({
      session: sessionResult.session,
      snapshotBeforeTurn: beforeSnapshot,
      snapshotAfterTurn: afterSnapshot,
      committedTurn: passTurn,
      rankedAnalysis: noLegalAnalysis,
      createdAt: "2026-07-31T09:35:00.000Z"
    });

    if (!passRecordResult.ok) {
      throw new Error(`${passRecordResult.reason}: ${passRecordResult.message}`);
    }

    expect(passRecordResult.record.chosenMove).toBeNull();
    expect(passRecordResult.record.rankedMoveAnalysis.kind).toBe("no-legal-moves");

    const legalReferencePosition = createPosition({
      points: {
        8: { player: "white", checkerCount: 1 },
        1: { player: "black", checkerCount: 1 }
      },
      borneOff: {
        white: 14,
        black: 14
      }
    });

    const evaluatedSource = buildRankedAnalysis(
      legalReferencePosition,
      "white",
      passDice,
      "complete"
    );
    if (evaluatedSource.kind !== "evaluated") {
      throw new Error("Expected evaluated source analysis");
    }

    const evaluated = {
      ...evaluatedSource,
      player: "white" as const,
      dice: passDice,
      positionBefore: analyzePosition(passPosition)
    };
    const passMismatch = createAnalysisRecord({
      session: sessionResult.session,
      snapshotBeforeTurn: beforeSnapshot,
      snapshotAfterTurn: afterSnapshot,
      committedTurn: passTurn,
      rankedAnalysis: evaluated,
      createdAt: "2026-07-31T09:36:00.000Z"
    });
    expect(passMismatch.ok).toBe(false);
    if (!passMismatch.ok) {
      expect(passMismatch.reason).toBe("unsupported-turn-kind");
    }
  });
});

describe("appendAnalysisRecord", () => {
  it("appends immutably, preserves identity fields, updates updatedAt, and supports idempotent retries", () => {
    const session = createSessionFixture();
    const prepared = prepareSecondTurn();
    const recordResult = createAnalysisRecord({
      session,
      snapshotBeforeTurn: prepared.snapshotBeforeTurn,
      snapshotAfterTurn: prepared.snapshotAfterTurn,
      committedTurn: prepared.committedTurn,
      rankedAnalysis: prepared.rankedAnalysis,
      createdAt: "2026-07-31T09:40:00.000Z"
    });

    expect(recordResult.ok).toBe(true);
    if (!recordResult.ok) {
      return;
    }

    const appended = appendAnalysisRecord({
      session,
      record: recordResult.record,
      updatedAt: "2026-07-31T09:41:00.000Z"
    });

    expect(appended.ok).toBe(true);
    if (!appended.ok) {
      return;
    }

    expect(appended.idempotent).toBe(false);
    expect(appended.session.sessionId).toBe(session.sessionId);
    expect(appended.session.createdAt).toBe(session.createdAt);
    expect(appended.session.updatedAt).toBe("2026-07-31T09:41:00.000Z");
    expect(appended.session.records).toHaveLength(1);
    expect(session.records).toHaveLength(0);

    const retry = appendAnalysisRecord({
      session: appended.session,
      record: recordResult.record,
      updatedAt: "2026-07-31T09:42:00.000Z"
    });

    expect(retry.ok).toBe(true);
    if (!retry.ok) {
      return;
    }

    expect(retry.idempotent).toBe(true);
    expect(retry.session).toEqual(appended.session);

    const parsed = decodeAnalysisSession(encodeAnalysisSession(appended.session));
    expect(parsed.ok).toBe(true);
  });

  it("enforces sparse ascending order, rejects conflicting duplicates, and validates evaluator compatibility", () => {
    const session = createSessionFixture();
    const prepared = prepareSecondTurn();

    const recordResult = createAnalysisRecord({
      session,
      snapshotBeforeTurn: prepared.snapshotBeforeTurn,
      snapshotAfterTurn: prepared.snapshotAfterTurn,
      committedTurn: prepared.committedTurn,
      rankedAnalysis: prepared.rankedAnalysis,
      createdAt: "2026-07-31T09:45:00.000Z"
    });
    if (!recordResult.ok) {
      throw new Error(recordResult.message);
    }

    const firstAppend = appendAnalysisRecord({
      session,
      record: recordResult.record,
      updatedAt: "2026-07-31T09:46:00.000Z"
    });
    if (!firstAppend.ok) {
      throw new Error(firstAppend.message);
    }

    const conflicting = {
      ...recordResult.record,
      annotations: ["different"]
    };
    const conflictingResult = appendAnalysisRecord({
      session: firstAppend.session,
      record: conflicting,
      updatedAt: "2026-07-31T09:47:00.000Z"
    });

    expect(conflictingResult.ok).toBe(false);
    if (!conflictingResult.ok) {
      expect(conflictingResult.reason).toBe("conflicting-record");
    }

    const earlierTurn = {
      ...recordResult.record,
      turnNumber: 1,
      snapshotReference: {
        turnNumber: 1,
        position: "before-turn" as const
      }
    };
    const orderResult = appendAnalysisRecord({
      session: firstAppend.session,
      record: earlierTurn,
      updatedAt: "2026-07-31T09:48:00.000Z"
    });

    expect(orderResult.ok).toBe(false);
    if (!orderResult.ok) {
      expect(orderResult.reason).toBe("turn-order-invalid");
    }

    const metadataMismatchRecord = {
      ...recordResult.record,
      turnNumber: 3,
      snapshotReference: {
        turnNumber: 3,
        position: "before-turn" as const
      },
      evaluatorProvenance: {
        ...recordResult.record.evaluatorProvenance,
        provider: "different-provider"
      }
    };

    const evaluatorMismatch = appendAnalysisRecord({
      session: firstAppend.session,
      record: metadataMismatchRecord,
      updatedAt: "2026-07-31T09:49:00.000Z"
    });

    expect(evaluatorMismatch.ok).toBe(false);
    if (!evaluatorMismatch.ok) {
      expect(evaluatorMismatch.reason).toBe("invalid-record");
    }
  });
});

describe("reconcileAnalysisSession", () => {
  const buildSessionWithRecord = () => {
    const session = createSessionFixture();
    const prepared = prepareSecondTurn();
    const recordResult = createAnalysisRecord({
      session,
      snapshotBeforeTurn: prepared.snapshotBeforeTurn,
      snapshotAfterTurn: prepared.snapshotAfterTurn,
      committedTurn: prepared.committedTurn,
      rankedAnalysis: prepared.rankedAnalysis,
      createdAt: "2026-07-31T09:55:00.000Z"
    });

    if (!recordResult.ok) {
      throw new Error(recordResult.message);
    }

    const appendResult = appendAnalysisRecord({
      session,
      record: recordResult.record,
      updatedAt: "2026-07-31T09:56:00.000Z"
    });

    if (!appendResult.ok) {
      throw new Error(appendResult.message);
    }

    return {
      session: appendResult.session,
      prepared,
      record: recordResult.record
    };
  };

  it("reconciles empty and partial sessions; reports current or game-advanced deterministically", () => {
    const prepared = prepareSecondTurn();
    const empty = createSessionFixture();

    const emptyReconcile = reconcileAnalysisSession({
      session: empty,
      gameSnapshot: prepared.snapshotBeforeTurn
    });

    expect(emptyReconcile.ok).toBe(true);
    if (emptyReconcile.ok) {
      expect(emptyReconcile.status).toBe("game-advanced");
      expect(emptyReconcile.analyzedTurnCount).toBe(0);
    }

    const withRecord = buildSessionWithRecord();
    const current = reconcileAnalysisSession({
      session: withRecord.session,
      gameSnapshot: prepared.snapshotAfterTurn
    });

    expect(current.ok).toBe(true);
    if (!current.ok) {
      return;
    }

    expect(current.status).toBe("game-advanced");
    expect(current.analyzedTurnCount).toBe(1);
    expect(current.committedTurnCount).toBe(2);

    const sparseCurrentSnapshot: GameSnapshot = {
      ...prepared.snapshotAfterTurn,
      turnHistory: [
        prepared.snapshotAfterTurn.turnHistory[0]!,
        prepared.snapshotAfterTurn.turnHistory[1]!
      ]
    };

    const deterministicAgain = reconcileAnalysisSession({
      session: withRecord.session,
      gameSnapshot: sparseCurrentSnapshot
    });
    expect(deterministicAgain).toEqual(current);
  });

  it("fails closed on game mismatch, missing turn, committed move mismatch, and position mismatches", () => {
    const withRecord = buildSessionWithRecord();

    const mismatchGame = reconcileAnalysisSession({
      session: withRecord.session,
      gameSnapshot: {
        ...withRecord.prepared.snapshotAfterTurn,
        turnHistory: []
      }
    });

    expect(mismatchGame.ok).toBe(false);

    const missingTurn = reconcileAnalysisSession({
      session: withRecord.session,
      gameSnapshot: {
        ...withRecord.prepared.snapshotAfterTurn,
        turnHistory: [withRecord.prepared.snapshotAfterTurn.turnHistory[0]!],
        gameState: createGameState(
          withRecord.prepared.snapshotAfterTurn.turnHistory[0]!.positionAfter,
          withRecord.prepared.snapshotAfterTurn.turnHistory[0]!.player === "white"
            ? "black"
            : "white"
        )
      }
    });

    expect(missingTurn.ok).toBe(false);
    if (!missingTurn.ok) {
      expect(missingTurn.reason).toBe("missing-committed-turn");
    }

    if (withRecord.prepared.committedTurn.outcome.kind !== "move") {
      throw new Error("Expected move outcome fixture");
    }

    const changedMoveTurn = createTurnRecord({
      ...withRecord.prepared.committedTurn,
      outcome: {
        kind: "move",
        move: {
          ...withRecord.prepared.committedTurn.outcome.move,
          steps: withRecord.prepared.committedTurn.outcome.move.steps.map((step, index) =>
            index === 0 && step.toPoint !== "off"
              ? {
                  ...step,
                  toPoint: ((step.toPoint as number) + 1) as 1
                }
              : step
          )
        }
      }
    });

    const moveMismatchSnapshot = {
      ...withRecord.prepared.snapshotAfterTurn,
      turnHistory: [withRecord.prepared.snapshotAfterTurn.turnHistory[0]!, changedMoveTurn]
    };

    const moveMismatch = reconcileAnalysisSession({
      session: withRecord.session,
      gameSnapshot: moveMismatchSnapshot
    });

    expect(moveMismatch.ok).toBe(false);

    const positionMismatchTurn = createTurnRecord({
      ...withRecord.prepared.committedTurn,
      positionAfter: createPosition({
        points: {
          11: { player: "black", checkerCount: 1 }
        },
        borneOff: {
          white: 14,
          black: 14
        }
      })
    });

    const positionMismatch = reconcileAnalysisSession({
      session: withRecord.session,
      gameSnapshot: {
        ...withRecord.prepared.snapshotAfterTurn,
        turnHistory: [withRecord.prepared.snapshotAfterTurn.turnHistory[0]!, positionMismatchTurn]
      }
    });

    expect(positionMismatch.ok).toBe(false);
    if (!positionMismatch.ok) {
      expect(
        [
          "post-turn-position-mismatch",
          "committed-move-mismatch",
          "record-turn-invalid",
          "invalid-game-snapshot"
        ].includes(positionMismatch.reason)
      ).toBe(true);
    }
  });

  it("does not mutate session or snapshot inputs", () => {
    const withRecord = buildSessionWithRecord();
    const sessionCopy = structuredClone(withRecord.session);
    const snapshotCopy = structuredClone(withRecord.prepared.snapshotAfterTurn);

    const result = reconcileAnalysisSession({
      session: withRecord.session,
      gameSnapshot: withRecord.prepared.snapshotAfterTurn
    });

    expect(withRecord.session).toEqual(sessionCopy);
    expect(withRecord.prepared.snapshotAfterTurn).toEqual(snapshotCopy);
    expect(result.ok).toBe(true);
  });
});

describe("parser and summary compatibility", () => {
  const createPopulatedSession = (): AnalysisSession => {
    const session = createSessionFixture();
    const prepared = prepareSecondTurn();

    const recordResult = createAnalysisRecord({
      session,
      snapshotBeforeTurn: prepared.snapshotBeforeTurn,
      snapshotAfterTurn: prepared.snapshotAfterTurn,
      committedTurn: prepared.committedTurn,
      rankedAnalysis: prepared.rankedAnalysis,
      createdAt: "2026-07-31T10:05:00.000Z"
    });

    if (!recordResult.ok) {
      throw new Error(recordResult.message);
    }

    const appendResult = appendAnalysisRecord({
      session,
      record: recordResult.record,
      updatedAt: "2026-07-31T10:06:00.000Z"
    });

    if (!appendResult.ok) {
      throw new Error(appendResult.message);
    }

    return appendResult.session;
  };

  it("parses builder-produced sessions, enforces sparse order, and keeps deterministic encoding", () => {
    const session = createPopulatedSession();

    const parsed = parseAnalysisSession(serializeAnalysisSession(session));
    expect(parsed.ok).toBe(true);

    const textA = encodeAnalysisSession(session);
    const textB = encodeAnalysisSession(session);
    expect(textA).toBe(textB);

    const sparseOrdered = {
      ...serializeAnalysisSession(session),
      records: [
        {
          ...session.records[0]!,
          turnNumber: 2,
          snapshotReference: {
            turnNumber: 2,
            position: "before-turn" as const
          }
        },
        {
          ...session.records[0]!,
          turnNumber: 5,
          snapshotReference: {
            turnNumber: 5,
            position: "before-turn" as const
          },
          positionHash: "decision-position-v1:custom"
        }
      ]
    };

    const sparseResult = parseAnalysisSession(sparseOrdered);
    expect(sparseResult.ok).toBe(true);

    const outOfOrder = {
      ...sparseOrdered,
      records: [sparseOrdered.records[1]!, sparseOrdered.records[0]!]
    };

    const outOfOrderResult = parseAnalysisSession(outOfOrder);
    expect(outOfOrderResult.ok).toBe(false);
  });

  it("rejects corrupted chosen move, position hash, and game reference", () => {
    const session = createPopulatedSession();
    const serialized = serializeAnalysisSession(session);

    const chosenCorrupt = {
      ...serialized,
      records: [
        {
          ...serialized.records[0]!,
          chosenMove: {
            ...serialized.records[0]!.chosenMove!,
            steps: [
              {
                ...serialized.records[0]!.chosenMove!.steps[0],
                dieIndex: 3
              },
              ...serialized.records[0]!.chosenMove!.steps.slice(1)
            ]
          }
        }
      ]
    };

    const chosenResult = parseAnalysisSession(chosenCorrupt);
    expect(chosenResult.ok).toBe(false);

    const hashCorrupt = {
      ...serialized,
      records: [
        {
          ...serialized.records[0]!,
          positionHash: ""
        }
      ]
    };
    const hashResult = parseAnalysisSession(hashCorrupt);
    expect(hashResult.ok).toBe(false);

    const gameReferenceCorrupt = {
      ...serialized,
      gameSnapshotReference: {
        ...serialized.gameSnapshotReference,
        gameReference: ""
      }
    };
    const gameReferenceResult = parseAnalysisSession(gameReferenceCorrupt);
    expect(gameReferenceResult.ok).toBe(false);
  });

  it("summarizes factual counts for coverage and chosen move evaluation", () => {
    const summary: AnalysisSummary = summarizeAnalysisSession(createPopulatedSession());

    expect(summary.format).toBe(ANALYSIS_SESSION_FORMAT);
    expect(summary.version).toBe(ANALYSIS_SESSION_VERSION);
    expect(summary.recordCount).toBe(1);
    expect(summary.analyzedTurnNumbers).toEqual([2]);
    expect(summary.firstTurnNumber).toBe(2);
    expect(summary.lastTurnNumber).toBe(2);
    expect(
      summary.completeCoverageCount + summary.partialCoverageCount + summary.noLegalMovesCount
    ).toBe(1);
    expect(summary.evaluatedChosenMoves + summary.unevaluatedChosenMoves).toBe(1);
  });
});
