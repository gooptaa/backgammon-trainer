import type { ChatModel } from "@backgammon-trainer/ai-contracts";

import type { ServerConfig } from "./config";
import { MockModelAdapter } from "./mockAdapter";
import { OpenAiCompatibleChatModelAdapter } from "./openAiCompatibleAdapter";

export interface CoachProviderStatus {
  readonly configured: boolean;
  readonly mode: "none" | "fixture" | "production";
  readonly providerFamily: "none" | "mock" | "openai-compatible";
  readonly providerLabel: string;
  readonly model: string | null;
  readonly message: string;
}

export interface CoachProviderRuntime {
  readonly model: ChatModel | undefined;
  readonly status: CoachProviderStatus;
}

const buildNoProvider = (message: string): CoachProviderRuntime => {
  return {
    model: undefined,
    status: {
      configured: false,
      mode: "none",
      providerFamily: "none",
      providerLabel: "none",
      model: null,
      message
    }
  };
};

export const createCoachProviderRuntime = (config: ServerConfig): CoachProviderRuntime => {
  if (config.modelProvider === "none") {
    return buildNoProvider("Coach provider is disabled by server configuration.");
  }

  if (config.modelProvider === "mock") {
    const model = new MockModelAdapter();
    return {
      model,
      status: {
        configured: true,
        mode: "fixture",
        providerFamily: "mock",
        providerLabel: "server-mock",
        model: "mock-v1",
        message: "Development fixture coach provider is active."
      }
    };
  }

  const modelId = config.openAiCompatible.model;
  const apiKey = config.openAiCompatible.apiKey;

  if (!modelId || !apiKey) {
    return {
      model: undefined,
      status: {
        configured: false,
        mode: "production",
        providerFamily: "openai-compatible",
        providerLabel: config.openAiCompatible.providerLabel,
        model: modelId ?? null,
        message: "OpenAI-compatible coach provider is selected but missing required configuration."
      }
    };
  }

  const model = new OpenAiCompatibleChatModelAdapter({
    endpointBaseUrl: config.openAiCompatible.baseUrl,
    apiKey,
    model: modelId,
    providerLabel: config.openAiCompatible.providerLabel,
    timeoutMs: config.openAiCompatible.timeoutMs
  });

  return {
    model,
    status: {
      configured: true,
      mode: "production",
      providerFamily: "openai-compatible",
      providerLabel: config.openAiCompatible.providerLabel,
      model: modelId,
      message: "OpenAI-compatible coach provider is configured."
    }
  };
};
