import {
  analyzePosition,
  getMoveFingerprint,
  type EvaluationScoreScale,
  type EvaluatorProvenance,
  type JsonValue,
  type LegalMoveOutcome,
  type RankedLegalMoveAnalysis
} from "@backgammon-trainer/backgammon-analysis";
import {
  parseGameSnapshot,
  serializeGameSnapshot,
  type DiceRoll,
  type GameSnapshot,
  type Move,
  type TurnRecord
} from "@backgammon-trainer/backgammon-engine";

type Player = "white" | "black";

export const ANALYSIS_SESSION_FORMAT = "backgammon-trainer-analysis-session";
export const ANALYSIS_SESSION_VERSION = 1;

export interface AnalysisMetadata {
  readonly analysisFormat: string;
  readonly analysisVersion: number;
  readonly generatorVersion: string;
  readonly evaluatorProvider: string;
  readonly evaluatorVersion: string;
  readonly scoreScale: EvaluationScoreScale;
  readonly createdAt: string;
}

export interface AnalysisSessionGameSnapshotReference {
  readonly snapshotFormat: string;
  readonly snapshotVersion: number;
  readonly savedAt: string;
  readonly gameReference: string;
}

export interface AnalysisRecordSnapshotReference {
  readonly turnNumber: number;
  readonly position: "before-turn" | "after-turn";
}

export interface AnalysisRecord {
  readonly turnNumber: number;
  readonly player: Player;
  readonly positionHash: string;
  readonly snapshotReference: AnalysisRecordSnapshotReference;
  readonly evaluatorProvenance: EvaluatorProvenance;
  readonly rankedMoveAnalysis: RankedLegalMoveAnalysis;
  readonly chosenMove: Move | null;
  readonly annotations?: readonly string[];
  readonly tags?: readonly string[];
}

export interface AnalysisSession {
  readonly sessionId: string;
  readonly format: typeof ANALYSIS_SESSION_FORMAT;
  readonly version: typeof ANALYSIS_SESSION_VERSION;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata: AnalysisMetadata;
  readonly gameSnapshotReference: AnalysisSessionGameSnapshotReference;
  readonly records: readonly AnalysisRecord[];
}

export interface AnalysisSummary {
  readonly sessionId: string;
  readonly format: string;
  readonly version: number;
  readonly recordCount: number;
  readonly analyzedTurnNumbers: readonly number[];
  readonly firstTurnNumber: number | null;
  readonly lastTurnNumber: number | null;
  readonly evaluatorProvider: string;
  readonly evaluatorVersion: string;
  readonly completeCoverageCount: number;
  readonly partialCoverageCount: number;
  readonly noLegalMovesCount: number;
  readonly taggedRecordCount: number;
  readonly evaluatedChosenMoves: number;
  readonly unevaluatedChosenMoves: number;
}

export type CreateAnalysisSessionFailureReason =
  | "invalid-session-metadata"
  | "invalid-game-snapshot"
  | "invalid-game-reference"
  | "invalid-timestamp";

export type CreateAnalysisSessionResult =
  | {
      readonly ok: true;
      readonly session: AnalysisSession;
    }
  | {
      readonly ok: false;
      readonly reason: CreateAnalysisSessionFailureReason;
      readonly message: string;
    };

export type CreateAnalysisRecordFailureReason =
  | "invalid-session"
  | "invalid-ranked-analysis"
  | "invalid-turn-record"
  | "game-mismatch"
  | "turn-number-mismatch"
  | "player-mismatch"
  | "dice-mismatch"
  | "position-mismatch"
  | "resulting-position-mismatch"
  | "chosen-move-not-legal"
  | "chosen-move-fingerprint-mismatch"
  | "evaluator-mismatch"
  | "unsupported-turn-kind"
  | "invalid-timestamp"
  | "invalid-annotations"
  | "invalid-tags";

export type CreateAnalysisRecordResult =
  | {
      readonly ok: true;
      readonly record: AnalysisRecord;
    }
  | {
      readonly ok: false;
      readonly reason: CreateAnalysisRecordFailureReason;
      readonly message: string;
    };

export type AppendAnalysisRecordFailureReason =
  | "invalid-session"
  | "invalid-record"
  | "game-mismatch"
  | "duplicate-turn"
  | "conflicting-record"
  | "turn-order-invalid"
  | "evaluator-mismatch"
  | "timestamp-invalid";

export type AppendAnalysisRecordResult =
  | {
      readonly ok: true;
      readonly session: AnalysisSession;
      readonly idempotent: boolean;
    }
  | {
      readonly ok: false;
      readonly reason: AppendAnalysisRecordFailureReason;
      readonly message: string;
    };

export type ReconcileAnalysisSessionFailureReason =
  | "invalid-session"
  | "invalid-game-snapshot"
  | "game-mismatch"
  | "missing-committed-turn"
  | "committed-move-mismatch"
  | "pre-turn-position-mismatch"
  | "post-turn-position-mismatch"
  | "record-turn-invalid";

export type ReconcileAnalysisSessionResult =
  | {
      readonly ok: true;
      readonly status: "current" | "game-advanced";
      readonly session: AnalysisSession;
      readonly analyzedTurnCount: number;
      readonly committedTurnCount: number;
    }
  | {
      readonly ok: false;
      readonly reason: ReconcileAnalysisSessionFailureReason;
      readonly message: string;
      readonly turnNumber?: number;
    };

export interface CreateAnalysisSessionInput {
  readonly sessionId: string;
  readonly gameSnapshot: GameSnapshot;
  readonly metadata: AnalysisMetadata;
  readonly createdAt: string;
  readonly gameReference?: string;
}

export interface CreateAnalysisRecordInput {
  readonly session: AnalysisSession;
  readonly snapshotBeforeTurn: GameSnapshot;
  readonly snapshotAfterTurn: GameSnapshot;
  readonly committedTurn: TurnRecord;
  readonly rankedAnalysis: RankedLegalMoveAnalysis;
  readonly createdAt: string;
  readonly annotations?: readonly string[];
  readonly tags?: readonly string[];
}

export interface AppendAnalysisRecordInput {
  readonly session: AnalysisSession;
  readonly record: AnalysisRecord;
  readonly updatedAt: string;
}

export interface ReconcileAnalysisSessionInput {
  readonly session: AnalysisSession;
  readonly gameSnapshot: GameSnapshot;
}

export type ParseAnalysisSessionFailureReason =
  | "invalid-json"
  | "wrong-format"
  | "unsupported-version"
  | "invalid-structure"
  | "invalid-domain-state";

export type ParseAnalysisSessionResult =
  | {
      readonly ok: true;
      readonly session: AnalysisSession;
    }
  | {
      readonly ok: false;
      readonly reason: ParseAnalysisSessionFailureReason;
      readonly message: string;
    };

export interface SerializedAnalysisSessionV1 {
  readonly format: typeof ANALYSIS_SESSION_FORMAT;
  readonly version: typeof ANALYSIS_SESSION_VERSION;
  readonly sessionId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata: AnalysisMetadata;
  readonly gameSnapshotReference: AnalysisSessionGameSnapshotReference;
  readonly records: readonly AnalysisRecord[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isIsoTimestampString = (value: unknown): value is string => {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
};

const isPlayer = (value: unknown): value is Player => {
  return value === "white" || value === "black";
};

const isPointIndex = (value: unknown): value is number => {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 24;
};

const isPositiveInteger = (value: unknown): value is number => {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
};

const isNonNegativeInteger = (value: unknown): value is number => {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
};

const isJsonSafeValue = (value: unknown): value is JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isJsonSafeValue(entry));
  }

  if (!isRecord(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    return false;
  }

  return Object.values(value).every((entry) => isJsonSafeValue(entry));
};

const canonicalizeJsonValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    const arrayValue = value as readonly JsonValue[];
    return arrayValue.map((item: JsonValue) => canonicalizeJsonValue(item));
  }

  if (value !== null && typeof value === "object") {
    const objectValue = value as Record<string, JsonValue>;
    const keys = Object.keys(objectValue).sort((left, right) => left.localeCompare(right));
    const result: Record<string, JsonValue> = {};
    for (const key of keys) {
      result[key] = canonicalizeJsonValue(objectValue[key]!);
    }
    return result;
  }

  return value;
};

const toCanonicalJsonText = (value: JsonValue): string => {
  return JSON.stringify(canonicalizeJsonValue(value));
};

