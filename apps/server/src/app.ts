import Fastify from "fastify";

import { createCoachProviderRuntime, type CoachProviderRuntime } from "./coachProvider";
import { createEvaluatorProviderRuntime, type EvaluatorProviderRuntime } from "./evaluatorProvider";
import { serverConfig } from "./config";
import coachingRoutes from "./routes/coaching";
import evaluatorRoutes from "./routes/evaluator";
import healthRoutes from "./routes/health";

export interface BuildServerOptions {
  readonly coachProviderRuntime?: CoachProviderRuntime;
  readonly evaluatorProviderRuntime?: EvaluatorProviderRuntime;
}

export const buildServer = (options?: BuildServerOptions) => {
  const app = Fastify({ logger: false });
  const providerRuntime = options?.coachProviderRuntime ?? createCoachProviderRuntime(serverConfig);
  const evaluatorRuntime =
    options?.evaluatorProviderRuntime ?? createEvaluatorProviderRuntime(serverConfig);

  app.register(healthRoutes);
  app.register(evaluatorRoutes, {
    evaluator: evaluatorRuntime.evaluator,
    evaluatorStatus: evaluatorRuntime.status
  });
  app.register(coachingRoutes, {
    coachModel: providerRuntime.model,
    coachProviderStatus: providerRuntime.status
  });

  return app;
};
