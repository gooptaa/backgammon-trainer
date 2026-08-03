import { describe, expect, it, vi } from "vitest";

import { OpenAiCompatibleChatModelAdapter } from "../src/openAiCompatibleAdapter";

const REQUEST = {
  requestId: "request-1",
  systemInstruction: "system",
  developerInstructions: ["developer"],
  messages: [{ role: "user", text: "Why this move?" }],
  evidence: {
    contextKind: "current-position",
    deterministicEvidence: {
      legalMoves: 3
    }
  },
  settings: {
    temperature: 0.2
  }
} as const;

const createAdapter = (fetchImpl: typeof fetch) => {
  return new OpenAiCompatibleChatModelAdapter({
    endpointBaseUrl: "https://example.test/v1",
    apiKey: "test-key",
    model: "gpt-test",
    providerLabel: "openai-compatible",
    timeoutMs: 50,
    fetchImpl
  });
};

describe("OpenAiCompatibleChatModelAdapter", () => {
  it("maps valid provider response to generic success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "gpt-test",
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: "Answer text"
              }
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 6,
            total_tokens: 16
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );

    const adapter = createAdapter(fetchImpl);
    const result = await adapter.complete(REQUEST);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.text).toBe("Answer text");
    expect(result.model.provider).toBe("openai-compatible");
    expect(result.model.model).toBe("gpt-test");
    expect(result.usage).toEqual({
      inputTokens: 10,
      outputTokens: 6,
      totalTokens: 16
    });

    const [, init] = fetchImpl.mock.calls[0] as [RequestInfo | URL, RequestInit];
    const bodyText = typeof init.body === "string" ? init.body : "";
    const body = JSON.parse(bodyText) as {
      messages: readonly { role: string; content: string }[];
    };
    expect(
      body.messages.some((message) => message.content.includes("Structured coaching evidence"))
    ).toBe(true);
  });

  it("fails closed on missing completion text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: null
              }
            }
          ]
        }),
        { status: 200 }
      )
    );

    const adapter = createAdapter(fetchImpl);
    const result = await adapter.complete(REQUEST);

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid-response"
    });
  });

  it("maps authentication failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "bad key" } }), {
        status: 401,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    const adapter = createAdapter(fetchImpl);
    const result = await adapter.complete(REQUEST);

    expect(result).toMatchObject({
      ok: false,
      reason: "authentication-failed",
      retryable: false
    });
    expect(JSON.stringify(result)).not.toContain("test-key");
  });

  it("maps rate-limited and timeout statuses", async () => {
    const rateLimitedFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 429 }));
    const timeoutFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 504 }));

    const rateLimitedAdapter = createAdapter(rateLimitedFetch);
    const timeoutAdapter = createAdapter(timeoutFetch);

    await expect(rateLimitedAdapter.complete(REQUEST)).resolves.toMatchObject({
      ok: false,
      reason: "rate-limited"
    });
    await expect(timeoutAdapter.complete(REQUEST)).resolves.toMatchObject({
      ok: false,
      reason: "timeout"
    });
  });

  it("maps network failures to unavailable", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("network failed"));
    const adapter = createAdapter(fetchImpl);

    const result = await adapter.complete(REQUEST);
    expect(result).toMatchObject({
      ok: false,
      reason: "unavailable"
    });
  });

  it("does not mutate request input", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "ok"
              }
            }
          ]
        }),
        { status: 200 }
      )
    );

    const adapter = createAdapter(fetchImpl);
    const request = structuredClone(REQUEST);
    const before = JSON.stringify(request);

    await adapter.complete(request);

    expect(JSON.stringify(request)).toBe(before);
  });
});
