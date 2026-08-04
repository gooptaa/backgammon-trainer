import type { RankedLegalMoveAnalysis } from "@backgammon-trainer/backgammon-analysis";
import type { TurnRecord } from "@backgammon-trainer/backgammon-engine";
import { getMoveFingerprint } from "@backgammon-trainer/backgammon-analysis";

import {
  classifyCommittedMove,
  isFixtureEvaluator,
  MOVE_CLASSIFICATION_POLICY,
  type CoachMoveClassification,
  type CoachMoveClassificationLabel,
  type CoachMoveClassificationUnclassifiedReason
} from "./classification";
import {
  deriveLearnerPatternSignals,
  PATTERN_DETECTION_POLICY,
  summarizeLearnerPatterns,
  type LearnerPatternSignal,
  type LearnerPatternSummary
} from "./patterns";

export const LEARNER_PROFILE_FORMAT = "backgammon-trainer-learner-profile";
export const LEARNER_PROFILE_VERSION = 1;
export const DEFAULT_RECENT_WINDOW_SIZE = 20;
export const DEFAULT_MAX_OBSERVATIONS = 500;
export const MIN_CLASSIFIED_FOR_TREND = 5;

export type LearnerOwnershipMode = "white" | "black" | "both" | "unknown";

export interface LearnerLineageOwnership {
  readonly mode: LearnerOwnershipMode;
  readonly resolvedAt: string;
}

export type LearnerObservationClassification =
  | {
      readonly status: "classified";
      readonly label: CoachMoveClassificationLabel;
      readonly normalizedLossFromBest: number;
      readonly playedMoveRank: number;
      readonly isTieForBest: boolean;
      readonly tieWithinTolerance: boolean;
    }
  | {
      readonly status: "unclassified";
      readonly reason: CoachMoveClassificationUnclassifiedReason;
    };

export interface LearnerDecisionObservation {
  readonly observationId: string;
  readonly lineageId: string;
  readonly gameReference?: string;
  readonly turnNumber: number;
  readonly actingSide: "white" | "black";
  readonly playedMoveFingerprint: string;
  readonly learnerOwnershipAtObservation: "white" | "black";
  readonly observedAt: string;
  readonly source: "committed-turn";
  readonly policyId: typeof MOVE_CLASSIFICATION_POLICY.id;
  readonly policyVersion: string;
  readonly patternPolicyId: string;
  readonly patternPolicyVersion: string;
  readonly patternSignals: readonly LearnerPatternSignal[];
  readonly classification: LearnerObservationClassification;
  readonly analysisKind: "evaluated" | "no-legal-moves" | "missing";
  readonly evaluatorCoverage?: "complete" | "partial";
  readonly evaluatorProvenance?: {
    readonly provider: string;
    readonly providerVersion: string;
    readonly adapterVersion: string;
  };
}

export interface LearnerProfile {
  readonly format: typeof LEARNER_PROFILE_FORMAT;
  readonly version: typeof LEARNER_PROFILE_VERSION;
  readonly updatedAt: string;
  readonly maxObservations: number;
  readonly lineageOwnership: Readonly<Record<string, LearnerLineageOwnership>>;
  readonly observations: readonly LearnerDecisionObservation[];
}

export interface LearnerProgressCounts {
  readonly best: number;
  readonly reasonable: number;
  readonly mistake: number;
  readonly majorMistake: number;
  readonly unclassified: number;
  readonly totalEligible: number;
  readonly totalClassified: number;
  readonly bestOrReasonable: number;
}

export type LearnerProgressTrend =
  | {
      readonly status: "insufficient-evidence";
      readonly reason:
        "not-enough-observations" | "insufficient-classified-observations" | "incompatible-policy";
      readonly recentWindowSize: number;
      readonly previousWindowSize: number;
      readonly recentClassifiedCount: number;
      readonly previousClassifiedCount: number;
    }
  | {
      readonly status: "supported";
      readonly recentWindowSize: number;
      readonly previousWindowSize: number;
      readonly recentClassifiedCount: number;
      readonly previousClassifiedCount: number;
      readonly recentBestOrReasonableShare: number;
      readonly previousBestOrReasonableShare: number;
      readonly recentMajorMistakeShare: number;
      readonly previousMajorMistakeShare: number;
      readonly bestOrReasonableShareDelta: number;
      readonly majorMistakeShareDelta: number;
      readonly recentMajorMistakeCount: number;
      readonly previousMajorMistakeCount: number;
      readonly majorMistakeCountDelta: number;
    };

