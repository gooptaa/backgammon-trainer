export const GAME_LINEAGE_STORAGE_FORMAT = "backgammon-trainer-game-lineage";
export const GAME_LINEAGE_STORAGE_VERSION = 2;
export const DEFAULT_GAME_LINEAGE_STORAGE_KEY = "backgammon-trainer.game-lineage.v1";

export type GameShellMode = "player-vs-computer" | "exploratory";

export interface PersistedGameLineageV1 {
  readonly format: typeof GAME_LINEAGE_STORAGE_FORMAT;
  readonly version: 1;
  readonly lineageId: string;
  readonly updatedAt: string;
}

export interface PersistedGameLineageV2 {
  readonly format: typeof GAME_LINEAGE_STORAGE_FORMAT;
  readonly version: typeof GAME_LINEAGE_STORAGE_VERSION;
  readonly lineageId: string;
  readonly updatedAt: string;
  readonly shellMode: GameShellMode;
}

export type ParsePersistedGameLineageResult =
  | {
      readonly ok: true;
      readonly value: PersistedGameLineageV2;
    }
  | {
      readonly ok: false;
      readonly reason:
        "invalid-json" | "wrong-format" | "unsupported-version" | "invalid-structure";
      readonly message: string;
    };

export interface GameLineageStorage {
  load(): string | null;
  save(value: string): void;
  clear(): void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isIsoTimestamp = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
};

const isGameShellMode = (value: unknown): value is GameShellMode => {
  return value === "player-vs-computer" || value === "exploratory";
};

const fail = (
  reason: "invalid-json" | "wrong-format" | "unsupported-version" | "invalid-structure",
  message: string
): ParsePersistedGameLineageResult => {
  return {
    ok: false,
    reason,
    message
  };
};

export const parsePersistedGameLineage = (input: unknown): ParsePersistedGameLineageResult => {
  if (!isRecord(input)) {
    return fail("invalid-structure", "Lineage payload must be an object.");
  }

  if (input.format !== GAME_LINEAGE_STORAGE_FORMAT) {
    return fail("wrong-format", "Lineage payload format is not recognized.");
  }

  if (!Number.isInteger(input.version)) {
    return fail("invalid-structure", "Lineage payload version must be an integer.");
  }

  if (input.version !== 1 && input.version !== GAME_LINEAGE_STORAGE_VERSION) {
    return fail("unsupported-version", "Lineage payload version is not supported.");
  }

  if (typeof input.lineageId !== "string" || input.lineageId.trim().length === 0) {
    return fail("invalid-structure", "Lineage payload lineageId must be a non-empty string.");
  }

  if (!isIsoTimestamp(input.updatedAt)) {
    return fail("invalid-structure", "Lineage payload updatedAt must be a valid timestamp.");
  }

  if (input.version === 1) {
    return {
      ok: true,
      value: {
        format: GAME_LINEAGE_STORAGE_FORMAT,
        version: GAME_LINEAGE_STORAGE_VERSION,
        lineageId: input.lineageId.trim(),
        updatedAt: input.updatedAt,
        shellMode: "exploratory"
      }
    };
  }

  if (!isGameShellMode(input.shellMode)) {
    return fail("invalid-structure", "Lineage payload shellMode is invalid.");
  }

  return {
    ok: true,
    value: {
      format: GAME_LINEAGE_STORAGE_FORMAT,
      version: GAME_LINEAGE_STORAGE_VERSION,
      lineageId: input.lineageId.trim(),
      updatedAt: input.updatedAt,
      shellMode: input.shellMode
    }
  };
};

export const decodePersistedGameLineage = (text: string): ParsePersistedGameLineageResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return fail("invalid-json", "Lineage payload text is not valid JSON.");
  }

  return parsePersistedGameLineage(parsed);
};

export const serializePersistedGameLineage = (value: {
  lineageId: string;
  updatedAt: string;
  shellMode: GameShellMode;
}): PersistedGameLineageV2 => {
  return {
    format: GAME_LINEAGE_STORAGE_FORMAT,
    version: GAME_LINEAGE_STORAGE_VERSION,
    lineageId: value.lineageId,
    updatedAt: value.updatedAt,
    shellMode: value.shellMode
  };
};

export const encodePersistedGameLineage = (value: {
  lineageId: string;
  updatedAt: string;
  shellMode: GameShellMode;
}): string => {
  return JSON.stringify(serializePersistedGameLineage(value));
};

export const createLocalGameLineageStorage = (
  storageKey: string = DEFAULT_GAME_LINEAGE_STORAGE_KEY
): GameLineageStorage => {
  return {
    load: () => {
      return window.localStorage.getItem(storageKey);
    },
    save: (value) => {
      window.localStorage.setItem(storageKey, value);
    },
    clear: () => {
      window.localStorage.removeItem(storageKey);
    }
  };
};
