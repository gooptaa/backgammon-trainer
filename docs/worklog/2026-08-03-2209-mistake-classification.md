# Deterministic Mistake Classification

Date: 2026-08-03 22:09 (local)
Milestone: Deterministic Mistake Classification

## Full Game Review closure

- Last Move Review commit: 8cffd80b4b5f9a1f2c12b2974eb252f63e2ef5ec
- Full Game Review starting commit: 7612945e37821327f1897ee8b57d6710972c2a7f
- Full Game Review implementation commit: 76187e803b26767303796f974a58e83cf63a78c2
- Full Game Review push result: present on origin/main before this milestone started
- Closure prework state: main branch, clean tree, no unresolved unrelated changes

## Mistake Classification starting point

- Mistake Classification starting commit: 76187e803b26767303796f974a58e83cf63a78c2

## Repository findings

- Evaluator normalization is higher-is-better `normalizedScore` with deterministic `lossFromBest = bestScore - moveScore`.
- Ranked ties are dense and deterministic (score first, canonical move fingerprint tiebreak).
- Complete/partial coverage semantics are validated in analysis and analysis-session contracts.
- Analysis-session records remain raw evaluator-linked turn evidence and do not own pedagogical labels.
- Coach evidence already resolves historical and full-game review over immutable committed turn identity.
- Prompt construction already carries deterministic evidence and recommendation support authority before generation.

## Classification ownership and dependency direction

- Classification policy is owned by `@backgammon-trainer/backgammon-coach`.
- Engine remains legal/committed-turn authority only.
- Analysis and evaluator remain factual scoring/provenance providers only.
- Language model receives deterministic classification evidence and must explain it, not redefine it.

## Evaluator score semantics

- Normalized quantity used: `lossFromBest` from ranked evaluator output.
- Supported score-scale for policy v1: equity points.
- Coverage precondition for formal labels: complete trustworthy non-fixture evaluator coverage.

## Eligibility rules

Formal classification requires all of:

- committed checker-play turn with canonical played move
- ranked analysis kind `evaluated`
- complete evaluator coverage
- non-fixture evaluator provenance
- supported score semantics (equity points)
- played move present in evaluator-ranked coverage
- finite non-negative loss-from-best

Otherwise result is deterministic `unclassified`.

## Selected thresholds and rationale

Policy id/version: `deterministic-loss-from-best` / `1.0.0`

- tie tolerance inclusive: `0.000001`
- `reasonable` upper bound inclusive: `0.08`
- `mistake` upper bound inclusive: `0.2`
- `major mistake`: above `0.2`

Rationale:

- preserves clear progression from tied-best to severe loss
- avoids false precision in user-facing interpretation
- remains explicit product policy (versioned), not universal backgammon truth

## Tie handling

- tied-best is detected by policy tolerance and rank-one multiplicity
- ties classify as `best`
- tie state is preserved in deterministic evidence

## Policy identity/version

- Exposed in evidence: `moveClassificationPolicy` and per-decision classification fields
- Prompt instructions enforce model compliance with deterministic labels

## Capability delivered

- Added centralized deterministic classification policy in coach domain.
- Added per-turn classification results for historical review evidence.
- Added per-turn classification results and bounded aggregate counts for full-game review.
- Added deterministic unclassified reasons for unsupported/insufficient evidence.
- Added severity-aware deterministic key-decision prioritization for full-game review while preserving explicit turn references and bounded balance inclusion.
- Kept current-position recommendation behavior unchanged: no mistake labeling before commit.

## Last Move Review integration

- Historical review evidence now includes move classification when eligible.
- Unclassified reasons are explicit when classification is not supported.
- Prompt instructions include deterministic label authority constraint.

## Full Game Review aggregation

- Added counts for `best`, `reasonable`, `mistake`, `major mistake`, `unclassified`.
- Key decisions now include deterministic per-turn classification evidence.
- Selection remains deterministic and bounded with severity priority plus balance candidate behavior.

## Unclassified behavior

Deterministic unclassified reasons include:

- unsupported turn kind
- missing ranked analysis
- evaluation failed/unavailable
- unsupported analysis source
- fixture provenance
- partial coverage
- played move not evaluated
- unsupported score scale
- missing best evaluated move
- invalid loss-from-best

## Ownership limitations

- Ownership remains authoritative only when scope is learner-only.
- Ambiguous ownership remains all-player review scope and is disclosed.
- No silent conversion to “your mistakes” when ownership is ambiguous.

## Lifecycle behavior

- Uses existing immutable submission snapshots and committed-turn boundaries.
- Same-lineage continued play does not retarget submitted review evidence.
- Existing stale-response protections remain unchanged.

## Persistence impact

- No persistence format changes.
- No analysis-session schema/version changes.
- No conversation persistence introduced.
- Classification is derived from ranked evidence at request time.

## Public API impact

- Added coach exports for classification policy/contracts.
- Bumped coach evidence version from `2` to `3` due contract expansion.
- No engine, evaluator, or analysis-session public schema mutation for classification storage.

## Security and privacy impact

- No credentials added.
- No raw GNU transcripts, full prompts, or model responses committed.
- `.env.local` remains ignored/untracked.
- Browser bundle remains free of GNU/Node process implementation.

## Files changed

- Added `packages/backgammon-coach/src/classification.ts`
- Added `packages/backgammon-coach/test/moveClassification.test.ts`
- Added `docs/adr/0012-deterministic-move-classification-policy.md`
- Updated coach evidence/prompt/index/conversation contracts
- Updated coach and web tests for classification behavior
- Updated docs and READMEs for boundary/policy behavior

## Tests and validation

Focused during implementation:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test`
- `CI=1 pnpm --filter @backgammon-trainer/web test`
- `CI=1 pnpm --filter @backgammon-trainer/web build`

Completion matrix:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test` passed
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test` passed
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test` passed
- `CI=1 pnpm --filter @backgammon-trainer/ai-contracts test` passed
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-knowledge test` passed
- `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check` passed
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test` passed
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg test` passed
- `CI=1 pnpm --filter @backgammon-trainer/server test` passed
- `CI=1 pnpm --filter @backgammon-trainer/web test` passed
- `CI=1 pnpm --filter @backgammon-trainer/web build` passed
- `pnpm config:check` passed
- `CI=1 pnpm check` passed
- `CI=1 pnpm test` passed
- `git diff --check` passed

Additional boundary checks:

- Architecture validation (within `pnpm check`) passed.
- Browser dist scan for GNU/server-only markers found no leaks.
- `.env.local` ignore status validated via `git check-ignore`.

## Manual verification result

- Optional real GNU/model manual verification was not rerun in this milestone because changed behavior is deterministic coach-domain classification policy and local tests covered decision contracts; no live-provider integration logic was modified.

## Deviations

- No durable architecture direction change beyond documenting classification policy boundary in a new ADR.

## Unresolved limitations

- Policy currently supports equity-point semantics only.
- Partial-coverage turns remain unclassified rather than graded.
- Thresholds are initial pedagogy defaults and may need future versioned tuning with product evidence.

## Deferred capabilities

- Inaccuracy/blunder multi-label taxonomy beyond current four labels
- Cross-game or habit-level aggregation
- Player ratings/performance metrics
- Cube/match-equity classification
- Semantic retrieval/embeddings
- Additional model-provider runtime features
