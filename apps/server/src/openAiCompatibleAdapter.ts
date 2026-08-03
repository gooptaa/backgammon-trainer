import type {
  ChatModel,
  ChatModelCapabilities,
  ChatModelGenerationSettings,
  ChatModelMessage,
  ChatModelRequest,
  ChatModelResult,
  ChatModelUsage
} from "@backgammon-trainer/ai-contracts";

const capabilities: ChatModelCapabilities = {
  nonStreamingText: true,
  supportsSystemInstruction: true,
  supportsDeveloperInstructions: true,
  supportsStructuredEvidence: true
};

interface OpenAiCompatibleErrorPayload {
  readonly error?: {
    readonly message?: string;
  };
}

interface OpenAiCompatibleChoice {
  readonly finish_reason?: string;
  readonly message?: {
    readonly content?:
      string | readonly { readonly type?: string; readonly text?: string }[] | null;
  };
}

interface OpenAiCompatiblePayload {
  readonly model?: string;
  readonly choices?: readonly OpenAiCompatibleChoice[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
}

interface OpenAiCompatibleRequestMessage {
  readonly role: "system" | "developer" | "user" | "assistant";
  readonly content: string;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface OpenAiCompatibleChatModelOptions {
  readonly endpointBaseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly providerLabel: string;
  readonly timeoutMs: number;
  readonly fetchImpl?: FetchLike;
}

const mapGenerationSettings = (
  settings: ChatModelGenerationSettings | undefined
): {
  readonly temperature?: number;
} => {
  if (settings?.temperature === undefined) {
    return {};
  }

  return {
    temperature: settings.temperature
  };
};

const mapRole = (role: ChatModelMessage["role"]): OpenAiCompatibleRequestMessage["role"] => {
  if (role === "system" || role === "developer" || role === "assistant") {
    return role;
  }

  return "user";
};

const serializeEvidence = (evidence: ChatModelRequest["evidence"]): string | undefined => {
  if (evidence === undefined) {
    return undefined;
  }

  return JSON.stringify(evidence);
};

const toProviderMessages = (
  request: ChatModelRequest
): readonly OpenAiCompatibleRequestMessage[] => {
  const messages: OpenAiCompatibleRequestMessage[] = [
    {
      role: "system",
      content: request.systemInstruction
    }
  ];

  for (const instruction of request.developerInstructions ?? []) {
    messages.push({
      role: "developer",
      content: instruction
    });
  }

  for (const message of request.messages) {
    messages.push({
      role: mapRole(message.role),
      content: message.text
    });
  }

  const serializedEvidence = serializeEvidence(request.evidence);
  if (serializedEvidence !== undefined) {
    messages.push({
      role: "developer",
      content: `Structured coaching evidence JSON:\n${serializedEvidence}`
    });
  }

  return messages;
};

const parseUsage = (payload: OpenAiCompatiblePayload): ChatModelUsage | undefined => {
  const usage = payload.usage;
  if (!usage) {
    return undefined;
  }

  return {
    ...(typeof usage.prompt_tokens === "number" ? { inputTokens: usage.prompt_tokens } : {}),
    ...(typeof usage.completion_tokens === "number"
      ? { outputTokens: usage.completion_tokens }
      : {}),
    ...(typeof usage.total_tokens === "number" ? { totalTokens: usage.total_tokens } : {})
  };
};

const extractTextFromChoice = (choice: OpenAiCompatibleChoice | undefined): string | null => {
  const content = choice?.message?.content;
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(content)) {
    const isTextPart = (
      part: unknown
    ): part is { readonly type?: string; readonly text?: string } => {
      return typeof part === "object" && part !== null;
    };

    const joined = content
      .filter(isTextPart)
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();

    return joined.length > 0 ? joined : null;
  }

