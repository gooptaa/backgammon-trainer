import type {
  CoachingRequest,
  CoachingResponse,
  ModelAdapter,
  ProviderCapabilities
} from "@backgammon-trainer/ai-contracts";

const capabilities: ProviderCapabilities = {
  text: true,
  structuredJson: true,
  streaming: false,
  toolCalling: false,
  imageInput: false,
  selectableModel: true
};

export class MockModelAdapter implements ModelAdapter {
  public readonly name = "mock-model-adapter";
  public readonly capabilities = capabilities;

  public async complete(request: CoachingRequest): Promise<CoachingResponse> {
    return {
      text: `Mock coaching (${request.mode}): this is a placeholder response with no real model call.`,
      confidence: "low",
      hint: {
        title: "Mock hint",
        rationale:
          "Use this endpoint to verify integration boundaries while deterministic move logic is still under construction.",
        skillFocus: "general",
        confidence: "low"
      },
      providerMetadata: {
        model: "mock-v1"
      }
    };
  }
}
