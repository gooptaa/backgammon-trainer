import { pathToFileURL } from "node:url";

import { evaluateLegalMoves } from "@backgammon-trainer/backgammon-analysis";

import { detectGnuBg } from "./capability.js";
import type { DetectGnuBgOptions, GnuBgCapabilityResult } from "./capability.js";
import { createGnuBgPositionEvaluator } from "./evaluator.js";
import type { GnuBgProcessRunner } from "./evaluator.js";
import { createNodeGnuBgProcessRunner } from "./node.js";
import { GNU_BG_SMOKE_REQUEST } from "./smokeFixture.js";

export interface SmokeDependencies {
  readonly writeLine?: (line: string) => void;
  readonly processRunner?: GnuBgProcessRunner;
  readonly detectGnuBgFn?: (options: DetectGnuBgOptions) => Promise<GnuBgCapabilityResult>;
  readonly evaluateLegalMovesFn?: typeof evaluateLegalMoves;
}

const writeJsonLine = (writeLine: (line: string) => void, payload: object): void => {
  writeLine(JSON.stringify(payload));
};

export const runSmoke = async (dependencies: SmokeDependencies = {}): Promise<number> => {
  const writeLine = dependencies.writeLine ?? ((line: string) => console.log(line));
  const processRunner = dependencies.processRunner ?? createNodeGnuBgProcessRunner();
  const detectGnuBgFn = dependencies.detectGnuBgFn ?? detectGnuBg;
  const evaluateLegalMovesFn = dependencies.evaluateLegalMovesFn ?? evaluateLegalMoves;
  const capability = await detectGnuBgFn({
    processRunner
  });

  if (!capability.ok) {
    writeJsonLine(writeLine, {
      status: capability.status,
      message: capability.message
    });
    return 0;
  }

  writeJsonLine(writeLine, {
    status: "skipped",
    executable: capability.executable,
    version: capability.parsedVersion,
    message: capability.analysisInvocation.message
  });

  const evaluator = createGnuBgPositionEvaluator({
    executable: capability.executable,
    providerVersion: capability.parsedVersion,
    processRunner
  });

  const result = await evaluateLegalMovesFn(GNU_BG_SMOKE_REQUEST, evaluator);

  if (!result.ok) {
    writeJsonLine(writeLine, {
      status: "unverified",
      message: result.message
    });
    return result.reason === "provider-failed" ? 0 : 1;
  }

  writeJsonLine(writeLine, {
    status: "ok",
    coverage: result.analysis.coverage,
    provider: result.analysis.kind === "evaluated" ? result.analysis.provenance.provider : null,
    version:
      result.analysis.kind === "evaluated" ? result.analysis.provenance.providerVersion : null,
    scoredMoves: result.analysis.kind === "evaluated" ? result.analysis.rankedMoves.length : 0,
    topNormalizedScore:
      result.analysis.kind === "evaluated" && result.analysis.rankedMoves.length > 0
        ? result.analysis.rankedMoves[0]!.normalizedScore
        : null,
    warnings: result.analysis.warnings
  });

  return 0;
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const exitCode = await runSmoke();
  process.exitCode = exitCode;
}
