# Backgammon Analysis Session

## Purpose

Provide a versioned interpretation boundary that links committed deterministic turns to ranked analysis records through immutable, fail-closed orchestration APIs.

## Responsibilities

- Define `AnalysisSession`/`AnalysisRecord` contracts and versioned envelope parsing.
- Create new sessions with deterministic game-reference linkage.
- Build analysis records from committed turn facts plus ranked analysis payloads.
- Append records immutably with idempotent duplicate handling.
- Reconcile stored analysis sessions against later deterministic snapshots.

## Allowed Dependencies

- `@backgammon-trainer/backgammon-analysis`
- `@backgammon-trainer/backgammon-engine`

## Forbidden Dependencies

- `@backgammon-trainer/web`
- `@backgammon-trainer/backgammon-evaluator-gnubg`
- Browser storage, network/database adapters, and UI frameworks

## Public API

- Session envelope/version constants and parse/serialize/encode/decode helpers.
- Builder/orchestration APIs (`createAnalysisSession`, `createAnalysisRecord`, `appendAnalysisRecord`, `reconcileAnalysisSession`).
- Deterministic identity helpers (`getAnalysisSessionGameReference`, `getDecisionPositionFingerprint`).
- Read-only summary helper (`summarizeAnalysisSession`).

Why these exports are public:

- They define the only supported host-layer integration surface for safe analysis-session creation, update, and validation.

## Non-goals

- Evaluator process invocation.
- GNU integration and process management.
- Browser/local/backend persistence adapters.
- Coaching labels, recommendations, and lesson planning.
- Cross-game learner ownership/profile persistence or progress aggregation.

Analysis-session records remain raw evaluator-linked evidence for committed turns. Versioned pedagogical move classification is derived in coach-domain orchestration and is not persisted in this package format.

## Future Roadmap

- Persistence adapter integration in host layers.
- Migration guidance for future analysis-session schema versions.
- Additional reconciliation diagnostics where needed.