const isValidScoreScale = (scale: unknown): scale is EvaluationScoreScale => {
  if (!isRecord(scale) || !isNonEmptyString(scale.kind)) {
    return false;
  }

  if (scale.kind === "relative") {
    return true;
  }

  if (scale.kind === "equity") {
    return scale.unit === "points";
  }

  if (scale.kind === "probability") {
    return (
      Array.isArray(scale.range) &&
      scale.range.length === 2 &&
      scale.range[0] === 0 &&
      scale.range[1] === 1
    );
  }

  return false;
};

const cloneScoreScale = (scale: EvaluationScoreScale): EvaluationScoreScale => {
  if (scale.kind === "relative") {
    return { kind: "relative" };
  }

  if (scale.kind === "equity") {
    return {
      kind: "equity",
      unit: "points"
    };
  }

  return {
    kind: "probability",
    range: [0, 1]
  };
};

const isValidProvenance = (value: unknown): value is EvaluatorProvenance => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.provider) &&
    isNonEmptyString(value.providerVersion) &&
    isNonEmptyString(value.adapterVersion) &&
    isRecord(value.settings) &&
    isJsonSafeValue(value.settings)
  );
};

const cloneProvenance = (provenance: EvaluatorProvenance): EvaluatorProvenance => {
  return {
    provider: provenance.provider,
    providerVersion: provenance.providerVersion,
    adapterVersion: provenance.adapterVersion,
    settings: structuredClone(provenance.settings)
  };
};

const sameProvenance = (left: EvaluatorProvenance, right: EvaluatorProvenance): boolean => {
  return (
    left.provider === right.provider &&
    left.providerVersion === right.providerVersion &&
    left.adapterVersion === right.adapterVersion &&
    toCanonicalJsonText(left.settings) === toCanonicalJsonText(right.settings)
  );
};

const cloneMove = (move: Move): Move => {
  return {
    player: move.player,
    steps: move.steps.map((step) => ({
      kind: step.kind,
      fromPoint: step.fromPoint,
      toPoint: step.toPoint,
      dieValue: step.dieValue,
      dieIndex: step.dieIndex,
      hitsBlot: step.hitsBlot,
      ...(step.hit === undefined
        ? {}
        : {
            hit: {
              player: step.hit.player,
              point: step.hit.point
            }
          })
    }))
  };
};

const cloneLegalMoveOutcome = (outcome: LegalMoveOutcome): LegalMoveOutcome => {
  return {
    move: cloneMove(outcome.move),
    positionAfter: structuredClone(outcome.positionAfter),
    analysisAfter: structuredClone(outcome.analysisAfter),
    featureDelta: structuredClone(outcome.featureDelta)
  };
};

const cloneDice = (dice: DiceRoll): DiceRoll => {
  return {
    dice: [dice.dice[0], dice.dice[1]]
  };
};

const cloneRankedLegalMoveAnalysis = (
  analysis: RankedLegalMoveAnalysis
): RankedLegalMoveAnalysis => {
  if (analysis.kind === "no-legal-moves") {
    return {
      kind: "no-legal-moves",
      player: analysis.player,
      dice: { dice: [analysis.dice.dice[0], analysis.dice.dice[1]] },
      positionBefore: structuredClone(analysis.positionBefore),
      factualOutcomes: [],
      coverage: "complete",
      rankedMoves: [],
      unevaluatedMoves: [],
      warnings: []
    };
  }

  return {
    kind: "evaluated",
    player: analysis.player,
    dice: { dice: [analysis.dice.dice[0], analysis.dice.dice[1]] },
    positionBefore: structuredClone(analysis.positionBefore),
    factualOutcomes: analysis.factualOutcomes.map((outcome) => cloneLegalMoveOutcome(outcome)),
    scoreScale: cloneScoreScale(analysis.scoreScale),
    provenance: cloneProvenance(analysis.provenance),
    coverage: analysis.coverage,
    rankedMoves: analysis.rankedMoves.map((entry) => ({
      rank: entry.rank,
      normalizedScore: entry.normalizedScore,
      lossFromBest: entry.lossFromBest,
      moveFingerprint: entry.moveFingerprint,
      ...(entry.providerRank === undefined ? {} : { providerRank: entry.providerRank }),
      outcome: cloneLegalMoveOutcome(entry.outcome)
    })),
    unevaluatedMoves: analysis.unevaluatedMoves.map((outcome) => cloneLegalMoveOutcome(outcome)),
    warnings: [...analysis.warnings]
  };
};

const failParse = (
  reason: ParseAnalysisSessionFailureReason,
  message: string
): ParseAnalysisSessionResult => {
  return {
    ok: false,
    reason,
    message
  };
};

const isValidMoveStep = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.kind !== "point-to-point" &&
    value.kind !== "enter-from-bar" &&
    value.kind !== "bear-off"
  ) {
    return false;
  }

  const dieValue = value.dieValue;
  if (typeof dieValue !== "number" || !Number.isInteger(dieValue) || dieValue < 1 || dieValue > 6) {
    return false;
  }

  const dieIndex = value.dieIndex;
  if (typeof dieIndex !== "number" || !Number.isInteger(dieIndex) || dieIndex < 0 || dieIndex > 3) {
    return false;
  }

  if (typeof value.hitsBlot !== "boolean") {
    return false;
  }

  if (value.kind === "enter-from-bar") {
    if (value.fromPoint !== "bar" || !isPointIndex(value.toPoint)) {
      return false;
    }
  }

  if (value.kind === "point-to-point") {
    if (!isPointIndex(value.fromPoint) || !isPointIndex(value.toPoint)) {
      return false;
    }
  }

  if (value.kind === "bear-off") {
    if (!isPointIndex(value.fromPoint) || value.toPoint !== "off") {
      return false;
    }
  }

  if (value.hit !== undefined) {
    if (!value.hitsBlot || !isRecord(value.hit)) {
      return false;
    }

    if (!isPlayer(value.hit.player) || !isPointIndex(value.hit.point)) {
      return false;
    }
  }

  if (value.hitsBlot && value.hit === undefined) {
    return false;
  }

  return true;
};

const isValidMove = (value: unknown): value is Move => {
  if (!isRecord(value) || !isPlayer(value.player) || !Array.isArray(value.steps)) {
    return false;
  }

  if (value.steps.length === 0) {
    return false;
  }

  return value.steps.every((step) => isValidMoveStep(step));
};

const isStringArray = (value: unknown): value is readonly string[] => {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
};

const sanitizeLabelList = (
  input: readonly string[] | undefined,
  label: "annotations" | "tags"
): { ok: true; value: readonly string[] | undefined } | { ok: false; message: string } => {
  if (input === undefined) {
    return {
      ok: true,
      value: undefined
    };
  }

  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return {
        ok: false,
        message: `${label} must not contain empty values.`
      };
    }

    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }

  return {
    ok: true,
    value: result
  };
};

const isCanonicalLabelList = (value: readonly string[]): boolean => {
  const seen = new Set<string>();
  for (const item of value) {
    if (item !== item.trim() || item.length === 0 || seen.has(item)) {
      return false;
    }
    seen.add(item);
  }

  return true;
};

const sameScoreScale = (left: EvaluationScoreScale, right: EvaluationScoreScale): boolean => {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "relative") {
    return true;
  }

  if (left.kind === "equity" && right.kind === "equity") {
    return left.unit === right.unit;
  }

  if (left.kind === "probability" && right.kind === "probability") {
    return left.range[0] === right.range[0] && left.range[1] === right.range[1];
  }

  return false;
};

const validateNoLegalMovesAnalysis = (
  value: Record<string, unknown>,
  path: string
): string | null => {
  if (value.coverage !== "complete") {
    return `${path}.coverage must be complete when kind is no-legal-moves.`;
  }

  if (!Array.isArray(value.factualOutcomes) || value.factualOutcomes.length > 0) {
    return `${path}.factualOutcomes must be an empty array for no-legal-moves.`;
  }

  if (!Array.isArray(value.rankedMoves) || value.rankedMoves.length > 0) {
    return `${path}.rankedMoves must be an empty array for no-legal-moves.`;
  }

  if (!Array.isArray(value.unevaluatedMoves) || value.unevaluatedMoves.length > 0) {
    return `${path}.unevaluatedMoves must be an empty array for no-legal-moves.`;
  }

  if (!Array.isArray(value.warnings) || value.warnings.length > 0) {
    return `${path}.warnings must be an empty array for no-legal-moves.`;
  }

  return null;
};

