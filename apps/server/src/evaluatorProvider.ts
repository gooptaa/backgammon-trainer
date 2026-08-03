import type { PositionEvaluator } from "@backgammon-trainer/backgammon-analysis";
import { createFixturePositionEvaluator } from "@backgammon-trainer/backgammon-analysis/fixture";

import type { ServerConfig } from "./config";

export interface EvaluatorProviderStatus {
  readonly configured: boolean;
  readonly mode: "none" | "fixture";
  readonly providerFamily: "none" | "mock";
  readonly providerLabel: string;
  readonly message: string;
}

export interface EvaluatorProviderRuntime {
  readonly evaluator: PositionEvaluator | undefined;
  readonly status: EvaluatorProviderStatus;
}

export const createEvaluatorProviderRuntime = (config: ServerConfig): EvaluatorProviderRuntime => {
  if (config.evaluatorProvider === "none") {
    return {
      evaluator: undefined,
      status: {
        configured: false,
        mode: "none",
        providerFamily: "none",
        providerLabel: "none",
        message: "Evaluator provider is disabled by server configuration."
      }
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
      message: "Fixture evaluator provider is active."
    }
  };
};
