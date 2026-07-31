import { describe, expect, it } from "vitest";
import {
  analyzeLegalMoveOutcomes,
  getMoveFingerprint,
  type RankedLegalMoveAnalysis
} from "@backgammon-trainer/backgammon-analysis";
import {
  appendAnalysisRecord,
  createAnalysisSession,
  decodeAnalysisSession,
  encodeAnalysisSession,
  type AnalysisSession
} from "@backgammon-trainer/backgammon-analysis-session";
import {
  applyMove,
  createGameState,
  createTurnRecord,
  getGameStatus,
  getLegalMoves,
  setDice,
  type DiceRoll,
  type GameSnapshot,
  type TurnRecord
} from "@backgammon-trainer/backgammon-engine";
import type { BoardPosition } from "@backgammon-trainer/backgammon-domain";

import {
  captureCommittedTurnAnalysis,
  createFixtureAnalysisSessionMetadata,
  createPendingDecisionAnalysis,
  getAnalysisDecisionKey,
  type FixtureAnalysisSessionMetadataConfig,
  type PendingDecisionAnalysis
} from "./analysisCapture";

const createEmptyPoints = (): BoardPosition["points"] => ({
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
  points?: Partial<BoardPosition["points"]>;
  bar?: Partial<BoardPosition["bar"]>;
  borneOff?: Partial<BoardPosition["borneOff"]>;
}): BoardPosition => ({
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
    openingTurnPending: input.turnHistory.length === 0
  }
});

const METADATA_CONFIG: FixtureAnalysisSessionMetadataConfig = {
  analysisFormat: "ranked-legal-move-analysis",
  analysisVersion: 1,
  generatorVersion: "test-generator/1.0.0",
  evaluatorProvider: "fixture-position-evaluator",
  evaluatorVersion: "0.1.0",
  scoreScale: {
    kind: "relative"
  }
};

const buildEvaluatedAnalysis = (
  position: BoardPosition,
  player: "white" | "black",
  dice: DiceRoll,
  coverage: "complete" | "partial" = "complete"
): RankedLegalMoveAnalysis => {
  const factual = analyzeLegalMoveOutcomes(position, player, dice);
  if (!factual.ok) {
    throw new Error("Expected factual analysis");
  }

  const outcomes = factual.analysis.outcomes;
  const scoredOutcomes = coverage === "complete" ? outcomes : outcomes.slice(0, 1);

  const rankedMoves = scoredOutcomes.map((outcome, index) => ({
    rank: index + 1,
    normalizedScore: scoredOutcomes.length - index,
    lossFromBest: index,
    moveFingerprint: getMoveFingerprint(outcome.move),
    outcome
  }));

  const scoredFingerprints = new Set(rankedMoves.map((row) => row.moveFingerprint));

  return {
    kind: "evaluated",
    player,
    dice,
    positionBefore: factual.analysis.positionBefore,
    factualOutcomes: outcomes,
    scoreScale: {
      kind: "relative"
    },
    provenance: {
      provider: "fixture-position-evaluator",
      providerVersion: "0.1.0",
      adapterVersion: "0.1.0",
      settings: {
        mode: "complete"
      }
    },
    coverage,
    rankedMoves,
    unevaluatedMoves: outcomes.filter(
      (outcome) => !scoredFingerprints.has(getMoveFingerprint(outcome.move))
    ),
    warnings: []
  };
};

const createTurnFixture = (): {
  session: AnalysisSession;
  snapshotBeforeTurn: GameSnapshot;
  snapshotAfterTurn: GameSnapshot;
  committedTurn: TurnRecord;
  rankedAnalysis: RankedLegalMoveAnalysis;
  pendingDecision: PendingDecisionAnalysis;
} => {
  const startPosition = createPosition({
    points: {
      8: { player: "white", checkerCount: 1 },
      1: { player: "black", checkerCount: 1 }
    },
    borneOff: {
      white: 14,
      black: 14
    }
  });

  const baseState = createGameState(startPosition, "white");
  const withDice = setDice(baseState, { dice: [6, 1] });
  if (!withDice.ok) {
    throw new Error("Expected setDice success");
  }

  const move = getLegalMoves({
    position: withDice.state.position,
    player: "white",
    roll: { dice: [6, 1] }
  }).moves[0];

  if (move === undefined) {
    throw new Error("Expected one legal move");
  }

  const applied = applyMove(withDice.state.position, "white", { dice: [6, 1] }, move);
  if (!applied.ok) {
    throw new Error("Expected applyMove success");
  }

  const committedTurn = createTurnRecord({
    turnNumber: 1,
    player: "white",
    dice: { dice: [6, 1] },
    outcome: {
      kind: "move",
      move
    },
    positionBefore: withDice.state.position,
    positionAfter: applied.position,
    gameStatusAfter: getGameStatus(applied.position),
    phase: "opening"
  });

  const snapshotBeforeTurn = createSnapshot({
    savedAt: "2026-07-31T10:30:00.000Z",
    gameState: withDice.state,
    turnHistory: []
  });

  const snapshotAfterTurn = createSnapshot({
    savedAt: "2026-07-31T10:31:00.000Z",
    gameState: createGameState(applied.position, "black"),
    turnHistory: [committedTurn]
  });

  const createdSession = createAnalysisSession({
    sessionId: "session-001",
    gameSnapshot: snapshotBeforeTurn,
    metadata: createFixtureAnalysisSessionMetadata(METADATA_CONFIG, "2026-07-31T10:29:00.000Z"),
    createdAt: "2026-07-31T10:29:00.000Z"
  });

  if (!createdSession.ok) {
    throw new Error(createdSession.message);
  }

  const rankedAnalysis = buildEvaluatedAnalysis(withDice.state.position, "white", { dice: [6, 1] });
  const decisionKey = getAnalysisDecisionKey({
    gameReference: createdSession.session.gameSnapshotReference.gameReference,
    turnNumber: 1,
    position: withDice.state.position,
    player: "white",
    dice: { dice: [6, 1] }
  });

  return {
    session: createdSession.session,
    snapshotBeforeTurn,
    snapshotAfterTurn,
    committedTurn,
    rankedAnalysis,
    pendingDecision: createPendingDecisionAnalysis({
      decisionKey,
      gameReference: createdSession.session.gameSnapshotReference.gameReference,
      turnNumber: 1,
      snapshotBeforeTurn,
      player: "white",
      dice: { dice: [6, 1] },
      rankedAnalysis,
      evaluatorRequestId: 1
    })
  };
};