const validateEvaluatedAnalysis = (value: Record<string, unknown>, path: string): string | null => {
  if (!isValidScoreScale(value.scoreScale)) {
    return `${path}.scoreScale is invalid.`;
  }

  if (!isValidProvenance(value.provenance)) {
    return `${path}.provenance is invalid.`;
  }

  if (value.coverage !== "complete" && value.coverage !== "partial") {
    return `${path}.coverage must be complete or partial.`;
  }

  if (
    !Array.isArray(value.warnings) ||
    !value.warnings.every((entry) => typeof entry === "string")
  ) {
    return `${path}.warnings must be an array of strings.`;
  }

  if (!Array.isArray(value.factualOutcomes)) {
    return `${path}.factualOutcomes must be an array.`;
  }

  if (!Array.isArray(value.rankedMoves)) {
    return `${path}.rankedMoves must be an array.`;
  }

  if (!Array.isArray(value.unevaluatedMoves)) {
    return `${path}.unevaluatedMoves must be an array.`;
  }

  const factualOutcomes = value.factualOutcomes as unknown[];
  const rankedMovesRaw = value.rankedMoves as unknown[];
  const unevaluatedMoves = value.unevaluatedMoves as unknown[];

  const factualOutcomeFingerprints = new Set<string>();

  for (let index = 0; index < factualOutcomes.length; index += 1) {
    const outcomeValue = factualOutcomes[index];

    if (!isRecord(outcomeValue) || !isValidMove(outcomeValue.move)) {
      return `${path}.factualOutcomes[${index}] has an invalid move.`;
    }

    const fingerprint = getMoveFingerprint(outcomeValue.move);
    if (factualOutcomeFingerprints.has(fingerprint)) {
      return `${path}.factualOutcomes contains duplicate canonical moves.`;
    }

    factualOutcomeFingerprints.add(fingerprint);
  }

  const rankedFingerprints = new Set<string>();

  for (let index = 0; index < rankedMovesRaw.length; index += 1) {
    const rankedValue = rankedMovesRaw[index];
    if (!isRecord(rankedValue)) {
      return `${path}.rankedMoves[${index}] must be an object.`;
    }

    if (
      !isPositiveInteger(rankedValue.rank) ||
      !isFiniteNumber(rankedValue.normalizedScore) ||
      !isFiniteNumber(rankedValue.lossFromBest) ||
      rankedValue.lossFromBest < 0 ||
      !isNonEmptyString(rankedValue.moveFingerprint)
    ) {
      return `${path}.rankedMoves[${index}] has invalid rank/score fields.`;
    }

    const providerRank = rankedValue.providerRank;
    if (providerRank !== undefined && (!isPositiveInteger(providerRank) || providerRank <= 0)) {
      return `${path}.rankedMoves[${index}].providerRank is invalid.`;
    }

    if (!isRecord(rankedValue.outcome) || !isValidMove(rankedValue.outcome.move)) {
      return `${path}.rankedMoves[${index}] has an invalid canonical outcome.`;
    }

    const outcomeFingerprint = getMoveFingerprint(rankedValue.outcome.move);
    if (rankedValue.moveFingerprint !== outcomeFingerprint) {
      return `${path}.rankedMoves[${index}] fingerprint does not match outcome move.`;
    }

    if (!factualOutcomeFingerprints.has(rankedValue.moveFingerprint)) {
      return `${path}.rankedMoves[${index}] references a non-factual move.`;
    }

    if (rankedFingerprints.has(rankedValue.moveFingerprint)) {
      return `${path}.rankedMoves contains duplicate move fingerprints.`;
    }

    rankedFingerprints.add(rankedValue.moveFingerprint);
  }

  const unevaluatedFingerprints = new Set<string>();

  for (let index = 0; index < unevaluatedMoves.length; index += 1) {
    const unevaluated = unevaluatedMoves[index];
    if (!isRecord(unevaluated) || !isValidMove(unevaluated.move)) {
      return `${path}.unevaluatedMoves[${index}] has an invalid move.`;
    }

    const fingerprint = getMoveFingerprint(unevaluated.move);
    if (!factualOutcomeFingerprints.has(fingerprint)) {
      return `${path}.unevaluatedMoves[${index}] references a non-factual move.`;
    }

    if (rankedFingerprints.has(fingerprint)) {
      return `${path}.unevaluatedMoves[${index}] duplicates a ranked move.`;
    }

    if (unevaluatedFingerprints.has(fingerprint)) {
      return `${path}.unevaluatedMoves contains duplicate move fingerprints.`;
    }

    unevaluatedFingerprints.add(fingerprint);
  }

  if (
    value.coverage === "complete" &&
    (unevaluatedMoves.length > 0 || rankedFingerprints.size !== factualOutcomes.length)
  ) {
    return `${path} complete coverage must evaluate every factual move.`;
  }

  if (value.coverage === "partial" && factualOutcomes.length > 0 && rankedMovesRaw.length === 0) {
    return `${path} partial coverage must include at least one ranked move.`;
  }

  if (rankedMovesRaw.length > 0) {
    const rankedMoves = rankedMovesRaw as Array<{
      rank: number;
      normalizedScore: number;
      lossFromBest: number;
      moveFingerprint: string;
    }>;

    const expectedOrder = [...rankedMoves].sort((left, right) => {
      if (left.normalizedScore !== right.normalizedScore) {
        return right.normalizedScore - left.normalizedScore;
      }

      return left.moveFingerprint.localeCompare(right.moveFingerprint);
    });

    for (let index = 0; index < rankedMoves.length; index += 1) {
      if (rankedMoves[index]?.moveFingerprint !== expectedOrder[index]?.moveFingerprint) {
        return `${path}.rankedMoves must be sorted by score then canonical fingerprint.`;
      }
    }

    const bestScore = rankedMoves[0]!.normalizedScore;
    if (rankedMoves[0]!.lossFromBest !== 0) {
      return `${path}.rankedMoves[0].lossFromBest must be 0.`;
    }

    let currentRank = 1;
    for (let index = 0; index < rankedMoves.length; index += 1) {
      const rankedMove = rankedMoves[index]!;

      if (index > 0 && rankedMoves[index - 1]!.normalizedScore !== rankedMove.normalizedScore) {
        currentRank += 1;
      }

      if (rankedMove.rank !== currentRank) {
        return `${path}.rankedMoves uses invalid dense ranking.`;
      }

      if (rankedMove.lossFromBest !== bestScore - rankedMove.normalizedScore) {
        return `${path}.rankedMoves uses an invalid lossFromBest value.`;
      }
    }
  }

  return null;
};

const validateRankedMoveAnalysis = (value: unknown, path: string): string | null => {
  if (!isRecord(value) || !isPlayer(value.player) || !isRecord(value.dice)) {
    return `${path} must include player and dice.`;
  }

  if (
    !Array.isArray(value.dice.dice) ||
    value.dice.dice.length !== 2 ||
    typeof value.dice.dice[0] !== "number" ||
    typeof value.dice.dice[1] !== "number" ||
    !Number.isInteger(value.dice.dice[0]) ||
    !Number.isInteger(value.dice.dice[1]) ||
    value.dice.dice[0] < 1 ||
    value.dice.dice[0] > 6 ||
    value.dice.dice[1] < 1 ||
    value.dice.dice[1] > 6
  ) {
    return `${path}.dice must be a valid pair.`;
  }

  if (!isRecord(value.positionBefore)) {
    return `${path}.positionBefore must be an object.`;
  }

  if (value.kind === "no-legal-moves") {
    return validateNoLegalMovesAnalysis(value, path);
  }

  if (value.kind === "evaluated") {
    return validateEvaluatedAnalysis(value, path);
  }

  return `${path}.kind is invalid.`;
};

const sameDice = (left: DiceRoll, right: DiceRoll): boolean => {
  return left.dice[0] === right.dice[0] && left.dice[1] === right.dice[1];
};

const sameBoardPosition = (
  left: GameSnapshot["gameState"]["position"],
  right: GameSnapshot["gameState"]["position"]
): boolean => {
  const leftPoints = left.points as Record<string, unknown>;
  const rightPoints = right.points as Record<string, unknown>;

  for (let point = 1; point <= 24; point += 1) {
    const leftOccupancy = leftPoints[String(point)] as
      { player: Player; checkerCount: number } | null | undefined;
    const rightOccupancy = rightPoints[String(point)] as
      { player: Player; checkerCount: number } | null | undefined;

    if (leftOccupancy === null || leftOccupancy === undefined) {
      if (rightOccupancy !== null && rightOccupancy !== undefined) {
        return false;
      }
      continue;
    }

    if (
      rightOccupancy === null ||
      rightOccupancy === undefined ||
      leftOccupancy.player !== rightOccupancy.player ||
      leftOccupancy.checkerCount !== rightOccupancy.checkerCount
    ) {
      return false;
    }
  }

  return (
    left.bar.white === right.bar.white &&
    left.bar.black === right.bar.black &&
    left.borneOff.white === right.borneOff.white &&
    left.borneOff.black === right.borneOff.black
  );
};

