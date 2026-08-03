import { describe, expect, it } from "vitest";

import { resolveApiBaseUrlFromEnv, resolveCoachModeFromEnv } from "./runtimeConfig";

describe("resolveCoachModeFromEnv", () => {
  it("defaults to fixture in development when mode is unset", () => {
    expect(resolveCoachModeFromEnv({}, true)).toEqual({
      mode: "fixture",
      warning: undefined
    });
  });

  it("defaults to server in production when mode is unset", () => {
    expect(resolveCoachModeFromEnv({}, false)).toEqual({
      mode: "server",
      warning: undefined
    });
  });

  it("accepts valid explicit mode", () => {
    expect(resolveCoachModeFromEnv({ VITE_COACH_MODEL_MODE: "none" }, true)).toEqual({
      mode: "none",
      warning: undefined
    });
  });

  it("fails clearly for invalid explicit mode", () => {
    const result = resolveCoachModeFromEnv({ VITE_COACH_MODEL_MODE: "bad" }, true);
    expect(result.mode).toBe("none");
    expect(result.warning).toContain("Invalid VITE_COACH_MODEL_MODE value");
  });
});

describe("resolveApiBaseUrlFromEnv", () => {
  it("uses the default api base url when unset", () => {
    expect(resolveApiBaseUrlFromEnv({})).toBe("http://localhost:3001");
  });

  it("normalizes configured base url by trimming trailing slash", () => {
    expect(resolveApiBaseUrlFromEnv({ VITE_API_BASE_URL: "http://localhost:9999/" })).toBe(
      "http://localhost:9999"
    );
  });
});
