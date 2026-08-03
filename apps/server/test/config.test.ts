import { describe, expect, it } from "vitest";

import { getServerConfigIssues, readServerConfig } from "../src/config";
import { createCoachProviderRuntime } from "../src/coachProvider";
import { createEvaluatorProviderRuntime } from "../src/evaluatorProvider";

describe("server configuration parsing", () => {
  it("flags invalid provider mode selections", () => {
    const config = readServerConfig({
      MODEL_PROVIDER: "invalid-mode",
      EVALUATOR_PROVIDER: "wrong"
    });

    const issues = getServerConfigIssues(config);

    expect(issues).toContain(
      'Invalid MODEL_PROVIDER value "invalid-mode". Expected one of: none, mock, openai-compatible.'
    );
    expect(issues).toContain(
      'Invalid EVALUATOR_PROVIDER value "wrong". Expected one of: none, mock, gnubg.'
    );
  });

  it("requires model and api key only in openai-compatible mode", () => {
    const openAiConfig = readServerConfig({
      MODEL_PROVIDER: "openai-compatible",
      OPENAI_COMPAT_MODEL: "",
      OPENAI_COMPAT_API_KEY: ""
    });

    const openAiIssues = getServerConfigIssues(openAiConfig);
    expect(openAiIssues).toContain(
      "OPENAI_COMPAT_MODEL is required when MODEL_PROVIDER=openai-compatible."
    );
    expect(openAiIssues).toContain(
      "OPENAI_COMPAT_API_KEY is required when MODEL_PROVIDER=openai-compatible."
    );

    const fixtureConfig = readServerConfig({
      MODEL_PROVIDER: "mock"
    });
    expect(getServerConfigIssues(fixtureConfig)).toEqual([]);
  });
});

describe("provider runtime invalid-mode behavior", () => {
  it("returns unconfigured coach runtime for invalid model provider mode", () => {
    const config = readServerConfig({
      MODEL_PROVIDER: "invalid-mode"
    });

    const runtime = createCoachProviderRuntime(config);

    expect(runtime.model).toBeUndefined();
    expect(runtime.status.configured).toBe(false);
    expect(runtime.status.message).toContain("Invalid MODEL_PROVIDER value");
  });

  it("returns unconfigured evaluator runtime for invalid evaluator provider mode", () => {
    const config = readServerConfig({
      EVALUATOR_PROVIDER: "invalid-mode"
    });

    const runtime = createEvaluatorProviderRuntime(config);

    expect(runtime.evaluator).toBeUndefined();
    expect(runtime.status.configured).toBe(false);
    expect(runtime.status.message).toContain("Invalid EVALUATOR_PROVIDER value");
  });

  it("normalizes gnu alias to gnubg mode with defaults", () => {
    const config = readServerConfig({
      EVALUATOR_PROVIDER: "gnu"
    });

    expect(config.evaluatorProvider).toBe("gnubg");
    expect(config.gnubg.executable).toBe("gnubg");
    expect(config.gnubg.timeoutMs).toBe(4000);
    expect(config.gnubg.detectionTimeoutMs).toBe(2000);
  });
});
