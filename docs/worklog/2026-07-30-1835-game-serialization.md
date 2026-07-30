# Versioned Game Serialization and Local Restore

Timestamp: 2026-07-30-1835

Previous worklog: docs/worklog/2026-07-30-1801-turn-history.md

Goal:

Add a stable, versioned durable game snapshot format and local restore flow, including export/import UI, runtime validation, trusted reconstruction, and browser local-save integration without changing engine legality semantics.

Files changed:

- apps/web/src/App.tsx
- apps/web/src/App.test.tsx
- apps/web/src/features/sandbox/EngineSandboxPanel.tsx
- apps/web/src/features/sandbox/EngineSandboxPanel.module.css
- apps/web/src/features/sandbox/gameStorage.ts
- docs/architecture/overview.md
- docs/engine-api.md
- docs/worklog/2026-07-30-1835-game-serialization.md
- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/engine.test.ts

Canonical durable snapshot shape:

- Added versioned envelope constants:
  - `GAME_SNAPSHOT_FORMAT = "backgammon-trainer-game"`
  - `GAME_SNAPSHOT_VERSION = 1`
- Added snapshot types:
  - `GameSnapshot`
  - `SnapshotOpeningState`
  - `SerializedGameStateV1`
  - `SerializedTurnRecordV1`
  - `SerializedOpeningStateV1`
  - `SerializedGameSnapshotV1`
- Envelope fields:
  - `format`
  - `version`
  - `savedAt`
  - `gameState`
  - `turnHistory`
  - `openingState`

Format identifier and schema version:

- Format identifier is strict and app-owned: `backgammon-trainer-game`.
- Version is strict integer `1`.
- Unknown format is rejected.
- Missing version is rejected.
- Unsupported versions are rejected.
- Version-specific parsing is isolated in `parseSerializedGameSnapshotV1(...)`.

Type and parser placement:

- Snapshot contracts and runtime parse/serialize logic were added to `packages/backgammon-engine/src/index.ts`.
- Rationale:
  - snapshot payload is game-domain data tied to engine `GameState`, `Move`, `TurnRecord`, and `GameStatus`
  - parsing/validation is host-agnostic and reusable in browser/server/worker/native hosts
  - browser APIs (`localStorage`) remain outside engine

Serialization API:

- Added reusable engine APIs:
  - `serializeGameSnapshot(snapshot)`
  - `encodeGameSnapshot(snapshot)`
  - `parseGameSnapshot(input)`
  - `decodeGameSnapshot(text)`
- Added parse-result contract:
  - `ParseGameSnapshotResult`
  - failure reasons:
    - `invalid-json`
    - `wrong-format`
    - `unsupported-version`
    - `invalid-structure`
    - `invalid-domain-state`

Runtime validation performed:

- Envelope:
  - format id
  - integer version
  - timestamp parseability
  - top-level object fields
- Domain values:
  - players (`white|black`)
  - dice shape and range
  - board positions via `validateBoardPosition(...)`
  - move step kinds and coordinate semantics
  - die indices (`0..3`)
  - hit metadata shape and compatibility with `hitsBlot`
  - turn-record sequence numbering (contiguous from 1)
  - turn `phase` and outcome shape
  - game-status consistency with `positionAfter`
- Opening coherence:
  - waiting/tied/resolved phase constraints
  - tie requires equal dice
  - resolved requires unequal dice and higher-die starter
  - opening-pending coherence with current dice/state/history
- Session coherence:
  - final history `positionAfter` must match current committed position
  - at most one opening-phase record
  - completed games cannot restore with active dice/opening pending

Domain reconstruction strategy:

- Parsed input is never trusted directly.
- Reconstruction creates fresh domain values:
  - board positions are rebuilt field-by-field
  - dice and moves are rebuilt from validated primitives
  - history records are reconstructed with `createTurnRecord(...)`
  - snapshot output from parse is cloned again before return
- No formatted strings are used as authoritative move/state data.

Immutability guarantee clarified:

- Precise guarantee is structural cloning plus non-mutating API conventions.
- Runtime deep freezing is not used.
- Documentation now avoids implying `Object.freeze(...)` semantics.

