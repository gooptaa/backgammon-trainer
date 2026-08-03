import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { createFixturePositionEvaluator } from "@backgammon-trainer/backgammon-analysis/fixture";
import { createFixtureChatModel } from "@backgammon-trainer/ai-contracts/fixture";

import App from "./App";

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

const devFixtureCoachModel = import.meta.env.DEV
  ? createFixtureChatModel({
      mode: "success",
      responseText:
        "Fixture coach response. This response is development fixture output and not strategic advice."
    })
  : undefined;

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App
      analysisCaptureEnabled={import.meta.env.DEV}
      analysisCaptureRuntime={devAnalysisCaptureRuntime}
      analysisCaptureMetadata={devAnalysisCaptureMetadata}
      coachFixtureEnabled={devFixtureCoachModel !== undefined}
      {...(devFixtureCoachModel === undefined ? {} : { coachModel: devFixtureCoachModel })}
      {...(devFixtureEvaluator === undefined ? {} : { moveEvaluator: devFixtureEvaluator })}
    />
  </React.StrictMode>
);