describe("getAnalysisDecisionKey", () => {
  it("is deterministic for equivalent decision state", () => {
    const fixture = createTurnFixture();

    const keyOne = getAnalysisDecisionKey({
      gameReference: fixture.session.gameSnapshotReference.gameReference,
      turnNumber: 1,
      position: fixture.snapshotBeforeTurn.gameState.position,
      player: "white",
      dice: { dice: [6, 1] }
    });

    const keyTwo = getAnalysisDecisionKey({
      gameReference: fixture.session.gameSnapshotReference.gameReference,
      turnNumber: 1,
      position: structuredClone(fixture.snapshotBeforeTurn.gameState.position),
      player: "white",
      dice: { dice: [6, 1] }
    });

    expect(keyOne).toBe(keyTwo);
  });

  it("changes when game reference, turn number, position, player, or dice changes", () => {
    const fixture = createTurnFixture();

    const base = getAnalysisDecisionKey({
      gameReference: fixture.session.gameSnapshotReference.gameReference,
      turnNumber: 1,
      position: fixture.snapshotBeforeTurn.gameState.position,
      player: "white",
      dice: { dice: [6, 1] }
    });

    const differentGame = getAnalysisDecisionKey({
      gameReference: `${fixture.session.gameSnapshotReference.gameReference}-other`,
      turnNumber: 1,
      position: fixture.snapshotBeforeTurn.gameState.position,
      player: "white",
      dice: { dice: [6, 1] }
    });

    const differentTurn = getAnalysisDecisionKey({
      gameReference: fixture.session.gameSnapshotReference.gameReference,
      turnNumber: 2,
      position: fixture.snapshotBeforeTurn.gameState.position,
      player: "white",
      dice: { dice: [6, 1] }
    });

    const differentPosition = getAnalysisDecisionKey({
      gameReference: fixture.session.gameSnapshotReference.gameReference,
      turnNumber: 1,
      position: {
        ...fixture.snapshotBeforeTurn.gameState.position,
        bar: {
          ...fixture.snapshotBeforeTurn.gameState.position.bar,
          white: 1
        }
      },
      player: "white",
      dice: { dice: [6, 1] }
    });

    const differentPlayer = getAnalysisDecisionKey({
      gameReference: fixture.session.gameSnapshotReference.gameReference,
      turnNumber: 1,
      position: fixture.snapshotBeforeTurn.gameState.position,
      player: "black",
      dice: { dice: [6, 1] }
    });

    const differentDice = getAnalysisDecisionKey({
      gameReference: fixture.session.gameSnapshotReference.gameReference,
      turnNumber: 1,
      position: fixture.snapshotBeforeTurn.gameState.position,
      player: "white",
      dice: { dice: [1, 6] }
    });

    expect(base).not.toBe(differentGame);
    expect(base).not.toBe(differentTurn);
    expect(base).not.toBe(differentPosition);
    expect(base).not.toBe(differentPlayer);
    expect(base).not.toBe(differentDice);
  });
});

