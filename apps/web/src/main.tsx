import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { createFixturePositionEvaluator } from "@backgammon-trainer/backgammon-analysis/fixture";

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App {...(devFixtureEvaluator === undefined ? {} : { moveEvaluator: devFixtureEvaluator })} />
  </React.StrictMode>
);
