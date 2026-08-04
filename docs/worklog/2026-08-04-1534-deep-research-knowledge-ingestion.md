# Deep Research Knowledge Ingestion

Date: 2026-08-04

Branch: main

Starting commit: c7d5ffec7e8943189b4448828b98c8067959d676

Preceding milestone implementation commit: becff97 (feat: add deterministic learner pattern detection)

Preceding milestone push status: present on origin/main before ingestion work started

## Goal

Ingest the supplied Deep Research knowledge drafts into the canonical curated corpus while preserving existing repository architecture, schema, taxonomy, and coach retrieval boundaries.

## Repository findings

- Canonical authored content root is packages/backgammon-knowledge/content/.
- Runtime generation currently reads flat content/*.md (non-recursive).
- Runtime frontmatter schema authority is implemented in packages/backgammon-knowledge/scripts/knowledge-source.mjs and packages/backgammon-knowledge/src/model.ts.
- Required fields are schemaVersion, id, title, summary, learnerLevel, track, concepts, contexts, aliases, provenanceKind, provenanceLabel.
- Controlled vocabulary authority is packages/backgammon-knowledge/src/model.ts.
- Corpus generation is packages/backgammon-knowledge/scripts/generate-knowledge.mjs.
- Drift check is packages/backgammon-knowledge/scripts/validate-knowledge.mjs.
- Runtime corpus artifact is packages/backgammon-knowledge/src/generated/corpus.ts.
- Retrieval boundary and behavior remain in backgammon-coach and backgammon-knowledge package contracts.

## Taxonomy and provenance decisions

- Preserved schema version 1 and taxonomy version 1.
- Used only supported track, concept, context, and learner-level values.
- Preserved project-authored provenance model:
  - provenanceKind: project-authored
  - provenanceLabel: Backgammon Trainer curated knowledge
- Did not expand schema or taxonomy.

## Capability-boundary decisions

- Deferred cube-centric drafts for runtime corpus because current authoring policy explicitly excludes doubling-cube strategy in the current corpus.
- Preserved checker-play and move-review boundaries without implying unsupported runtime cube workflows.

## README handling

- Did not create runtime content README under content/.
- Added generation-time guard to fail if content/README.md appears.
- Updated authoring guide to document that content READMEs are documentation-only and excluded from runtime corpus.

## Source inventory and disposition mapping

Total proposed briefs found: 17

1. knowledge/README.md -> merged into existing documentation entry points; runtime entry not created (documentation-oriented, duplicate intent)
2. knowledge/glossary/core-terms.md -> created as packages/backgammon-knowledge/content/glossary-core-terms.md (id: kg.glossary-core-terms)
3. knowledge/foundations/position-classification.md -> expanded existing packages/backgammon-knowledge/content/board-vision-first-look.md (id: kg.board-vision-first-look)
4. knowledge/foundations/probability-pips-and-racing.md -> created as packages/backgammon-knowledge/content/pip-count-and-race-context.md (id: kg.pip-count-and-race-context)
5. knowledge/checker-play/anchors-builders-duplication-flexibility.md -> expanded existing packages/backgammon-knowledge/content/making-points-and-anchors.md (id: kg.making-points-and-anchors)
6. knowledge/checker-play/timing-structure-and-volatility.md -> created as packages/backgammon-knowledge/content/timing-structure-and-volatility.md (id: kg.timing-structure-and-volatility)
7. knowledge/strategies/priming.md -> created as packages/backgammon-knowledge/content/priming-and-prime-battles.md (id: kg.priming-and-prime-battles)
8. knowledge/strategies/blitz-holding-and-back-games.md -> created as packages/backgammon-knowledge/content/blitz-holding-and-backgame-plans.md (id: kg.blitz-holding-and-backgame-plans)
9. knowledge/cube/money-cube-basics.md -> deferred (unsupported in current corpus policy boundary)
10. knowledge/cube/match-play.md -> deferred (unsupported in current corpus policy boundary)
11. knowledge/openings/opening-principles.md -> created as packages/backgammon-knowledge/content/opening-principles-first.md (id: kg.opening-principles-first)
12. knowledge/endgame/bearoff-and-reference-positions.md -> expanded existing packages/backgammon-knowledge/content/bearing-off-basics.md (id: kg.bearing-off-basics)
13. knowledge/lessons/curriculum-ladders.md -> created as packages/backgammon-knowledge/content/curriculum-ladders-and-practice.md (id: kg.curriculum-ladders-and-practice)
14. knowledge/coaching/common-mistakes-and-myths.md -> created as packages/backgammon-knowledge/content/common-mistakes-and-myths.md (id: kg.common-mistakes-and-myths)
15. knowledge/coaching/faq-and-analogies.md -> created as packages/backgammon-knowledge/content/faq-and-analogies.md (id: kg.faq-and-analogies)
16. knowledge/coaching/example-dialogues.md -> created as packages/backgammon-knowledge/content/example-dialogue-patterns.md (id: kg.example-dialogue-patterns)
17. knowledge/coaching/reusable-snippets.md -> created as packages/backgammon-knowledge/content/reusable-coaching-snippets.md (id: kg.reusable-coaching-snippets)

## Ingestion totals

- Entries created: 11
- Existing entries expanded: 4
- Briefs merged into existing docs/entries: 1
- Briefs renamed/remapped to canonical flat root paths: 15
- Briefs split into multiple entries: 0
- Briefs skipped as duplicates: 1 (README intent)
- Briefs deferred/omitted: 2 (cube drafts)

## Duplicate-content reconciliation

- Preserved existing canonical IDs for overlapping foundation and endgame entries.
- Merged overlapping ideas into stronger existing entries instead of introducing duplicate IDs.
- Added new entries only for distinct retrievable concepts.

## Generated corpus impact

- Regenerated packages/backgammon-knowledge/src/generated/corpus.ts from canonical markdown source.
- Corpus now includes additional intermediate-oriented strategy/coaching concept entries under existing schema and taxonomy.

## Retrieval checks

- Updated deterministic retrieval test expectations for expanded corpus ordering.
- Preserved no-match behavior for unsupported query topics (cube query remains no-match).
- Added README exclusion invariant test at corpus level.

## Files changed

Added:
- packages/backgammon-knowledge/content/blitz-holding-and-backgame-plans.md
- packages/backgammon-knowledge/content/common-mistakes-and-myths.md
- packages/backgammon-knowledge/content/curriculum-ladders-and-practice.md
- packages/backgammon-knowledge/content/example-dialogue-patterns.md
- packages/backgammon-knowledge/content/faq-and-analogies.md
- packages/backgammon-knowledge/content/glossary-core-terms.md
- packages/backgammon-knowledge/content/opening-principles-first.md
- packages/backgammon-knowledge/content/pip-count-and-race-context.md
- packages/backgammon-knowledge/content/priming-and-prime-battles.md
- packages/backgammon-knowledge/content/reusable-coaching-snippets.md
- packages/backgammon-knowledge/content/timing-structure-and-volatility.md

Modified:
- docs/knowledge/authoring-guide.md
- packages/backgammon-knowledge/README.md
- packages/backgammon-knowledge/content/bearing-off-basics.md
- packages/backgammon-knowledge/content/blots-hits-and-tempo.md
- packages/backgammon-knowledge/content/board-vision-first-look.md
- packages/backgammon-knowledge/content/making-points-and-anchors.md
- packages/backgammon-knowledge/scripts/knowledge-source.mjs
- packages/backgammon-knowledge/src/generated/corpus.ts
- packages/backgammon-knowledge/test/knowledge.test.ts

## Validation performed

- pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:generate
- pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check
- CI=1 pnpm --filter @backgammon-trainer/backgammon-knowledge test
- CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test
- CI=1 pnpm --filter @backgammon-trainer/web test
- CI=1 pnpm --filter @backgammon-trainer/web build
- CI=1 pnpm check
- CI=1 pnpm test
- git diff --check

All above commands passed after regeneration and formatting.

## Deviations from source draft

- Did not adopt proposed nested knowledge/* directory tree; preserved canonical package root and flat content ingestion model.
- Did not adopt proposed frontmatter keys outside the implemented schema.
- Removed report wrapper labels and citation placeholders from runtime entries.
- Deferred cube-specific runtime entries due existing corpus policy boundary.

## Unresolved limitations

- Taxonomy does not yet have dedicated cube concepts/contexts, so cube content remains deferred.
- Retrieval remains lexical and deterministic by current package design.

## Follow-up suggestions

- If cube coaching becomes in-scope, propose a deliberate schema/taxonomy expansion milestone before adding cube runtime entries.
- Consider adding an explicit concept for opening theory if opening coverage grows significantly beyond principles-first guidance.
