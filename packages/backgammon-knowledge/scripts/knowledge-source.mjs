import { format } from "prettier";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const TRACKS = new Set([
  "board-vision",
  "safety-risk",
  "making-points",
  "hitting-tempo",
  "game-plan-recognition",
  "move-review"
]);

const CONCEPTS = new Set([
  "current-position",
  "legal-moves",
  "dice-use",
  "bar-entry",
  "bearing-off",
  "blots",
  "hits",
  "tempo",
  "made-points",
  "anchors",
  "inner-board",
  "safety",
  "risk",
  "running",
  "structure",
  "race",
  "contact",
  "candidate-comparison",
  "move-review",
  "game-plan"
]);

const CONTEXTS = new Set(["current-position", "move-outcome", "history-turn", "game-review"]);

const parseFrontmatter = (frontmatterText, fileName) => {
  const scalar = new Map();
  const lists = new Map();
  let currentListKey = null;

  for (const rawLine of frontmatterText.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.trim().length === 0) {
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      if (currentListKey === null) {
        throw new Error(`${fileName}: list item found without a list key.`);
      }

      const items = lists.get(currentListKey) ?? [];
      items.push(line.replace(/^\s*-\s+/, "").trim());
      lists.set(currentListKey, items);
      continue;
    }

    currentListKey = null;
    const match = line.match(/^([A-Za-z][A-Za-z0-9]*):(.*)$/);
    if (match === null) {
      throw new Error(`${fileName}: could not parse frontmatter line '${line}'.`);
    }

    const [, key, rest] = match;
    const value = rest.trim();
    if (value.length === 0) {
      currentListKey = key;
      lists.set(key, []);
      continue;
    }

    scalar.set(key, value);
  }

  return {
    scalar,
    lists
  };
};

const requireScalar = (scalar, key, fileName) => {
  const value = scalar.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fileName}: missing required frontmatter field '${key}'.`);
  }
  return value.trim();
};

const requireList = (lists, key, fileName) => {
  const value = lists.get(key);
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${fileName}: missing required list field '${key}'.`);
  }
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
};

export const parseKnowledgeMarkdown = (fileName, markdownText) => {
  const parts = markdownText.split(/\n---\n/);
  if (!markdownText.startsWith("---\n") || parts.length < 2) {
    throw new Error(`${fileName}: expected markdown frontmatter wrapped by --- markers.`);
  }

  const frontmatterText = parts[0].slice(4);
  const body = parts.slice(1).join("\n---\n").trim();
  const { scalar, lists } = parseFrontmatter(frontmatterText, fileName);

  const schemaVersion = Number.parseInt(requireScalar(scalar, "schemaVersion", fileName), 10);
  if (!Number.isInteger(schemaVersion) || schemaVersion !== 1) {
    throw new Error(`${fileName}: unsupported schemaVersion '${scalar.get("schemaVersion")}'.`);
  }

  const track = requireScalar(scalar, "track", fileName);
  if (!TRACKS.has(track)) {
    throw new Error(`${fileName}: unsupported track '${track}'.`);
  }

  const concepts = requireList(lists, "concepts", fileName);
  for (const concept of concepts) {
    if (!CONCEPTS.has(concept)) {
      throw new Error(`${fileName}: unsupported concept '${concept}'.`);
    }
  }

  const contexts = requireList(lists, "contexts", fileName);
  for (const context of contexts) {
    if (!CONTEXTS.has(context)) {
      throw new Error(`${fileName}: unsupported context '${context}'.`);
    }
  }

  return {
    schemaVersion: 1,
    id: requireScalar(scalar, "id", fileName),
    title: requireScalar(scalar, "title", fileName),
    summary: requireScalar(scalar, "summary", fileName),
    learnerLevel: requireScalar(scalar, "learnerLevel", fileName),
    track,
    concepts,
    contexts,
    aliases: requireList(lists, "aliases", fileName),
    provenance: {
      kind: requireScalar(scalar, "provenanceKind", fileName),
      label: requireScalar(scalar, "provenanceLabel", fileName)
    },
    body
  };
};

export const readKnowledgeEntries = async (packageDir) => {
  const contentDir = path.join(packageDir, "content");
  const allMarkdownFiles = (await readdir(contentDir))
    .filter((fileName) => fileName.endsWith(".md"))
    .sort();

  const readmeFile = allMarkdownFiles.find((fileName) => fileName.toLowerCase() === "readme.md");
  if (readmeFile !== undefined) {
    throw new Error(
      `${readmeFile}: content README files are documentation-only and must not be runtime corpus entries.`
    );
  }

  const files = allMarkdownFiles;

  const entries = [];
  for (const fileName of files) {
    const absolutePath = path.join(contentDir, fileName);
    const markdownText = await readFile(absolutePath, "utf8");
    entries.push(parseKnowledgeMarkdown(fileName, markdownText));
  }

  return entries;
};

const quote = (value) => JSON.stringify(value);

export const buildGeneratedCorpusSource = async (entries) => {
  const entryLines = entries.map((entry) => {
    return `    {\n      schemaVersion: 1,\n      id: ${quote(entry.id)},\n      title: ${quote(entry.title)},\n      summary: ${quote(entry.summary)},\n      learnerLevel: ${quote(entry.learnerLevel)},\n      track: ${quote(entry.track)},\n      concepts: ${quote(entry.concepts)},\n      contexts: ${quote(entry.contexts)},\n      aliases: ${quote(entry.aliases)},\n      provenance: {\n        kind: ${quote(entry.provenance.kind)},\n        label: ${quote(entry.provenance.label)}\n      },\n      body: ${quote(entry.body)}\n    }`;
  });

  const source = `import type { BackgammonKnowledgeCorpus } from "../model";\n\n// Generated from packages/backgammon-knowledge/content/*.md. Do not edit manually.\nexport const backgammonKnowledgeCorpus: BackgammonKnowledgeCorpus = {\n  schemaVersion: 1,\n  taxonomyVersion: 1,\n  entries: [\n${entryLines.join(",\n")}\n  ]\n};\n`;

  return await format(source, {
    parser: "typescript",
    semi: true,
    singleQuote: false,
    trailingComma: "none",
    printWidth: 100
  });
};
