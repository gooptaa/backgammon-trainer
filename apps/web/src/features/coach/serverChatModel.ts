import type {
  ChatModel,
  ChatModelCapabilities,
  ChatModelFailureReason,
  ChatModelRequest,
  ChatModelResult
} from "@backgammon-trainer/ai-contracts";

export interface CoachProviderStatus {
  readonly configured: boolean;
  readonly mode: "none" | "fixture" | "production";
  readonly providerFamily: "none" | "mock" | "openai-compatible";
  readonly providerLabel: string;
  readonly model: string | null;
  readonly message: string;
}

interface CoachStatusResponse {
  readonly data?: {
    readonly coachProvider?: CoachProviderStatus;
  };
}

interface CoachCompletionResponse {
  readonly data?: {
    readonly result?: ChatModelResult;
  };
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
  };
}

const capabilities: ChatModelCapabilities = {
  nonStreamingText: true,
  supportsSystemInstruction: true,
  supportsDeveloperInstructions: true,
  supportsStructuredEvidence: true
};

export const loadCoachProviderStatus = async (
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<CoachProviderStatus | null> => {
  try {
    const response = await fetchImpl(`${apiBaseUrl}/api/coach/status`, {
      method: "GET"
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as CoachStatusResponse;
    return body.data?.coachProvider ?? null;
  } catch {
    return null;
  }
};

const isChatModelResult = (value: unknown): value is ChatModelResult => {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    return false;
  }

  const candidate = value as {
    readonly ok: unknown;
    readonly text?: unknown;
    readonly message?: unknown;
  };

  if (candidate.ok === true) {
    return typeof candidate.text === "string";
  }

  return typeof candidate.message === "string";
};

const toTransportFailure = (input: {
  reason: ChatModelFailureReason;
  message: string;
  retryable: boolean;
  fallbackProvider: string;
  fallbackModel: string;
}): ChatModelResult => {
  return {
    ok: false,
    reason: input.reason,
    message: input.message,
    retryable: input.retryable,
    model: {
      provider: input.fallbackProvider,
      model: input.fallbackModel,
      adapterVersion: "1.0.0",
      mode: "production"
    }
  };
};

export const createServerCoachChatModel = (input: {
  apiBaseUrl: string;
  providerLabel: string;
  modelLabel: string;
  fetchImpl?: typeof fetch;
}): ChatModel => {
  const fetchImpl = input.fetchImpl ?? fetch;

  return {
    name: "server-coach-chat-model",
    capabilities,
    complete: async (request: ChatModelRequest): Promise<ChatModelResult> => {
      try {
        const response = await fetchImpl(`${input.apiBaseUrl}/api/coach/complete`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(request)
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => undefined)) as
            CoachCompletionResponse | undefined;

          if (response.status === 503) {
            return toTransportFailure({
              reason: "unavailable",
              message: errorBody?.error?.message ?? "Coach provider is unavailable.",
              retryable: true,
              fallbackProvider: input.providerLabel,
              fallbackModel: input.modelLabel
            });
          }

          if (response.status === 400 || response.status === 413 || response.status === 422) {
            return toTransportFailure({
              reason: "provider-failed",
              message: "Coach request was rejected by the server.",
              retryable: false,
              fallbackProvider: input.providerLabel,
              fallbackModel: input.modelLabel
            });
          }

          return toTransportFailure({
            reason: "unavailable",
            message: "Coach server is unavailable.",
            retryable: true,
            fallbackProvider: input.providerLabel,
            fallbackModel: input.modelLabel
          });
        }

        const body = (await response.json()) as CoachCompletionResponse;
        const result = body.data?.result;
        if (!isChatModelResult(result)) {
          return toTransportFailure({
            reason: "invalid-response",
            message: "Coach server returned invalid output.",
            retryable: false,
            fallbackProvider: input.providerLabel,
            fallbackModel: input.modelLabel
          });
        }

        return result;
      } catch {
        return toTransportFailure({
          reason: "unavailable",
          message: "Coach request failed to reach the server.",
          retryable: true,
          fallbackProvider: input.providerLabel,
          fallbackModel: input.modelLabel
        });
      }
    }
  };
};
