import { describe, expect, it, vi } from "vitest";
import { STANDARD_STARTING_POSITION } from "@backgammon-trainer/backgammon-domain";

import {
  createServerPositionEvaluator,
  loadEvaluatorProviderStatus
} from "./serverPositionEvaluator";

const buildEvaluateRequest = () => ({
  position: STANDARD_STARTING_POSITION,
  player: "white" as const,
  dice: {
    dice: [1, 2] as const
  },
  legalOutcomes: [] as const
});

describe("serverPositionEvaluator", () => {
  it("loads evaluator provider status", async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: {
            evaluatorProvider: {
              configured: true,
              mode: "fixture",
              providerFamily: "mock",
              providerLabel: "server-fixture-evaluator",
              message: "Fixture evaluator provider is active."
            }
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    const status = await loadEvaluatorProviderStatus("http://localhost:3001", fetchImpl);
    expect(status).toEqual({
      configured: true,
      mode: "fixture",
      providerFamily: "mock",
      providerLabel: "server-fixture-evaluator",
      message: "Fixture evaluator provider is active."
    });
  });

  it("maps server 503 evaluator response to unavailable", async () => {
    const fetchImpl: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: "evaluator-provider-unconfigured",
            message: "Evaluator provider is disabled by server configuration."
          }
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    };

    const evaluator = createServerPositionEvaluator({
      apiBaseUrl: "http://localhost:3001",
      fetchImpl
    });

    const result = await evaluator.evaluate(buildEvaluateRequest());
    expect(result).toEqual({
      ok: false,
      reason: "unavailable",
      message: "Evaluator provider is disabled by server configuration."
    });
  });

  it("returns evaluated result when server response is valid", async () => {
    const fetchImpl: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          data: {
            result: {
              ok: true,
              coverage: "complete",
              scores: [],
              scoreScale: {
                kind: "relative"
              },
              provenance: {
                provider: "fixture-position-evaluator",
                providerVersion: "0.1.0",
                adapterVersion: "0.1.0",
                settings: {}
              },
              warnings: []
            }
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    };

    const evaluator = createServerPositionEvaluator({
      apiBaseUrl: "http://localhost:3001",
      fetchImpl
    });

    const result = await evaluator.evaluate(buildEvaluateRequest());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.coverage).toBe("complete");
    expect(result.provenance.provider).toBe("fixture-position-evaluator");
  });
});
