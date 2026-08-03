# Knowledge Authoring Guide

## Canonical source

Author curated knowledge entries in `packages/backgammon-knowledge/content/`.

Each entry is one markdown file with frontmatter plus plain-English instructional body text.

## Required metadata

Each entry must define:

- `schemaVersion`
- `id`
- `title`
- `summary`
- `learnerLevel`
- `track`
- `concepts`
- `contexts`
- `aliases`
- `provenanceKind`
- `provenanceLabel`

## Identity rules

- `id` must be stable and unique
- use the `kg.` prefix for curated knowledge entries
- do not rename an id casually once a caller may depend on it

## Taxonomy rules

Current tracks are defined in `packages/backgammon-knowledge/src/model.ts`.

Use only supported track and concept values.

Do not create ad hoc tags in markdown files. Extend the controlled taxonomy deliberately in code when needed.

## Provenance rules

Current corpus entries use:

- `provenanceKind: project-authored`
- `provenanceLabel: Backgammon Trainer curated knowledge`

Do not claim external expert attribution unless the source is real, intentionally included, and documented.

## Writing standards

- write original project-authored prose
- keep explanations practical and beginner-friendly
- distinguish rules from strategy
- describe exceptions honestly
- avoid exact equity claims unless authoritative evidence is available elsewhere
- do not copy books, websites, or course material
- do not add fake citations

## Generation and validation

Regenerate browser-safe source after editing markdown:

```bash
pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:generate
```

Validate source integrity and stale generated output:

```bash
pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check
```

Repository-wide validation also runs:

```bash
pnpm knowledge:check
```

## Testing

Run package tests after changing content, taxonomy, validation, or retrieval:

```bash
CI=1 pnpm --filter @backgammon-trainer/backgammon-knowledge test
```

If coach integration is affected, also run:

```bash
CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test
CI=1 pnpm --filter @backgammon-trainer/web test
```

## Prohibited material

Do not add:

- copied instructional passages
- fabricated citations or endorsements
- model-generated filler that has not been reviewed and rewritten
- opening-table memorization dumps
- doubling-cube strategy in the current beginner corpus
- advanced rollout theory without an explicit future milestone
