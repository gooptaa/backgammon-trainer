import type {
  EvaluatePositionRequest,
  EvaluatePositionResult,
  EvaluatorProvenance,
  JsonValue,
  PositionEvaluator
} from "@backgammon-trainer/backgammon-analysis";

import { matchGnuBgMoveToLegalOutcome } from "./matching.js";
import { parseGnuBgEvaluationOutput } from "./parser.js";
import { translatePositionToGnuBgBoard, type GnuBgBoardState } from "./translation.js";

const ADAPTER_VERSION = "0.1.0";
const DEFAULT_EXECUTABLE = "gnubg";
const DEFAULT_TIMEOUT_MS = 4_000;

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

const buildDefaultAnalysisRequest: BuildGnuBgAnalysisRequest = () => {
  return {
    ok: false,
    message: "GNU Backgammon checker-play invocation is not configured in this spike.",
    settings: {
      invocationMode: "unconfigured-spike",
      liveAnalysisVerified: false
    },
    warnings: [
      "Checker-play command invocation remains unverified; transcript-backed tests cover parsing and matching only."
    ]
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
      const analysisRequest = (options.analysisRequestFactory ?? buildDefaultAnalysisRequest)({
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
          return {
            ok: false,
            reason: "invalid-provider-result",
            message: matched.message,
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
