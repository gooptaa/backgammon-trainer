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

const MOVE_TOKEN_PATTERN = /^(bar|[1-9]|1\d|2[0-4])\/(off|[1-9]|1\d|2[0-4])(\*)?$/i;

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

    steps.push({
      kind:
        fromPoint === "bar" ? "enter-from-bar" : toPoint === "off" ? "bear-off" : "point-to-point",
      fromPoint,
      toPoint,
      hitsBlot
    });
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

export const matchGnuBgMoveToLegalOutcome = (
  parsedMove: GnuBgParsedMove,
  legalOutcomes: readonly LegalMoveOutcome[]
): MatchGnuBgMoveToLegalOutcomeResult => {
  const matchingOutcomes = legalOutcomes.filter((outcome) => {
    if (outcome.move.steps.length !== parsedMove.steps.length) {
      return false;
    }

    return outcome.move.steps.every((step, index) => stepMatches(step, parsedMove.steps[index]!));
  });

  if (matchingOutcomes.length === 0) {
    return {
      ok: false,
      reason: "unknown-move",
      message: `GNU move is not present in the canonical legal move set: ${parsedMove.notation}.`,
      candidateFingerprints: []
    };
  }

  if (matchingOutcomes.length > 1) {
    return {
      ok: false,
      reason: "ambiguous-move",
      message: `GNU move is ambiguous against canonical legal moves: ${parsedMove.notation}.`,
      candidateFingerprints: matchingOutcomes.map((outcome) => getMoveFingerprint(outcome.move))
    };
  }

  return {
    ok: true,
    moveFingerprint: getMoveFingerprint(matchingOutcomes[0]!.move),
    outcome: matchingOutcomes[0]!
  };
};