Transient state explicitly excluded from persistence:

- selected source
- staged prefix steps
- staged projected position
- hover destination
- breadcrumbs and candidate summaries
- history inspection selection
- manual dice form state
- transient UI messages

Browser storage adapter:

- Added `apps/web/src/features/sandbox/gameStorage.ts` with:
  - `GameStorage` interface
  - `createLocalGameStorage(...)`
  - `DEFAULT_GAME_STORAGE_KEY = "backgammon-trainer.game-snapshot.v1"`
- Adapter is injected through `App` props for testability.

Local-save key and save triggers:

- Key: `backgammon-trainer.game-snapshot.v1`.
- Save writes occur on durable state transitions only (not staged/hover-only changes).
- Covered transitions include:
  - opening roll tie/resolution
  - successful committed move
  - successful pass
  - New Game
  - successful import
- Initial render intentionally skips immediate write to avoid overwriting malformed stored data before user action.

Initial restore behavior:

- On app startup, storage is loaded and decoded.
- Valid snapshot restores committed state/history/opening state atomically.
- Invalid restore falls back to safe fresh state with concise message.
- Invalid stored text is not auto-cleared by startup restore.

Invalid-save recovery behavior:

- Storage read/write/clear failures are caught.
- Failures produce concise UI messages and do not crash gameplay.

Import/export UX:

- Added compact controls under sandbox panel:
  - `Export Game` details section
  - read-only exported JSON textarea
  - format/version label
  - `Copy Snapshot` button (clipboard capability gated)
  - `Import Game` textarea and `Validate and Import` action
  - `Clear Saved Game` action
- Export uses durable snapshot only.
- Import validates first, then applies atomically only on success.

Destructive-import confirmation behavior:

- If the current session has progress, import prompts for explicit confirmation before replacement.

Opening-state restoration:

- Supports and validates:
  - waiting state
  - tied state (`Roll Again` flow)
  - resolved opening-turn-pending state
  - post-opening normal flow

Completed-game restoration:

- Completed state remains restored as completed.
- Interaction constraints continue via existing completion checks.
- History inspection and New Game remain available.

New Game persistence behavior:

- New Game continues to clear committed + transient gameplay/session state.
- Updated empty-session snapshot is persisted on subsequent durable-state change cycle.

Engine API impact:

- Added public versioned snapshot contracts and encode/decode/parse/serialize APIs.
- Existing move generation/application/preview legality APIs unchanged.

Move-legality impact:

- None.
- `getLegalMoves(...)`, `applyMove(...)`, `applyGameMove(...)`, `previewMovePrefix(...)`, and `passTurn(...)` legality semantics are unchanged.

Tests added/updated:

- Engine (`packages/backgammon-engine/test/engine.test.ts`):
  - format/version presence
  - valid round-trip of committed state/history
  - pass outcome round-trip
  - opening-phase record preservation
  - die-index metadata preservation
  - unknown format rejection
  - missing version rejection
  - unsupported version rejection
  - invalid JSON rejection
  - invalid player/dice rejection
  - invalid position totals/negative count rejection
  - invalid move-step kind/die-index rejection
  - non-contiguous turn-number rejection
  - history/current mismatch rejection
  - invalid opening tie/resolved-starter rejection
  - reference detachment from parsed input
- Web (`apps/web/src/App.test.tsx`):
  - fresh start with no saved snapshot
  - valid restore on initialization
  - tied opening restore with Roll Again
  - invalid stored JSON fallback without crash
  - save-trigger behavior for durable transitions and staged non-trigger
  - export format/version presence and transient-state exclusion
  - valid import atomic replacement + invalid import preservation
  - clear-saved-game behavior without in-memory mutation

Validation performed:

- CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test
- CI=1 pnpm --filter @backgammon-trainer/web test
- CI=1 pnpm --filter @backgammon-trainer/web build
- CI=1 pnpm check
- git diff --check
- git status

Deviations from plan:

- Save writes intentionally skip initial mount to preserve malformed stored snapshots until user-driven replacement/clear.
- Import/export controls were integrated into existing sandbox panel details blocks rather than a separate dialog system.
