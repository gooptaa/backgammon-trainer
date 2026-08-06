import { fileURLToPath } from "node:url";

import type {
  EvaluatePositionRequest,
  EvaluatePositionResult,
  EvaluatorProvenance,
  JsonValue,
  PositionEvaluator
} from "@backgammon-trainer/backgammon-analysis";
import { getCanonicalMoveFingerprint } from "@backgammon-trainer/backgammon-analysis";

import { matchGnuBgMoveToLegalOutcome } from "./matching.js";
import { parseGnuBgEvaluationOutput } from "./parser.js";
import { translatePositionToGnuBgBoard, type GnuBgBoardState } from "./translation.js";

const ADAPTER_VERSION = "0.1.0";
const DEFAULT_EXECUTABLE = "gnubg";
const DEFAULT_TIMEOUT_MS = 4_000;
const DEFAULT_PYTHON_BRIDGE_SCRIPT_PATH = fileURLToPath(
  new URL("../scripts/gnubg_checkerplay_bridge.py", import.meta.url)
);

export interface GnuBgProcessRequest {
  readonly executable: string;
  readonly args: readonly string[];
  readonly stdin: string;
  readonly timeoutMs: number;
}

export type GnuBgProcessResult =
  | {
      readonly ok: true;
      readonly exitCode: number;
      readonly stdout: string;
      readonly stderr: string;
    }
  | {
      readonly ok: false;
      readonly reason: "unavailable" | "timeout" | "spawn-failed";
      readonly message: string;
    };

export interface GnuBgProcessRunner {
  run(request: GnuBgProcessRequest): Promise<GnuBgProcessResult>;
}

export interface BuildGnuBgAnalysisRequestInput {
  readonly executable: string;
  readonly timeoutMs: number;
  readonly request: EvaluatePositionRequest;
  readonly translatedBoard: GnuBgBoardState;
}

export type BuildGnuBgAnalysisRequestResult =
  | {
      readonly ok: true;
      readonly processRequest: GnuBgProcessRequest;
      readonly settings: Readonly<Record<string, JsonValue>>;
      readonly warnings?: readonly string[];
    }
  | {
      readonly ok: false;
      readonly message: string;
      readonly settings?: Readonly<Record<string, JsonValue>>;
      readonly warnings?: readonly string[];
    };

export type BuildGnuBgAnalysisRequest = (
  input: BuildGnuBgAnalysisRequestInput
) => BuildGnuBgAnalysisRequestResult;

export interface GnuBgEvaluatorOptions {
  readonly executable?: string;
  readonly timeoutMs?: number;
  readonly processRunner?: GnuBgProcessRunner;
  readonly pythonBridgeScriptPath?: string;
  readonly analysisRequestFactory?: BuildGnuBgAnalysisRequest;
  readonly providerVersion?: string;
}

const createHiddenStderrMessage = (exitCode: number): string => {
  return `GNU Backgammon process exited with code ${exitCode}.`;
};

const getSafeExecutableIdentity = (executable: string): string => {
  const segments = executable.split("/");
  return segments[segments.length - 1] || executable;
};

const toSimpleBoardNotation = (board: GnuBgBoardState): string => {
  const pointsAscending = [...board.points].sort((left, right) => left.gnuPoint - right.gnuPoint);
  const values = [
    board.rollerBar,
    ...pointsAscending.map((point) =>
      point.rollerCheckerCount > 0 ? point.rollerCheckerCount : -point.opponentCheckerCount
    ),
    -board.opponentBar
  ];

  return values.join(" ");
};

const createDefaultAnalysisRequestFactory = (
  pythonBridgeScriptPath: string
): BuildGnuBgAnalysisRequest => {
  return (input: BuildGnuBgAnalysisRequestInput): BuildGnuBgAnalysisRequestResult => {
    const expectedMoves = Math.min(
      Math.max(
        new Set(input.request.legalOutcomes.map((outcome) => getCanonicalMoveFingerprint(outcome)))
          .size,
        0
      ),
      256
    );
    const stdin =
      JSON.stringify({
        boardSimple: toSimpleBoardNotation(input.translatedBoard),
        dice: input.request.dice.dice,
        expectedMoves
      }) + "\n";

    return {
      ok: true,
      processRequest: {
        executable: input.executable,
        args: ["-t", "-q", "-r", `--python=${pythonBridgeScriptPath}`],
        stdin,
        timeoutMs: input.timeoutMs
      },
      settings: {
        invocationMode: "python-hint-bridge",
        bridgeScript: getSafeExecutableIdentity(pythonBridgeScriptPath),
        expectedMoves,
        liveAnalysisVerified: true
      }
    };
  };
};

const buildProvenance = (
  executable: string,
  providerVersion: string,
  settings: Readonly<Record<string, JsonValue>>
): EvaluatorProvenance => {
  return {
    provider: "gnubg",
    providerVersion,
    adapterVersion: ADAPTER_VERSION,
    settings: {
      executable: getSafeExecutableIdentity(executable),
      ...settings
    }
  };
};

