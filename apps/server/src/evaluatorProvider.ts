import type { PositionEvaluator } from "@backgammon-trainer/backgammon-analysis";
import { createFixturePositionEvaluator } from "@backgammon-trainer/backgammon-analysis/fixture";
import {
  createGnuBgPositionEvaluator,
  detectGnuBg
} from "@backgammon-trainer/backgammon-evaluator-gnubg";
import { createNodeGnuBgProcessRunner } from "@backgammon-trainer/backgammon-evaluator-gnubg/node";

import type { ServerConfig } from "./config";

export interface EvaluatorProviderStatus {
  readonly configured: boolean;
  readonly mode: "none" | "fixture" | "gnubg";
  readonly providerFamily: "none" | "mock" | "gnubg";
  readonly providerLabel: string;
  readonly availability:
    "unknown" | "checking" | "available" | "unavailable" | "incompatible" | "detection-failed";
  readonly providerVersion?: string;
  readonly issue?: string;
  readonly message: string;
}

export interface EvaluatorProviderRuntime {
  readonly evaluator: PositionEvaluator | undefined;
  readonly status: EvaluatorProviderStatus;
}

interface MutableEvaluatorProviderStatus {
  configured: boolean;
  mode: "none" | "fixture" | "gnubg";
  providerFamily: "none" | "mock" | "gnubg";
  providerLabel: string;
  availability:
    "unknown" | "checking" | "available" | "unavailable" | "incompatible" | "detection-failed";
  providerVersion?: string;
  issue?: string;
  message: string;
}

export const createEvaluatorProviderRuntime = (config: ServerConfig): EvaluatorProviderRuntime => {
  if (config.invalidEvaluatorProvider !== undefined) {
    return {
      evaluator: undefined,
      status: {
        configured: false,
        mode: "none",
        providerFamily: "none",
        providerLabel: "none",
        availability: "unknown",
        message: `Invalid EVALUATOR_PROVIDER value "${config.invalidEvaluatorProvider}". Expected one of: none, mock, gnubg.`
      }
    };
  }

  if (config.evaluatorProvider === "none") {
    return {
      evaluator: undefined,
      status: {
        configured: false,
        mode: "none",
        providerFamily: "none",
        providerLabel: "none",
        availability: "unknown",
        message: "Evaluator provider is disabled by server configuration."
      }
    };
  }

  if (config.evaluatorProvider === "gnubg") {
    const processRunner = createNodeGnuBgProcessRunner();
    const mutableStatus: MutableEvaluatorProviderStatus = {
      configured: true,
      mode: "gnubg",
      providerFamily: "gnubg",
      providerLabel: "gnu-backgammon",
      availability: "checking",
      message: "GNU Backgammon evaluator configured. Availability check pending."
    };

    void detectGnuBg({
      executable: config.gnubg.executable,
      timeoutMs: config.gnubg.detectionTimeoutMs,
      processRunner
    })
      .then((capability) => {
        if (capability.ok) {
          mutableStatus.availability = "available";
          mutableStatus.providerVersion = capability.parsedVersion;
          mutableStatus.message = "GNU Backgammon evaluator is available.";
          return;
        }

        mutableStatus.availability = capability.status;
        mutableStatus.issue = capability.message;
        mutableStatus.message = `GNU Backgammon evaluator unavailable: ${capability.message}`;
      })
      .catch(() => {
        mutableStatus.availability = "detection-failed";
        mutableStatus.issue = "GNU Backgammon capability detection failed.";
        mutableStatus.message = "GNU Backgammon evaluator availability check failed.";
      });

    return {
      evaluator: createGnuBgPositionEvaluator({
        executable: config.gnubg.executable,
        timeoutMs: config.gnubg.timeoutMs,
        processRunner
      }),
      status: mutableStatus
    };
  }

  return {
    evaluator: createFixturePositionEvaluator({
      mode: "complete",
      warnings: ["Synthetic fixture data for evaluator contract preview."]
    }),
    status: {
      configured: true,
      mode: "fixture",
      providerFamily: "mock",
      providerLabel: "server-fixture-evaluator",
      availability: "available",
      message: "Fixture evaluator provider is active."
    }
  };
};
