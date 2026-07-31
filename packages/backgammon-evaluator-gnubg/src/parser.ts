import type {
  EvaluationScoreScale,
  JsonValue,
  Player
} from "@backgammon-trainer/backgammon-analysis";

import { parseGnuBgMoveNotation, type GnuBgParsedMove } from "./matching.js";

export interface ParseGnuBgEvaluationContext {
  readonly playerOnRoll: Player;
}

export interface ParsedGnuBgEvaluationRow {
  readonly notation: string;
  readonly parsedMove: GnuBgParsedMove;
  readonly sourceScore: number;
  readonly normalizedScore: number;
  readonly providerRank?: number;
}

export interface ParsedGnuBgEvaluation {
  readonly coverage: "complete" | "partial";
  readonly scoreScale: EvaluationScoreScale;
  readonly providerVersion: string;
  readonly warnings: readonly string[];
  readonly settings: Readonly<Record<string, JsonValue>>;
  readonly rows: readonly ParsedGnuBgEvaluationRow[];
}

export type ParseGnuBgEvaluationOutputResult =
  | {
      readonly ok: true;
      readonly evaluation: ParsedGnuBgEvaluation;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

const MOVE_ROW_PATTERN =
  /^(\d+)\.\s+(.+?)\s+\|\s+equity\s+([+-]?(?:\d+(?:\.\d+)?|\.\d+|nan|inf))(?:\s+\|\s+rank\s+(\d+))?$/i;

const parseSettingValue = (value: string): JsonValue => {
  const trimmed = value.trim();

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  const numericValue = Number(trimmed);

  if (trimmed.length > 0 && Number.isFinite(numericValue)) {
    return numericValue;
  }

  return trimmed;
};

const createEquityScale = (): EvaluationScoreScale => ({
  kind: "equity",
  unit: "points"
});

export const parseGnuBgEvaluationOutput = (
  output: string,
  context: ParseGnuBgEvaluationContext
): ParseGnuBgEvaluationOutputResult => {
  const normalizedText = output.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalizedText.split("\n");

  if (rawLines.every((line) => line.trim().length === 0)) {
    return {
      ok: false,
      message: "GNU Backgammon output is empty."
    };
  }

  let providerVersion = "unknown";
  let coverage: "complete" | "partial" | null = null;
  let perspective: "player-on-roll" | "opponent-of-player-on-roll" | null = null;
  let scoreScaleSeen = false;
  let formatSeen = false;
  let noLegalMoves = false;

  const warnings: string[] = [];
  const settings: Record<string, JsonValue> = {};
  const rows: ParsedGnuBgEvaluationRow[] = [];
  const seenNotations = new Set<string>();

  for (const rawLine of rawLines) {
    const line = rawLine.trim();

    if (line.length === 0 || line.startsWith("info:")) {
      continue;
    }

    if (/^gnu backgammon/i.test(line)) {
      providerVersion = line.replace(/^GNU Backgammon\s*/i, "").trim() || "unknown";
      continue;
    }

    if (/^format:\s*checker-play-v1$/i.test(line)) {
      formatSeen = true;
      continue;
    }

    if (/^coverage:\s*(complete|partial)$/i.test(line)) {
      coverage = line.toLowerCase().endsWith("partial") ? "partial" : "complete";
      continue;
    }

    if (/^perspective:\s*(player-on-roll|opponent-of-player-on-roll)$/i.test(line)) {
      perspective = line.toLowerCase().endsWith("opponent-of-player-on-roll")
        ? "opponent-of-player-on-roll"
        : "player-on-roll";
      continue;
    }

    if (/^score-scale:\s*equity-points$/i.test(line)) {
      scoreScaleSeen = true;
      continue;
    }

    if (/^warning:\s*/i.test(line)) {
      warnings.push(line.replace(/^warning:\s*/i, ""));
      continue;
    }

    if (/^setting\s+[a-z][a-z0-9-]*\s*:/i.test(line)) {
      const separatorIndex = line.indexOf(":");
      const key = line.slice("setting ".length, separatorIndex).trim();

      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        return {
          ok: false,
          message: `GNU Backgammon output repeats setting ${key}.`
        };
      }

      settings[key] = parseSettingValue(line.slice(separatorIndex + 1));
      continue;
    }

    if (/^no legal moves\.?$/i.test(line)) {
      noLegalMoves = true;
      continue;
    }

    const rowMatch = MOVE_ROW_PATTERN.exec(line);

    if (rowMatch === null) {
      return {
        ok: false,
        message: `GNU Backgammon output line is not recognized: ${line}.`
      };
    }

    const notation = rowMatch[2]!.trim();
    const parsedMove = parseGnuBgMoveNotation(notation, context.playerOnRoll);

    if (!parsedMove.ok) {
      return {
        ok: false,
        message: parsedMove.message
      };
    }

    if (seenNotations.has(parsedMove.move.notation)) {
      return {
        ok: false,
        message: `GNU Backgammon output repeats one move row: ${parsedMove.move.notation}.`
      };
    }

    seenNotations.add(parsedMove.move.notation);

    const sourceScore = Number(rowMatch[3]);

    if (!Number.isFinite(sourceScore)) {
      return {
        ok: false,
        message: `GNU Backgammon output contains a non-finite score for ${parsedMove.move.notation}.`
      };
    }

    const providerRank = rowMatch[4] === undefined ? undefined : Number.parseInt(rowMatch[4], 10);

    rows.push({
      notation: parsedMove.move.notation,
      parsedMove: parsedMove.move,
      sourceScore,
      normalizedScore: perspective === "opponent-of-player-on-roll" ? -sourceScore : sourceScore,
      ...(providerRank === undefined ? {} : { providerRank })
    });
  }

  if (!formatSeen) {
    return {
      ok: false,
      message: "GNU Backgammon output format marker is missing."
    };
  }

  if (coverage === null) {
    return {
      ok: false,
      message: "GNU Backgammon output coverage marker is missing."
    };
  }

  if (perspective === null) {
    return {
      ok: false,
      message: "GNU Backgammon output score perspective is missing."
    };
  }

  if (!scoreScaleSeen) {
    return {
      ok: false,
      message: "GNU Backgammon output score scale marker is missing."
    };
  }

  if (noLegalMoves && rows.length > 0) {
    return {
      ok: false,
      message: "GNU Backgammon output cannot report both scored rows and no legal moves."
    };
  }

  return {
    ok: true,
    evaluation: {
      coverage,
      scoreScale: createEquityScale(),
      providerVersion,
      warnings,
      settings,
      rows
    }
  };
};