export interface LearnerProgressSnapshot {
  readonly policyId: typeof MOVE_CLASSIFICATION_POLICY.id;
  readonly policyVersion: string;
  readonly compatibilityMode: "current-policy-only";
  readonly recentWindowSize: number;
  readonly maxObservations: number;
  readonly counts: {
    readonly fullProfile: LearnerProgressCounts;
    readonly recentWindow: LearnerProgressCounts;
  };
  readonly gamesRepresented: {
    readonly fullProfile: number;
    readonly recentWindow: number;
  };
  readonly coverage: {
    readonly fullProfileClassifiedRatio: number;
    readonly recentWindowClassifiedRatio: number;
  };
  readonly trend: LearnerProgressTrend;
  readonly patterns: LearnerPatternSummary;
  readonly limitations: readonly string[];
}

export type ParseLearnerProfileFailureReason =
  "invalid-json" | "wrong-format" | "unsupported-version" | "invalid-structure";

export type ParseLearnerProfileResult =
  | {
      readonly ok: true;
      readonly profile: LearnerProfile;
    }
  | {
      readonly ok: false;
      readonly reason: ParseLearnerProfileFailureReason;
      readonly message: string;
    };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isIsoTimestamp = (value: unknown): value is string => {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
};

const isOwnershipMode = (value: unknown): value is LearnerOwnershipMode => {
  return value === "white" || value === "black" || value === "both" || value === "unknown";
};

const isFiniteNonNegativeNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
};

const isPositiveInteger = (value: unknown): value is number => {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
};

const cloneOwnershipMap = (
  value: Readonly<Record<string, LearnerLineageOwnership>>
): Readonly<Record<string, LearnerLineageOwnership>> => {
  const sortedEntries = Object.entries(value)
    .filter(([lineageId, ownership]) => {
      return (
        lineageId.trim().length > 0 &&
        isOwnershipMode(ownership.mode) &&
        isIsoTimestamp(ownership.resolvedAt)
      );
    })
    .sort(([left], [right]) => left.localeCompare(right));

  return Object.fromEntries(
    sortedEntries.map(([lineageId, ownership]) => [
      lineageId,
      {
        mode: ownership.mode,
        resolvedAt: ownership.resolvedAt
      }
    ])
  );
};

const observationSortKey = (observation: LearnerDecisionObservation): string => {
  return `${observation.observedAt}|${observation.observationId}`;
};

const normalizePatternSignals = (
  signals: readonly LearnerPatternSignal[]
): readonly LearnerPatternSignal[] => {
  const byId = new Map<string, LearnerPatternSignal>();
  for (const signal of signals) {
    byId.set(signal.signalId, signal);
  }

  return [...byId.values()].sort((left, right) => left.signalId.localeCompare(right.signalId));
};

const sortObservationsAscending = (
  observations: readonly LearnerDecisionObservation[]
): readonly LearnerDecisionObservation[] => {
  return [...observations].sort((left, right) => {
    const leftKey = observationSortKey(left);
    const rightKey = observationSortKey(right);
    if (leftKey !== rightKey) {
      return leftKey.localeCompare(rightKey);
    }

    return left.observationId.localeCompare(right.observationId);
  });
};

const toObservationId = (input: {
  lineageId: string;
  turnNumber: number;
  actingSide: "white" | "black";
  playedMoveFingerprint: string;
  policyId: string;
  policyVersion: string;
}): string => {
  return [
    "learner-observation-v1",
    input.lineageId,
    String(input.turnNumber),
    input.actingSide,
    input.playedMoveFingerprint,
    input.policyId,
    input.policyVersion
  ].join("|");
};

const toObservationClassification = (
  classification: CoachMoveClassification
): LearnerObservationClassification => {
  if (classification.status === "classified") {
    return {
      status: "classified",
      label: classification.label,
      normalizedLossFromBest: classification.normalizedLossFromBest,
      playedMoveRank: classification.playedMoveRank,
      isTieForBest: classification.isTieForBest,
      tieWithinTolerance: classification.tieWithinTolerance
    };
  }

  return {
    status: "unclassified",
    reason: classification.reason
  };
};

const observationPreference = (observation: LearnerDecisionObservation): number => {
  if (observation.classification.status === "classified") {
    return 100 + observation.patternSignals.length;
  }

  return observation.patternSignals.length;
};

const choosePreferredObservation = (
  left: LearnerDecisionObservation,
  right: LearnerDecisionObservation
): LearnerDecisionObservation => {
  const leftPreference = observationPreference(left);
  const rightPreference = observationPreference(right);
  if (leftPreference !== rightPreference) {
    return leftPreference > rightPreference ? left : right;
  }

  if (left.observedAt !== right.observedAt) {
    return left.observedAt > right.observedAt ? left : right;
  }

  return left.observationId >= right.observationId ? left : right;
};

