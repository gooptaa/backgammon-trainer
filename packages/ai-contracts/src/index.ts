export type PlayerColor = "white" | "black";

export interface CoachingGameStateSnapshot {
  serializedPosition: string;
  playerToMove: PlayerColor;
}

export interface CoachingMoveSequenceSnapshot {
  moveNotation: string;
}

export type CoachingMode = "critique" | "hint" | "explain-candidates";

export type SkillFocus =
  "safety" | "risk" | "point-making" | "hitting" | "racing" | "cube-decision" | "general";

export type ConfidenceLevel = "low" | "medium" | "high";

export interface StructuredHint {
  title: string;
  rationale: string;
  suggestedMoveNotation?: string;
  skillFocus: SkillFocus;
  confidence: ConfidenceLevel;
}

export interface MoveCritique {
  moveNotation: string;
  summary: string;
  strengths: readonly string[];
  risks: readonly string[];
  betterAlternatives?: readonly string[];
  confidence: ConfidenceLevel;
}

export interface CoachingRequest {
  sessionId: string;
  mode: CoachingMode;
  player: PlayerColor;
  gameState: CoachingGameStateSnapshot;
  attemptedMove?: CoachingMoveSequenceSnapshot;
  skillFocus?: readonly SkillFocus[];
  userSkillLevel?: "beginner" | "intermediate" | "advanced";
  includeStructuredOutput?: boolean;
  preferredModel?: string;
  includeImageInput?: boolean;
  imageDataUrl?: string;
}

export interface CoachingResponse {
  text: string;
  hint?: StructuredHint;
  critique?: MoveCritique;
  candidateMoves?: readonly string[];
  confidence: ConfidenceLevel;
  providerMetadata?: {
    model?: string;
    latencyMs?: number;
    requestId?: string;
  };
}

export interface ProviderCapabilities {
  text: boolean;
  structuredJson: boolean;
  streaming: boolean;
  toolCalling: boolean;
  imageInput: boolean;
  selectableModel: boolean;
}

export interface AdapterRequestOptions {
  timeoutMs?: number;
  model?: string;
}

export type CoachingStreamEvent =
  | { type: "started"; requestId: string }
  | { type: "token"; textChunk: string }
  | { type: "structured"; partial: Partial<CoachingResponse> }
  | { type: "completed"; response: CoachingResponse }
  | { type: "error"; message: string; retryable: boolean };

export interface ModelAdapter {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  complete(request: CoachingRequest, options?: AdapterRequestOptions): Promise<CoachingResponse>;

  stream?(
    request: CoachingRequest,
    options?: AdapterRequestOptions
  ): AsyncIterable<CoachingStreamEvent>;
}
