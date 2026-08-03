import Fastify from "fastify";

import { createCoachProviderRuntime, type CoachProviderRuntime } from "./coachProvider";
import { serverConfig } from "./config";
import coachingRoutes from "./routes/coaching";
import healthRoutes from "./routes/health";

export interface BuildServerOptions {
  readonly coachProviderRuntime?: CoachProviderRuntime;
}

export const buildServer = (options?: BuildServerOptions) => {
  const app = Fastify({ logger: false });
  const providerRuntime = options?.coachProviderRuntime ?? createCoachProviderRuntime(serverConfig);

  app.register(healthRoutes);
  app.register(coachingRoutes, {
    coachModel: providerRuntime.model,
    coachProviderStatus: providerRuntime.status
  });

  return app;
};
