# Evidence Selection and Curated Knowledge Retrieval

Timestamp: 2026-08-03-1208

Previous worklog: docs/worklog/2026-08-03-1107-coach-conversation-foundation.md

Goal:

Improve the coach request pipeline so that current-position questions send a bounded, question-relevant subset of trusted move evidence plus a small amount of repository-owned curated teaching material, without changing engine, analysis, evaluator, or persistence authority.

## Starting point

- active branch: `main`
- starting commit: `37a9f8ab06b5752e6c00f0d243c402b2bc69f5b7`

Ending commit is recorded after commit creation for this milestone.

## Repository findings that shaped the design

- `@backgammon-trainer/backgammon-coach` already owned context resolution, evidence building, prompt construction, and the provider-neutral knowledge retriever boundary.
- The existing `buildCoachEvidence(...)` current-position path still selected a broad deterministic legal-move slice rather than question-aware move rows.
- The existing retriever contract was intentionally non-fatal and already sat in the correct orchestration layer for a future replaceable retrieval implementation.
- The repository had no established browser-safe authored-content pipeline to reuse, but it already accepted checked-in generated package artifacts for workspace development and strict repository validation.
- Existing architecture guardrails already enforced that engine, analysis, analysis-session, and browser runtime boundaries remain clean.

## Product capability delivered

Implemented a first curated coaching retrieval layer that now provides:

- question-aware legal move evidence selection for current-position coaching requests
- move-reference matching against legal candidates only
- explicit clear, partial, ambiguous, and unmatched move-reference handling
- compact legal-move coverage and omission transparency
- small deterministic curated knowledge retrieval from project-authored content
- prompt separation between deterministic facts, evaluator evidence, and general guidance
- richer fixture response summaries for development inspection

## Package placement decision

Decision:

- keep the retriever boundary in `@backgammon-trainer/backgammon-coach`
- add `@backgammon-trainer/backgammon-knowledge` as a lower browser-safe package for curated knowledge source, taxonomy, validation, generated corpus delivery, and deterministic local retrieval helpers

Reason:

- the coach layer must remain responsible for factual context and request composition
- the curated knowledge layer has a distinct durable responsibility that should survive future retrieval implementation changes

## Dependency direction

- `@backgammon-trainer/backgammon-knowledge` has no workspace-package dependencies
- `@backgammon-trainer/backgammon-coach` now depends on `@backgammon-trainer/backgammon-knowledge`
- engine, analysis, and analysis-session remain independent from coaching and knowledge prose
- browser UI still depends on coach public exports rather than knowledge authoring helpers

## Authority boundaries

- engine authority: unchanged
- factual analysis authority: unchanged
- evaluator authority and provenance: unchanged
- curated knowledge: general instructional guidance only, never position-authoritative
- model role: still explanatory and explicitly non-authoritative

## Knowledge source and provenance

Implemented canonical markdown source under `packages/backgammon-knowledge/content/` with deterministic checked-in browser-safe generation to `packages/backgammon-knowledge/src/generated/corpus.ts`.

Initial provenance is truthfully project-authored:

- `project-authored`
- `Backgammon Trainer curated knowledge`

## Browser-delivery approach

- markdown files are canonical source for review and editing
- generation script creates browser-safe TypeScript data
- browser imports generated corpus through package public exports
- no runtime filesystem access is added to browser code
- stale generated output is detected by `knowledge:check`

## Retrieval boundary

The durable retrieval contract remains `CoachKnowledgeRetriever.retrieve(...)` in `@backgammon-trainer/backgammon-coach`.

The local implementation uses `@backgammon-trainer/backgammon-knowledge`, but callers still depend only on the coach boundary.

This keeps future semantic retrieval swappable without changing:

- coach orchestration
- prompt construction
- web conversation flow
- evidence disclosure behavior

## Current retrieval behavior

- deterministic local lexical matching only
- considers question text, context kind, and factual retrieval concepts
- alias and concept matches are stronger than context-only overlap
- context-only filler results are rejected
- no-match is valid
- returned entries preserve stable identity, provenance, concepts, track, and explicit selection reasons

## Evidence-selection responsibility

For current-position requests, the coach now selects a bounded legal-move subset using deterministic product priorities:

1. question-referenced legal candidates
2. staged candidates from the current UI state
3. ranked comparison rows when evaluator output exists
4. factually distinct alternatives
5. deterministic fallback if nothing stronger applies

