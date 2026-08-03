import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

export interface LocalEnvironmentLoadResult {
  readonly loadedFiles: readonly string[];
  readonly attemptedFiles: readonly string[];
}

export interface LoadLocalEnvironmentOptions {
  readonly repoRoot?: string;
  readonly processEnv?: NodeJS.ProcessEnv;
}

const resolveRepositoryRoot = (): string => {
  return fileURLToPath(new URL("../../..", import.meta.url));
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const loadLocalEnvironment = async (
  options: LoadLocalEnvironmentOptions = {}
): Promise<LocalEnvironmentLoadResult> => {
  const repoRoot = options.repoRoot ?? resolveRepositoryRoot();
  const processEnv = options.processEnv ?? process.env;
  const attemptedFiles = [`${repoRoot}/.env.local`, `${repoRoot}/.env`];
  const loadedFiles: string[] = [];

  for (const filePath of attemptedFiles) {
    if (!(await fileExists(filePath))) {
      continue;
    }

    loadDotenv({
      path: filePath,
      processEnv: processEnv as Record<string, string>,
      override: false
    });
    loadedFiles.push(filePath);
  }

  return {
    attemptedFiles,
    loadedFiles
  };
};
