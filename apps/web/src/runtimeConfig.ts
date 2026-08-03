export type CoachRuntimeMode = "fixture" | "server" | "none";

const DEFAULT_API_BASE_URL = "http://localhost:3001";

const readEnvString = (value: unknown): string | undefined => {
  return typeof value === "string" ? value : undefined;
};

export interface CoachModeResolution {
  readonly mode: CoachRuntimeMode;
  readonly warning: string | undefined;
}

export const resolveCoachModeFromEnv = (
  env: Record<string, unknown>,
  isDev: boolean
): CoachModeResolution => {
  const configured = readEnvString(env.VITE_COACH_MODEL_MODE)?.trim();
  if (configured === undefined || configured.length === 0) {
    return {
      mode: isDev ? "fixture" : "server",
      warning: undefined
    };
  }

  if (configured === "fixture" || configured === "server" || configured === "none") {
    return {
      mode: configured,
      warning: undefined
    };
  }

  return {
    mode: "none",
    warning:
      `Invalid VITE_COACH_MODEL_MODE value "${configured}". ` +
      "Expected one of: none, fixture, server."
  };
};

export const resolveApiBaseUrlFromEnv = (env: Record<string, unknown>): string => {
  const configured = readEnvString(env.VITE_API_BASE_URL)?.trim();
  if (!configured) {
    return DEFAULT_API_BASE_URL;
  }

  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
};
