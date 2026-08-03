# Evidence-Backed Last Move Review

Date: 2026-08-03 18:10 (local)
Milestone: Evidence-Backed Last Move Review

## GNU prework closure

- Local environment baseline commit before GNU milestone work:
  - `89ac078e987b2855b01b6775ff3764b26b4bb947`
  - `chore: add local environment integration`
- Real GNU integration commit already present at start of this milestone:
  - `66384fa44c54df3d423920a60bf38c0c01e2683f`
  - `feat: add real gnubg evaluator integration`
- GNU live-compatibility repair commit (this session):
  - `abdc0d6...`
  - `fix: repair real gnubg live smoke compatibility`

Live validation outcomes:

- `pnpm config:check`: passed.
- GNU executable availability check: found and version reported.
- `ALLOW_GNUBG_SMOKE=true pnpm smoke:gnubg` against isolated `EVALUATOR_PROVIDER=gnubg` server: passed.
- `ALLOW_LIVE_PROVIDER_SMOKE=true pnpm smoke:live-provider` against isolated production provider mode server: provider status reachable; bounded completion returned non-success due external rate limiting in this environment.

## Last Move Review starting commit

- Start point for this milestone implementation:
  - `abdc0d6...`

## Repository findings

- `TurnRecord` already preserves full decision-time authority:
  - acting player
  - decision dice
  - `positionBefore`
  - committed move/pass outcome
- Existing `history-turn` coach context already supports committed-turn targeting.
- Existing coach precedence already places explicit history turn ahead of current-position context.
- Existing lineage stale-response protection already prevents cross-lineage attachment.
- Existing analysis-session records already link ranked analysis to committed turns.

## Product behavior delivered

- Last-move questions now resolve to a historical review target deterministically.
- Explicit selected history turn remains authoritative when present.
- Otherwise, last-move questions resolve to the latest committed checker-play turn in the same lineage.
- Review evidence is tied to committed-turn identity and remains attached to the submitted request context.
- Historical review can hydrate ranked analysis on demand through existing provider-neutral evaluator pipeline when no linked analysis record exists.

## Review-target precedence

1. Explicit selected history turn (if applicable).
2. Latest committed checker-play turn for last-move review questions.
3. Existing context precedence for non-review questions remains unchanged.

## Decision-time reconstruction

- Historical review always uses committed `turnRecord.positionBefore` and `turnRecord.dice`.
- No reverse reconstruction from current board UI state was introduced.

## Canonical played-move mapping

- Played move identity remains canonical via existing move-fingerprint semantics.
- Historical evidence compares played move against ranked/unevaluated legal candidates from the same decision-time analysis.

## Evaluator reuse and on-demand evaluation

- Existing linked `analysisRecord.rankedMoveAnalysis` is reused when available.
- Optional on-demand history-turn evaluation path was added to coach submission orchestration and wired from web host integration.
- No broad persistent evaluation cache was introduced.

## Deterministic review-support rules

- Complete trustworthy coverage:
  - supported authoritative recommendation.
- Partial trustworthy coverage:
  - supported strongest-evaluated recommendation with explicit limitation.
- Played move not evaluated:
  - non-supported (`played-move-not-evaluated`), no fabricated rank/loss for played move.
- Fixture evaluator:
  - non-supported (`fixture-evaluator`) with explicit limitation.
- Missing evaluator analysis:
  - non-supported (`missing-evaluator`) and warning.
- Unsupported historical turn (non-checker move):
  - non-supported (`unsupported-history-turn`).

## Complete/partial/fixture/unavailable behavior

- Complete: supports definitive historical comparison.
- Partial: comparison is explicitly limited to evaluated subset.
- Fixture: never treated as authoritative.
- Missing/unavailable: factual review still emitted with explicit limitations.

## Historical lifecycle behavior

- Resolved target is captured at submit time.
- Additional moves played during pending requests do not retarget the historical request.
- Selecting another turn later does not rewrite prior request context.
- Existing lineage stale protections remain intact.

## Persistence impact

- No new persistence layer was introduced.
- No changes to game snapshot persistence semantics.
- No raw model prompts/responses or raw GNU transcripts persisted.

## Public API and dependency impact

- `@backgammon-trainer/backgammon-coach` public contracts extended:
  - history-turn context now includes deterministic selection source and optional ranked analysis.
  - orchestration accepts optional history-turn analysis resolver.
  - evidence includes historical review evidence and additional recommendation-support reasons.
- No GNU-specific types crossed into coach or web boundaries.

## Security and privacy impact

- No credential handling changes.
- No local env secrets logged or persisted.
- No raw GNU transcript persistence introduced.

## Tests and validation during milestone

Focused baseline executed:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test`
- `CI=1 pnpm --filter @backgammon-trainer/server test`
- `CI=1 pnpm --filter @backgammon-trainer/web test`

Additional scoped repair gates executed during GNU closure:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg test`
- `pnpm config:check`
- `git diff --check`

## Deviations

- Live model-provider smoke did not produce successful completion due provider-side rate limiting in this environment after provider status validation succeeded.

## Unresolved limitations

- Full live provider end-to-end success is environment-dependent on external provider quota/rate limits.
- Historical review currently detects last-move prompts using bounded pattern matching rather than a broader intent parser.

## Deferred capabilities

- Formal mistake/blunder classification and threshold taxonomy.
- Cross-turn habit detection.
- Conversation persistence.
- Batch/full-game review.
