import {
  getMoveFingerprint,
  type LegalMoveOutcome,
  type Player
} from "@backgammon-trainer/backgammon-analysis";

import { gnuPointToEnginePoint } from "./translation.js";

export interface GnuBgParsedMoveStep {
  readonly kind: "point-to-point" | "enter-from-bar" | "bear-off";
  readonly fromPoint: number | "bar";
  readonly toPoint: number | "off";
  readonly hitsBlot: boolean;
}

export interface GnuBgParsedMove {
  readonly notation: string;
  readonly steps: readonly GnuBgParsedMoveStep[];
}

export type ParseGnuBgMoveNotationResult =
  | {
      readonly ok: true;
      readonly move: GnuBgParsedMove;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

export type MatchGnuBgMoveToLegalOutcomeResult =
  | {
      readonly ok: true;
      readonly moveFingerprint: string;
      readonly outcome: LegalMoveOutcome;
    }
  | {
      readonly ok: false;
      readonly reason: "unknown-move" | "ambiguous-move";
      readonly message: string;
      readonly candidateFingerprints: readonly string[];
    };

const MOVE_TOKEN_PATTERN = /^(bar|[1-9]|1\d|2[0-4])\/(off|[1-9]|1\d|2[0-4])(\*)?(?:\(([1-4])\))?$/i;

const normalizeNotation = (notation: string): string => {
  return notation
    .trim()
    .split(/[\s,]+/)
    .filter((token) => token.length > 0)
    .join(" ");
};

const parsePointToken = (token: string, playerOnRoll: Player): number | "bar" | "off" => {
  if (token === "bar" || token === "off") {
    return token;
  }

  return gnuPointToEnginePoint(playerOnRoll, Number.parseInt(token, 10));
};

export const parseGnuBgMoveNotation = (
  notation: string,
  playerOnRoll: Player
): ParseGnuBgMoveNotationResult => {
  const normalizedNotation = normalizeNotation(notation);

  if (normalizedNotation.length === 0) {
    return {
      ok: false,
      message: "GNU move notation is empty."
    };
  }

  const steps: GnuBgParsedMoveStep[] = [];

  for (const token of normalizedNotation.split(" ")) {
    const match = MOVE_TOKEN_PATTERN.exec(token);

    if (match === null) {
      return {
        ok: false,
        message: `GNU move token is malformed: ${token}.`
      };
    }

    const fromPoint = parsePointToken(match[1]!.toLowerCase(), playerOnRoll);
    const toPoint = parsePointToken(match[2]!.toLowerCase(), playerOnRoll);
    const hitsBlot = match[3] === "*";
    const repeatCount = match[4] === undefined ? 1 : Number.parseInt(match[4], 10);

    if (fromPoint === "off") {
      return {
        ok: false,
        message: `GNU move token cannot start from off: ${token}.`
      };
    }

    if (toPoint === "bar") {
      return {
        ok: false,
        message: `GNU move token cannot end on bar: ${token}.`
      };
    }

    if (fromPoint === "bar" && toPoint === "off") {
      return {
        ok: false,
        message: `GNU move token cannot go directly from bar to off: ${token}.`
      };
    }

    if (!Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 4) {
      return {
        ok: false,
        message: `GNU move token repeat count is unsupported: ${token}.`
      };
    }

    if (hitsBlot && repeatCount > 1) {
      return {
        ok: false,
        message: `GNU move token cannot combine hit and repeat count: ${token}.`
      };
    }

    for (let index = 0; index < repeatCount; index += 1) {
      steps.push({
        kind:
          fromPoint === "bar"
            ? "enter-from-bar"
            : toPoint === "off"
              ? "bear-off"
              : "point-to-point",
        fromPoint,
        toPoint,
        hitsBlot
      });
    }
  }

  return {
    ok: true,
    move: {
      notation: normalizedNotation,
      steps
    }
  };
};

const stepMatches = (
  candidate: LegalMoveOutcome["move"]["steps"][number],
  parsed: GnuBgParsedMoveStep
): boolean => {
  return (
    candidate.kind === parsed.kind &&
    candidate.fromPoint === parsed.fromPoint &&
    candidate.toPoint === parsed.toPoint &&
    candidate.hitsBlot === parsed.hitsBlot
  );
};

const positionsEqual = (
  left: LegalMoveOutcome["positionAfter"],
  right: LegalMoveOutcome["positionAfter"]
): boolean => {
  if (left.bar.white !== right.bar.white || left.bar.black !== right.bar.black) {
    return false;
  }

  if (
    left.borneOff.white !== right.borneOff.white ||
    left.borneOff.black !== right.borneOff.black
  ) {
    return false;
  }

  for (let point = 1; point <= 24; point += 1) {
    const key = point as keyof typeof left.points;
    const leftOccupancy = left.points[key];
    const rightOccupancy = right.points[key];

    if (leftOccupancy === null || rightOccupancy === null) {
      if (leftOccupancy !== rightOccupancy) {
        return false;
      }

      continue;
    }

    if (
      leftOccupancy.player !== rightOccupancy.player ||
      leftOccupancy.checkerCount !== rightOccupancy.checkerCount
    ) {
      return false;
    }
  }

  return true;
};

const canCollapseMatch = (
  candidateSteps: readonly LegalMoveOutcome["move"]["steps"][number][],
  parsedSteps: readonly GnuBgParsedMoveStep[]
): boolean => {
  let candidateIndex = 0;

  for (const parsedStep of parsedSteps) {
    if (candidateIndex >= candidateSteps.length) {
      return false;
    }

    const groupStart = candidateIndex;
    if (candidateSteps[groupStart]!.fromPoint !== parsedStep.fromPoint) {
      return false;
    }

    let foundGroup = false;
    let sawIntermediateHit = false;

    for (let groupEnd = groupStart; groupEnd < candidateSteps.length; groupEnd += 1) {
      const step = candidateSteps[groupEnd]!;

      if (groupEnd > groupStart && candidateSteps[groupEnd - 1]!.toPoint !== step.fromPoint) {
        break;
      }

      if (step.toPoint !== parsedStep.toPoint) {
        if (groupEnd > groupStart && step.hitsBlot) {
          sawIntermediateHit = true;
        }

        continue;
      }

      if (sawIntermediateHit || step.hitsBlot !== parsedStep.hitsBlot) {
        continue;
      }

      candidateIndex = groupEnd + 1;
      foundGroup = true;
      break;
    }

    if (!foundGroup) {
      return false;
    }
  }

  return candidateIndex === candidateSteps.length;
};

const resolveCandidateOutcome = (
  parsedMove: GnuBgParsedMove,
  matchingOutcomes: readonly LegalMoveOutcome[]
): MatchGnuBgMoveToLegalOutcomeResult => {
  if (matchingOutcomes.length === 0) {
    return {
      ok: false,
      reason: "unknown-move",
      message: `GNU move is not present in the canonical legal move set: ${parsedMove.notation}.`,
      candidateFingerprints: []
    };
  }

  if (matchingOutcomes.length > 1) {
    const [firstOutcome, ...restOutcomes] = matchingOutcomes;
    const allEquivalent = restOutcomes.every((outcome) =>
      positionsEqual(outcome.positionAfter, firstOutcome!.positionAfter)
    );

    if (!allEquivalent) {
      return {
        ok: false,
        reason: "ambiguous-move",
        message: `GNU move is ambiguous against canonical legal moves: ${parsedMove.notation}.`,
        candidateFingerprints: matchingOutcomes.map((outcome) => getMoveFingerprint(outcome.move))
      };
    }
  }

  const orderedMatches = [...matchingOutcomes].sort((left, right) => {
    return getMoveFingerprint(left.move).localeCompare(getMoveFingerprint(right.move));
  });
  const selected = orderedMatches[0]!;

  return {
    ok: true,
    moveFingerprint: getMoveFingerprint(selected.move),
    outcome: selected
  };
};

export const matchGnuBgMoveToLegalOutcome = (
  parsedMove: GnuBgParsedMove,
  legalOutcomes: readonly LegalMoveOutcome[]
): MatchGnuBgMoveToLegalOutcomeResult => {
  const strictMatches = legalOutcomes.filter((outcome) => {
    if (outcome.move.steps.length !== parsedMove.steps.length) {
      return false;
    }

    return outcome.move.steps.every((step, index) => stepMatches(step, parsedMove.steps[index]!));
  });

  if (strictMatches.length > 0) {
    return resolveCandidateOutcome(parsedMove, strictMatches);
  }

  const collapsedMatches = legalOutcomes.filter((outcome) => {
    return canCollapseMatch(outcome.move.steps, parsedMove.steps);
  });

  return resolveCandidateOutcome(parsedMove, collapsedMatches);
};
