import type { GnuBgProcessRunner } from "./evaluator.js";

export interface DetectGnuBgOptions {
  readonly executable?: string;
  readonly timeoutMs?: number;
  readonly processRunner: GnuBgProcessRunner;
}

export type GnuBgCapabilityResult =
  | {
      readonly ok: true;
      readonly status: "available";
      readonly executable: string;
      readonly versionText: string;
      readonly parsedVersion: string;
      readonly supportsTty: true;
      readonly supportsCommandsFile: true;
      readonly analysisInvocation: {
        readonly status: "unverified";
        readonly message: string;
      };
    }
  | {
      readonly ok: false;
      readonly status: "unavailable" | "incompatible" | "detection-failed";
      readonly executable: string;
      readonly message: string;
      readonly versionText?: string;
    };

const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_EXECUTABLE = "gnubg";

export const parseGnuBgVersionText = (text: string): string | null => {
  const versionMatch = /(?:GNU Backgammon|gnubg)(?:[^0-9]+)?(\d+\.\d+(?:\.\d+)?)/i.exec(text);

  return versionMatch?.[1] ?? null;
};

const helpSupportsRequiredOptions = (output: string): boolean => {
  const normalized = output.toLowerCase();

  return normalized.includes("--commands") && normalized.includes("--tty");
};

export const detectGnuBg = async (options: DetectGnuBgOptions): Promise<GnuBgCapabilityResult> => {
  const executable = options.executable ?? DEFAULT_EXECUTABLE;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const versionResult = await options.processRunner.run({
    executable,
    args: ["--version"],
    stdin: "",
    timeoutMs
  });

  if (!versionResult.ok) {
    if (versionResult.reason === "unavailable") {
      return {
        ok: false,
        status: "unavailable",
        executable,
        message: "GNU Backgammon executable is unavailable."
      };
    }

    return {
      ok: false,
      status: "detection-failed",
      executable,
      message: "GNU Backgammon version detection failed."
    };
  }

  if (versionResult.exitCode !== 0) {
    return {
      ok: false,
      status: "incompatible",
      executable,
      message: "GNU Backgammon did not return a successful version response.",
      versionText: versionResult.stdout.trim()
    };
  }

  const helpResult = await options.processRunner.run({
    executable,
    args: ["--help"],
    stdin: "",
    timeoutMs
  });

  if (!helpResult.ok) {
    return {
      ok: false,
      status: "detection-failed",
      executable,
      message: "GNU Backgammon help detection failed.",
      versionText: versionResult.stdout.trim()
    };
  }

  if (helpResult.exitCode !== 0) {
    return {
      ok: false,
      status: "incompatible",
      executable,
      message: "GNU Backgammon did not return a successful help response.",
      versionText: versionResult.stdout.trim()
    };
  }

  const helpOutput = `${helpResult.stdout}\n${helpResult.stderr}`;

  if (!helpSupportsRequiredOptions(helpOutput)) {
    return {
      ok: false,
      status: "incompatible",
      executable,
      message:
        "GNU Backgammon help output does not advertise required tty and commands-file options.",
      versionText: versionResult.stdout.trim()
    };
  }

  return {
    ok: true,
    status: "available",
    executable,
    versionText: versionResult.stdout.trim(),
    parsedVersion: parseGnuBgVersionText(versionResult.stdout) ?? "unknown",
    supportsTty: true,
    supportsCommandsFile: true,
    analysisInvocation: {
      status: "unverified",
      message:
        "TTY and commands-file options were detected, but the checker-play command transcript remains unverified in this spike."
    }
  };
};
