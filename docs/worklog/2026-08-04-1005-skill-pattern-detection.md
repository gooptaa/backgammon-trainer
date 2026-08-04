# Deterministic Skill-Pattern Detection

Date: 2026-08-04 10:05 (local)
Milestone: Deterministic Skill-Pattern Detection

## Profile milestone closure

- active branch: `main`
- Mistake Classification commit: `f12819bf96086f62f35a05d3acc6944f98b758f3`
- profile milestone starting commit: `f12819bf96086f62f35a05d3acc6944f98b758f3`
- profile milestone implementation commit: `ccce5aceb493362aed20f84e68117fc3707029d0`
- profile milestone push result: present on `origin/main`
- closure status: clean working tree before starting this milestone

## Pattern milestone starting commit

- starting commit: `ccce5aceb493362aed20f84e68117fc3707029d0`

## Repository findings

- deterministic move classification already existed in coach policy (`deterministic-loss-from-best` `1.0.0`) and already enforced non-fixture, complete-coverage requirements before labeling
- learner observations were already idempotent and superseding per committed-turn identity
- profile aggregation already provided full-profile and recent-window counts with policy compatibility filtering
- progress-profile context already existed in coach orchestration and UI
- factual analysis already exposed deterministic feature deltas and post-move position facts suitable for conservative detector rules

## Package placement decision

- pattern policy and detectors live in `@backgammon-trainer/backgammon-coach` (`src/patterns.ts`)
- per-observation pattern signals are stored in coach learner-profile contracts (`src/profile.ts`)
- browser persistence remains in `apps/web/src/features/profile/*` and stores the serialized coach profile

## Dependency direction

- engine remains authoritative for legal move identity and committed-turn state
- analysis remains factual and provides post-move facts used by detectors
- evaluator remains score/provenance authority only
- coach owns deterministic pattern interpretation, aggregation, and main-pattern selection
- web owns local storage and compact display of deterministic summaries

## Supported detector taxonomy

- `avoidable-blot-exposure`
- `missed-point-making-opportunity`
- `missed-hit-opportunity`

## Detector policy

- id: `deterministic-committed-move-patterns`
- version: `1.0.0`
- centralized support rules:
  - min eligible decisions for main-pattern support: `4`
  - min recurring occurrences for supported main pattern: `2`
  - bounded top-pattern and representative-turn output

## Detector factual inputs

- committed played move fingerprint
- supported stronger evaluated move fingerprint (rank 1)
- deterministic move classification label/loss from best
- post-move factual position analysis for played and stronger outcomes
- move-step hit flags for tempo/hit opportunities

## Signal eligibility

Signals are emitted only when all requirements are met:

- committed learner-owned checker-play turn
- classification is `mistake` or `major mistake`
- ranked analysis kind is `evaluated`
- evaluator coverage is `complete`
- evaluator provenance is non-fixture
- played move is evaluator-covered and stronger evaluated move exists

Signals are not emitted for unclassified, best/reasonable, fixture, partial, missing, or unsupported evidence.

## Pattern-signal schema

Each signal stores bounded deterministic evidence:

- signal id
- detector id/version
- lineage and committed-turn identity
- acting side
- played/stronger move fingerprints
- classification label and normalized loss
- detector-specific factual evidence payload
- observed timestamp
- explicit limitations list

## Identity and reconciliation

- observation identity remains canonical (`lineage + turn + acting side + move fingerprint + classification policy`)
- pattern signals are canonicalized per observation and deduplicated by signal id
- repeated ingestion remains idempotent
- supersession behavior remains deterministic through preferred-observation reconciliation

## Classification-policy compatibility

- progress aggregation remains `current-policy-only` for move classifications
- incompatible classification-policy observations are preserved but excluded from active counts

## Pattern-policy compatibility

- pattern aggregation is `current-policy-only`
- incompatible pattern-policy observations are preserved and excluded from active pattern aggregates
- limitations report excluded incompatible observation counts

## Aggregation behavior

- full-profile and recent-window pattern aggregates are computed deterministically
- each aggregate includes occurrence counts, mistake/major-mistake counts, cumulative loss, games represented, most-recent timestamp, and bounded representative turns
- multi-signal turns are preserved as independent detector matches (no double counting within a detector)

## Main-pattern selection

- deterministic and policy-owned (never model-selected)
- requires minimum eligible decisions and recurring occurrences
- resolves to one of:
  - `supported`
  - `tied`
  - `insufficient-evidence`

## Tie and insufficient-evidence behavior

- ties are explicit when leading detector metrics are equal
- insufficient evidence distinguishes:
  - too few eligible decisions
  - no supported pattern signals
  - no recurring pattern

## Skill-area mapping

- `safety-versus-risk` -> knowledge concept `safety`
- `making-points` -> knowledge concept `made-points`
- `hitting-and-tempo` -> knowledge concept `hits`

## Last Move Review integration

- historical move classification remains separate from pattern attribution
- one-move pattern signals remain per-decision evidence and do not imply recurring habit by themselves

## Full Game Review integration

- no new game-review ranking or selection authority was added in this milestone
- full-game review remains deterministic and bounded; pattern recurrence is represented through profile aggregation context

## Progress-profile integration

- progress snapshot now includes deterministic `patterns` evidence
- recent compact summary can report supported main pattern, tie, or insufficient evidence
- existing classification counts/trend fields are unchanged

## Coach context behavior

- recurring-pattern questions route to existing `progress-profile` context when available
- explicit move-outcome/history/full-game-review precedence remains unchanged
- pattern intent does not override explicit selected-turn review context

## UI behavior

- learner profile panel remains compact and conversation-first
- added concise main-pattern line and optional bounded detail line
- default state remains explicit: `Main pattern: not enough evidence yet`

## Persistence and privacy impact

- pattern evidence remains local-only in browser profile storage
- no telemetry added
- no credentials, raw GNU output, prompts, or model responses stored in profile
- profile clear behavior still resets all learner profile data, including pattern signals

## Public API impact

- added coach exports for pattern policy contracts and helpers
- `LearnerProgressSnapshot` now includes deterministic `patterns` summary
- coach evidence bundle version advanced to `5` and progress evidence now carries pattern summary

## Tests and validation

Focused baseline before implementation:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test` passed
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test` passed
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test` passed
- `CI=1 pnpm --filter @backgammon-trainer/web test` passed

New/updated coverage:

- updated `packages/backgammon-coach/test/progressProfile.test.ts` for detector behavior, eligibility gating, and tied main-pattern behavior
- updated `packages/backgammon-coach/test/coach.test.ts` for recurring-pattern intent routing and prompt guardrails
- updated `apps/web/src/App.test.tsx` for compact main-pattern UI summary

Implementation-round focused validation:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test` passed
- `CI=1 pnpm --filter @backgammon-trainer/web test` passed

## Manual verification

- pending final bounded local verification after full matrix run and before final completion report

## Deviations

- pattern context routing reuses `progress-profile` context kind rather than adding a separate context kind, while still handling distinct recurring-pattern intents deterministically

## Unresolved limitations

- initial taxonomy intentionally limited to three conservative detectors
- no strategic habit diagnosis beyond deterministic detector matches
- no trend-over-pattern metric beyond current deterministic main-pattern support rules

## Deferred capabilities

- personalized lesson generation
- generated practice positions
- spaced repetition
- mastery benchmarks and ratings
- cloud sync/accounts
- semantic retrieval for pattern matching
- cube/match-equity pattern attribution