The selector explains why a row was chosen but does not assign strategic verdicts.

## Legal move reference behavior

Supported notation includes forms such as `13/8`, `13-8`, `13 to 8`, and comma-separated multi-step references.

Resolution is constrained to existing legal candidates only.

Implemented outcomes:

- clear
- partial
- ambiguous
- unmatched

Ambiguity is preserved instead of guessed away.

Unmatched notation creates bounded warnings and no fabricated move.

## Coverage distinctions

The milestone keeps these concepts separate:

- legal move coverage: complete engine-generated legal set
- evaluator coverage: complete or partial ranked scoring coverage
- coach evidence coverage: complete or selected-subset move rows supplied to the model

Omitted move rows are not described as illegal.

## Prompt integration

`buildCoachModelRequest(...)` now sends a compact envelope with:

- user question
- response preferences
- context kind
- deterministic evidence
- curated knowledge
- truncation metadata

Instructions now explicitly require the model to keep deterministic facts, evaluator output, and curated guidance separate.

## Web transparency

The Coach panel remains conversation-first and now discloses, per response:

- selected versus total legal move counts
- omitted legal move count
- question move-reference outcomes
- evaluator provenance and coverage
- curated knowledge identities and retrieval reasons
- knowledge warnings when retrieval fails

No separate knowledge browser or raw markdown rendering was added.

## Failure behavior

- retrieval failure remains non-fatal
- ambiguous and unmatched references surface warnings rather than guesses
- no-match knowledge retrieval remains valid
- stale prior-lineage responses are still ignored
- gameplay remains enabled while coach work is pending

## Persistence boundaries

No new persistence was added for:

- conversations
- request snapshots
- move-reference matches
- selected evidence rows
- knowledge retrieval results
- game snapshots
- local storage
- analysis-session serialization

## Public API impact

Added public package:

- `@backgammon-trainer/backgammon-knowledge`

Extended coach package public surface with:

- local curated retriever factory
- richer knowledge excerpt metadata types

## Engine, analysis, evaluator, analysis-session, web, and server impact

- engine impact: none
- legal move generation impact: none
- factual analysis impact: none
- evaluator impact: none
- analysis-session impact: none
- web impact: Coach panel disclosure and default local retrieval integration only
- server impact: none

## Tests added or extended

- `packages/backgammon-knowledge/test/knowledge.test.ts`
- `packages/backgammon-coach/test/coach.test.ts`
- `packages/ai-contracts/test/fixture.test.ts`
- `apps/web/src/features/coach/CoachPanel.test.tsx`

## Documentation created and updated

Created:

- `docs/coach/evidence-selection-knowledge-retrieval.md`
- `docs/knowledge/authoring-guide.md`
- `docs/adr/0008-curated-knowledge-retrieval-boundary.md`
- `packages/backgammon-knowledge/README.md`
- `docs/worklog/2026-08-03-1208-evidence-selection-knowledge-retrieval.md`

Updated:

- `README.md`
- `docs/README.md`
- `docs/architecture/overview.md`
- `docs/architecture/dependency-guardrails.md`
- `docs/architecture/public-api-audit.md`
- `docs/coach/conversation-foundation.md`
- `docs/knowledge/architecture.md`
- `apps/web/README.md`
- `packages/ai-contracts/README.md`
- `packages/backgammon-coach/README.md`

## Validation performed

Focused validation during implementation:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-knowledge test`
- `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check`
- `CI=1 pnpm --filter @backgammon-trainer/ai-contracts test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test`
- `CI=1 pnpm --filter @backgammon-trainer/web test`

Full matrix is recorded after milestone completion.

## Deviations from plan

- no server change was required because the new capability fits entirely inside the existing browser and coach package boundaries
- the initial curated corpus is stored as markdown plus checked-in generated TypeScript, rather than adding a broader content toolchain

## Unresolved limitations

- local lexical retrieval only
- no semantic ranking or embeddings
- current corpus is intentionally beginner-oriented and modest in size
- current move-reference parsing is notation-oriented and does not attempt natural-language paraphrase understanding

## Intentionally deferred capabilities

- provider-specific retrieval adapters
- embeddings or vector indices
- remote knowledge services
- strategic current-position verdicts
- persistence of conversation or retrieval state
- full-game coaching review
- habit detection and learner modeling
- streaming and real provider adapters
