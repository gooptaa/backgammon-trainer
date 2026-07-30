import Fastify from "fastify";

import coachingRoutes from "./routes/coaching";
import healthRoutes from "./routes/health";

export const buildServer = () => {
  const app = Fastify({ logger: false });

  app.register(healthRoutes);
  app.register(coachingRoutes);

  return app;
};
