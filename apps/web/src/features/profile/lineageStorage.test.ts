import { describe, expect, it } from "vitest";

import {
  decodePersistedGameLineage,
  encodePersistedGameLineage,
  GAME_LINEAGE_STORAGE_FORMAT,
  GAME_LINEAGE_STORAGE_VERSION,
  parsePersistedGameLineage,
  serializePersistedGameLineage
} from "./lineageStorage";

const NOW = "2026-08-05T19:58:00.000Z";

const createV2Payload = (shellMode: "player-vs-computer" | "exploratory") => ({
  format: GAME_LINEAGE_STORAGE_FORMAT,
  version: GAME_LINEAGE_STORAGE_VERSION,
  lineageId: "lineage-1",
  updatedAt: NOW,
  shellMode
});

describe("parsePersistedGameLineage", () => {
  it("migrates version 1 payloads to exploratory mode", () => {
    const result = parsePersistedGameLineage({
      format: GAME_LINEAGE_STORAGE_FORMAT,
      version: 1,
      lineageId: "lineage-1",
      updatedAt: NOW
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.version).toBe(GAME_LINEAGE_STORAGE_VERSION);
    expect(result.value.shellMode).toBe("exploratory");
  });

  it("accepts version 2 player-versus-computer payloads", () => {
    const result = parsePersistedGameLineage(createV2Payload("player-vs-computer"));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual(createV2Payload("player-vs-computer"));
  });

  it("accepts version 2 exploratory payloads", () => {
    const result = parsePersistedGameLineage(createV2Payload("exploratory"));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual(createV2Payload("exploratory"));
  });

  it("rejects invalid shell modes", () => {
    const result = parsePersistedGameLineage({
      format: GAME_LINEAGE_STORAGE_FORMAT,
      version: GAME_LINEAGE_STORAGE_VERSION,
      lineageId: "lineage-1",
      updatedAt: NOW,
      shellMode: "player" as never
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("invalid-structure");
  });

  it("rejects unsupported versions", () => {
    const result = parsePersistedGameLineage({
      format: GAME_LINEAGE_STORAGE_FORMAT,
      version: 3,
      lineageId: "lineage-1",
      updatedAt: NOW,
      shellMode: "exploratory"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("unsupported-version");
  });

  it("rejects malformed values", () => {
    const invalidJson = decodePersistedGameLineage("{");
    const invalidStructure = parsePersistedGameLineage(null);

    expect(invalidJson.ok).toBe(false);
    if (!invalidJson.ok) {
      expect(invalidJson.reason).toBe("invalid-json");
    }

    expect(invalidStructure.ok).toBe(false);
    if (!invalidStructure.ok) {
      expect(invalidStructure.reason).toBe("invalid-structure");
    }
  });
});

describe("serializePersistedGameLineage", () => {
  it("round trips through encoding and decoding", () => {
    const original = {
      lineageId: "lineage-1",
      updatedAt: NOW,
      shellMode: "player-vs-computer" as const
    };

    const serialized = serializePersistedGameLineage(original);
    const encoded = encodePersistedGameLineage(original);

    expect(serialized).toEqual(createV2Payload("player-vs-computer"));
    expect(decodePersistedGameLineage(encoded)).toEqual({
      ok: true,
      value: createV2Payload("player-vs-computer")
    });
  });
});