export const createGnuBgPositionEvaluator = (
  options: GnuBgEvaluatorOptions = {}
): PositionEvaluator => {
  const analysisRequestFactory =
    options.analysisRequestFactory ??
    createDefaultAnalysisRequestFactory(
      options.pythonBridgeScriptPath ?? DEFAULT_PYTHON_BRIDGE_SCRIPT_PATH
    );

  return {
    evaluate: async (request: EvaluatePositionRequest): Promise<EvaluatePositionResult> => {
      const translation = translatePositionToGnuBgBoard(request.position, request.player);

      if (!translation.ok) {
        return {
          ok: false,
          reason: "unsupported-position",
          message: translation.message
        };
      }

      const processRunner = options.processRunner;

      if (processRunner === undefined) {
        return {
          ok: false,
          reason: "unavailable",
          message: "GNU Backgammon process runner is not configured."
        };
      }

      const executable = options.executable ?? DEFAULT_EXECUTABLE;
      const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const analysisRequest = analysisRequestFactory({
        executable,
        timeoutMs,
        request,
        translatedBoard: translation.board
      });

      if (!analysisRequest.ok) {
        return {
          ok: false,
          reason: "provider-failed",
          message: analysisRequest.message,
          ...(analysisRequest.settings === undefined
            ? {}
            : {
                provenance: buildProvenance(
                  executable,
                  options.providerVersion ?? "unknown",
                  analysisRequest.settings
                )
              })
        };
      }

      const processResult = await processRunner.run(analysisRequest.processRequest);

      if (!processResult.ok) {
        if (processResult.reason === "unavailable") {
          return {
            ok: false,
            reason: "unavailable",
            message: "GNU Backgammon executable is unavailable."
          };
        }

        if (processResult.reason === "timeout") {
          return {
            ok: false,
            reason: "timeout",
            message: "GNU Backgammon evaluation timed out."
          };
        }

        return {
          ok: false,
          reason: "provider-failed",
          message: "GNU Backgammon process could not be started."
        };
      }

      if (processResult.exitCode !== 0) {
        return {
          ok: false,
          reason: "provider-failed",
          message: createHiddenStderrMessage(processResult.exitCode),
          provenance: buildProvenance(
            executable,
            options.providerVersion ?? "unknown",
            analysisRequest.settings
          )
        };
      }

      const parsedOutput = parseGnuBgEvaluationOutput(processResult.stdout, {
        playerOnRoll: request.player
      });

      if (!parsedOutput.ok) {
        return {
          ok: false,
          reason: "invalid-provider-result",
          message: parsedOutput.message,
          provenance: buildProvenance(
            executable,
            options.providerVersion ?? "unknown",
            analysisRequest.settings
          )
        };
      }

      const scores = [];

      for (const row of parsedOutput.evaluation.rows) {
        const matched = matchGnuBgMoveToLegalOutcome(row.parsedMove, request.legalOutcomes);

        if (!matched.ok) {
          const firstStep = row.parsedMove.steps[0];
          const lastStep = row.parsedMove.steps[row.parsedMove.steps.length - 1];
          const normalizedPath =
            firstStep === undefined || lastStep === undefined
              ? ""
              : `; normalized=${String(firstStep.fromPoint)}/${String(lastStep.toPoint)}${lastStep.hitsBlot ? "*" : ""}`;
          const sourceRank = row.providerRank === undefined ? "unknown" : String(row.providerRank);

          return {
            ok: false,
            reason: "invalid-provider-result",
            message: `${matched.message} (source-rank=${sourceRank}; notation=${row.notation}${normalizedPath}; candidate-count=${matched.candidateFingerprints.length}; failure=${matched.reason})`,
            provenance: buildProvenance(
              executable,
              options.providerVersion ?? parsedOutput.evaluation.providerVersion,
              {
                ...analysisRequest.settings,
                ...parsedOutput.evaluation.settings
              }
            )
          };
        }

        scores.push({
          moveFingerprint: matched.moveFingerprint,
          normalizedScore: row.normalizedScore,
          ...(row.providerRank === undefined ? {} : { providerRank: row.providerRank })
        });
      }

      return {
        ok: true,
        coverage: parsedOutput.evaluation.coverage,
        scores,
        scoreScale: parsedOutput.evaluation.scoreScale,
        provenance: buildProvenance(
          executable,
          options.providerVersion ?? parsedOutput.evaluation.providerVersion,
          {
            ...analysisRequest.settings,
            ...parsedOutput.evaluation.settings,
            liveAnalysisVerified: false,
            outputFormat: "checker-play-v1"
          }
        ),
        warnings: [...(analysisRequest.warnings ?? []), ...parsedOutput.evaluation.warnings]
      };
    }
  };
};
