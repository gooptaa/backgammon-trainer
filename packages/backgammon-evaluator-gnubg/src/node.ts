import { spawn } from "node:child_process";

import type { GnuBgProcessRequest, GnuBgProcessResult, GnuBgProcessRunner } from "./evaluator.js";

export const createNodeGnuBgProcessRunner = (): GnuBgProcessRunner => {
  return {
    run: (request: GnuBgProcessRequest): Promise<GnuBgProcessResult> => {
      return new Promise<GnuBgProcessResult>((resolve) => {
        let settled = false;
        let stdout = "";
        let stderr = "";
        let timedOut = false;

        const child = spawn(request.executable, [...request.args], {
          shell: false,
          stdio: "pipe"
        });

        const settle = (result: GnuBgProcessResult): void => {
          if (settled) {
            return;
          }

          settled = true;
          resolve(result);
        };

        const timer = setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, request.timeoutMs);

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk: string) => {
          stderr += chunk;
        });

        child.on("error", (error) => {
          clearTimeout(timer);
          settle({
            ok: false,
            reason:
              error.name === "Error" && "code" in error && error.code === "ENOENT"
                ? "unavailable"
                : "spawn-failed",
            message: error.message
          });
        });

        child.on("close", (code) => {
          clearTimeout(timer);

          if (timedOut) {
            settle({
              ok: false,
              reason: "timeout",
              message: `GNU Backgammon process exceeded ${request.timeoutMs}ms.`
            });
            return;
          }

          settle({
            ok: true,
            exitCode: code ?? -1,
            stdout,
            stderr
          });
        });

        if (request.stdin.length > 0) {
          child.stdin.write(request.stdin);
        }

        child.stdin.end();
      });
    }
  };
};
