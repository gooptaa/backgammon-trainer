# Evidence-Backed Full Game Review

Date: 2026-08-03 19:35 (local)
Milestone: Evidence-Backed Full Game Review

## Last Move Review closure

- Last Move Review starting commit: abdc0d6d398e1f9bc973f02c8fe669f7522967f3
- Last Move Review implementation commit: 8cffd80b4b5f9a1f2c12b2974eb252f63e2ef5ec
- Last Move Review push result: present on origin/main
- GNU live-compatibility repair commit: abdc0d6d398e1f9bc973f02c8fe669f7522967f3
- Closure matrix result: passed once before Full Game Review implementation

## Full Game Review starting point

- Full Game Review starting commit: 7612945e37821327f1897ee8b57d6710972c2a7f

## Repository findings

- Turn history is immutable, canonical, and decision-time complete through TurnRecord fields including positionBefore, dice, player, outcome, and turnNumber.
- Analysis-session records already link ranked analysis to committed turn identity and support sparse turn coverage.
- Existing coach orchestration already supports deterministic context resolution and on-demand single-turn hydration for historical review.
- Existing stale-response protection already binds pending requests to lineage keys.
- Existing prompt boundary already separates deterministic evidence, evaluator evidence, and curated knowledge.

## Capability delivered

- Added user-initiated full-game review via conversation intent for completed games and game-so-far.
- Added deterministic game-review context metadata: scope, committed-turn boundary, ownership scope, selection source, selected/referenced turns.
- Added bounded deterministic review evidence aggregation with key decisions before model generation.

## Review-scope resolution

- Full-game review activates only for explicit review intent (for example: review this game, how did I play, game so far).
- Completed games are no longer auto-routed to game-review context for every question.
- Scope resolves to completed-game or game-so-far from submitted snapshot turn history.

## Learner ownership behavior

- When learner ownership is not authoritative, review scope remains all-players.
- Ambiguous ownership is disclosed as evidence warning and review metadata.
- No silent assignment of reviewed decisions to the user was introduced.

## Decision reconstruction

- Each reviewed checker-play decision uses committed turn data: turn identity, acting player, positionBefore, dice, and committed move.
- No reconstruction from staged UI state or current post-move board was introduced.

## Evaluator reuse and orchestration

- Existing analysis-session records are reused first for matching committed turns.
- Missing checker-play turns can be hydrated on demand via provider-neutral callback.
- Hydration runs sequentially for bounded process safety and deterministic ordering.
- Duplicate same-turn hydration is avoided within a review request.

## Coverage aggregation

- Aggregates complete, partial, missing, fixture, failed, unavailable, and unsupported counts.
- Tracks evaluated vs unevaluated played-move counts without fabricated rank values.
- Distinguishes unsupported non-checker turns from missing evaluator evidence.

## Key-decision selection

- Deterministic and bounded selection (using coach evidence max row bound).
- Prioritizes selected/referenced turns and largest supported played-vs-best evaluated differences.
- Includes tie-for-top decisions when available for balanced instruction.
- Uses neutral phrasing in evidence notes.

## Evidence bounds

- Full-game evidence remains bounded before prompt construction.
- Evidence includes only selected key decisions, not all candidates from every turn.
- Prompt still uses existing bounded conversation and knowledge limits.

## Lifecycle behavior

- Full-game review captures committed-turn boundary at submission.
- Additional moves do not expand a pending review.
- Later history-selection changes do not retarget submitted review evidence.
- Existing lineage stale-response guards remain unchanged.

## UI behavior

- Conversation-first flow preserved.
- No separate game-analysis dashboard or auto modal introduced.
- Evidence disclosure now includes review scope, ownership, coverage counts, key decisions, and limitations.

## Persistence impact

- No new persistence layer introduced.
- GameSnapshot semantics unchanged.
- Analysis-session format/version unchanged.
- No prompt/response persistence introduced.

## Public API and dependency impact

- backgammon-coach context contracts extended for full-game review metadata and per-turn review evidence.
- backgammon-coach orchestration extends submission with optional game-review hydration callback type.
- Web coach integration passes analysis session and resolver through existing boundaries.
- No GNU-specific imports introduced in coach or browser layers.

## Tests and validation

Focused validation during implementation:

- CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test
- CI=1 pnpm --filter @backgammon-trainer/web test

Results:

- backgammon-coach: passed (31 tests)
- web: passed (147 tests)

Full repository validation matrix and git diff --check run at milestone completion gate.

## Deviations

- No durable architecture changes requiring a new ADR were introduced.

## Unresolved limitations

- Learner-side ownership remains ambiguous without a dedicated authoritative ownership source.
- Full-game review hydration currently evaluates sequentially for safety rather than bounded parallelism.

## Deferred capabilities

- Formal mistake/blunder classification thresholds
- Cross-game habit detection
- Multi-game or match review
- Cube decisions, match equity, and luck analysis
- Semantic retrieval/embeddings
- Additional model-provider runtime features
