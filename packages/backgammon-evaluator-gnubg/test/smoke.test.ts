import { describe, expect, it } from "vitest";

import { runSmoke } from "../src/smoke";

describe("runSmoke", () => {
  it("reports unavailable installations truthfully", async () => {
    const lines: string[] = [];
    const exitCode = await runSmoke({
      writeLine: (line) => lines.push(line),
      detectGnuBgFn: async () => ({
        ok: false,
        status: "unavailable",
        executable: "gnubg",
        message: "GNU Backgammon executable is unavailable."
      })
    });

    expect(exitCode).toBe(0);
    expect(lines[0]).toContain('"status":"unavailable"');
  });

  it("uses one fixed deterministic smoke fixture request", async () => {
    let capturedRequest: unknown = null;

    const exitCode = await runSmoke({
      writeLine: () => undefined,
      detectGnuBgFn: async () => ({
        ok: true,
        status: "available",
        executable: "gnubg",
        versionText: "gnubg (GNU Backgammon) 1.08.003",
        parsedVersion: "1.08.003",
        supportsTty: true,
        supportsCommandsFile: true,
        supportsPython: true,
        analysisInvocation: {
          status: "configured",
          message: "configured"
        }
      }),
      evaluateLegalMovesFn: async (request) => {
        capturedRequest = request;
        return {
          ok: false,
          reason: "provider-failed",
          message: "GNU Backgammon checker-play invocation is not configured in this spike.",
          factualAnalysis: {
            player: request.player,
            dice: request.dice,
            positionBefore: { white: {} as never, black: {} as never, relationship: {} as never },
            outcomes: []
          }
        } as never;
      }
    });

    expect(exitCode).toBe(0);
    expect(capturedRequest).toEqual(
      expect.objectContaining({
        player: "white",
        dice: { dice: [1, 2] },
        context: { gameMode: "money" }
      })
    );
  });

  it("returns nonzero for real adapter errors beyond unavailable or unverified provider failure", async () => {
    const exitCode = await runSmoke({
      writeLine: () => undefined,
      detectGnuBgFn: async () => ({
        ok: true,
        status: "available",
        executable: "gnubg",
        versionText: "gnubg (GNU Backgammon) 1.08.003",
        parsedVersion: "1.08.003",
        supportsTty: true,
        supportsCommandsFile: true,
        supportsPython: true,
        analysisInvocation: {
          status: "configured",
          message: "configured"
        }
      }),
      evaluateLegalMovesFn: async () =>
        ({
          ok: false,
          reason: "timeout",
          message: "timed out",
          factualAnalysis: {
            player: "white",
            dice: { dice: [1, 2] },
            positionBefore: { white: {} as never, black: {} as never, relationship: {} as never },
            outcomes: []
          }
        }) as never
    });

    expect(exitCode).toBe(1);
  });
});
