import type { FastifyPluginAsync } from "fastify";
import type {
  EvaluatePositionRequest,
  EvaluatePositionResult,
  PositionEvaluator
} from "@backgammon-trainer/backgammon-analysis";

import type { EvaluatorProviderStatus } from "../evaluatorProvider";

const MAX_EVALUATOR_REQUEST_BYTES = 400_000;

const evaluateBodySchema = {
  type: "object",
  required: ["position", "player", "dice", "legalOutcomes"],
  additionalProperties: false,
  properties: {
    position: {
      type: "object"
    },
    player: {
      type: "string",
      enum: ["white", "black"]
    },
    dice: {
      type: "object",
      required: ["dice"],
      additionalProperties: false,
      properties: {
        dice: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: {
            type: "number",
            minimum: 1,
            maximum: 6
          }
        }
      }
    },
    legalOutcomes: {
      type: "array",
      maxItems: 256
    },
    context: {
      type: "object",
      additionalProperties: false,
      properties: {
        gameMode: {
          type: "string",
          enum: ["money", "match"]
        }
      }
    }
  }
} as const;

const evaluatorRoutes: FastifyPluginAsync<{
  evaluator: PositionEvaluator | undefined;
  evaluatorStatus: EvaluatorProviderStatus;
}> = async (app, options) => {
  app.get("/api/evaluator/status", async (_request, reply) => {
    return reply.send({
      data: {
        evaluatorProvider: options.evaluatorStatus
      }
    });
  });

  app.post<{ Body: EvaluatePositionRequest }>(
    "/api/evaluator/evaluate-position",
    {
      schema: {
        body: evaluateBodySchema
      },
      bodyLimit: MAX_EVALUATOR_REQUEST_BYTES
    },
    async (request, reply) => {
      const payloadBytes = Buffer.byteLength(JSON.stringify(request.body), "utf8");
      if (payloadBytes > MAX_EVALUATOR_REQUEST_BYTES) {
        return reply.code(413).send({
          error: {
            code: "payload-too-large",
            message: "Evaluator request payload is too large."
          }
        });
      }

      if (options.evaluator === undefined) {
        return reply.code(503).send({
          error: {
            code: "evaluator-provider-unconfigured",
            message: options.evaluatorStatus.message
          }
        });
      }

      let result: EvaluatePositionResult;
      try {
        result = await options.evaluator.evaluate(request.body);
      } catch {
        result = {
          ok: false,
          reason: "provider-failed",
          message: "Evaluator provider execution failed unexpectedly."
        };
      }

      return reply.send({
        data: {
          result
        }
      });
    }
  );
};

export default evaluatorRoutes;
