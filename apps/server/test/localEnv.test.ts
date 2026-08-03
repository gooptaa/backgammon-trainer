import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { loadLocalEnvironment } from "../src/localEnv";

const tempRoots: string[] = [];

const createTempRoot = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "bg-trainer-env-"));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("loadLocalEnvironment", () => {
  it("loads .env.local and then .env from the repository root", async () => {
    const root = await createTempRoot();
    await writeFile(join(root, ".env"), "MODEL_PROVIDER=none\nSERVER_PORT=3002\n", "utf8");
    await writeFile(join(root, ".env.local"), "MODEL_PROVIDER=mock\n", "utf8");

    const env: NodeJS.ProcessEnv = {};
    const result = await loadLocalEnvironment({ repoRoot: root, processEnv: env });

    expect(result.loadedFiles).toEqual([join(root, ".env.local"), join(root, ".env")]);
    expect(env.MODEL_PROVIDER).toBe("mock");
    expect(env.SERVER_PORT).toBe("3002");
  });

  it("does not override explicit process environment variables", async () => {
    const root = await createTempRoot();
    await writeFile(join(root, ".env.local"), "MODEL_PROVIDER=none\n", "utf8");

    const env: NodeJS.ProcessEnv = {
      MODEL_PROVIDER: "openai-compatible"
    };

    await loadLocalEnvironment({ repoRoot: root, processEnv: env });

    expect(env.MODEL_PROVIDER).toBe("openai-compatible");
  });

  it("returns no loaded files when local env files are absent", async () => {
    const root = await createTempRoot();
    const env: NodeJS.ProcessEnv = {};

    const result = await loadLocalEnvironment({ repoRoot: root, processEnv: env });

    expect(result.loadedFiles).toEqual([]);
    expect(result.attemptedFiles).toEqual([join(root, ".env.local"), join(root, ".env")]);
  });
});
