# Learner Ownership and Persistent Progress Profile

Date: 2026-08-04 06:49 (local)
Milestone: Learner Ownership and Persistent Progress Profile

## Deterministic Mistake Classification closure

- Full Game Review commit: `76187e803b26767303796f974a58e83cf63a78c2`
- Mistake Classification starting commit: `76187e803b26767303796f974a58e83cf63a78c2`
- Mistake Classification implementation commit: `f12819bf96086f62f35a05d3acc6944f98b758f3`
- Mistake Classification push result: present on `origin/main`
- Closure safety state: `main`, clean working tree, no unresolved unrelated changes

## Profile milestone starting point

- Starting commit: `f12819bf96086f62f35a05d3acc6944f98b758f3`

## Repository findings

- Checker side (`white`/`black`) is engine/domain rule state, while learner identity was not previously persisted.
- Existing full-game review ownership scope had explicit `learner-only` vs `all-players` shape, but current runtime defaulted to ambiguous ownership.
- Deterministic move classification policy already lived in `@backgammon-trainer/backgammon-coach` with policy id/version `deterministic-loss-from-best`/`1.0.0`.
- Existing browser persistence covered only deterministic game snapshot (`backgammon-trainer.game-snapshot.v1`).
- Existing lineage handling for coaching/analysis references used deterministic game-reference strings that can collide across unrelated games with the same origin payload.
- Existing coach evidence was versioned and bounded; it already enforced deterministic authority before model generation.

## Learner ownership authority

- Added explicit per-lineage learner ownership modes: `white`, `black`, `both`, `unknown`.
- Ownership is product metadata, not engine rule-state.
- Ownership is selected in web UI and persisted locally.
- `unknown` and `both` prevent learner observation attribution.

## Package placement and dependency direction

Placement decision:

- Extended `@backgammon-trainer/backgammon-coach` with a learner-profile domain module (`src/profile.ts`).
- Kept browser storage adapters in `apps/web/src/features/profile/*`.

Dependency direction:

- Coach domain owns profile schema/versioning, observation eligibility/reconciliation, aggregation, and progress evidence.
- Web owns localStorage adapters and UI controls.
- Engine, analysis, analysis-session, evaluator, and server remain profile-independent.

## Profile schema and version

- Format: `backgammon-trainer-learner-profile`
- Version: `1`
- Schema contains:
  - `updatedAt`
  - `maxObservations`
  - per-lineage ownership map
  - bounded learner observation list

## Learner observation contents

Each observation preserves deterministic provenance:

- canonical observation id (`learner-observation-v1|...`)
- lineage id
- optional game reference
- committed turn number
- acting side
- played move fingerprint
- learner ownership at observation time
- policy id/version
- classified/unclassified result
- evaluator coverage/provenance when available
- observation timestamp

Excluded from storage:

- credentials
- raw GNU output
- prompts or model responses
- large snapshot duplication

## Observation eligibility

Observation ingestion requires:

- committed checker-play move turn
- lineage id present
- ownership authoritative (`white` or `black`)
- acting side equals learner side

Observation ingestion rejects:

- unknown/both ownership
- opponent turns
- non-checker actions (`pass`)
- fixture demonstrations

## Identity, idempotency, and reconciliation

- Canonical identity includes lineage id + committed turn identity + policy identity/version.
- Repeated ingestion is idempotent for same observation id.
- No count inflation on repeated review/reload paths.
- Supersession upgrades compatible unclassified observation to classified when stronger evidence arrives.
- Same position in different lineage ids remains distinct.

## Classification-policy compatibility

- Aggregation mode: `current-policy-only`.
- Observations with incompatible policy id/version are preserved but excluded from active aggregates.

## Recent-20 aggregation and trend behavior

- Deterministic summary exposes both full compatible profile and rolling recent window (`20`).
- Counts exposed: `best`, `reasonable`, `mistake`, `major mistake`, `unclassified`, totals/classified, and combined `bestOrReasonable`.
- Coverage ratios and games represented are included.
- Trend is conservative and deterministic:
  - supported only when two non-overlapping windows exist with sufficient classified counts
  - otherwise explicit insufficient-evidence reason

## Persistence implementation

- Added local profile storage adapter: `backgammon-trainer.learner-profile.v1`.
- Added local lineage metadata adapter: `backgammon-trainer.game-lineage.v1`.
- Added explicit lineage id persistence independent of engine snapshot.
- Added safe restore behavior:
  - malformed profile payload -> fail-safe reset
  - unsupported future profile version -> do not rewrite
  - storage failures -> in-memory fallback, gameplay unaffected

## Corruption, migration, clearing, and recovery

- Read-time validation is fail-closed.
- Unsupported future profile versions remain untouched.
- `Clear Learner Profile` explicitly resets local profile data.
- `Clear Saved Game` also clears lineage metadata key.

## Coach integration

- Added `progress-profile` context kind in coach domain.
- Added progress-intent routing in orchestration for questions like:
  - "How am I doing?"
  - "Show my recent progress."
  - "How many mistakes..."
  - "Am I improving?"
- Added deterministic `progressEvidence` in coach evidence bundle.
- Bumped coach evidence version from `3` to `4`.
- Prompt instructions now explicitly forbid inventing progress counts/trends/ratings.

## UI behavior

- Added compact Learner Profile UI section in sandbox panel:
  - learner-side selector
  - concise recent-20 counts
  - games represented count
  - local storage status message
  - explicit clear-profile action
- No analytics dashboard added.

## Privacy impact

- Profile data remains local-only browser storage in this milestone.
- Profile data is not sent to evaluator routes.
- Profile data is only included in coach model requests for explicit progress-profile questions.
- No telemetry added.

## Public API impact

- Added coach exports for learner profile domain contracts and helpers.
- Added new coach context kind `progress-profile`.
- Expanded coach evidence contract to include `progressEvidence`.
- Updated docs and ADRs for new boundary.

## Tests and validation

Focused baseline before implementation:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test` passed
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test` passed
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test` passed
- `CI=1 pnpm --filter @backgammon-trainer/web test` passed

New/updated tests:

- added `packages/backgammon-coach/test/progressProfile.test.ts`
- added progress-intent orchestration coverage in `packages/backgammon-coach/test/coach.test.ts`
- added learner profile UI/persistence coverage in `apps/web/src/App.test.tsx`

Implementation-round validation executed:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test` passed
- `CI=1 pnpm --filter @backgammon-trainer/web test` passed

## Manual verification

- Verified learner ownership selection UI is present and persisted locally.
- Verified committed learner move ingestion increments recent progress counts once.
- Verified reload preserves ownership/profile and repeated reads do not duplicate observations.
- Verified progress context is deterministic and model-facing only for explicit progress intent.
- Full prompt/response transcripts were not recorded.

## Deviations

- None beyond introducing explicit local lineage metadata to avoid unrelated-game collision in profile attribution.

## Unresolved limitations

- Progress trend remains conservative and intentionally limited to simple deterministic comparisons.
- Profile export/import remains deferred.
- Strategic habit diagnosis remains deferred.

## Deferred capabilities

- strategic habit attribution
- skill/rating systems
- personalized lesson generation
- cloud sync, accounts, server profile storage
- profile export/import UX
- match-equity/cube progress metrics
