export type CoachContextKind =
  "current-position" | "history-turn" | "move-outcome" | "game-review" | "progress-profile";

export interface CoachContextReference {
  readonly kind: CoachContextKind;
  readonly gameReference: string;
  readonly turnNumber?: number;
  readonly moveFingerprint?: string;
}

export interface CoachEvidenceReference {
  readonly evidenceVersion: 5 | 6;
  readonly contextKind: CoachContextKind;
  readonly warningCount: number;
}

export interface CoachModelProvenance {
  readonly provider: string;
  readonly model: string;
  readonly adapterVersion: string;
  readonly mode?: "fixture" | "production";
}

export type CoachConversationMessage =
  | {
      readonly id: string;
      readonly role: "user";
      readonly createdAt: string;
      readonly text: string;
      readonly contextReference: CoachContextReference;
    }
  | {
      readonly id: string;
      readonly role: "coach";
      readonly createdAt: string;
      readonly text: string;
      readonly evidenceReference?: CoachEvidenceReference;
      readonly model?: CoachModelProvenance;
    };

export interface CoachConversation {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly messages: readonly CoachConversationMessage[];
}

export type ConversationFailureReason =
  "invalid-id" | "invalid-timestamp" | "empty-text" | "duplicate-message-id";

export type ConversationMutationResult =
  | {
      readonly ok: true;
      readonly conversation: CoachConversation;
      readonly message: CoachConversationMessage;
    }
  | {
      readonly ok: false;
      readonly reason: ConversationFailureReason;
      readonly message: string;
    };

const isValidTimestamp = (value: string): boolean => {
  return value.trim().length > 0 && !Number.isNaN(Date.parse(value));
};

const normalizeText = (value: string): string => value.trim();

const isValidId = (value: string): boolean => value.trim().length > 0;

const containsMessageId = (conversation: CoachConversation, messageId: string): boolean => {
  return conversation.messages.some((message) => message.id === messageId);
};

export const createCoachConversation = (input: {
  id: string;
  createdAt: string;
}): CoachConversation => {
  if (!isValidId(input.id)) {
    throw new Error("Conversation ID must be non-empty.");
  }

  if (!isValidTimestamp(input.createdAt)) {
    throw new Error("Conversation timestamp must be a valid ISO-like date string.");
  }

  return {
    id: input.id,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    messages: []
  };
};

export const appendUserCoachMessage = (input: {
  conversation: CoachConversation;
  id: string;
  createdAt: string;
  text: string;
  contextReference: CoachContextReference;
}): ConversationMutationResult => {
  if (!isValidId(input.id)) {
    return {
      ok: false,
      reason: "invalid-id",
      message: "Message ID must be non-empty."
    };
  }

  if (!isValidTimestamp(input.createdAt)) {
    return {
      ok: false,
      reason: "invalid-timestamp",
      message: "Message timestamp must be valid."
    };
  }

  const text = normalizeText(input.text);
  if (text.length === 0) {
    return {
      ok: false,
      reason: "empty-text",
      message: "Message text must not be empty."
    };
  }

  if (containsMessageId(input.conversation, input.id)) {
    return {
      ok: false,
      reason: "duplicate-message-id",
      message: "Message ID already exists in this conversation."
    };
  }

  const message: CoachConversationMessage = {
    id: input.id,
    role: "user",
    createdAt: input.createdAt,
    text,
    contextReference: structuredClone(input.contextReference)
  };

  return {
    ok: true,
    message,
    conversation: {
      ...input.conversation,
      updatedAt: input.createdAt,
      messages: [...input.conversation.messages, message]
    }
  };
};

export const appendCoachCoachMessage = (input: {
  conversation: CoachConversation;
  id: string;
  createdAt: string;
  text: string;
  evidenceReference?: CoachEvidenceReference;
  model?: CoachModelProvenance;
}): ConversationMutationResult => {
  if (!isValidId(input.id)) {
    return {
      ok: false,
      reason: "invalid-id",
      message: "Message ID must be non-empty."
    };
  }

  if (!isValidTimestamp(input.createdAt)) {
    return {
      ok: false,
      reason: "invalid-timestamp",
      message: "Message timestamp must be valid."
    };
  }

  const text = normalizeText(input.text);
  if (text.length === 0) {
    return {
      ok: false,
      reason: "empty-text",
      message: "Message text must not be empty."
    };
  }

  if (containsMessageId(input.conversation, input.id)) {
    return {
      ok: false,
      reason: "duplicate-message-id",
      message: "Message ID already exists in this conversation."
    };
  }

  const message: CoachConversationMessage = {
    id: input.id,
    role: "coach",
    createdAt: input.createdAt,
    text,
    ...(input.evidenceReference === undefined
      ? {}
      : { evidenceReference: structuredClone(input.evidenceReference) }),
    ...(input.model === undefined ? {} : { model: structuredClone(input.model) })
  };

  return {
    ok: true,
    message,
    conversation: {
      ...input.conversation,
      updatedAt: input.createdAt,
      messages: [...input.conversation.messages, message]
    }
  };
};