const boardPositionToJsonValue = (position: GameSnapshot["gameState"]["position"]): JsonValue => {
  const points: Record<string, JsonValue> = {};

  for (let point = 1; point <= 24; point += 1) {
    const occupancy = (position.points as Record<string, unknown>)[String(point)] as
      { player: Player; checkerCount: number } | null | undefined;

    points[String(point)] =
      occupancy === null || occupancy === undefined
        ? null
        : {
            player: occupancy.player,
            checkerCount: occupancy.checkerCount
          };
  }

  return {
    points,
    bar: {
      white: position.bar.white,
      black: position.bar.black
    },
    borneOff: {
      white: position.borneOff.white,
      black: position.borneOff.black
    }
  };
};

const gameSnapshotToTrustedClone = (
  snapshot: GameSnapshot
): { ok: true; snapshot: GameSnapshot } | { ok: false; message: string } => {
  const parsed = parseGameSnapshot(serializeGameSnapshot(snapshot));
  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.message
    };
  }

  return {
    ok: true,
    snapshot: parsed.snapshot
  };
};

const getGameOriginPosition = (snapshot: GameSnapshot): GameSnapshot["gameState"]["position"] => {
  if (snapshot.turnHistory.length > 0) {
    return snapshot.turnHistory[0]!.positionBefore;
  }

  return snapshot.gameState.position;
};

export const getDecisionPositionFingerprint = (input: {
  readonly position: GameSnapshot["gameState"]["position"];
  readonly player: Player;
  readonly dice: DiceRoll;
}): string => {
  const points = input.position.points as Record<string, unknown>;
  const pointEntries = Array.from({ length: 24 }, (_, index) => {
    const point = index + 1;
    const occupancy = points[String(point)] as
      { player: Player; checkerCount: number } | null | undefined;
    if (occupancy === null || occupancy === undefined) {
      return [point, null] as const;
    }

    return [point, { player: occupancy.player, checkerCount: occupancy.checkerCount }] as const;
  });

  const payload: JsonValue = {
    algorithm: "decision-position-v1",
    player: input.player,
    dice: [input.dice.dice[0], input.dice.dice[1]],
    points: pointEntries,
    bar: {
      white: input.position.bar.white,
      black: input.position.bar.black
    },
    borneOff: {
      white: input.position.borneOff.white,
      black: input.position.borneOff.black
    }
  };

  return `decision-position-v1:${toCanonicalJsonText(payload)}`;
};

export const getAnalysisSessionGameReference = (
  snapshot: GameSnapshot,
  explicitGameReference?: string
): { ok: true; gameReference: string } | { ok: false; message: string } => {
  if (explicitGameReference !== undefined) {
    const trimmed = explicitGameReference.trim();
    if (trimmed.length === 0) {
      return {
        ok: false,
        message: "gameReference must be a non-empty string when provided."
      };
    }

    return {
      ok: true,
      gameReference: trimmed
    };
  }

  const origin = getGameOriginPosition(snapshot);
  const payload: JsonValue = {
    algorithm: "game-reference-v1",
    originPosition: boardPositionToJsonValue(origin),
    originActivePlayer: snapshot.turnHistory[0]?.player ?? snapshot.gameState.activePlayer
  };

  return {
    ok: true,
    gameReference: `game-reference-v1:${toCanonicalJsonText(payload)}`
  };
};

const getBaselineEvaluatedProvenance = (session: AnalysisSession): EvaluatorProvenance | null => {
  for (const record of session.records) {
    if (record.rankedMoveAnalysis.kind === "evaluated") {
      return record.rankedMoveAnalysis.provenance;
    }
  }

  return null;
};

const validateSessionEvaluatorCompatibility = (
  session: AnalysisSession,
  record: AnalysisRecord
): string | null => {
  if (record.evaluatorProvenance.provider !== session.metadata.evaluatorProvider) {
    return "Record evaluator provider does not match session metadata.";
  }

  if (record.evaluatorProvenance.providerVersion !== session.metadata.evaluatorVersion) {
    return "Record evaluator version does not match session metadata.";
  }

  if (record.rankedMoveAnalysis.kind === "evaluated") {
    if (!sameScoreScale(record.rankedMoveAnalysis.scoreScale, session.metadata.scoreScale)) {
      return "Record score scale does not match session metadata.";
    }

    if (!sameProvenance(record.evaluatorProvenance, record.rankedMoveAnalysis.provenance)) {
      return "Record evaluator provenance does not match ranked analysis provenance.";
    }

    const baseline = getBaselineEvaluatedProvenance(session);
    if (baseline !== null && !sameProvenance(baseline, record.rankedMoveAnalysis.provenance)) {
      return "Evaluator provenance must remain consistent across evaluated session records.";
    }
  }

  return null;
};

const cloneMetadata = (metadata: AnalysisMetadata): AnalysisMetadata => {
  return {
    analysisFormat: metadata.analysisFormat,
    analysisVersion: metadata.analysisVersion,
    generatorVersion: metadata.generatorVersion,
    evaluatorProvider: metadata.evaluatorProvider,
    evaluatorVersion: metadata.evaluatorVersion,
    scoreScale: cloneScoreScale(metadata.scoreScale),
    createdAt: metadata.createdAt
  };
};

const cloneGameSnapshotReference = (
  reference: AnalysisSessionGameSnapshotReference
): AnalysisSessionGameSnapshotReference => {
  return {
    snapshotFormat: reference.snapshotFormat,
    snapshotVersion: reference.snapshotVersion,
    savedAt: reference.savedAt,
    gameReference: reference.gameReference
  };
};

const cloneRecord = (record: AnalysisRecord): AnalysisRecord => {
  return {
    turnNumber: record.turnNumber,
    player: record.player,
    positionHash: record.positionHash,
    snapshotReference: {
      turnNumber: record.snapshotReference.turnNumber,
      position: record.snapshotReference.position
    },
    evaluatorProvenance: cloneProvenance(record.evaluatorProvenance),
    rankedMoveAnalysis: cloneRankedLegalMoveAnalysis(record.rankedMoveAnalysis),
    chosenMove: record.chosenMove === null ? null : cloneMove(record.chosenMove),
    ...(record.annotations === undefined ? {} : { annotations: [...record.annotations] }),
    ...(record.tags === undefined ? {} : { tags: [...record.tags] })
  };
};

const parseSessionFromValue = (value: unknown): AnalysisSession | null => {
  const parsed = parseAnalysisSession(value);
  if (!parsed.ok) {
    return null;
  }

  return parsed.session;
};

const getRecordOutcomeByFingerprint = (
  analysis: RankedLegalMoveAnalysis,
  fingerprint: string
): LegalMoveOutcome | null => {
  if (analysis.kind !== "evaluated") {
    return null;
  }

  const scoredOutcome = analysis.rankedMoves.find((row) => row.moveFingerprint === fingerprint);
  if (scoredOutcome !== undefined) {
    return scoredOutcome.outcome;
  }

  const unevaluatedOutcome = analysis.unevaluatedMoves.find(
    (outcome) => getMoveFingerprint(outcome.move) === fingerprint
  );

  return unevaluatedOutcome ?? null;
};

const parseMetadata = (
  value: unknown,
  path: string
): { ok: true; metadata: AnalysisMetadata } | { ok: false; result: ParseAnalysisSessionResult } => {
  if (!isRecord(value)) {
    return {
      ok: false,
      result: failParse("invalid-structure", `${path} must be an object.`)
    };
  }

  if (!isNonEmptyString(value.analysisFormat)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.analysisFormat is required.`)
    };
  }

  if (!isPositiveInteger(value.analysisVersion)) {
    return {
      ok: false,
      result: failParse(
        "invalid-domain-state",
        `${path}.analysisVersion must be a positive integer.`
      )
    };
  }

  if (!isNonEmptyString(value.generatorVersion)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.generatorVersion is required.`)
    };
  }

  if (!isNonEmptyString(value.evaluatorProvider)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.evaluatorProvider is required.`)
    };
  }

  if (!isNonEmptyString(value.evaluatorVersion)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.evaluatorVersion is required.`)
    };
  }

  if (!isValidScoreScale(value.scoreScale)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.scoreScale is invalid.`)
    };
  }

  if (!isIsoTimestampString(value.createdAt)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.createdAt must be an ISO-8601 timestamp.`)
    };
  }

  return {
    ok: true,
    metadata: {
      analysisFormat: value.analysisFormat,
      analysisVersion: value.analysisVersion,
      generatorVersion: value.generatorVersion,
      evaluatorProvider: value.evaluatorProvider,
      evaluatorVersion: value.evaluatorVersion,
      scoreScale: cloneScoreScale(value.scoreScale),
      createdAt: value.createdAt
    }
  };
};