describe("captureCommittedTurnAnalysis", () => {
  it("returns sparse-session no-op when pending analysis is absent", () => {
    const fixture = createTurnFixture();

    const result = captureCommittedTurnAnalysis({
      session: fixture.session,
      pendingDecision: null,
      snapshotBeforeTurn: fixture.snapshotBeforeTurn,
      snapshotAfterTurn: fixture.snapshotAfterTurn,
      committedTurn: fixture.committedTurn,
      updatedAt: "2026-07-31T10:31:30.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.captured).toBe(false);
    if (!result.captured) {
      expect(result.reason).toBe("no-pending-analysis");
    }
  });

  it("captures one record when pending analysis matches committed turn context", () => {
    const fixture = createTurnFixture();

    const result = captureCommittedTurnAnalysis({
      session: fixture.session,
      pendingDecision: fixture.pendingDecision,
      snapshotBeforeTurn: fixture.snapshotBeforeTurn,
      snapshotAfterTurn: fixture.snapshotAfterTurn,
      committedTurn: fixture.committedTurn,
      updatedAt: "2026-07-31T10:31:30.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.captured).toBe(true);
    if (result.captured) {
      expect(result.session.records).toHaveLength(1);
      expect(result.record.turnNumber).toBe(1);
      expect(result.record.player).toBe("white");
      expect(result.record.rankedMoveAnalysis.kind).toBe("evaluated");
      expect(result.record.chosenMove).not.toBeNull();
    }
  });

  it("rejects stale decision-key mismatches without mutating the session", () => {
    const fixture = createTurnFixture();

    const stalePending = {
      ...fixture.pendingDecision,
      decisionKey: "analysis-decision-v1|stale"
    };

    const result = captureCommittedTurnAnalysis({
      session: fixture.session,
      pendingDecision: stalePending,
      snapshotBeforeTurn: fixture.snapshotBeforeTurn,
      snapshotAfterTurn: fixture.snapshotAfterTurn,
      committedTurn: fixture.committedTurn,
      updatedAt: "2026-07-31T10:31:30.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.captured).toBe(false);
    if (!result.captured) {
      expect(result.reason).toBe("stale-decision");
      expect(result.session.records).toHaveLength(0);
    }
  });

  it("rejects mismatched game references and preserves prior valid records", () => {
    const fixture = createTurnFixture();

    const firstCapture = captureCommittedTurnAnalysis({
      session: fixture.session,
      pendingDecision: fixture.pendingDecision,
      snapshotBeforeTurn: fixture.snapshotBeforeTurn,
      snapshotAfterTurn: fixture.snapshotAfterTurn,
      committedTurn: fixture.committedTurn,
      updatedAt: "2026-07-31T10:31:30.000Z"
    });

    expect(firstCapture.ok).toBe(true);
    if (!firstCapture.ok || !firstCapture.captured) {
      return;
    }

    const badPending = {
      ...fixture.pendingDecision,
      gameReference: `${fixture.pendingDecision.gameReference}-bad`
    };

    const secondCapture = captureCommittedTurnAnalysis({
      session: firstCapture.session,
      pendingDecision: badPending,
      snapshotBeforeTurn: fixture.snapshotBeforeTurn,
      snapshotAfterTurn: fixture.snapshotAfterTurn,
      committedTurn: fixture.committedTurn,
      updatedAt: "2026-07-31T10:31:35.000Z"
    });

    expect(secondCapture.ok).toBe(false);
    if (secondCapture.ok) {
      return;
    }

    expect(secondCapture.reason).toBe("game-reference-mismatch");
    expect(secondCapture.session?.records).toHaveLength(1);
  });

  it("is idempotent for exact duplicate append attempts", () => {
    const fixture = createTurnFixture();

    const captured = captureCommittedTurnAnalysis({
      session: fixture.session,
      pendingDecision: fixture.pendingDecision,
      snapshotBeforeTurn: fixture.snapshotBeforeTurn,
      snapshotAfterTurn: fixture.snapshotAfterTurn,
      committedTurn: fixture.committedTurn,
      updatedAt: "2026-07-31T10:31:30.000Z"
    });

    expect(captured.ok).toBe(true);
    if (!captured.ok || !captured.captured) {
      return;
    }

    const duplicateAppend = appendAnalysisRecord({
      session: captured.session,
      record: captured.record,
      updatedAt: "2026-07-31T10:31:30.000Z"
    });

    expect(duplicateAppend.ok).toBe(true);
    if (!duplicateAppend.ok) {
      return;
    }

    expect(duplicateAppend.idempotent).toBe(true);
    expect(duplicateAppend.session.records).toHaveLength(1);
  });

  it("round-trips captured sessions through encode/decode", () => {
    const fixture = createTurnFixture();

    const captured = captureCommittedTurnAnalysis({
      session: fixture.session,
      pendingDecision: fixture.pendingDecision,
      snapshotBeforeTurn: fixture.snapshotBeforeTurn,
      snapshotAfterTurn: fixture.snapshotAfterTurn,
      committedTurn: fixture.committedTurn,
      updatedAt: "2026-07-31T10:31:30.000Z"
    });

    expect(captured.ok).toBe(true);
    if (!captured.ok || !captured.captured) {
      return;
    }

    const decoded = decodeAnalysisSession(encodeAnalysisSession(captured.session));
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      return;
    }

    expect(decoded.session.records).toHaveLength(1);
    expect(decoded.session.records[0]?.turnNumber).toBe(1);
  });
});
