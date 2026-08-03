import type {
  ChatModel,
  ChatModelRequest,
  ChatModelResult
} from "@backgammon-trainer/ai-contracts";

const capabilities: ChatModel["capabilities"] = {
  nonStreamingText: true,
  supportsSystemInstruction: true,
  supportsDeveloperInstructions: true,
  supportsStructuredEvidence: true
};

export class MockModelAdapter implements ChatModel {
  public readonly name = "mock-model-adapter";
  public readonly capabilities = capabilities;

  public async complete(request: ChatModelRequest): Promise<ChatModelResult> {
    return {
      ok: true,
      text: `Fixture coach response from server mock adapter for request ${request.requestId}. Not strategic advice.`,
      model: {
        provider: "server-mock",
        model: "mock-v1",
        adapterVersion: "1.0.0",
        mode: "fixture"
      },
      warnings: ["Server fixture response"]
    };
  }
}
