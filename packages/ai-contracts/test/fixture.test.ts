import { describe, expect, it } from "vitest";

import { createControlledFixtureChatModel, createFixtureChatModel } from "../src/fixture";

const REQUEST = {
  requestId: "request-1",
  systemInstruction: "system",
  developerInstructions: ["developer"],
  messages: [{ role: "user", text: "What should I do?" }],
  evidence: {
    questionContext: {
      kind: "current-position"
    }
  }
} as const;

describe("fixture chat model", () => {
  it("is asynchronous", async () => {
    const model = createFixtureChatModel({ mode: "success", delayMs: 1 });
    const startedAt = Date.now();

    const result = await model.complete(REQUEST);

    expect(Date.now()).toBeGreaterThanOrEqual(startedAt);
    expect(result.ok).toBe(true);
  });

  it("returns deterministic response text and provenance", async () => {
    const model = createFixtureChatModel({ mode: "success" });

    const first = await model.complete(REQUEST);
    const second = await model.complete(REQUEST);

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    expect(first.model.mode).toBe("fixture");
    expect(first.text).toContain("not strategic advice");
  });

  it("maps unavailable mode", async () => {
    const model = createFixtureChatModel({ mode: "unavailable" });
    const result = await model.complete(REQUEST);

    expect(result).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("maps timeout mode", async () => {
    const model = createFixtureChatModel({ mode: "timeout" });
    const result = await model.complete(REQUEST);

    expect(result).toMatchObject({ ok: false, reason: "timeout" });
  });

  it("maps rate-limited mode", async () => {
    const model = createFixtureChatModel({ mode: "rate-limited" });
    const result = await model.complete(REQUEST);

    expect(result).toMatchObject({ ok: false, reason: "rate-limited" });
  });

  it("maps provider-failed mode", async () => {
    const model = createFixtureChatModel({ mode: "provider-failed" });
    const result = await model.complete(REQUEST);

    expect(result).toMatchObject({ ok: false, reason: "provider-failed" });
  });

  it("maps invalid-response mode", async () => {
    const model = createFixtureChatModel({ mode: "invalid-response" });
    const result = await model.complete(REQUEST);

    expect(result).toMatchObject({ ok: false, reason: "invalid-response" });
  });

  it("supports controlled pending promises", async () => {
    const controlled = createControlledFixtureChatModel();
    const pending = controlled.model.complete(REQUEST);

    controlled.resolve({
      ok: true,
      text: "Fixture coach response. Not strategic advice.",
      model: {
        provider: "fixture-coach",
        model: "fixture-text-v1",
        adapterVersion: "1.0.0",
        mode: "fixture"
      },
      warnings: []
    });

    const result = await pending;
    expect(result.ok).toBe(true);
  });

  it("does not mutate request input", async () => {
    const model = createFixtureChatModel();
    const request = structuredClone(REQUEST);
    const before = JSON.stringify(request);

    await model.complete(request);

    expect(JSON.stringify(request)).toBe(before);
  });
});
