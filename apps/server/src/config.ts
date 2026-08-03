const parsePort = (raw: string | undefined): number => {
  const fallbackPort = 3001;

  if (!raw) {
    return fallbackPort;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallbackPort;
};

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const parseTimeoutMs = (raw: string | undefined): number => parsePositiveInt(raw, 15_000);

const normalizeProviderMode = (raw: string | undefined): "mock" | "openai-compatible" | "none" => {
  if (raw === "mock" || raw === "openai-compatible" || raw === "none") {
    return raw;
  }

  if (raw === undefined) {
    return "mock";
  }

  return "none";
};

const normalizeEvaluatorProviderMode = (raw: string | undefined): "mock" | "none" | "gnubg" => {
  if (raw === "mock" || raw === "none" || raw === "gnubg" || raw === "gnu") {
    return raw === "gnu" ? "gnubg" : raw;
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

const toTrimmed = (raw: string | undefined): string | undefined => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed;
};

export interface GnuBgConfig {
  readonly executable: string;
  readonly timeoutMs: number;
  readonly detectionTimeoutMs: number;
}

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly modelProvider: "mock" | "openai-compatible" | "none";
  readonly evaluatorProvider: "mock" | "none" | "gnubg";
  readonly invalidModelProvider: string | undefined;
  readonly invalidEvaluatorProvider: string | undefined;
  readonly gnubg: GnuBgConfig;
  readonly openAiCompatible: {
    readonly baseUrl: string;
    readonly model: string | undefined;
    readonly apiKey: string | undefined;
    readonly timeoutMs: number;
    readonly providerLabel: string;
  };
}

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
      rawEvaluatorProvider !== "mock" &&
      rawEvaluatorProvider !== "gnubg" &&
      rawEvaluatorProvider !== "gnu"
        ? rawEvaluatorProvider
        : undefined,
    gnubg: {
      executable: toTrimmed(env.GNUBG_EXECUTABLE) ?? "gnubg",
      timeoutMs: parsePositiveInt(env.GNUBG_TIMEOUT_MS, 4_000),
      detectionTimeoutMs: parsePositiveInt(env.GNUBG_DETECTION_TIMEOUT_MS, 2_000)
    },
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
      `Invalid EVALUATOR_PROVIDER value "${config.invalidEvaluatorProvider}". Expected one of: none, mock, gnubg.`
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