const normalizeProfile = (profile: LearnerProfile): LearnerProfile => {
  const maxObservations = Math.max(1, Math.floor(profile.maxObservations));
  const normalizedObservations = sortObservationsAscending(profile.observations).slice(
    -maxObservations
  );

  return {
    format: LEARNER_PROFILE_FORMAT,
    version: LEARNER_PROFILE_VERSION,
    updatedAt: profile.updatedAt,
    maxObservations,
    lineageOwnership: cloneOwnershipMap(profile.lineageOwnership),
    observations: normalizedObservations
  };
};

const computeCounts = (
  observations: readonly LearnerDecisionObservation[]
): LearnerProgressCounts => {
  let best = 0;
  let reasonable = 0;
  let mistake = 0;
  let majorMistake = 0;
  let unclassified = 0;
  let totalEligible = 0;
  let totalClassified = 0;
  let bestOrReasonable = 0;

  for (const observation of observations) {
    totalEligible += 1;
    if (observation.classification.status === "unclassified") {
      unclassified += 1;
      continue;
    }

    totalClassified += 1;
    if (observation.classification.label === "best") {
      best += 1;
      bestOrReasonable += 1;
    } else if (observation.classification.label === "reasonable") {
      reasonable += 1;
      bestOrReasonable += 1;
    } else if (observation.classification.label === "mistake") {
      mistake += 1;
    } else {
      majorMistake += 1;
    }
  }

  return {
    best,
    reasonable,
    mistake,
    majorMistake,
    unclassified,
    totalEligible,
    totalClassified,
    bestOrReasonable
  };
};

const toRatio = (numerator: number, denominator: number): number => {
  if (denominator <= 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(6));
};

const toTrend = (input: {
  recent: readonly LearnerDecisionObservation[];
  previous: readonly LearnerDecisionObservation[];
  recentWindowSize: number;
}): LearnerProgressTrend => {
  if (input.recent.length === 0 || input.previous.length === 0) {
    return {
      status: "insufficient-evidence",
      reason: "not-enough-observations",
      recentWindowSize: input.recent.length,
      previousWindowSize: input.previous.length,
      recentClassifiedCount: computeCounts(input.recent).totalClassified,
      previousClassifiedCount: computeCounts(input.previous).totalClassified
    };
  }

  const recentCounts = computeCounts(input.recent);
  const previousCounts = computeCounts(input.previous);
  if (
    recentCounts.totalClassified < MIN_CLASSIFIED_FOR_TREND ||
    previousCounts.totalClassified < MIN_CLASSIFIED_FOR_TREND
  ) {
    return {
      status: "insufficient-evidence",
      reason: "insufficient-classified-observations",
      recentWindowSize: input.recent.length,
      previousWindowSize: input.previous.length,
      recentClassifiedCount: recentCounts.totalClassified,
      previousClassifiedCount: previousCounts.totalClassified
    };
  }

  const recentBestOrReasonableShare = toRatio(
    recentCounts.bestOrReasonable,
    recentCounts.totalClassified
  );
  const previousBestOrReasonableShare = toRatio(
    previousCounts.bestOrReasonable,
    previousCounts.totalClassified
  );
  const recentMajorMistakeShare = toRatio(recentCounts.majorMistake, recentCounts.totalClassified);
  const previousMajorMistakeShare = toRatio(
    previousCounts.majorMistake,
    previousCounts.totalClassified
  );

  return {
    status: "supported",
    recentWindowSize: input.recent.length,
    previousWindowSize: input.previous.length,
    recentClassifiedCount: recentCounts.totalClassified,
    previousClassifiedCount: previousCounts.totalClassified,
    recentBestOrReasonableShare,
    previousBestOrReasonableShare,
    recentMajorMistakeShare,
    previousMajorMistakeShare,
    bestOrReasonableShareDelta: Number(
      (recentBestOrReasonableShare - previousBestOrReasonableShare).toFixed(6)
    ),
    majorMistakeShareDelta: Number(
      (recentMajorMistakeShare - previousMajorMistakeShare).toFixed(6)
    ),
    recentMajorMistakeCount: recentCounts.majorMistake,
    previousMajorMistakeCount: previousCounts.majorMistake,
    majorMistakeCountDelta: recentCounts.majorMistake - previousCounts.majorMistake
  };
};

const failParse = (
  reason: ParseLearnerProfileFailureReason,
  message: string
): ParseLearnerProfileResult => {
  return {
    ok: false,
    reason,
    message
  };
};