const parseGameSnapshotReference = (
  value: unknown,
  path: string
):
  | { ok: true; reference: AnalysisSessionGameSnapshotReference }
  | { ok: false; result: ParseAnalysisSessionResult } => {
  if (!isRecord(value)) {
    return {
      ok: false,
      result: failParse("invalid-structure", `${path} must be an object.`)
    };
  }

  if (!isNonEmptyString(value.snapshotFormat)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.snapshotFormat is required.`)
    };
  }

  if (!isPositiveInteger(value.snapshotVersion)) {
    return {
      ok: false,
      result: failParse(
        "invalid-domain-state",
        `${path}.snapshotVersion must be a positive integer.`
      )
    };
  }

  if (!isIsoTimestampString(value.savedAt)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.savedAt must be an ISO-8601 timestamp.`)
    };
  }

  if (!isNonEmptyString(value.gameReference)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.gameReference is required.`)
    };
  }

  return {
    ok: true,
    reference: {
      snapshotFormat: value.snapshotFormat,
      snapshotVersion: value.snapshotVersion,
      savedAt: value.savedAt,
      gameReference: value.gameReference
    }
  };
};

const parseRecord = (
  value: unknown,
  path: string,
  metadata: AnalysisMetadata
): { ok: true; record: AnalysisRecord } | { ok: false; result: ParseAnalysisSessionResult } => {
  if (!isRecord(value)) {
    return {
      ok: false,
      result: failParse("invalid-structure", `${path} must be an object.`)
    };
  }

  if (!isPositiveInteger(value.turnNumber)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.turnNumber must be a positive integer.`)
    };
  }

  if (!isPlayer(value.player)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.player is invalid.`)
    };
  }

  if (!isNonEmptyString(value.positionHash)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.positionHash is required.`)
    };
  }

  if (!isRecord(value.snapshotReference)) {
    return {
      ok: false,
      result: failParse("invalid-structure", `${path}.snapshotReference must be an object.`)
    };
  }

  if (!isNonNegativeInteger(value.snapshotReference.turnNumber)) {
    return {
      ok: false,
      result: failParse(
        "invalid-domain-state",
        `${path}.snapshotReference.turnNumber must be a non-negative integer.`
      )
    };
  }

  if (
    value.snapshotReference.position !== "before-turn" &&
    value.snapshotReference.position !== "after-turn"
  ) {
    return {
      ok: false,
      result: failParse(
        "invalid-domain-state",
        `${path}.snapshotReference.position must be before-turn or after-turn.`
      )
    };
  }

  if (!isValidProvenance(value.evaluatorProvenance)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.evaluatorProvenance is invalid.`)
    };
  }

  if (value.evaluatorProvenance.provider !== metadata.evaluatorProvider) {
    return {
      ok: false,
      result: failParse(
        "invalid-domain-state",
        `${path}.evaluatorProvenance.provider must match metadata.evaluatorProvider.`
      )
    };
  }

  if (value.evaluatorProvenance.providerVersion !== metadata.evaluatorVersion) {
    return {
      ok: false,
      result: failParse(
        "invalid-domain-state",
        `${path}.evaluatorProvenance.providerVersion must match metadata.evaluatorVersion.`
      )
    };
  }

  const rankedIntegrity = validateRankedMoveAnalysis(
    value.rankedMoveAnalysis,
    `${path}.rankedMoveAnalysis`
  );
  if (rankedIntegrity !== null) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", rankedIntegrity)
    };
  }

  if (!isRecord(value.rankedMoveAnalysis)) {
    return {
      ok: false,
      result: failParse("invalid-structure", `${path}.rankedMoveAnalysis must be an object.`)
    };
  }

  const rankedMoveAnalysis = value.rankedMoveAnalysis as RankedLegalMoveAnalysis;

  if (rankedMoveAnalysis.player !== value.player) {
    return {
      ok: false,
      result: failParse(
        "invalid-domain-state",
        `${path}.rankedMoveAnalysis.player must match record player.`
      )
    };
  }

  if (rankedMoveAnalysis.kind === "evaluated") {
    if (!sameScoreScale(rankedMoveAnalysis.scoreScale, metadata.scoreScale)) {
      return {
        ok: false,
        result: failParse(
          "invalid-domain-state",
          `${path}.rankedMoveAnalysis.scoreScale must match metadata.scoreScale.`
        )
      };
    }
  }

  if (value.chosenMove !== null && !isValidMove(value.chosenMove)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.chosenMove is invalid.`)
    };
  }

  if (rankedMoveAnalysis.kind === "no-legal-moves" && value.chosenMove !== null) {
    return {
      ok: false,
      result: failParse(
        "invalid-domain-state",
        `${path}.chosenMove must be null when rankedMoveAnalysis.kind is no-legal-moves.`
      )
    };
  }

  if (rankedMoveAnalysis.kind === "evaluated" && value.chosenMove === null) {
    return {
      ok: false,
      result: failParse(
        "invalid-domain-state",
        `${path}.chosenMove is required when rankedMoveAnalysis.kind is evaluated.`
      )
    };
  }

  if (rankedMoveAnalysis.kind === "evaluated" && value.chosenMove !== null) {
    const factualFingerprints = new Set(
      rankedMoveAnalysis.factualOutcomes.map((outcome) => getMoveFingerprint(outcome.move))
    );
    if (!factualFingerprints.has(getMoveFingerprint(value.chosenMove))) {
      return {
        ok: false,
        result: failParse(
          "invalid-domain-state",
          `${path}.chosenMove must be present in rankedMoveAnalysis factual outcomes.`
        )
      };
    }
  }

  if (value.annotations !== undefined && !isStringArray(value.annotations)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.annotations must be an array of strings.`)
    };
  }

  if (value.tags !== undefined && !isStringArray(value.tags)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.tags must be an array of strings.`)
    };
  }

  if (value.annotations !== undefined && !isCanonicalLabelList(value.annotations)) {
    return {
      ok: false,
      result: failParse(
        "invalid-domain-state",
        `${path}.annotations must be trimmed, non-empty, and deduplicated.`
      )
    };
  }

  if (value.tags !== undefined && !isCanonicalLabelList(value.tags)) {
    return {
      ok: false,
      result: failParse("invalid-domain-state", `${path}.tags must be trimmed and deduplicated.`)
    };
  }

  return {
    ok: true,
    record: {
      turnNumber: value.turnNumber,
      player: value.player,
      positionHash: value.positionHash,
      snapshotReference: {
        turnNumber: value.snapshotReference.turnNumber,
        position: value.snapshotReference.position
      },
      evaluatorProvenance: cloneProvenance(value.evaluatorProvenance),
      rankedMoveAnalysis: cloneRankedLegalMoveAnalysis(rankedMoveAnalysis),
      chosenMove: value.chosenMove === null ? null : cloneMove(value.chosenMove),
      ...(value.annotations === undefined ? {} : { annotations: [...value.annotations] }),
      ...(value.tags === undefined ? {} : { tags: [...value.tags] })
    }
  };
};

