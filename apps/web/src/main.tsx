import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import type { ChatModel } from "@backgammon-trainer/ai-contracts";
import type { PositionEvaluator } from "@backgammon-trainer/backgammon-analysis";
import { createFixturePositionEvaluator } from "@backgammon-trainer/backgammon-analysis/fixture";
import { createFixtureChatModel } from "@backgammon-trainer/ai-contracts/fixture";

import App from "./App";
import {
  createServerCoachChatModel,
  loadCoachProviderStatus,
  type CoachProviderStatus
} from "./features/coach/serverChatModel";
import {
  createServerPositionEvaluator,
  loadEvaluatorProviderStatus
} from "./features/analysis-session/serverPositionEvaluator";
import { resolveApiBaseUrlFromEnv, resolveCoachModeFromEnv } from "./runtimeConfig";

registerSW({
  immediate: true
});

const devFixtureEvaluator =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_FIXTURE_EVALUATOR === "true"
    ? createFixturePositionEvaluator({
        mode: "complete",
        warnings: ["Synthetic fixture data for evaluator contract preview."]
      })
    : undefined;

const devAnalysisCaptureRuntime = {
  createSessionId: () => crypto.randomUUID(),
  now: () => new Date().toISOString()
};

interface CoachRuntimeBootstrap {
  readonly coachModel?: ChatModel;
  readonly moveEvaluator?: PositionEvaluator;
  readonly coachFixtureEnabled: boolean;
  readonly coachProviderStatus?: CoachProviderStatus;
}

const resolveCoachRuntimeBootstrap = async (): Promise<CoachRuntimeBootstrap> => {
  const modeResolution = resolveCoachModeFromEnv(import.meta.env, import.meta.env.DEV);
  const mode = modeResolution.mode;

  if (modeResolution.warning !== undefined) {
    return {
      coachFixtureEnabled: false,
      coachProviderStatus: {
        configured: false,
        mode: "none",
        providerFamily: "none",
        providerLabel: "none",
        model: null,
        message: modeResolution.warning
      }
    };
  }

  if (mode === "none") {
    return {
      coachFixtureEnabled: false,
      coachProviderStatus: {
        configured: false,
        mode: "none",
        providerFamily: "none",
        providerLabel: "none",
        model: null,
        message: "Coach provider is disabled in browser configuration."
      }
    };
  }

  if (mode === "fixture") {
    return {
      coachModel: createFixtureChatModel({
        mode: "success",
        responseText:
          "Fixture coach response. This response is development fixture output and not strategic advice."
      }),
      coachFixtureEnabled: true,
      coachProviderStatus: {
        configured: true,
        mode: "fixture",
        providerFamily: "mock",
        providerLabel: "browser-fixture",
        model: "fixture-text-v1",
        message: "Development fixture coach is active in this browser build."
      }
    };
  }

  const apiBaseUrl = resolveApiBaseUrlFromEnv(import.meta.env);
  const serverStatus = await loadCoachProviderStatus(apiBaseUrl);
  const evaluatorStatus = await loadEvaluatorProviderStatus(apiBaseUrl);

  if (serverStatus === null) {
    return {
      coachModel: createServerCoachChatModel({
        apiBaseUrl,
        providerLabel: "server-unavailable",
        modelLabel: "unresolved"
      }),
      ...(evaluatorStatus?.configured
        ? {
            moveEvaluator: createServerPositionEvaluator({
              apiBaseUrl
            })
          }
        : {}),
      coachFixtureEnabled: false,
      coachProviderStatus: {
        configured: false,
        mode: "production",
        providerFamily: "openai-compatible",
        providerLabel: "server-unavailable",
        model: null,
        message: "Unable to load coach provider status from server."
      }
    };
  }

  return {
    ...(serverStatus.configured
      ? {
          coachModel: createServerCoachChatModel({
            apiBaseUrl,
            providerLabel: serverStatus.providerLabel,
            modelLabel: serverStatus.model ?? "unknown-model"
          })
        }
      : {}),
    ...(evaluatorStatus?.configured
      ? {
          moveEvaluator: createServerPositionEvaluator({
            apiBaseUrl
          })
        }
      : {}),
    coachFixtureEnabled: serverStatus.mode === "fixture",
    coachProviderStatus: serverStatus
  };
};

const devAnalysisCaptureMetadata = {
  analysisFormat: "ranked-legal-move-analysis",
  analysisVersion: 1,
  generatorVersion: "web-analysis-capture/1.0.0",
  evaluatorProvider: "fixture-position-evaluator",
  evaluatorVersion: "0.1.0",
  scoreScale: {
    kind: "relative"
  } as const
};

void resolveCoachRuntimeBootstrap().then((coachBootstrap) => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App
        analysisCaptureEnabled={import.meta.env.DEV}
        analysisCaptureRuntime={devAnalysisCaptureRuntime}
        analysisCaptureMetadata={devAnalysisCaptureMetadata}
        coachFixtureEnabled={coachBootstrap.coachFixtureEnabled}
        {...(coachBootstrap.coachModel === undefined
          ? {}
          : { coachModel: coachBootstrap.coachModel })}
        {...(coachBootstrap.coachProviderStatus === undefined
          ? {}
          : { coachProviderStatus: coachBootstrap.coachProviderStatus })}
        {...(() => {
          const evaluator = devFixtureEvaluator ?? coachBootstrap.moveEvaluator;
          return evaluator === undefined ? {} : { moveEvaluator: evaluator };
        })()}
      />
    </React.StrictMode>
  );
});
