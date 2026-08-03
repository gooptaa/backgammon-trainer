const parsePort = (raw: string | undefined): number => {
  const fallbackPort = 3001;

  if (!raw) {
    return fallbackPort;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallbackPort;
};

const parseTimeoutMs = (raw: string | undefined): number => {
  const fallbackTimeoutMs = 15_000;
  if (!raw) {
    return fallbackTimeoutMs;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackTimeoutMs;
  }

  return parsed;
};

const normalizeProviderMode = (raw: string | undefined): "mock" | "openai-compatible" | "none" => {
  if (raw === "mock" || raw === "openai-compatible" || raw === "none") {
    return raw;
  }

  return "mock";
};

const normalizeEvaluatorProviderMode = (raw: string | undefined): "mock" | "none" => {
  if (raw === "mock" || raw === "none") {
    return raw;
  }

  return "none";
};

const normalizeBaseUrl = (raw: string | undefined): string | undefined => {
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly modelProvider: "mock" | "openai-compatible" | "none";
  readonly evaluatorProvider: "mock" | "none";
  readonly openAiCompatible: {
    readonly baseUrl: string;
    readonly model: string | undefined;
    readonly apiKey: string | undefined;
    readonly timeoutMs: number;
    readonly providerLabel: string;
  };
}

export const serverConfig: ServerConfig = {
  host: process.env.SERVER_HOST ?? "0.0.0.0",
  port: parsePort(process.env.SERVER_PORT),
  modelProvider: normalizeProviderMode(process.env.MODEL_PROVIDER),
  evaluatorProvider: normalizeEvaluatorProviderMode(process.env.EVALUATOR_PROVIDER),
  openAiCompatible: {
    baseUrl: normalizeBaseUrl(process.env.OPENAI_COMPAT_BASE_URL) ?? "https://api.openai.com/v1",
    model: process.env.OPENAI_COMPAT_MODEL?.trim() || undefined,
    apiKey: process.env.OPENAI_COMPAT_API_KEY?.trim() || undefined,
    timeoutMs: parseTimeoutMs(process.env.OPENAI_COMPAT_TIMEOUT_MS),
    providerLabel: process.env.OPENAI_COMPAT_PROVIDER_LABEL?.trim() || "openai-compatible"
  }
};