const parseSerializedAnalysisSessionV1 = (
  input: Record<string, unknown>
): ParseAnalysisSessionResult => {
  if (!isNonEmptyString(input.sessionId)) {
    return failParse("invalid-domain-state", "sessionId is required.");
  }

  if (!isIsoTimestampString(input.createdAt)) {
    return failParse("invalid-domain-state", "createdAt must be an ISO-8601 timestamp.");
  }

  if (!isIsoTimestampString(input.updatedAt)) {
    return failParse("invalid-domain-state", "updatedAt must be an ISO-8601 timestamp.");
  }

  if (Date.parse(input.updatedAt) < Date.parse(input.createdAt)) {
    return failParse("invalid-domain-state", "updatedAt cannot be earlier than createdAt.");
  }

  const parsedMetadata = parseMetadata(input.metadata, "metadata");
  if (!parsedMetadata.ok) {
    return parsedMetadata.result;
  }

  const parsedReference = parseGameSnapshotReference(
    input.gameSnapshotReference,
    "gameSnapshotReference"
  );
  if (!parsedReference.ok) {
    return parsedReference.result;
  }

  if (!Array.isArray(input.records)) {
    return failParse("invalid-structure", "records must be an array.");
  }

  const records: AnalysisRecord[] = [];

  for (let index = 0; index < input.records.length; index += 1) {
    const parsedRecord = parseRecord(
      input.records[index],
      `records[${index}]`,
      parsedMetadata.metadata
    );

    if (!parsedRecord.ok) {
      return parsedRecord.result;
    }

    records.push(parsedRecord.record);
  }

  for (let index = 0; index < records.length; index += 1) {
    if (index > 0 && records[index]!.turnNumber <= records[index - 1]!.turnNumber) {
      return failParse(
        "invalid-domain-state",
        "records must be strictly ascending by turn number."
      );
    }
  }

  const baselineEvaluated = getBaselineEvaluatedProvenance({
    sessionId: input.sessionId,
    format: ANALYSIS_SESSION_FORMAT,
    version: ANALYSIS_SESSION_VERSION,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    metadata: parsedMetadata.metadata,
    gameSnapshotReference: parsedReference.reference,
    records
  });

  if (baselineEvaluated !== null) {
    for (const record of records) {
      if (record.rankedMoveAnalysis.kind !== "evaluated") {
        continue;
      }

      if (!sameProvenance(record.rankedMoveAnalysis.provenance, baselineEvaluated)) {
        return failParse(
          "invalid-domain-state",
          "evaluated records must share one provenance in a single analysis session."
        );
      }
    }
  }

  return {
    ok: true,
    session: {
      sessionId: input.sessionId,
      format: ANALYSIS_SESSION_FORMAT,
      version: ANALYSIS_SESSION_VERSION,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      metadata: cloneMetadata(parsedMetadata.metadata),
      gameSnapshotReference: cloneGameSnapshotReference(parsedReference.reference),
      records: records.map((record) => cloneRecord(record))
    }
  };
};

export const serializeAnalysisSession = (session: AnalysisSession): SerializedAnalysisSessionV1 => {
  return {
    format: ANALYSIS_SESSION_FORMAT,
    version: ANALYSIS_SESSION_VERSION,
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    metadata: cloneMetadata(session.metadata),
    gameSnapshotReference: cloneGameSnapshotReference(session.gameSnapshotReference),
    records: session.records.map((record) => cloneRecord(record))
  };
};

export const parseAnalysisSession = (input: unknown): ParseAnalysisSessionResult => {
  if (!isRecord(input)) {
    return failParse("invalid-structure", "Analysis session must be an object.");
  }

  if (input.format !== ANALYSIS_SESSION_FORMAT) {
    return failParse("wrong-format", "Analysis session format identifier is not recognized.");
  }

  if (!Number.isInteger(input.version)) {
    return failParse("invalid-structure", "Analysis session version must be an integer.");
  }

  if (input.version !== ANALYSIS_SESSION_VERSION) {
    return failParse("unsupported-version", "Analysis session version is not supported.");
  }

  return parseSerializedAnalysisSessionV1(input);
};

const failCreateSession = (
  reason: CreateAnalysisSessionFailureReason,
  message: string
): CreateAnalysisSessionResult => {
  return {
    ok: false,
    reason,
    message
  };
};

const failCreateRecord = (
  reason: CreateAnalysisRecordFailureReason,
  message: string
): CreateAnalysisRecordResult => {
  return {
    ok: false,
    reason,
    message
  };
};

const failAppendRecord = (
  reason: AppendAnalysisRecordFailureReason,
  message: string
): AppendAnalysisRecordResult => {
  return {
    ok: false,
    reason,
    message
  };
};

const failReconcile = (
  reason: ReconcileAnalysisSessionFailureReason,
  message: string,
  turnNumber?: number
): ReconcileAnalysisSessionResult => {
  return {
    ok: false,
    reason,
    message,
    ...(turnNumber === undefined ? {} : { turnNumber })
  };
};

export const createAnalysisSession = (
  input: CreateAnalysisSessionInput
): CreateAnalysisSessionResult => {
  if (!isNonEmptyString(input.sessionId)) {
    return failCreateSession("invalid-session-metadata", "sessionId is required.");
  }

  if (!isIsoTimestampString(input.createdAt)) {
    return failCreateSession("invalid-timestamp", "createdAt must be an ISO-8601 timestamp.");
  }

  const metadataParsed = parseMetadata(input.metadata, "metadata");
  if (!metadataParsed.ok) {
    const metadataFailure = metadataParsed.result as Extract<
      ParseAnalysisSessionResult,
      { ok: false }
    >;
    return failCreateSession("invalid-session-metadata", metadataFailure.message);
  }

  const trustedSnapshot = gameSnapshotToTrustedClone(input.gameSnapshot);
  if (!trustedSnapshot.ok) {
    return failCreateSession("invalid-game-snapshot", trustedSnapshot.message);
  }

  const gameReference = getAnalysisSessionGameReference(
    trustedSnapshot.snapshot,
    input.gameReference
  );
  if (!gameReference.ok) {
    return failCreateSession("invalid-game-reference", gameReference.message);
  }

  const session: AnalysisSession = {
    sessionId: input.sessionId.trim(),
    format: ANALYSIS_SESSION_FORMAT,
    version: ANALYSIS_SESSION_VERSION,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    metadata: cloneMetadata(metadataParsed.metadata),
    gameSnapshotReference: {
      snapshotFormat: "backgammon-trainer-game",
      snapshotVersion: 1,
      savedAt: trustedSnapshot.snapshot.savedAt,
      gameReference: gameReference.gameReference
    },
    records: []
  };

  const parsed = parseAnalysisSession(serializeAnalysisSession(session));
  if (!parsed.ok) {
    return failCreateSession("invalid-session-metadata", parsed.message);
  }

  return {
    ok: true,
    session: parsed.session
  };
};

const getChosenMoveKind = (
  rankedAnalysis: RankedLegalMoveAnalysis,
  chosenMoveFingerprint: string
): "evaluated" | "unevaluated" | null => {
  if (rankedAnalysis.kind !== "evaluated") {
    return null;
  }

  if (rankedAnalysis.rankedMoves.some((row) => row.moveFingerprint === chosenMoveFingerprint)) {
    return "evaluated";
  }

  if (
    rankedAnalysis.unevaluatedMoves.some(
      (outcome) => getMoveFingerprint(outcome.move) === chosenMoveFingerprint
    )
  ) {
    return "unevaluated";
  }

  return null;
};

