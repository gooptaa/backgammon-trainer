import type {
  EvaluatePositionRequest,
  EvaluatePositionResult,
  PositionEvaluator
} from "@backgammon-trainer/backgammon-analysis";

export interface EvaluatorProviderStatus {
  readonly configured: boolean;
  readonly mode: "none" | "fixture" | "gnubg";
  readonly providerFamily: "none" | "mock" | "gnubg";
  readonly providerLabel: string;
  readonly availability?:
    "unknown" | "checking" | "available" | "unavailable" | "incompatible" | "detection-failed";
  readonly providerVersion?: string;
  readonly issue?: string;
  readonly message: string;
}

interface EvaluatorStatusResponse {
  readonly data?: {
    readonly evaluatorProvider?: EvaluatorProviderStatus;
  };
}

interface EvaluatorCompletionResponse {
  readonly data?: {
    readonly result?: EvaluatePositionResult;
  };
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
  };
}

const isEvaluatePositionResult = (value: unknown): value is EvaluatePositionResult => {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    return false;
  }

  const candidate = value as {
    readonly ok: unknown;
    readonly coverage?: unknown;
    readonly scores?: unknown;
    readonly reason?: unknown;
    readonly message?: unknown;
  };

  if (candidate.ok === true) {
    return candidate.coverage === "complete" || candidate.coverage === "partial";
  }

  return typeof candidate.reason === "string" && typeof candidate.message === "string";
};

export const loadEvaluatorProviderStatus = async (
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<EvaluatorProviderStatus | null> => {
  try {
    const response = await fetchImpl(`${apiBaseUrl}/api/evaluator/status`, {
      method: "GET"
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as EvaluatorStatusResponse;
    return body.data?.evaluatorProvider ?? null;
  } catch {
    return null;
  }
};

export const createServerPositionEvaluator = (input: {
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
}): PositionEvaluator => {
  const fetchImpl = input.fetchImpl ?? fetch;

  return {
    evaluate: async (request: EvaluatePositionRequest): Promise<EvaluatePositionResult> => {
      try {
        const response = await fetchImpl(`${input.apiBaseUrl}/api/evaluator/evaluate-position`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(request)
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => undefined)) as
            EvaluatorCompletionResponse | undefined;
          if (response.status === 503) {
            return {
              ok: false,
              reason: "unavailable",
              message: errorBody?.error?.message ?? "Evaluator provider is unavailable."
            };
          }

          if (response.status === 400 || response.status === 413 || response.status === 422) {
            return {
              ok: false,
              reason: "provider-failed",
              message: "Evaluator request was rejected by the server."
            };
          }

          return {
            ok: false,
            reason: "provider-failed",
            message: "Evaluator server is unavailable."
          };
        }

        const body = (await response.json()) as EvaluatorCompletionResponse;
        const result = body.data?.result;
        if (!isEvaluatePositionResult(result)) {
          return {
            ok: false,
            reason: "invalid-provider-result",
            message: "Evaluator server returned invalid output."
          };
        }

        return result;
      } catch {
        return {
          ok: false,
          reason: "unavailable",
          message: "Evaluator request failed to reach the server."
        };
      }
    }
  };
};
