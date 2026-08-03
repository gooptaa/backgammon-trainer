import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  analyzeLegalMoveOutcomes,
  evaluateLegalMoves,
  getMoveFingerprint,
  type EvaluatePositionRequest,
  type LegalMoveOutcome
} from "@backgammon-trainer/backgammon-analysis";

import { createGnuBgPositionEvaluator } from "../src/evaluator";
import { createFakeGnuBgProcessRunner } from "../src/testing";
import {
  AMBIGUOUS_COORDINATE_MOVE_A,
  AMBIGUOUS_COORDINATE_MOVE_B,
  BLACK_SIMPLE_POSITION,
  DICE,
  WHITE_SIMPLE_POSITION,
  createOutcome
} from "./fixtures/testData";

const readFixture = (name: string): string => {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
};

const getLegalOutcomes = (
  position: EvaluatePositionRequest["position"],
  player: EvaluatePositionRequest["player"]
): readonly LegalMoveOutcome[] => {
  const result = analyzeLegalMoveOutcomes(position, player, DICE);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.analysis.outcomes;
};

describe("createGnuBgPositionEvaluator", () => {
  it("builds default python-bridge process requests with bounded args and JSON stdin", async () => {
    const captured = {
      request: null as {
        executable: string;
        args: readonly string[];
        stdin: string;
        timeoutMs: number;
      } | null
    };

    const evaluator = createGnuBgPositionEvaluator({
      executable: "gnubg-test",
      timeoutMs: 2222,
      pythonBridgeScriptPath: "/tmp/bridge.py",
      processRunner: createFakeGnuBgProcessRunner(async (request) => {
        captured.request = request;
        return {
          ok: true,
          exitCode: 0,
          stdout: readFixture("success-white-complete.txt"),
          stderr: ""
        };
      })
    });

    const legalOutcomes = getLegalOutcomes(WHITE_SIMPLE_POSITION, "white");
    const result = await evaluator.evaluate({
      position: WHITE_SIMPLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes,
      context: { gameMode: "money" }
    });

    expect(result.ok).toBe(true);
    expect(captured.request).not.toBeNull();
    if (captured.request === null) {
      throw new Error("Expected process request to be captured.");
    }
    expect(captured.request.executable).toBe("gnubg-test");
    expect(captured.request.timeoutMs).toBe(2222);
    expect(captured.request.args).toEqual(["-t", "-q", "-r", "--python=/tmp/bridge.py"]);
    expect(captured.request.stdin).toContain('"dice":[1,2]');
    expect(captured.request.stdin).toContain(`"expectedMoves":${String(legalOutcomes.length)}`);
  });

  it("implements PositionEvaluator and sends translated execution options through the process boundary", async () => {
    let capturedRequest: { executable: string; args: readonly string[]; timeoutMs: number } | null =
      null;
    const runner = createFakeGnuBgProcessRunner(async (request) => {
      capturedRequest = request;
      return {
        ok: true,
        exitCode: 0,
        stdout: readFixture("success-white-complete.txt"),
        stderr: readFixture("process-error.txt")
      };
    });

    const evaluator = createGnuBgPositionEvaluator({
      executable: "gnubg-test",
      timeoutMs: 3210,
      processRunner: runner,
      analysisRequestFactory: ({ executable, timeoutMs }) => ({
        ok: true,
        processRequest: {
          executable,
          args: ["-t", "-q", "-r", "--commands=/tmp/gnubg-commands.txt"],
          stdin: "",
          timeoutMs
        },
        settings: {
          invocationMode: "tty-commands-file-spike",
          analysisCommandVerified: false
        }
      })
    });

    const legalOutcomes = getLegalOutcomes(WHITE_SIMPLE_POSITION, "white");
    const result = await evaluator.evaluate({
      position: WHITE_SIMPLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes,
      context: { gameMode: "money" }
    });

    expect(capturedRequest).toEqual({
      executable: "gnubg-test",
      args: ["-t", "-q", "-r", "--commands=/tmp/gnubg-commands.txt"],
      stdin: "",
      timeoutMs: 3210
    });
    expect(result.ok).toBe(true);
  });

  it("returns complete coverage, canonical fingerprints, gnubg provenance, and JSON-safe settings", async () => {
    const evaluator = createGnuBgPositionEvaluator({
      processRunner: createFakeGnuBgProcessRunner(async () => ({
        ok: true,
        exitCode: 0,
        stdout: readFixture("success-white-complete.txt"),
        stderr: ""
      })),
      analysisRequestFactory: ({ executable, timeoutMs }) => ({
        ok: true,
        processRequest: { executable, args: [], stdin: "", timeoutMs },
        settings: { invocationMode: "fixture", analysisCommandVerified: false }
      })
    });

    const legalOutcomes = getLegalOutcomes(WHITE_SIMPLE_POSITION, "white");
    const result = await evaluator.evaluate({
      position: WHITE_SIMPLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.coverage).toBe("complete");
    expect(result.provenance.provider).toBe("gnubg");
    expect(result.provenance.providerVersion).toBe("1.08.003");
    expect(result.provenance.settings.invocationMode).toBe("fixture");
    expect(result.provenance.settings.outputFormat).toBe("checker-play-v1");
    expect(result.scores.map((score) => score.moveFingerprint)).toEqual(
      legalOutcomes.map((outcome) => getMoveFingerprint(outcome.move))
    );
  });

  it("supports partial coverage with provider warnings and preserves higher-is-better ranking for white and black", async () => {
    const partialEvaluator = createGnuBgPositionEvaluator({
      processRunner: createFakeGnuBgProcessRunner(async () => ({
        ok: true,
        exitCode: 0,
        stdout: readFixture("success-partial.txt"),
        stderr: ""
      })),
      analysisRequestFactory: ({ executable, timeoutMs }) => ({
        ok: true,
        processRequest: { executable, args: [], stdin: "", timeoutMs },
        settings: { invocationMode: "fixture", analysisCommandVerified: false }
      })
    });

    const partial = await evaluateLegalMoves(
      {
        position: WHITE_SIMPLE_POSITION,
        player: "white",
        dice: DICE
      },
      partialEvaluator
    );
    const completeBlackEvaluator = createGnuBgPositionEvaluator({
      processRunner: createFakeGnuBgProcessRunner(async () => ({
        ok: true,
        exitCode: 0,
        stdout: readFixture("success-black-complete.txt"),
        stderr: ""
      })),
      analysisRequestFactory: ({ executable, timeoutMs }) => ({
        ok: true,
        processRequest: { executable, args: [], stdin: "", timeoutMs },
        settings: { invocationMode: "fixture", analysisCommandVerified: false }
      })
    });
    const completeBlack = await evaluateLegalMoves(
      {
        position: BLACK_SIMPLE_POSITION,
        player: "black",
        dice: DICE
      },
      completeBlackEvaluator
    );

    expect(partial.ok).toBe(true);
    if (partial.ok) {
      expect(partial.analysis.coverage).toBe("partial");
      expect(partial.analysis.warnings).toEqual(["provider returned only top candidates"]);
    }

    expect(completeBlack.ok).toBe(true);
    if (completeBlack.ok) {
      expect(completeBlack.analysis.coverage).toBe("complete");
    }
    if (completeBlack.ok && completeBlack.analysis.kind === "evaluated") {
      expect(completeBlack.analysis.rankedMoves[0]?.normalizedScore).toBeGreaterThan(
        completeBlack.analysis.rankedMoves[1]?.normalizedScore ?? -Infinity
      );
    }
  });

  it("maps unavailable, timeout, nonzero exit, malformed output, unknown moves, and ambiguity to shared failure reasons", async () => {
    const legalOutcomes = getLegalOutcomes(WHITE_SIMPLE_POSITION, "white");
    const baseRequest = {
      position: WHITE_SIMPLE_POSITION,
      player: "white" as const,
      dice: DICE,
      legalOutcomes
    };

    const unavailable = await createGnuBgPositionEvaluator({
      processRunner: createFakeGnuBgProcessRunner(async () => ({
        ok: false,
        reason: "unavailable",
        message: "missing"
      })),
      analysisRequestFactory: ({ executable, timeoutMs }) => ({
        ok: true,
        processRequest: { executable, args: [], stdin: "", timeoutMs },
        settings: {}
      })
    }).evaluate(baseRequest);
    const timeout = await createGnuBgPositionEvaluator({
      processRunner: createFakeGnuBgProcessRunner(async () => ({
        ok: false,
        reason: "timeout",
        message: "slow"
      })),
      analysisRequestFactory: ({ executable, timeoutMs }) => ({
        ok: true,
        processRequest: { executable, args: [], stdin: "", timeoutMs },
        settings: {}
      })
    }).evaluate(baseRequest);
    const nonzeroExit = await createGnuBgPositionEvaluator({
      processRunner: createFakeGnuBgProcessRunner(async () => ({
        ok: true,
        exitCode: 2,
        stdout: "",
        stderr: readFixture("process-error.txt")
      })),
      analysisRequestFactory: ({ executable, timeoutMs }) => ({
        ok: true,
        processRequest: { executable, args: [], stdin: "", timeoutMs },
        settings: {}
      })
    }).evaluate(baseRequest);
    const malformed = await createGnuBgPositionEvaluator({
      processRunner: createFakeGnuBgProcessRunner(async () => ({
        ok: true,
        exitCode: 0,
        stdout: readFixture("malformed-row.txt"),
        stderr: ""
      })),
      analysisRequestFactory: ({ executable, timeoutMs }) => ({
        ok: true,
        processRequest: { executable, args: [], stdin: "", timeoutMs },
        settings: {}
      })
    }).evaluate(baseRequest);
    const unknownMove = await createGnuBgPositionEvaluator({
      processRunner: createFakeGnuBgProcessRunner(async () => ({
        ok: true,
        exitCode: 0,
        stdout: readFixture("unknown-move.txt"),
        stderr: ""
      })),
      analysisRequestFactory: ({ executable, timeoutMs }) => ({
        ok: true,
        processRequest: { executable, args: [], stdin: "", timeoutMs },
        settings: {}
      })
    }).evaluate(baseRequest);
    const ambiguous = await createGnuBgPositionEvaluator({
      processRunner: createFakeGnuBgProcessRunner(async () => ({
        ok: true,
        exitCode: 0,
        stdout: readFixture("success-partial.txt").replace("8/7 7/5", "8/7 7/6"),
        stderr: ""
      })),
      analysisRequestFactory: ({ executable, timeoutMs }) => ({
        ok: true,
        processRequest: { executable, args: [], stdin: "", timeoutMs },
        settings: {}
      })
    }).evaluate({
      position: WHITE_SIMPLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes: [
        createOutcome(AMBIGUOUS_COORDINATE_MOVE_A),
        createOutcome(AMBIGUOUS_COORDINATE_MOVE_B)
      ]
    });

    expect(unavailable.ok).toBe(false);
    if (!unavailable.ok) {
      expect(unavailable.reason).toBe("unavailable");
    }

    expect(timeout.ok).toBe(false);
    if (!timeout.ok) {
      expect(timeout.reason).toBe("timeout");
    }

    expect(nonzeroExit.ok).toBe(false);
    if (!nonzeroExit.ok) {
      expect(nonzeroExit.reason).toBe("provider-failed");
      expect(nonzeroExit.message.includes("failed to load")).toBe(false);
    }

    expect(malformed.ok).toBe(false);
    if (!malformed.ok) {
      expect(malformed.reason).toBe("invalid-provider-result");
    }

    expect(unknownMove.ok).toBe(false);
    if (!unknownMove.ok) {
      expect(unknownMove.reason).toBe("invalid-provider-result");
    }

    expect(ambiguous.ok).toBe(false);
    if (!ambiguous.ok) {
      expect(ambiguous.reason).toBe("invalid-provider-result");
    }
  });

  it("does not mutate request data and returns structurally equal results across repeated fixture-backed calls", async () => {
    const legalOutcomes = getLegalOutcomes(WHITE_SIMPLE_POSITION, "white");
    const request: EvaluatePositionRequest = {
      position: WHITE_SIMPLE_POSITION,
      player: "white",
      dice: DICE,
      legalOutcomes,
      context: { gameMode: "money" }
    };
    const before = structuredClone(request);
    const evaluator = createGnuBgPositionEvaluator({
      processRunner: createFakeGnuBgProcessRunner(async () => ({
        ok: true,
        exitCode: 0,
        stdout: readFixture("success-white-complete.txt"),
        stderr: ""
      })),
      analysisRequestFactory: ({ executable, timeoutMs }) => ({
        ok: true,
        processRequest: { executable, args: [], stdin: "", timeoutMs },
        settings: { invocationMode: "fixture", analysisCommandVerified: false }
      })
    });

    const first = await evaluator.evaluate(request);
    const second = await evaluator.evaluate(request);

    expect(request).toEqual(before);
    expect(first).toEqual(second);
  });
});
