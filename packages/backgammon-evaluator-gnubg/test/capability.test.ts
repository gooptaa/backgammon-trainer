import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { detectGnuBg, parseGnuBgVersionText } from "../src/capability";
import { createQueuedFakeGnuBgProcessRunner } from "../src/testing";

const readFixture = (name: string): string => {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
};

const HELP_TEXT = `-c, --commands=FILE Evaluate commands in FILE and exit\n-p, --python=FILE Start in Python mode or evaluate code in FILE and exit\n-t, --tty Start on tty instead of using window system\n-v, --version Show version information and exit\n`;

describe("detectGnuBg", () => {
  it("reports an available binary with observed version and required help options", async () => {
    const runner = createQueuedFakeGnuBgProcessRunner([
      { ok: true, exitCode: 0, stdout: readFixture("version.txt"), stderr: "" },
      { ok: true, exitCode: 0, stdout: HELP_TEXT, stderr: "" }
    ]);

    await expect(detectGnuBg({ processRunner: runner })).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        status: "available",
        parsedVersion: "1.08.003"
      })
    );
  });

  it("reports an unavailable executable truthfully", async () => {
    const runner = createQueuedFakeGnuBgProcessRunner([
      { ok: false, reason: "unavailable", message: "missing" }
    ]);

    await expect(detectGnuBg({ processRunner: runner })).resolves.toEqual(
      expect.objectContaining({ ok: false, status: "unavailable" })
    );
  });

  it("distinguishes incompatible help output from simple availability", async () => {
    const runner = createQueuedFakeGnuBgProcessRunner([
      { ok: true, exitCode: 0, stdout: readFixture("version.txt"), stderr: "" },
      { ok: true, exitCode: 0, stdout: "--version only\n", stderr: "" }
    ]);

    await expect(detectGnuBg({ processRunner: runner })).resolves.toEqual(
      expect.objectContaining({ ok: false, status: "incompatible" })
    );
  });

  it("parses expected version text formats", () => {
    expect(parseGnuBgVersionText(readFixture("version.txt"))).toBe("1.08.003");
    expect(parseGnuBgVersionText("GNU Backgammon 1.07.001")).toBe("1.07.001");
  });
});
