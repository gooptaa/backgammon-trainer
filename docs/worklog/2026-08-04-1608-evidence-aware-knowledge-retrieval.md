# Evidence-Aware Knowledge Retrieval Integration

Date: 2026-08-04

Branch: main

Knowledge-ingestion starting commit: c7d5ffec7e8943189b4448828b98c8067959d676

Knowledge-ingestion implementation commit: d328966

Knowledge-ingestion push result: present on origin/main before this milestone

Retrieval-integration starting commit: d328966

## Goal

Integrate expanded curated knowledge into real coaching flows by introducing explicit retrieval planning from deterministic context and evidence while preserving authority boundaries and retriever replaceability.

## Repository findings

- Coach retrieval boundary is `CoachKnowledgeRetriever` in `packages/backgammon-coach/src/knowledge.ts`.
- Prior retrieval planning was implicit in orchestration concept derivation.
- Knowledge retrieval was deterministic lexical scoring over generated corpus metadata.
- Coach already exposed selected knowledge IDs and selection reasons in evidence disclosure.
- Full prompt pipeline already bounded message history but did not bound knowledge text by per-entry and aggregate char budgets.

## Retrieval-plan placement

- Added provider-neutral retrieval planning module in `packages/backgammon-coach/src/retrievalPlan.ts`.
- Orchestration now builds a retrieval plan from resolved context + deterministic evidence before retriever invocation.
- Local retriever consumes the plan without exposing lexical internals to coach orchestration.

## Dependency direction

- Preserved existing direction: coach depends on knowledge package types/helpers.
- No new cross-boundary dependency edges added.

## Current retriever contract and changes

- `CoachKnowledgeRequest` now accepts optional `plan` metadata.
- Added exported `CoachKnowledgeRetrievalPlan` and `CoachKnowledgeRetrievalIntent`.
- Local retriever now forwards plan metadata to knowledge search:
  - concepts
  - preferred tracks
  - bounded query terms
  - intent
  - optional learner level
- Retrieval can intentionally no-op for disabled intents (unsupported-topic, progress-count factual requests).

## Context-aware retrieval behavior

- Current position: plan uses factual context concepts plus question concepts and strategic track preferences.
- Last Move Review / selected history: plan includes move-review + candidate-comparison concepts and review-suitable track weighting.
- Full Game Review: plan keeps review context while remaining bounded and deterministic.
- Progress profile:
  - factual count questions disable retrieval
  - learning-focus questions keep retrieval enabled and prefer learning/review material
- Pattern context: supported pattern skill areas map deterministically to retrieval concepts via existing mapping.

## Question-versus-context precedence

- User wording remains first-class through aliases, title tokens, and keywords.
- Context/evidence signals add metadata constraints and boosts.
- Definition intent stays definition-focused even when position context contains other themes.

## Metadata-aware ranking behavior

- Knowledge query model now supports preferred tracks, bounded query terms, intent, and optional learner level.
- Scoring remains deterministic and stable with tie-break by score, reason count, and entry id.
- Added track match as explicit selection reason kind.
- Current-position strategy requests apply a small move-review track penalty unless review-style wording is explicit.

## Corpus-role audit and metadata changes

Reviewed coaching-oriented entries:

- `kg.example-dialogue-patterns`
- `kg.reusable-coaching-snippets`
- `kg.faq-and-analogies`
- `kg.curriculum-ladders-and-practice`
- `kg.common-mistakes-and-myths`
- `kg.glossary-core-terms`

Metadata changes:

- `kg.reusable-coaching-snippets`: removed `current-position` context.
- `kg.curriculum-ladders-and-practice`: removed `current-position` context.
- `kg.glossary-core-terms`: added explicit anchor-definition aliases for direct glossary intent.

## Result bounds

- Retrieval plan max items:
  - definition intent: 2
  - other enabled intents: 3
- Prompt curation bounds:
  - max knowledge entries included: 4
  - max knowledge text per entry: 900 chars
  - max aggregate knowledge text: 2400 chars

## Evidence transparency

- Selected entry id/title/provenance/reasons remain in coach evidence disclosure.
- Retrieval reason kinds now include track-level metadata matches in addition to context/concept/alias/keyword.

## No-match and failure behavior

- Unsupported cube intent returns deterministic no-match instead of irrelevant fallback content.
- Factual progress-count intent returns deterministic no-match.
- Retriever failures remain non-fatal and surfaced via knowledge warning.

## Follow-up lifecycle

- Existing context resolution and follow-up behavior remain in orchestration.
- Retrieval remains request-scoped and bounded; no prompt-growth accumulation from prior selections.

## Semantic-retrieval extension point

- Retrieval plan remains provider-neutral and independent of lexical internals.
- Future semantic/hybrid retrievers can consume the same plan boundary without changing coach orchestration or prompt composition.

## Public API impact

- `@backgammon-trainer/backgammon-coach` exports now include retrieval-plan builder and types.
- `@backgammon-trainer/backgammon-knowledge` query model supports additional optional retrieval metadata fields.

## Package and subsystem impact

- Knowledge package: retrieval query model/scoring enhanced, corpus metadata adjusted, corpus regenerated.
- Coach package: explicit retrieval planning boundary, orchestration integration, prompt knowledge bounds.
- Analysis/session/profile/pattern packages: no contract changes.
- Web: no architectural contract changes; existing evidence disclosure continues to show selected knowledge reasons.
- Server/provider layers: unchanged.

## Tests and validation

Added or updated deterministic tests:

- knowledge retrieval ranking invariants:
  - glossary definition preference
  - point-making preference
  - race preference
  - bearing-off preference
  - opening and priming preference
  - broad coaching snippets not outranking specific strategic entries
- coach integration:
  - definition-intent retrieval plan construction
  - progress factual count retrieval suppression
  - unsupported cube retrieval suppression
  - prompt curated-knowledge char bounds

Focused validation run during implementation:

- `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:generate`
- `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-knowledge test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test`
- `CI=1 pnpm --filter @backgammon-trainer/web test`

## Manual verification

Performed bounded manual verification through deterministic retrieval scenarios in automated tests:

1. direct glossary definition question
2. current-position strategic retrieval query
3. history-turn move-review retrieval query
4. pattern-linked concept retrieval signal path
5. progress count no-retrieval path
6. unsupported cube no-match path

Observed outcomes aligned with authority and no-match policy boundaries.

## Deviations

- Did not expand schema/taxonomy.
- Did not add a new document-role field.
- Did not add embeddings, semantic retrieval, or external retrieval infrastructure.

## Unresolved limitations

- Retrieval remains lexical and deterministic by design.
- Learner-level weighting remains optional and currently lightly used.
- Coaching-style entries still rely on metadata discipline and deterministic ranking, not hard role partitioning.

## Deferred capabilities

- embeddings/vector retrieval
- semantic or hybrid reranking
- cube taxonomy expansion and cube content ingestion
- remote retrieval services
- model-assisted reranking
