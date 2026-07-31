import {
  getMoveFingerprint,
  type EvaluationScoreScale,
  type EvaluatorProvenance,
  type JsonValue,
  type LegalMoveOutcome,
  type RankedLegalMoveAnalysis
} from "@backgammon-trainer/backgammon-analysis";
import type { Move } from "@backgammon-trainer/backgammon-engine";

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
  readonly firstTurnNumber: number | null;
  readonly lastTurnNumber: number | null;
  readonly evaluatorProvider: string;
  readonly evaluatorVersion: string;
  readonly completeCoverageCount: number;
  readonly partialCoverageCount: number;
  readonly noLegalMovesCount: number;
  readonly taggedRecordCount: number;
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
    savedAt: reference.savedAt
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

  return {
    ok: true,
    reference: {
      snapshotFormat: value.snapshotFormat,
      snapshotVersion: value.snapshotVersion,
      savedAt: value.savedAt
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
    const expectedTurnNumber = index + 1;
    if (records[index]!.turnNumber !== expectedTurnNumber) {
      return failParse(
        "invalid-domain-state",
        "records must be ordered with contiguous turn numbers starting at 1."
      );
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

  for (const record of session.records) {
    if (record.tags !== undefined && record.tags.length > 0) {
      taggedRecordCount += 1;
    }

    if (record.rankedMoveAnalysis.kind === "no-legal-moves") {
      noLegalMovesCount += 1;
      continue;
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
    firstTurnNumber: session.records[0]?.turnNumber ?? null,
    lastTurnNumber: session.records[session.records.length - 1]?.turnNumber ?? null,
    evaluatorProvider: session.metadata.evaluatorProvider,
    evaluatorVersion: session.metadata.evaluatorVersion,
    completeCoverageCount,
    partialCoverageCount,
    noLegalMovesCount,
    taggedRecordCount
  };
};
