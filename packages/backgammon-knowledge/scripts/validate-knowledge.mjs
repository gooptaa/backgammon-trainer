import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildGeneratedCorpusSource, readKnowledgeEntries } from "./knowledge-source.mjs";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedPath = path.join(packageDir, "src", "generated", "corpus.ts");

const entries = await readKnowledgeEntries(packageDir);
const expectedSource = await buildGeneratedCorpusSource(entries);
const actualSource = await readFile(generatedPath, "utf8");

if (actualSource !== expectedSource) {
  console.error("Knowledge validation failed: generated corpus is stale.");
  console.error("Run pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:generate");
  process.exitCode = 1;
} else {
  console.log("Knowledge validation passed.");
}
