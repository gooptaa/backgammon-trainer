import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ChatModel } from "@backgammon-trainer/ai-contracts";
import type { PositionEvaluator } from "@backgammon-trainer/backgammon-analysis";

import { buildServer } from "../src/app";
import type { CoachProviderRuntime } from "../src/coachProvider";
import type { EvaluatorProviderRuntime } from "../src/evaluatorProvider";

const buildConfiguredRuntime = (): CoachProviderRuntime => {
  const model: ChatModel = {
    name: "test-model",
    capabilities: {
      nonStreamingText: true,
      supportsSystemInstruction: true,
      supportsDeveloperInstructions: true,
      supportsStructuredEvidence: true
    },
    complete: async (request) => {
      return {
        ok: true,
        text: `ok:${request.requestId}`,
        model: {
          provider: "test-provider",
          model: "test-model-v1",
          adapterVersion: "1.0.0",
          mode: "production"
        },
        warnings: []
      };
    }
  };

  return {
    model,
    status: {
      configured: true,
      mode: "production",
      providerFamily: "openai-compatible",
      providerLabel: "test-provider",
      model: "test-model-v1",
      message: "Configured"
    }
  };
};

const app = buildServer({
  coachProviderRuntime: buildConfiguredRuntime(),
  evaluatorProviderRuntime: {
    evaluator: {
      evaluate: async (request) => {
        return {
          ok: true,
          coverage: "complete",
          scores: request.legalOutcomes.map(() => ({
            moveFingerprint: "test-move",
            normalizedScore: 1
          })),
          scoreScale: {
            kind: "relative"
          },
          provenance: {
            provider: "test-evaluator",
            providerVersion: "1.0.0",
            adapterVersion: "1.0.0",
            settings: {}
          },
          warnings: []
        };
      }
    } satisfies PositionEvaluator,
    status: {
      configured: true,
      mode: "fixture",
      providerFamily: "mock",
      providerLabel: "test-evaluator",
      availability: "available",
      message: "Configured"
    }
  } satisfies EvaluatorProviderRuntime
});

describe("server routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns ok from /health", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("returns non-secret coach status", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/coach/status"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        coachProvider: {
          configured: true,
          providerFamily: "openai-compatible",
          providerLabel: "test-provider",
          model: "test-model-v1"
        }
      }
    });
    expect(response.body).not.toContain("apiKey");
  });

  it("accepts provider-neutral completion requests", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/coach/complete",
      payload: {
        requestId: "request-1",
        systemInstruction: "system",
        developerInstructions: ["dev"],
        messages: [{ role: "user", text: "hello" }],
        evidence: {
          contextKind: "current-position"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        result: {
          ok: true,
          text: "ok:request-1"
        }
      },
      meta: {
        requestId: "request-1"
      }
    });
  });

  it("rejects malformed completion payloads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/coach/complete",
      payload: {
        requestId: "request-1",
        systemInstruction: "system"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects oversized completion payloads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/coach/complete",
      payload: {
        requestId: "request-1",
        systemInstruction: "system",
        messages: [{ role: "user", text: "hello" }],
        evidence: {
          payload: "x".repeat(130_000)
        }
      }
    });

    expect(response.statusCode).toBe(413);
  });

  it("returns non-secret evaluator status", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/evaluator/status"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        evaluatorProvider: {
          configured: true,
          providerFamily: "mock",
          providerLabel: "test-evaluator"
        }
      }
    });
  });

  it("accepts evaluator position requests", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/evaluator/evaluate-position",
      payload: {
        position: {
          points: Object.fromEntries(
            Array.from({ length: 24 }, (_, index) => [String(index + 1), null])
          ),
          bar: {
            white: 0,
            black: 0
          },
          borneOff: {
            white: 0,
            black: 0
          }
        },
        player: "white",
        dice: {
          dice: [1, 2]
        },
        legalOutcomes: []
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        result: {
          ok: true,
          coverage: "complete",
          provenance: {
            provider: "test-evaluator"
          }
        }
      }
    });
  });
});

describe("server route unconfigured provider mode", () => {
  const unconfigured = buildServer({
    coachProviderRuntime: {
      model: undefined,
      status: {
        configured: false,
        mode: "none",
        providerFamily: "none",
        providerLabel: "none",
        model: null,
        message: "Disabled"
      }
    },
    evaluatorProviderRuntime: {
      evaluator: undefined,
      status: {
        configured: false,
        mode: "none",
        providerFamily: "none",
        providerLabel: "none",
        availability: "unknown",
        message: "Evaluator disabled"
      }
    }
  });

  beforeAll(async () => {
    await unconfigured.ready();
  });

  afterAll(async () => {
    await unconfigured.close();
  });

  it("returns 503 when completion is requested without configured provider", async () => {
    const response = await unconfigured.inject({
      method: "POST",
      url: "/api/coach/complete",
      payload: {
        requestId: "request-2",
        systemInstruction: "system",
        messages: [{ role: "user", text: "hello" }]
      }
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: "coach-provider-unconfigured",
        message: "Disabled"
      }
    });
  });

  it("returns 503 when evaluator is requested without configured provider", async () => {
    const response = await unconfigured.inject({
      method: "POST",
      url: "/api/evaluator/evaluate-position",
      payload: {
        position: {
          points: Object.fromEntries(
            Array.from({ length: 24 }, (_, index) => [String(index + 1), null])
          ),
          bar: {
            white: 0,
            black: 0
          },
          borneOff: {
            white: 0,
            black: 0
          }
        },
        player: "white",
        dice: {
          dice: [1, 2]
        },
        legalOutcomes: []
      }
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: "evaluator-provider-unconfigured",
        message: "Evaluator disabled"
      }
    });
  });
});