const parseObservation = (value: unknown): LearnerDecisionObservation | null => {
  if (!isRecord(value)) {
    return null;
  }

  const turnNumber = value.turnNumber;

  if (
    !isNonEmptyString(value.observationId) ||
    !isNonEmptyString(value.lineageId) ||
    !isPositiveInteger(turnNumber) ||
    (value.actingSide !== "white" && value.actingSide !== "black") ||
    !isNonEmptyString(value.playedMoveFingerprint) ||
    (value.learnerOwnershipAtObservation !== "white" &&
      value.learnerOwnershipAtObservation !== "black") ||
    !isIsoTimestamp(value.observedAt) ||
    value.source !== "committed-turn" ||
    value.policyId !== MOVE_CLASSIFICATION_POLICY.id ||
    !isNonEmptyString(value.policyVersion)
  ) {
    return null;
  }

  const classificationValue = value.classification;
  if (!isRecord(classificationValue) || !isNonEmptyString(classificationValue.status)) {
    return null;
  }

  let classification: LearnerObservationClassification;
  if (classificationValue.status === "classified") {
    const playedMoveRank = classificationValue.playedMoveRank;
    if (
      !isNonEmptyString(classificationValue.label) ||
      (classificationValue.label !== "best" &&
        classificationValue.label !== "reasonable" &&
        classificationValue.label !== "mistake" &&
        classificationValue.label !== "major mistake") ||
      !isFiniteNonNegativeNumber(classificationValue.normalizedLossFromBest) ||
      !isPositiveInteger(playedMoveRank) ||
      typeof classificationValue.isTieForBest !== "boolean" ||
      typeof classificationValue.tieWithinTolerance !== "boolean"
    ) {
      return null;
    }

    classification = {
      status: "classified",
      label: classificationValue.label,
      normalizedLossFromBest: classificationValue.normalizedLossFromBest,
      playedMoveRank,
      isTieForBest: classificationValue.isTieForBest,
      tieWithinTolerance: classificationValue.tieWithinTolerance
    };
  } else if (classificationValue.status === "unclassified") {
    if (!isNonEmptyString(classificationValue.reason)) {
      return null;
    }

    const reason = classificationValue.reason;
    if (
      reason !== "unsupported-turn-kind" &&
      reason !== "missing-ranked-analysis" &&
      reason !== "evaluation-failed" &&
      reason !== "evaluation-unavailable" &&
      reason !== "unsupported-analysis-source" &&
      reason !== "fixture-provenance" &&
      reason !== "partial-coverage" &&
      reason !== "played-move-not-evaluated" &&
      reason !== "unsupported-score-scale" &&
      reason !== "missing-best-evaluated-move" &&
      reason !== "invalid-loss-from-best"
    ) {
      return null;
    }

    classification = {
      status: "unclassified",
      reason
    };
  } else {
    return null;
  }

  const analysisKind =
    value.analysisKind === "evaluated" || value.analysisKind === "no-legal-moves"
      ? value.analysisKind
      : value.analysisKind === "missing"
        ? "missing"
        : null;
  if (analysisKind === null) {
    return null;
  }

  const evaluatorCoverage =
    value.evaluatorCoverage === "complete" || value.evaluatorCoverage === "partial"
      ? value.evaluatorCoverage
      : undefined;
  const evaluatorProvenance = (() => {
    if (!isRecord(value.evaluatorProvenance)) {
      return undefined;
    }

    if (
      !isNonEmptyString(value.evaluatorProvenance.provider) ||
      !isNonEmptyString(value.evaluatorProvenance.providerVersion) ||
      !isNonEmptyString(value.evaluatorProvenance.adapterVersion)
    ) {
      return undefined;
    }

    return {
      provider: value.evaluatorProvenance.provider,
      providerVersion: value.evaluatorProvenance.providerVersion,
      adapterVersion: value.evaluatorProvenance.adapterVersion
    };
  })();

  const patternPolicyId =
    typeof value.patternPolicyId === "string" ? value.patternPolicyId : PATTERN_DETECTION_POLICY.id;
  const patternPolicyVersion =
    typeof value.patternPolicyVersion === "string"
      ? value.patternPolicyVersion
      : PATTERN_DETECTION_POLICY.version;
  const patternSignals = (() => {
    if (!Array.isArray(value.patternSignals)) {
      return [] as LearnerPatternSignal[];
    }

    const signals: LearnerPatternSignal[] = [];
    for (const signal of value.patternSignals) {
      if (!isRecord(signal)) {
        return null;
      }

      const detectorId = signal.detectorId;
      const skillArea = signal.skillArea;
      if (!isRecord(signal.evidence)) {
        return null;
      }
      const evidenceValue = signal.evidence;
      const evidenceKind = evidenceValue.kind;
      if (
        detectorId !== "avoidable-blot-exposure" &&
        detectorId !== "missed-point-making-opportunity" &&
        detectorId !== "missed-hit-opportunity"
      ) {
        return null;
      }
      if (
        skillArea !== "safety-versus-risk" &&
        skillArea !== "making-points" &&
        skillArea !== "hitting-and-tempo"
      ) {
        return null;
      }

      if (
        !isNonEmptyString(signal.signalId) ||
        !isNonEmptyString(signal.observationId) ||
        signal.observationId !== value.observationId ||
        signal.detectorVersion !== "1.0.0" ||
        !isNonEmptyString(signal.displayName) ||
        !isNonEmptyString(signal.lineageId) ||
        !isPositiveInteger(signal.turnNumber) ||
        (signal.actingSide !== "white" && signal.actingSide !== "black") ||
        !isNonEmptyString(signal.playedMoveFingerprint) ||
        !isNonEmptyString(signal.strongerMoveFingerprint) ||
        (signal.moveClassificationLabel !== "mistake" &&
          signal.moveClassificationLabel !== "major mistake") ||
        !isFiniteNonNegativeNumber(signal.normalizedLossFromBest) ||
        !isIsoTimestamp(signal.observedAt) ||
        !Array.isArray(signal.limitations)
      ) {
        return null;
      }

      if (detectorId !== evidenceKind) {
        return null;
      }

      let evidence: LearnerPatternSignal["evidence"];
      if (evidenceKind === "avoidable-blot-exposure") {
        if (
          !isFiniteNonNegativeNumber(evidenceValue.playedBlotCount) ||
          !isFiniteNonNegativeNumber(evidenceValue.strongerBlotCount) ||
          !isFiniteNonNegativeNumber(evidenceValue.additionalExposedBlots)
        ) {
          return null;
        }

        evidence = {
          kind: "avoidable-blot-exposure",
          playedBlotCount: evidenceValue.playedBlotCount,
          strongerBlotCount: evidenceValue.strongerBlotCount,
          additionalExposedBlots: evidenceValue.additionalExposedBlots
        };
      } else if (evidenceKind === "missed-point-making-opportunity") {
        if (
          !isFiniteNonNegativeNumber(evidenceValue.playedMadePointCount) ||
          !isFiniteNonNegativeNumber(evidenceValue.strongerMadePointCount) ||
          !isFiniteNonNegativeNumber(evidenceValue.playedHomeBoardPointCount) ||
          !isFiniteNonNegativeNumber(evidenceValue.strongerHomeBoardPointCount) ||
          !isFiniteNonNegativeNumber(evidenceValue.additionalMadePoints) ||
          !isFiniteNonNegativeNumber(evidenceValue.additionalHomeBoardPoints)
        ) {
          return null;
        }

        evidence = {
          kind: "missed-point-making-opportunity",
          playedMadePointCount: evidenceValue.playedMadePointCount,
          strongerMadePointCount: evidenceValue.strongerMadePointCount,
          playedHomeBoardPointCount: evidenceValue.playedHomeBoardPointCount,
          strongerHomeBoardPointCount: evidenceValue.strongerHomeBoardPointCount,
          additionalMadePoints: evidenceValue.additionalMadePoints,
          additionalHomeBoardPoints: evidenceValue.additionalHomeBoardPoints
        };
      } else {
        if (
          !isFiniteNonNegativeNumber(evidenceValue.playedHitCount) ||
          !isFiniteNonNegativeNumber(evidenceValue.strongerHitCount) ||
          !isFiniteNonNegativeNumber(evidenceValue.missedHits)
        ) {
          return null;
        }

        evidence = {
          kind: "missed-hit-opportunity",
          playedHitCount: evidenceValue.playedHitCount,
          strongerHitCount: evidenceValue.strongerHitCount,
          missedHits: evidenceValue.missedHits
        };
      }

      signals.push({
        signalId: signal.signalId,
        observationId: signal.observationId,
        detectorId,
        detectorVersion: signal.detectorVersion,
        displayName: signal.displayName,
        skillArea,
        lineageId: signal.lineageId,
        turnNumber: signal.turnNumber,
        actingSide: signal.actingSide,
        playedMoveFingerprint: signal.playedMoveFingerprint,
        strongerMoveFingerprint: signal.strongerMoveFingerprint,
        moveClassificationLabel: signal.moveClassificationLabel,
        normalizedLossFromBest: signal.normalizedLossFromBest,
        observedAt: signal.observedAt,
        evidence,
        limitations: signal.limitations.filter((item): item is string => typeof item === "string")
      });
    }

    return normalizePatternSignals(signals);
  })();
  if (patternSignals === null) {
    return null;
  }

  return {
    observationId: value.observationId,
    lineageId: value.lineageId,
    ...(isNonEmptyString(value.gameReference) ? { gameReference: value.gameReference } : {}),
    turnNumber,
    actingSide: value.actingSide,
    playedMoveFingerprint: value.playedMoveFingerprint,
    learnerOwnershipAtObservation: value.learnerOwnershipAtObservation,
    observedAt: value.observedAt,
    source: "committed-turn",
    policyId: MOVE_CLASSIFICATION_POLICY.id,
    policyVersion: value.policyVersion,
    patternPolicyId,
    patternPolicyVersion,
    patternSignals,
    classification,
    analysisKind,
    ...(evaluatorCoverage === undefined ? {} : { evaluatorCoverage }),
    ...(evaluatorProvenance === undefined
      ? {}
      : {
          evaluatorProvenance
        })
  };
};

