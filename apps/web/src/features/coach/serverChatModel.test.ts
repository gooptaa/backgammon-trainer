import { describe, expect, it, vi } from "vitest";

import { createServerCoachChatModel, loadCoachProviderStatus } from "./serverChatModel";

const REQUEST = {
  requestId: "request-1",
  systemInstruction: "system",
  messages: [{ role: "user", text: "question" }]
} as const;

describe("server coach model client", () => {
  it("loads provider status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            coachProvider: {
              configured: true,
              mode: "production",
              providerFamily: "openai-compatible",
              providerLabel: "openai-compatible",
              model: "gpt-test",
              message: "Configured"
            }
          }
        }),
        { status: 200 }
      )
    );

    const status = await loadCoachProviderStatus("http://localhost:3001", fetchImpl);
    expect(status?.configured).toBe(true);
    expect(status?.model).toBe("gpt-test");
  });

  it("maps successful completion result", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            result: {
              ok: true,
              text: "answer",
              model: {
                provider: "openai-compatible",
                model: "gpt-test",
                adapterVersion: "1",
                mode: "production"
              },
              warnings: []
            }
          }
        }),
        { status: 200 }
      )
    );

    const model = createServerCoachChatModel({
      apiBaseUrl: "http://localhost:3001",
      providerLabel: "openai-compatible",
      modelLabel: "gpt-test",
      fetchImpl
    });

    const result = await model.complete(REQUEST);
    expect(result).toMatchObject({ ok: true, text: "answer" });
  });

  it("maps server unconfigured status to unavailable", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "coach-provider-unconfigured",
            message: "Not configured"
          }
        }),
        { status: 503 }
      )
    );

    const model = createServerCoachChatModel({
      apiBaseUrl: "http://localhost:3001",
      providerLabel: "openai-compatible",
      modelLabel: "gpt-test",
      fetchImpl
    });

    const result = await model.complete(REQUEST);
    expect(result).toMatchObject({
      ok: false,
      reason: "unavailable"
    });
  });

  it("maps invalid server payload to invalid-response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            result: {
              ok: true
            }
          }
        }),
        { status: 200 }
      )
    );

    const model = createServerCoachChatModel({
      apiBaseUrl: "http://localhost:3001",
      providerLabel: "openai-compatible",
      modelLabel: "gpt-test",
      fetchImpl
    });

    const result = await model.complete(REQUEST);
    expect(result).toMatchObject({
      ok: false,
      reason: "invalid-response"
    });
  });
});
