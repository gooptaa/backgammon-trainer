import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildGeneratedCorpusSource, readKnowledgeEntries } from "./knowledge-source.mjs";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entries = await readKnowledgeEntries(packageDir);
const outputDir = path.join(packageDir, "src", "generated");
const outputPath = path.join(outputDir, "corpus.ts");
const outputSource = await buildGeneratedCorpusSource(entries);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, outputSource, "utf8");

console.log(`Generated ${path.relative(packageDir, outputPath)} from canonical markdown source.`);