export const createAnalysisRecord = (
  input: CreateAnalysisRecordInput
): CreateAnalysisRecordResult => {
  const session = parseSessionFromValue(serializeAnalysisSession(input.session));
  if (session === null) {
    return failCreateRecord("invalid-session", "session is invalid.");
  }

  if (!isIsoTimestampString(input.createdAt)) {
    return failCreateRecord("invalid-timestamp", "createdAt must be an ISO-8601 timestamp.");
  }

  const beforeSnapshot = gameSnapshotToTrustedClone(input.snapshotBeforeTurn);
  if (!beforeSnapshot.ok) {
    return failCreateRecord(
      "game-mismatch",
      `snapshotBeforeTurn invalid: ${beforeSnapshot.message}`
    );
  }

  const afterSnapshot = gameSnapshotToTrustedClone(input.snapshotAfterTurn);
  if (!afterSnapshot.ok) {
    return failCreateRecord("game-mismatch", `snapshotAfterTurn invalid: ${afterSnapshot.message}`);
  }

  const beforeReference = getAnalysisSessionGameReference(beforeSnapshot.snapshot);
  const afterReference = getAnalysisSessionGameReference(afterSnapshot.snapshot);
  if (!beforeReference.ok || !afterReference.ok) {
    return failCreateRecord("game-mismatch", "Unable to derive deterministic game reference.");
  }

  if (
    session.gameSnapshotReference.gameReference !== beforeReference.gameReference ||
    session.gameSnapshotReference.gameReference !== afterReference.gameReference
  ) {
    return failCreateRecord("game-mismatch", "Snapshots do not match the session game reference.");
  }

  const turn = structuredClone(input.committedTurn);
  if (!isPositiveInteger(turn.turnNumber)) {
    return failCreateRecord("invalid-turn-record", "committedTurn.turnNumber must be positive.");
  }

  const historyTurn = afterSnapshot.snapshot.turnHistory[turn.turnNumber - 1];
  if (historyTurn === undefined) {
    return failCreateRecord(
      "turn-number-mismatch",
      "snapshotAfterTurn is missing the committed turn."
    );
  }

  if (
    historyTurn.player !== turn.player ||
    !sameDice(historyTurn.dice, turn.dice) ||
    historyTurn.outcome.kind !== turn.outcome.kind
  ) {
    return failCreateRecord(
      "invalid-turn-record",
      "committedTurn does not match snapshotAfterTurn history."
    );
  }

  if (historyTurn.outcome.kind === "move" && turn.outcome.kind === "move") {
    if (getMoveFingerprint(historyTurn.outcome.move) !== getMoveFingerprint(turn.outcome.move)) {
      return failCreateRecord(
        "chosen-move-fingerprint-mismatch",
        "Committed turn move fingerprint does not match snapshotAfterTurn history."
      );
    }
  }

  if (!sameBoardPosition(historyTurn.positionBefore, turn.positionBefore)) {
    return failCreateRecord("position-mismatch", "Committed turn positionBefore mismatch.");
  }

  if (!sameBoardPosition(historyTurn.positionAfter, turn.positionAfter)) {
    return failCreateRecord(
      "resulting-position-mismatch",
      "Committed turn positionAfter mismatch."
    );
  }

  const beforeHistoryLength = beforeSnapshot.snapshot.turnHistory.length;
  if (beforeHistoryLength !== turn.turnNumber - 1) {
    return failCreateRecord(
      "turn-number-mismatch",
      "snapshotBeforeTurn must include history through the previous committed turn."
    );
  }

  const beforePosition =
    beforeHistoryLength === 0
      ? beforeSnapshot.snapshot.gameState.position
      : beforeSnapshot.snapshot.turnHistory[beforeHistoryLength - 1]!.positionAfter;

  if (!sameBoardPosition(beforePosition, turn.positionBefore)) {
    return failCreateRecord(
      "position-mismatch",
      "snapshotBeforeTurn does not represent the committed pre-turn position."
    );
  }

  const rankedIntegrity = validateRankedMoveAnalysis(input.rankedAnalysis, "rankedAnalysis");
  if (rankedIntegrity !== null) {
    return failCreateRecord("invalid-ranked-analysis", rankedIntegrity);
  }

  if (input.rankedAnalysis.player !== turn.player) {
    return failCreateRecord(
      "player-mismatch",
      "Ranked analysis player must match committed turn player."
    );
  }

  if (!sameDice(input.rankedAnalysis.dice, turn.dice)) {
    return failCreateRecord(
      "dice-mismatch",
      "Ranked analysis dice must match committed turn dice."
    );
  }

  if (
    toCanonicalJsonText(analyzePosition(turn.positionBefore) as unknown as JsonValue) !==
    toCanonicalJsonText(input.rankedAnalysis.positionBefore as unknown as JsonValue)
  ) {
    return failCreateRecord(
      "position-mismatch",
      "rankedAnalysis.positionBefore must match factual analysis of committed pre-turn position."
    );
  }

  const evaluatorMismatch =
    turn.outcome.kind === "move" && input.rankedAnalysis.kind !== "evaluated"
      ? "Evaluated move analysis is required for move turns."
      : turn.outcome.kind === "pass" && input.rankedAnalysis.kind !== "no-legal-moves"
        ? "Pass turns require no-legal-moves analysis."
        : null;

  if (evaluatorMismatch !== null) {
    return failCreateRecord("unsupported-turn-kind", evaluatorMismatch);
  }

  if (input.rankedAnalysis.kind === "evaluated") {
    if (!sameScoreScale(input.rankedAnalysis.scoreScale, session.metadata.scoreScale)) {
      return failCreateRecord("evaluator-mismatch", "Ranked analysis score scale mismatch.");
    }

    if (input.rankedAnalysis.provenance.provider !== session.metadata.evaluatorProvider) {
      return failCreateRecord("evaluator-mismatch", "Ranked analysis provider mismatch.");
    }

    if (input.rankedAnalysis.provenance.providerVersion !== session.metadata.evaluatorVersion) {
      return failCreateRecord("evaluator-mismatch", "Ranked analysis provider version mismatch.");
    }
  }

  const annotations = sanitizeLabelList(input.annotations, "annotations");
  if (!annotations.ok) {
    return failCreateRecord("invalid-annotations", annotations.message);
  }

  const tags = sanitizeLabelList(input.tags, "tags");
  if (!tags.ok) {
    return failCreateRecord("invalid-tags", tags.message);
  }

  if (turn.outcome.kind === "pass") {
    const record: AnalysisRecord = {
      turnNumber: turn.turnNumber,
      player: turn.player,
      positionHash: getDecisionPositionFingerprint({
        position: turn.positionBefore,
        player: turn.player,
        dice: cloneDice(turn.dice)
      }),
      snapshotReference: {
        turnNumber: turn.turnNumber,
        position: "before-turn"
      },
      evaluatorProvenance: {
        provider: session.metadata.evaluatorProvider,
        providerVersion: session.metadata.evaluatorVersion,
        adapterVersion: session.records[0]?.evaluatorProvenance.adapterVersion ?? "unknown",
        settings: {}
      },
      rankedMoveAnalysis: cloneRankedLegalMoveAnalysis(input.rankedAnalysis),
      chosenMove: null,
      ...(annotations.value === undefined ? {} : { annotations: [...annotations.value] }),
      ...(tags.value === undefined ? {} : { tags: [...tags.value] })
    };

    return {
      ok: true,
      record
    };
  }

  if (input.rankedAnalysis.kind !== "evaluated") {
    return failCreateRecord("unsupported-turn-kind", "Move turns require evaluated analysis.");
  }

  const evaluatedAnalysis = input.rankedAnalysis;

  const chosenMoveFingerprint = getMoveFingerprint(turn.outcome.move);
  const chosenKind = getChosenMoveKind(evaluatedAnalysis, chosenMoveFingerprint);
  if (chosenKind === null) {
    return failCreateRecord(
      "chosen-move-not-legal",
      "Committed move is absent from ranked analysis factual outcomes."
    );
  }

  const chosenOutcome = getRecordOutcomeByFingerprint(evaluatedAnalysis, chosenMoveFingerprint);
  if (chosenOutcome === null) {
    return failCreateRecord("chosen-move-not-legal", "Unable to resolve chosen factual outcome.");
  }

  if (!sameBoardPosition(chosenOutcome.positionAfter, turn.positionAfter)) {
    return failCreateRecord(
      "resulting-position-mismatch",
      "Chosen move resulting position does not match committed turn positionAfter."
    );
  }

  const record: AnalysisRecord = {
    turnNumber: turn.turnNumber,
    player: turn.player,
    positionHash: getDecisionPositionFingerprint({
      position: turn.positionBefore,
      player: turn.player,
      dice: cloneDice(turn.dice)
    }),
    snapshotReference: {
      turnNumber: turn.turnNumber,
      position: "before-turn"
    },
    evaluatorProvenance: cloneProvenance(evaluatedAnalysis.provenance),
    rankedMoveAnalysis: cloneRankedLegalMoveAnalysis(evaluatedAnalysis),
    chosenMove: cloneMove(turn.outcome.move),
    ...(annotations.value === undefined ? {} : { annotations: [...annotations.value] }),
    ...(tags.value === undefined ? {} : { tags: [...tags.value] })
  };

  const compatibilityError = validateSessionEvaluatorCompatibility(session, record);
  if (compatibilityError !== null) {
    return failCreateRecord("evaluator-mismatch", compatibilityError);
  }

  return {
    ok: true,
    record
  };
};