export const createLearnerProfile = (input: {
  updatedAt: string;
  maxObservations?: number;
}): LearnerProfile => {
  const maxObservations = Math.max(
    1,
    Math.floor(input.maxObservations ?? DEFAULT_MAX_OBSERVATIONS)
  );
  return {
    format: LEARNER_PROFILE_FORMAT,
    version: LEARNER_PROFILE_VERSION,
    updatedAt: input.updatedAt,
    maxObservations,
    lineageOwnership: {},
    observations: []
  };
};

export const getLineageOwnershipMode = (
  profile: LearnerProfile,
  lineageId: string
): LearnerOwnershipMode => {
  return profile.lineageOwnership[lineageId]?.mode ?? "unknown";
};

export const setLineageOwnership = (input: {
  profile: LearnerProfile;
  lineageId: string;
  mode: LearnerOwnershipMode;
  resolvedAt: string;
}): LearnerProfile => {
  const lineageId = input.lineageId.trim();
  if (lineageId.length === 0 || !isIsoTimestamp(input.resolvedAt)) {
    return normalizeProfile(input.profile);
  }

  const nextOwnership: Record<string, LearnerLineageOwnership> = {
    ...input.profile.lineageOwnership,
    [lineageId]: {
      mode: input.mode,
      resolvedAt: input.resolvedAt
    }
  };

  return normalizeProfile({
    ...input.profile,
    updatedAt: input.resolvedAt,
    lineageOwnership: nextOwnership
  });
};

