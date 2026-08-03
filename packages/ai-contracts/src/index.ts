export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | {
      readonly [key: string]: JsonValue;
    };

export type ChatMessageRole = "system" | "developer" | "user" | "assistant";

export interface ChatModelMessage {
  readonly role: ChatMessageRole;
  readonly text: string;
}

export interface ChatModelGenerationSettings {
  readonly temperature?: number;
  readonly maxOutputChars?: number;
}

export interface ChatModelRequest {
  readonly requestId: string;
  readonly systemInstruction: string;
  readonly developerInstructions?: readonly string[];
  readonly messages: readonly ChatModelMessage[];
  readonly evidence?: JsonValue;
  readonly settings?: ChatModelGenerationSettings;
}

export interface ChatModelProvenance {
  readonly provider: string;
  readonly model: string;
  readonly adapterVersion: string;
  readonly mode?: "fixture" | "production";
}

export interface ChatModelUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export type ChatModelFailureReason =
  | "unavailable"
  | "authentication-failed"
  | "rate-limited"
  | "timeout"
  | "provider-failed"
  | "invalid-response";

export type ChatModelResult =
  | {
      readonly ok: true;
      readonly text: string;
      readonly model: ChatModelProvenance;
      readonly usage?: ChatModelUsage;
      readonly warnings: readonly string[];
    }
  | {
      readonly ok: false;
      readonly reason: ChatModelFailureReason;
      readonly message: string;
      readonly retryable: boolean;
      readonly model?: ChatModelProvenance;
    };

export interface ChatModelCapabilities {
  readonly nonStreamingText: boolean;
  readonly supportsSystemInstruction: boolean;
  readonly supportsDeveloperInstructions: boolean;
  readonly supportsStructuredEvidence: boolean;
}

export interface ChatModel {
  readonly name: string;
  readonly capabilities: ChatModelCapabilities;
  complete(request: ChatModelRequest): Promise<ChatModelResult>;
}
