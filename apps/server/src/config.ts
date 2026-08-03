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

  if (raw === undefined) {
    return "mock";
  }

  return "none";
};

const normalizeEvaluatorProviderMode = (raw: string | undefined): "mock" | "none" => {
  if (raw === "mock" || raw === "none") {
    return raw;
  }

  if (raw === undefined) {
    return "none";
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
  readonly invalidModelProvider: string | undefined;
  readonly invalidEvaluatorProvider: string | undefined;
  readonly openAiCompatible: {
    readonly baseUrl: string;
    readonly model: string | undefined;
    readonly apiKey: string | undefined;
    readonly timeoutMs: number;
    readonly providerLabel: string;
  };
}

const toTrimmed = (raw: string | undefined): string | undefined => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed;
};

export const readServerConfig = (env: NodeJS.ProcessEnv = process.env): ServerConfig => {
  const rawModelProvider = toTrimmed(env.MODEL_PROVIDER);
  const rawEvaluatorProvider = toTrimmed(env.EVALUATOR_PROVIDER);
  const modelProvider = normalizeProviderMode(rawModelProvider);
  const evaluatorProvider = normalizeEvaluatorProviderMode(rawEvaluatorProvider);

  return {
    host: env.SERVER_HOST ?? "0.0.0.0",
    port: parsePort(env.SERVER_PORT),
    modelProvider,
    evaluatorProvider,
    invalidModelProvider:
      rawModelProvider !== undefined &&
      rawModelProvider !== "none" &&
      rawModelProvider !== "mock" &&
      rawModelProvider !== "openai-compatible"
        ? rawModelProvider
        : undefined,
    invalidEvaluatorProvider:
      rawEvaluatorProvider !== undefined &&
      evaluatorProvider === "none" &&
      rawEvaluatorProvider !== "none" &&
      rawEvaluatorProvider !== "mock"
        ? rawEvaluatorProvider
        : undefined,
    openAiCompatible: {
      baseUrl: normalizeBaseUrl(env.OPENAI_COMPAT_BASE_URL) ?? "https://api.openai.com/v1",
      model: env.OPENAI_COMPAT_MODEL?.trim() || undefined,
      apiKey: env.OPENAI_COMPAT_API_KEY?.trim() || undefined,
      timeoutMs: parseTimeoutMs(env.OPENAI_COMPAT_TIMEOUT_MS),
      providerLabel: env.OPENAI_COMPAT_PROVIDER_LABEL?.trim() || "openai-compatible"
    }
  };
};

export const getServerConfigIssues = (config: ServerConfig): readonly string[] => {
  const issues: string[] = [];

  if (config.invalidModelProvider !== undefined) {
    issues.push(
      `Invalid MODEL_PROVIDER value "${config.invalidModelProvider}". Expected one of: none, mock, openai-compatible.`
    );
  }

  if (config.invalidEvaluatorProvider !== undefined) {
    issues.push(
      `Invalid EVALUATOR_PROVIDER value "${config.invalidEvaluatorProvider}". Expected one of: none, mock.`
    );
  }

  if (config.modelProvider === "openai-compatible") {
    if (!config.openAiCompatible.model) {
      issues.push("OPENAI_COMPAT_MODEL is required when MODEL_PROVIDER=openai-compatible.");
    }

    if (!config.openAiCompatible.apiKey) {
      issues.push("OPENAI_COMPAT_API_KEY is required when MODEL_PROVIDER=openai-compatible.");
    }
  }

  return issues;
};