export const clearLearnerProfile = (input: {
  updatedAt: string;
  maxObservations?: number;
}): LearnerProfile => {
  return createLearnerProfile(input);
};

export const ingestCommittedLearnerObservation = (input: {
  profile: LearnerProfile;
  lineageId: string;
  gameReference?: string;
  ownershipMode: LearnerOwnershipMode;
  committedTurn: TurnRecord;
  rankedAnalysis?: RankedLegalMoveAnalysis;
  observedAt: string;
}): {
  readonly profile: LearnerProfile;
  readonly ingested: boolean;
  readonly reason?:
    | "unknown-ownership"
    | "both-sides"
    | "opponent-turn"
    | "unsupported-turn-kind"
    | "missing-lineage-id"
    | "invalid-timestamp"
    | "fixture-demonstration";
} => {
  const lineageId = input.lineageId.trim();
  if (lineageId.length === 0) {
    return {
      profile: normalizeProfile(input.profile),
      ingested: false,
      reason: "missing-lineage-id"
    };
  }

  if (!isIsoTimestamp(input.observedAt)) {
    return {
      profile: normalizeProfile(input.profile),
      ingested: false,
      reason: "invalid-timestamp"
    };
  }

  if (input.ownershipMode === "unknown") {
    return {
      profile: normalizeProfile(input.profile),
      ingested: false,
      reason: "unknown-ownership"
    };
  }

  if (input.ownershipMode === "both") {
    return {
      profile: normalizeProfile(input.profile),
      ingested: false,
      reason: "both-sides"
    };
  }

  if (input.committedTurn.player !== input.ownershipMode) {
    return {
      profile: normalizeProfile(input.profile),
      ingested: false,
      reason: "opponent-turn"
    };
  }

  if (input.committedTurn.outcome.kind !== "move") {
    return {
      profile: normalizeProfile(input.profile),
      ingested: false,
      reason: "unsupported-turn-kind"
    };
  }

  if (
    input.rankedAnalysis?.kind === "evaluated" &&
    isFixtureEvaluator(input.rankedAnalysis.provenance.provider)
  ) {
    return {
      profile: normalizeProfile(input.profile),
      ingested: false,
      reason: "fixture-demonstration"
    };
  }

  const playedMoveFingerprint = getMoveFingerprint(input.committedTurn.outcome.move);
  const classification = classifyCommittedMove({
    playedMoveFingerprint,
    ...(input.rankedAnalysis === undefined ? {} : { rankedAnalysis: input.rankedAnalysis }),
    analysisSource: input.rankedAnalysis === undefined ? "missing" : "analysis-record"
  });

  const observationId = toObservationId({
    lineageId,
    turnNumber: input.committedTurn.turnNumber,
    actingSide: input.committedTurn.player,
    playedMoveFingerprint,
    policyId: classification.policyId,
    policyVersion: classification.policyVersion
  });

  const nextObservation: LearnerDecisionObservation = {
    observationId,
    lineageId,
    ...(input.gameReference === undefined || input.gameReference.trim().length === 0
      ? {}
      : { gameReference: input.gameReference.trim() }),
    turnNumber: input.committedTurn.turnNumber,
    actingSide: input.committedTurn.player,
    playedMoveFingerprint,
    learnerOwnershipAtObservation: input.ownershipMode,
    observedAt: input.observedAt,
    source: "committed-turn",
    policyId: classification.policyId,
    policyVersion: classification.policyVersion,
    patternPolicyId: PATTERN_DETECTION_POLICY.id,
    patternPolicyVersion: PATTERN_DETECTION_POLICY.version,
    patternSignals: normalizePatternSignals(
      deriveLearnerPatternSignals({
        observationId,
        lineageId,
        turnNumber: input.committedTurn.turnNumber,
        actingSide: input.committedTurn.player,
        observedAt: input.observedAt,
        playedMoveFingerprint,
        classification,
        ...(input.rankedAnalysis === undefined ? {} : { rankedAnalysis: input.rankedAnalysis })
      })
    ),
    classification: toObservationClassification(classification),
    analysisKind:
      input.rankedAnalysis === undefined
        ? "missing"
        : input.rankedAnalysis.kind === "evaluated"
          ? "evaluated"
          : "no-legal-moves",
    ...(input.rankedAnalysis?.kind === "evaluated"
      ? {
          evaluatorCoverage: input.rankedAnalysis.coverage,
          evaluatorProvenance: {
            provider: input.rankedAnalysis.provenance.provider,
            providerVersion: input.rankedAnalysis.provenance.providerVersion,
            adapterVersion: input.rankedAnalysis.provenance.adapterVersion
          }
        }
      : {})
  };

  const byId = new Map<string, LearnerDecisionObservation>();
  for (const observation of input.profile.observations) {
    byId.set(observation.observationId, observation);
  }

  const existing = byId.get(observationId);
  byId.set(
    observationId,
    existing === undefined ? nextObservation : choosePreferredObservation(existing, nextObservation)
  );

  const merged = sortObservationsAscending([...byId.values()]).slice(
    -input.profile.maxObservations
  );
  const changed =
    existing === undefined || JSON.stringify(existing) !== JSON.stringify(byId.get(observationId));

  if (!changed) {
    return {
      profile: normalizeProfile(input.profile),
      ingested: false
    };
  }

  return {
    profile: normalizeProfile({
      ...input.profile,
      updatedAt: input.observedAt,
      observations: merged
    }),
    ingested: true
  };
};

