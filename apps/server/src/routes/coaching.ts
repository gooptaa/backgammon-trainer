import type { CoachingMode } from "@backgammon-trainer/ai-contracts";
import type { FastifyPluginAsync } from "fastify";

import { MockModelAdapter } from "../mockAdapter";

const coachingBodySchema = {
  type: "object",
  required: ["sessionId", "mode", "moveNotation"],
  additionalProperties: false,
  properties: {
    sessionId: { type: "string", minLength: 1 },
    mode: {
      type: "string",
      enum: ["critique", "hint", "explain-candidates"]
    },
    moveNotation: { type: "string", minLength: 1 },
    positionId: { type: "string" }
  }
} as const;

interface CoachingBody {
  sessionId: string;
  mode: CoachingMode;
  moveNotation: string;
  positionId?: string;
}

const coachingRoutes: FastifyPluginAsync = async (app) => {
  const adapter = new MockModelAdapter();

  app.post<{ Body: CoachingBody }>(
    "/api/coaching",
    {
      schema: {
        body: coachingBodySchema
      }
    },
    async (request, reply) => {
      const response = await adapter.complete({
        sessionId: request.body.sessionId,
        mode: request.body.mode,
        player: "white",
        gameState: {
          serializedPosition: request.body.positionId ?? "placeholder-position",
          playerToMove: "white"
        },
        includeStructuredOutput: true
      });

      return reply.send({
        data: {
          mock: true,
          positionId: request.body.positionId ?? "placeholder-position",
          moveNotation: request.body.moveNotation,
          coaching: response,
          adapter: {
            name: adapter.name,
            streamingReady: false
          }
        },
        meta: {
          mock: true
        }
      });
    }
  );
};

export default coachingRoutes;
