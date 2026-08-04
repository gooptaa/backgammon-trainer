import type { FastifyPluginAsync } from "fastify";
import type { ChatModel, ChatModelRequest } from "@backgammon-trainer/ai-contracts";

import type { CoachProviderStatus } from "../coachProvider";

const MAX_COACH_REQUEST_BYTES = 120_000;

const completionBodySchema = {
  type: "object",
  required: ["requestId", "systemInstruction", "messages"],
  additionalProperties: false,
  properties: {
    requestId: { type: "string", minLength: 1, maxLength: 128 },
    systemInstruction: { type: "string", minLength: 1, maxLength: 5000 },
    developerInstructions: {
      type: "array",
      maxItems: 40,
      items: {
        type: "string",
        maxLength: 2000
      }
    },
    messages: {
      type: "array",
      minItems: 1,
      maxItems: 24,
      items: {
        type: "object",
        required: ["role", "text"],
        additionalProperties: false,
        properties: {
          role: {
            type: "string",
            enum: ["system", "developer", "user", "assistant"]
          },
          text: {
            type: "string",
            minLength: 1,
            maxLength: 4000
          }
        }
      }
    },
    evidence: {},
    settings: {
      type: "object",
      additionalProperties: false,
      properties: {
        temperature: { type: "number", minimum: 0, maximum: 2 },
        maxOutputChars: { type: "number", minimum: 1, maximum: 12000 }
      }
    }
  }
} as const;

const coachingRoutes: FastifyPluginAsync<{
  coachModel: ChatModel | undefined;
  coachProviderStatus: CoachProviderStatus;
}> = async (app, options) => {
  app.get("/api/coach/status", async (_request, reply) => {
    return reply.send({
      data: {
        coachProvider: options.coachProviderStatus
      }
    });
  });

  app.post<{ Body: ChatModelRequest }>(
    "/api/coach/complete",
    {
      schema: {
        body: completionBodySchema
      },
      bodyLimit: MAX_COACH_REQUEST_BYTES
    },
    async (request, reply) => {
      const payloadBytes = Buffer.byteLength(JSON.stringify(request.body), "utf8");
      if (payloadBytes > MAX_COACH_REQUEST_BYTES) {
        return reply.code(413).send({
          error: {
            code: "payload-too-large",
            message: "Coach request payload is too large."
          }
        });
      }

      if (options.coachModel === undefined) {
        return reply.code(503).send({
          error: {
            code: "coach-provider-unconfigured",
            message: options.coachProviderStatus.message
          }
        });
      }

      const result = await options.coachModel.complete(request.body);

      return reply.send({
        data: {
          result
        },
        meta: {
          requestId: request.body.requestId
        }
      });
    }
  );
};

export default coachingRoutes;