export const appendAnalysisRecord = (
  input: AppendAnalysisRecordInput
): AppendAnalysisRecordResult => {
  const parsedSession = parseAnalysisSession(serializeAnalysisSession(input.session));
  if (!parsedSession.ok) {
    return failAppendRecord("invalid-session", parsedSession.message);
  }

  const parsedRecord = parseRecord(input.record, "record", parsedSession.session.metadata);
  if (!parsedRecord.ok) {
    const recordFailure = parsedRecord.result as Extract<ParseAnalysisSessionResult, { ok: false }>;
    return failAppendRecord("invalid-record", recordFailure.message);
  }

  if (!isIsoTimestampString(input.updatedAt)) {
    return failAppendRecord("timestamp-invalid", "updatedAt must be an ISO-8601 timestamp.");
  }

  if (Date.parse(input.updatedAt) < Date.parse(parsedSession.session.createdAt)) {
    return failAppendRecord("timestamp-invalid", "updatedAt cannot be earlier than createdAt.");
  }

  if (input.record.turnNumber <= 0) {
    return failAppendRecord("invalid-record", "turnNumber must be a positive integer.");
  }

  if (input.record.snapshotReference.turnNumber !== input.record.turnNumber) {
    return failAppendRecord(
      "invalid-record",
      "record snapshotReference.turnNumber must match turnNumber."
    );
  }

  const compatibilityError = validateSessionEvaluatorCompatibility(
    parsedSession.session,
    input.record
  );
  if (compatibilityError !== null) {
    return failAppendRecord("evaluator-mismatch", compatibilityError);
  }

  const existing = parsedSession.session.records.find(
    (record) => record.turnNumber === input.record.turnNumber
  );
  if (existing !== undefined) {
    const left = toCanonicalJsonText(cloneRecord(existing) as unknown as JsonValue);
    const right = toCanonicalJsonText(cloneRecord(input.record) as unknown as JsonValue);

    if (left === right) {
      return {
        ok: true,
        session: parsedSession.session,
        idempotent: true
      };
    }

    return failAppendRecord(
      "conflicting-record",
      "A different record already exists for this turn number."
    );
  }

  const lastTurnNumber =
    parsedSession.session.records[parsedSession.session.records.length - 1]?.turnNumber;
  if (lastTurnNumber !== undefined && input.record.turnNumber <= lastTurnNumber) {
    return failAppendRecord(
      "turn-order-invalid",
      "New record turnNumber must be strictly increasing."
    );
  }

  const nextSession: AnalysisSession = {
    ...parsedSession.session,
    updatedAt: input.updatedAt,
    records: [
      ...parsedSession.session.records.map((record) => cloneRecord(record)),
      cloneRecord(input.record)
    ]
  };

  const parsedNext = parseAnalysisSession(serializeAnalysisSession(nextSession));
  if (!parsedNext.ok) {
    return failAppendRecord("invalid-record", parsedNext.message);
  }

  return {
    ok: true,
    session: parsedNext.session,
    idempotent: false
  };
};

export const reconcileAnalysisSession = (
  input: ReconcileAnalysisSessionInput
): ReconcileAnalysisSessionResult => {
  const parsedSession = parseAnalysisSession(serializeAnalysisSession(input.session));
  if (!parsedSession.ok) {
    return failReconcile("invalid-session", parsedSession.message);
  }

  const trustedSnapshot = gameSnapshotToTrustedClone(input.gameSnapshot);
  if (!trustedSnapshot.ok) {
    return failReconcile("invalid-game-snapshot", trustedSnapshot.message);
  }

  const gameReference = getAnalysisSessionGameReference(trustedSnapshot.snapshot);
  if (!gameReference.ok) {
    return failReconcile("invalid-game-snapshot", gameReference.message);
  }

  if (gameReference.gameReference !== parsedSession.session.gameSnapshotReference.gameReference) {
    return failReconcile(
      "game-mismatch",
      "Session game reference does not match provided snapshot."
    );
  }

  for (const record of parsedSession.session.records) {
    const turn = trustedSnapshot.snapshot.turnHistory[record.turnNumber - 1];
    if (turn === undefined) {
      return failReconcile(
        "missing-committed-turn",
        "Snapshot does not contain a committed turn referenced by the session.",
        record.turnNumber
      );
    }

    if (turn.player !== record.player || !sameDice(turn.dice, record.rankedMoveAnalysis.dice)) {
      return failReconcile(
        "record-turn-invalid",
        "Record player or dice does not match committed turn history.",
        record.turnNumber
      );
    }

    const expectedPositionHash = getDecisionPositionFingerprint({
      position: turn.positionBefore,
      player: turn.player,
      dice: turn.dice
    });
    if (record.positionHash !== expectedPositionHash) {
      return failReconcile(
        "pre-turn-position-mismatch",
        "Record position fingerprint does not match committed pre-turn position.",
        record.turnNumber
      );
    }

    const factualBefore = analyzePosition(turn.positionBefore);
    if (
      toCanonicalJsonText(record.rankedMoveAnalysis.positionBefore as unknown as JsonValue) !==
      toCanonicalJsonText(factualBefore as unknown as JsonValue)
    ) {
      return failReconcile(
        "pre-turn-position-mismatch",
        "Record ranked pre-turn analysis does not match committed pre-turn position.",
        record.turnNumber
      );
    }

    if (turn.outcome.kind === "pass") {
      if (record.rankedMoveAnalysis.kind !== "no-legal-moves" || record.chosenMove !== null) {
        return failReconcile(
          "record-turn-invalid",
          "Pass turns must map to no-legal-moves analysis with null chosenMove.",
          record.turnNumber
        );
      }

      if (!sameBoardPosition(turn.positionAfter, turn.positionBefore)) {
        return failReconcile(
          "post-turn-position-mismatch",
          "Pass turn position transition is invalid.",
          record.turnNumber
        );
      }

      continue;
    }

    if (record.rankedMoveAnalysis.kind !== "evaluated" || record.chosenMove === null) {
      return failReconcile(
        "record-turn-invalid",
        "Move turns must map to evaluated analysis with a chosen move.",
        record.turnNumber
      );
    }

    const committedFingerprint = getMoveFingerprint(turn.outcome.move);
    const recordChosenFingerprint = getMoveFingerprint(record.chosenMove);
    if (committedFingerprint !== recordChosenFingerprint) {
      return failReconcile(
        "committed-move-mismatch",
        "Record chosen move does not match the committed canonical move.",
        record.turnNumber
      );
    }

    const chosenOutcome = getRecordOutcomeByFingerprint(
      record.rankedMoveAnalysis,
      committedFingerprint
    );
    if (chosenOutcome === null) {
      return failReconcile(
        "committed-move-mismatch",
        "Committed move is absent from ranked factual outcomes.",
        record.turnNumber
      );
    }

    if (!sameBoardPosition(chosenOutcome.positionAfter, turn.positionAfter)) {
      return failReconcile(
        "post-turn-position-mismatch",
        "Record chosen outcome does not match committed resulting position.",
        record.turnNumber
      );
    }
  }

  return {
    ok: true,
    status:
      parsedSession.session.records.length === trustedSnapshot.snapshot.turnHistory.length
        ? "current"
        : "game-advanced",
    session: parsedSession.session,
    analyzedTurnCount: parsedSession.session.records.length,
    committedTurnCount: trustedSnapshot.snapshot.turnHistory.length
  };
};

export const encodeAnalysisSession = (session: AnalysisSession): string => {
  return JSON.stringify(serializeAnalysisSession(session));
};

export const decodeAnalysisSession = (text: string): ParseAnalysisSessionResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return failParse("invalid-json", "Analysis session text is not valid JSON.");
  }

  return parseAnalysisSession(parsed);
};

export const summarizeAnalysisSession = (session: AnalysisSession): AnalysisSummary => {
  let completeCoverageCount = 0;
  let partialCoverageCount = 0;
  let noLegalMovesCount = 0;
  let taggedRecordCount = 0;
  let evaluatedChosenMoves = 0;
  let unevaluatedChosenMoves = 0;

  for (const record of session.records) {
    if (record.tags !== undefined && record.tags.length > 0) {
      taggedRecordCount += 1;
    }

    if (record.rankedMoveAnalysis.kind === "no-legal-moves") {
      noLegalMovesCount += 1;
      continue;
    }

    if (record.chosenMove !== null) {
      const chosenFingerprint = getMoveFingerprint(record.chosenMove);
      const isScored = record.rankedMoveAnalysis.rankedMoves.some(
        (row) => row.moveFingerprint === chosenFingerprint
      );
      if (isScored) {
        evaluatedChosenMoves += 1;
      } else {
        unevaluatedChosenMoves += 1;
      }
    }

    if (record.rankedMoveAnalysis.coverage === "complete") {
      completeCoverageCount += 1;
      continue;
    }

    partialCoverageCount += 1;
  }

  return {
    sessionId: session.sessionId,
    format: session.format,
    version: session.version,
    recordCount: session.records.length,
    analyzedTurnNumbers: session.records.map((record) => record.turnNumber),
    firstTurnNumber: session.records[0]?.turnNumber ?? null,
    lastTurnNumber: session.records[session.records.length - 1]?.turnNumber ?? null,
    evaluatorProvider: session.metadata.evaluatorProvider,
    evaluatorVersion: session.metadata.evaluatorVersion,
    completeCoverageCount,
    partialCoverageCount,
    noLegalMovesCount,
    taggedRecordCount,
    evaluatedChosenMoves,
    unevaluatedChosenMoves
  };
};