export const summarizeLearnerProgress = (
  profile: LearnerProfile,
  options?: {
    recentWindowSize?: number;
  }
): LearnerProgressSnapshot => {
  const normalized = normalizeProfile(profile);
  const recentWindowSize = Math.max(
    1,
    Math.floor(options?.recentWindowSize ?? DEFAULT_RECENT_WINDOW_SIZE)
  );
  const compatible = sortObservationsAscending(
    normalized.observations.filter(
      (observation) =>
        observation.policyId === MOVE_CLASSIFICATION_POLICY.id &&
        observation.policyVersion === MOVE_CLASSIFICATION_POLICY.version
    )
  );

  const incompatibleCount = normalized.observations.length - compatible.length;
  const fullCounts = computeCounts(compatible);
  const recent = compatible.slice(-recentWindowSize);
  const previous = compatible.slice(-(recentWindowSize * 2), -recentWindowSize);
  const recentCounts = computeCounts(recent);

  const limitations: string[] = [];
  if (incompatibleCount > 0) {
    limitations.push(
      `${incompatibleCount} stored observations use an incompatible classification policy and are excluded from current aggregates.`
    );
  }
  if (compatible.length === 0) {
    limitations.push("No compatible learner observations are available yet.");
  }
  if (recent.length < recentWindowSize) {
    limitations.push(
      `Recent window includes ${recent.length} of ${recentWindowSize} target observations.`
    );
  }
  if (fullCounts.totalClassified === 0) {
    limitations.push("No formally classified learner decisions are available yet.");
  }

  const patterns = summarizeLearnerPatterns({
    observations: compatible.map((observation) => ({
      lineageId: observation.lineageId,
      turnNumber: observation.turnNumber,
      actingSide: observation.actingSide,
      observedAt: observation.observedAt,
      classification:
        observation.classification.status === "classified"
          ? {
              status: "classified" as const,
              label: observation.classification.label
            }
          : {
              status: "unclassified" as const
            },
      patternPolicyId: observation.patternPolicyId,
      patternPolicyVersion: observation.patternPolicyVersion,
      patternSignals: observation.patternSignals
    })),
    recentWindowSize
  });

  limitations.push(...patterns.limitations);

  return {
    policyId: MOVE_CLASSIFICATION_POLICY.id,
    policyVersion: MOVE_CLASSIFICATION_POLICY.version,
    compatibilityMode: "current-policy-only",
    recentWindowSize,
    maxObservations: normalized.maxObservations,
    counts: {
      fullProfile: fullCounts,
      recentWindow: recentCounts
    },
    gamesRepresented: {
      fullProfile: new Set(compatible.map((observation) => observation.lineageId)).size,
      recentWindow: new Set(recent.map((observation) => observation.lineageId)).size
    },
    coverage: {
      fullProfileClassifiedRatio: toRatio(fullCounts.totalClassified, fullCounts.totalEligible),
      recentWindowClassifiedRatio: toRatio(recentCounts.totalClassified, recentCounts.totalEligible)
    },
    trend: toTrend({
      recent,
      previous,
      recentWindowSize
    }),
    patterns,
    limitations
  };
};

