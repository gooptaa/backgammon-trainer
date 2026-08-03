import type {
  ChatModel,
  ChatModelCapabilities,
  ChatModelProvenance,
  ChatModelRequest,
  ChatModelResult
} from "./index";

type FixtureMode =
  | "success"
  | "unavailable"
  | "authentication-failed"
  | "rate-limited"
  | "timeout"
  | "provider-failed"
  | "invalid-response";

export interface FixtureChatModelOptions {
  readonly mode?: FixtureMode;
  readonly delayMs?: number;
  readonly responseText?: string;
  readonly provenance?: ChatModelProvenance;
}

export interface ControlledFixtureChatModel {
  readonly model: ChatModel;
  resolve(result: ChatModelResult): void;
}

const DEFAULT_PROVENANCE: ChatModelProvenance = {
  provider: "fixture-coach",
  model: "fixture-text-v1",
  adapterVersion: "1.0.0",
  mode: "fixture"
};

const CAPABILITIES: ChatModelCapabilities = {
  nonStreamingText: true,
  supportsSystemInstruction: true,
  supportsDeveloperInstructions: true,
  supportsStructuredEvidence: true
};

const wait = async (delayMs: number): Promise<void> => {
  if (delayMs <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

const buildFixtureText = (request: ChatModelRequest): string => {
  const contextKind =
    request.evidence !== undefined &&
    typeof request.evidence === "object" &&
    request.evidence !== null &&
    "questionContext" in request.evidence &&
    typeof request.evidence.questionContext === "object" &&
    request.evidence.questionContext !== null &&
    "kind" in request.evidence.questionContext &&
    typeof request.evidence.questionContext.kind === "string"
      ? request.evidence.questionContext.kind
      : "unknown";

  return `Fixture coach response. Context: ${contextKind}. This response is development fixture output and not strategic advice.`;
};

const failureResult = (
  reason: Exclude<FixtureMode, "success">,
  provenance: ChatModelProvenance
): ChatModelResult => {
  if (reason === "invalid-response") {
    return {
      ok: false,
      reason: "invalid-response",
      message: "Fixture chat model produced an invalid response shape.",
      retryable: false,
      model: provenance
    };
  }

  if (reason === "unavailable") {
    return {
      ok: false,
      reason: "unavailable",
      message: "Fixture chat model is unavailable.",
      retryable: true,
      model: provenance
    };
  }

  if (reason === "authentication-failed") {
    return {
      ok: false,
      reason: "authentication-failed",
      message: "Fixture chat model authentication failed.",
      retryable: false,
      model: provenance
    };
  }

  if (reason === "rate-limited") {
    return {
      ok: false,
      reason: "rate-limited",
      message: "Fixture chat model rate limited this request.",
      retryable: true,
      model: provenance
    };
  }

  if (reason === "timeout") {
    return {
      ok: false,
      reason: "timeout",
      message: "Fixture chat model timed out.",
      retryable: true,
      model: provenance
    };
  }

  return {
    ok: false,
    reason: "provider-failed",
    message: "Fixture chat model provider failure.",
    retryable: true,
    model: provenance
  };
};

export const createFixtureChatModel = (options?: FixtureChatModelOptions): ChatModel => {
  const mode = options?.mode ?? "success";
  const delayMs = options?.delayMs ?? 0;
  const provenance = options?.provenance ?? DEFAULT_PROVENANCE;
  const responseText = options?.responseText;

  return {
    name: "fixture-chat-model",
    capabilities: CAPABILITIES,
    complete: async (request): Promise<ChatModelResult> => {
      await wait(delayMs);

      if (mode !== "success") {
        return failureResult(mode, provenance);
      }

      const text = (responseText ?? buildFixtureText(request)).trim();
      if (text.length === 0) {
        return {
          ok: false,
          reason: "invalid-response",
          message: "Fixture chat model produced empty text.",
          retryable: false,
          model: provenance
        };
      }

      return {
        ok: true,
        text,
        model: provenance,
        warnings: ["Development fixture coach output."]
      };
    }
  };
};

export const createControlledFixtureChatModel = (): ControlledFixtureChatModel => {
  let resolver: ((result: ChatModelResult) => void) | null = null;
  let queuedResult: ChatModelResult | null = null;

  const model: ChatModel = {
    name: "fixture-chat-model-controlled",
    capabilities: CAPABILITIES,
    complete: async (): Promise<ChatModelResult> => {
      if (queuedResult !== null) {
        const result = queuedResult;
        queuedResult = null;
        return result;
      }

      return await new Promise<ChatModelResult>((resolve) => {
        resolver = resolve;
      });
    }
  };

  return {
    model,
    resolve: (result) => {
      if (resolver !== null) {
        resolver(result);
        resolver = null;
        return;
      }

      queuedResult = result;
    }
  };
};