  return null;
};

const mapHttpFailure = (
  statusCode: number,
  provider: string,
  model: string,
  adapterVersion: string,
  providerMessage?: string
): ChatModelResult => {
  const provenance = {
    provider,
    model,
    adapterVersion,
    mode: "production" as const
  };

  const safeSuffix =
    providerMessage === undefined || providerMessage.trim().length === 0
      ? ""
      : ` (${providerMessage.trim().slice(0, 200)})`;

  if (statusCode === 401 || statusCode === 403) {
    return {
      ok: false,
      reason: "authentication-failed",
      message: `Coach provider authentication failed.${safeSuffix}`,
      retryable: false,
      model: provenance
    };
  }

  if (statusCode === 429) {
    return {
      ok: false,
      reason: "rate-limited",
      message: `Coach provider rate limited this request.${safeSuffix}`,
      retryable: true,
      model: provenance
    };
  }

  if (statusCode === 408 || statusCode === 504) {
    return {
      ok: false,
      reason: "timeout",
      message: `Coach provider timed out.${safeSuffix}`,
      retryable: true,
      model: provenance
    };
  }

  if (statusCode === 400 || statusCode === 413 || statusCode === 422) {
    return {
      ok: false,
      reason: "provider-failed",
      message: `Coach request was rejected by the provider.${safeSuffix}`,
      retryable: false,
      model: provenance
    };
  }

  if (statusCode === 502 || statusCode === 503) {
    return {
      ok: false,
      reason: "unavailable",
      message: `Coach provider is unavailable.${safeSuffix}`,
      retryable: true,
      model: provenance
    };
  }

  return {
    ok: false,
    reason: "provider-failed",
    message: `Coach provider request failed (status ${statusCode}).${safeSuffix}`,
    retryable: statusCode >= 500,
    model: provenance
  };
};

const toAbortableFetch = async <T>(input: {
  fetchImpl: FetchLike;
  request: RequestInfo | URL;
  init: RequestInit;
  timeoutMs: number;
}): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort("timeout");
  }, input.timeoutMs);

  try {
    const response = await input.fetchImpl(input.request, {
      ...input.init,
      signal: controller.signal
    });
    return response as T;
  } finally {
    clearTimeout(timeout);
  }
};

export class OpenAiCompatibleChatModelAdapter implements ChatModel {
  public readonly name = "openai-compatible-chat-model-adapter";
  public readonly capabilities = capabilities;

  private readonly endpointBaseUrl: string;
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly providerLabel: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  public constructor(options: OpenAiCompatibleChatModelOptions) {
    this.endpointBaseUrl = options.endpointBaseUrl;
    this.apiKey = options.apiKey;
    this.modelId = options.model;
    this.providerLabel = options.providerLabel;
    this.timeoutMs = options.timeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  public async complete(request: ChatModelRequest): Promise<ChatModelResult> {
    const adapterVersion = "1.0.0";
    const modelProvenance = {
      provider: this.providerLabel,
      model: this.modelId,
      adapterVersion,
      mode: "production" as const
    };

    try {
      const response = await toAbortableFetch<Response>({
        fetchImpl: this.fetchImpl,
        request: `${this.endpointBaseUrl}/chat/completions`,
        timeoutMs: this.timeoutMs,
        init: {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.modelId,
            messages: toProviderMessages(request),
            ...mapGenerationSettings(request.settings)
          })
        }
      });

      const raw = (await response.json()) as OpenAiCompatiblePayload | OpenAiCompatibleErrorPayload;

      if (!response.ok) {
        const providerMessage =
          typeof raw === "object" && raw !== null && "error" in raw
            ? raw.error?.message
            : undefined;

        return mapHttpFailure(
          response.status,
          this.providerLabel,
          this.modelId,
          adapterVersion,
          providerMessage
        );
      }

      const payload = raw as OpenAiCompatiblePayload;
      const choice = payload.choices?.[0];
      const text = extractTextFromChoice(choice);
      if (text === null) {
        return {
          ok: false,
          reason: "invalid-response",
          message: "Coach provider returned an empty or invalid text response.",
          retryable: false,
          model: modelProvenance
        };
      }

      const warnings: string[] = [];
      if (choice?.finish_reason !== undefined && choice.finish_reason !== "stop") {
        warnings.push(`Provider finish reason: ${choice.finish_reason}`);
      }

      const usage = parseUsage(payload);

      if (usage === undefined) {
        return {
          ok: true,
          text,
          model: {
            provider: this.providerLabel,
            model: typeof payload.model === "string" ? payload.model : this.modelId,
            adapterVersion,
            mode: "production"
          },
          warnings
        };
      }

      return {
        ok: true,
        text,
        model: {
          provider: this.providerLabel,
          model: typeof payload.model === "string" ? payload.model : this.modelId,
          adapterVersion,
          mode: "production"
        },
        usage,
        warnings
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          ok: false,
          reason: "timeout",
          message: "Coach provider request timed out.",
          retryable: true,
          model: modelProvenance
        };
      }

      if (error instanceof TypeError) {
        return {
          ok: false,
          reason: "unavailable",
          message: "Coach provider is unavailable.",
          retryable: true,
          model: modelProvenance
        };
      }

      return {
        ok: false,
        reason: "provider-failed",
        message: "Coach provider request failed.",
        retryable: true,
        model: modelProvenance
      };
    }
  }
}