export const serializeLearnerProfile = (profile: LearnerProfile): LearnerProfile => {
  return normalizeProfile(profile);
};

export const encodeLearnerProfile = (profile: LearnerProfile): string => {
  return JSON.stringify(serializeLearnerProfile(profile));
};

export const parseLearnerProfile = (input: unknown): ParseLearnerProfileResult => {
  if (!isRecord(input)) {
    return failParse("invalid-structure", "Learner profile must be an object.");
  }

  if (input.format !== LEARNER_PROFILE_FORMAT) {
    return failParse("wrong-format", "Learner profile format is not recognized.");
  }

  if (!Number.isInteger(input.version)) {
    return failParse("invalid-structure", "Learner profile version must be an integer.");
  }

  if (input.version !== LEARNER_PROFILE_VERSION) {
    return failParse("unsupported-version", "Learner profile version is not supported.");
  }

  if (!isIsoTimestamp(input.updatedAt)) {
    return failParse("invalid-structure", "Learner profile updatedAt must be a valid timestamp.");
  }

  const maxObservations = input.maxObservations;
  if (!isPositiveInteger(maxObservations)) {
    return failParse(
      "invalid-structure",
      "Learner profile maxObservations must be a positive integer."
    );
  }

  if (!isRecord(input.lineageOwnership)) {
    return failParse(
      "invalid-structure",
      "Learner profile lineageOwnership must be an object map."
    );
  }

  const lineageOwnershipEntries = Object.entries(input.lineageOwnership);
  const lineageOwnership: Record<string, LearnerLineageOwnership> = {};
  for (const [lineageId, ownershipValue] of lineageOwnershipEntries) {
    if (!isNonEmptyString(lineageId) || !isRecord(ownershipValue)) {
      return failParse(
        "invalid-structure",
        "Learner profile lineage ownership entries are invalid."
      );
    }

    if (!isOwnershipMode(ownershipValue.mode) || !isIsoTimestamp(ownershipValue.resolvedAt)) {
      return failParse(
        "invalid-structure",
        "Learner profile lineage ownership values are invalid."
      );
    }

    lineageOwnership[lineageId] = {
      mode: ownershipValue.mode,
      resolvedAt: ownershipValue.resolvedAt
    };
  }

  if (!Array.isArray(input.observations)) {
    return failParse("invalid-structure", "Learner profile observations must be an array.");
  }

  const observations: LearnerDecisionObservation[] = [];
  for (const item of input.observations) {
    const parsed = parseObservation(item);
    if (parsed === null) {
      return failParse("invalid-structure", "Learner profile observation entry is invalid.");
    }
    observations.push(parsed);
  }

  return {
    ok: true,
    profile: normalizeProfile({
      format: LEARNER_PROFILE_FORMAT,
      version: LEARNER_PROFILE_VERSION,
      updatedAt: input.updatedAt,
      maxObservations,
      lineageOwnership,
      observations
    })
  };
};

export const decodeLearnerProfile = (text: string): ParseLearnerProfileResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return failParse("invalid-json", "Learner profile text is not valid JSON.");
  }

  return parseLearnerProfile(parsed);
};
