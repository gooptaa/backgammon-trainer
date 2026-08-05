# Player-First Game Shell and Automatic GNU Opponent

Date: 2026-08-05

Branch: main

Preceding milestone implementation commit: 7999a65

Preceding milestone push result: present on origin/main before this milestone

Milestone starting commit: 7ce1f46

Milestone status: partial, stopped before completion

## Goal

Transform the developer-oriented sandbox into a player-first single-player shell where normal play is always White versus an automatic Black computer opponent, while preserving engine authority, evaluator authority boundaries, Coach behavior, and development tooling.

## Closure status

1. Active branch remained `main` throughout.
2. The preceding retrieval milestone `feat: add evidence-aware knowledge retrieval` was confirmed committed and present on `origin/main`.
3. The working tree was not initially clean because of uncommitted server changes. Those were validated and committed first as `7ce1f46` (`fix(server): accept bounded coach instruction sets`) to establish a clean baseline.
4. This milestone was not completed under the requested hard gate:

- no milestone implementation commit was created
- nothing was pushed for this milestone
- the final working tree remained dirty
- the final validation matrix was not run
- required docs/worklog updates were not completed until this partial record

## Repository findings

- Opening resolution, turn progression, evaluator caching, learner-profile ingestion, lineage replacement, and primary layout all live centrally in `apps/web/src/App.tsx`.
- Opening dice were already orchestrated in web and injected into engine state through existing engine-authoritative dice assignment.
- Legal move generation, move commitment, passing, and completion already flowed through `backgammon-engine`; no second engine path was necessary.
- Ranked evaluator output already returned canonical move fingerprints sufficient for direct engine-generated move selection.
- Evaluator coverage and provenance distinctions were already modeled as complete versus partial and real versus fixture.
- Learner ownership was already explicit per lineage and intentionally separate from engine rule state.
- Current UI still prioritized sandbox and diagnostic surfaces over the main play loop.
- Imported and restored lineages needed to remain valid for exploratory or unknown-ownership use cases rather than being silently converted into player-versus-computer mode.

## Architectural decisions

1. Automatic computer turns remain application orchestration in `apps/web`, not engine behavior.
2. Engine authority remains unchanged:

- engine decides legality
- engine applies moves
- engine advances turns
- engine decides no-legal-move pass legality
- engine decides game completion

3. Automatic opponent move choice remains evaluator-driven, not model-driven.
4. Computer turns require trustworthy, non-fixture, complete evaluator coverage before a move may be auto-applied.
5. Partial, fixture, malformed, or failed evaluator output must fail closed and expose retry rather than guessing.
6. Normal player-versus-computer behavior is product metadata layered over lineage, not engine state.
7. Imported and restored games keep exploratory semantics by default rather than being retrofitted into normal mode.

## Implementation decisions

1. Added a persisted lineage-level shell mode in `apps/web/src/features/profile/lineageStorage.ts`:

- `player-vs-computer`
- `exploratory`

2. Kept backward compatibility for older lineage payloads by upgrading version 1 lineage metadata into exploratory mode.

3. Updated `New Game` in `apps/web/src/App.tsx` to:

- create a new lineage id
- set normal shell mode to `player-vs-computer`
- set learner ownership to White via existing profile metadata
- resolve the opening roll immediately
- inject opening dice into authoritative game state
- enter the opening turn directly

4. Added an app-level automatic Black-turn lifecycle in `apps/web/src/App.tsx` with public states derived from:

- rolling
- evaluating
- applying
- failed

5. Bound automatic opponent work to immutable turn and decision identity using:

- lineage id
- turn number
- opening versus normal phase
- current decision key derived from game reference, player, dice, and position

6. Reused the existing evaluator request path instead of adding a second opponent-specific evaluator client.

7. Added a retry path that invalidates current evaluation state and reruns the current computer decision without duplicating committed moves.

8. Added a bounded automatic opening reroll helper for `New Game` so exhausted or pathological deterministic random sources cannot hang tests or runtime forever.

9. Added a board-adjacent game status and actions bar in `apps/web/src/App.tsx` and `apps/web/src/App.module.css`.

10. Kept `Roll Dice` and `Pass Turn` visible in the new game bar as state-driven controls to preserve existing interaction expectations while moving gameplay controls out of the sandbox panel.

11. Removed duplicate top-level sandbox gameplay buttons from `apps/web/src/features/sandbox/EngineSandboxPanel.tsx` so the board-level bar owns the primary play actions.

12. Added small bounded Coach quick prompts in `apps/web/src/features/coach/CoachPanel.tsx` routed through the existing Coach pipeline.

13. Increased Coach conversation space and kept the composer closer to the bottom of the panel via `apps/web/src/features/coach/CoachPanel.module.css`.

## Product capability delivered

### Complete

1. `New Game` now resolves opening automatically instead of returning to a waiting opening state.
2. Normal new games assign learner ownership to White automatically.
3. Normal Black turns are orchestrated automatically after a committed White turn.
4. Black opening turns are orchestrated automatically when Black wins the opening roll.
5. Computer move selection does not use the language model.
6. Computer turns fail closed on incomplete or untrustworthy evaluator evidence and expose `Retry Computer Move`.
7. A compact board-adjacent game bar now surfaces:

- You · White
- Computer · Black
- active turn
- opening summary
- current turn dice
- main action buttons

8. Coach panel gained quick prompts and substantially more vertical space.

### Partial

1. The interface is more player-first than before, but diagnostics still occupy too much main-page space below the board.
2. Header diagnostics are less dominant, but provider and evaluator status are not fully reorganized into clearly secondary product surfaces.
3. The desktop flow is improved, but the full no-scroll-at-1440x900 acceptance target was not formally verified.
4. Development controls remain available and more secondary than before, but the entire diagnostics suite was not comprehensively restructured.

### Not completed

1. Final productized pass UX for White no-legal-move states.
2. Final player-facing placement and refinement of `Hint` and `Show Best Move`.
3. Full responsive pass across narrow viewports.
4. Final accessibility audit for announcements, duplicate state presentation, and keyboard flow.

## Player and computer ownership

### Complete

1. Normal new games set learner ownership to White.
2. Computer control is modeled as Black in normal shell mode.
3. Ownership remains product metadata rather than engine rule state.

### Partial

1. Existing imported and restored ownership semantics were preserved by keeping imported games exploratory by default.
2. I did not complete the full regression audit to prove that all prior imported and unknown-ownership scenarios still behave identically across all review/profile features.

## Opening-roll orchestration

### Complete

1. `New Game` creates a new lineage.
2. Opening dice are resolved immediately.
3. Opening dice are preserved for the opening winner.
4. No second opening roll is generated for the winner.
5. White-opening states hand control to the player.
6. Black-opening states enter automatic Black orchestration.

### Partial

1. Runtime behavior works for deterministic test coverage and the browser shell.
2. Full manual gameplay verification of both opening-winner branches was not completed under the final checklist.

## Computer-turn lifecycle

### Complete

1. Added explicit application-level computer-turn states.
2. Added stale-result protections keyed to current immutable turn and decision identity.
3. Added retry behavior for failed computer decisions.
4. Added targeted tests for:

- Black opening auto-turn
- one Black reply after a committed White turn
- stale-evaluator invalidation through `New Game`

### Partial

1. The automatic turn flow is stable in targeted tests and current web package tests.
2. I did not complete the entire prompt-required lifecycle matrix for import, restore, no-legal-move Black turns, game-completion stop conditions, and retry idempotence under every failure class.

## Evaluator selection policy

### Complete in code

1. Automatic Black moves require:

- current decision identity match
- evaluator success
- `evaluated` ranked output
- complete coverage
- non-fixture provenance
- a ranked move that maps back to an engine legal move

2. Partial coverage does not silently auto-play.
3. Fixture provenance does not silently auto-play.
4. Failure or invalid output does not silently auto-play.

### Pending in full milestone terms

1. In live local browser verification, the real GNU route returned partial coverage for the opening Black decision, so the computer correctly failed closed rather than moving.
2. Because of that, the milestone acceptance criterion "Black selects the evaluator-best canonical legal move using trustworthy GNU evidence" is only partially satisfied:

- code path exists
- targeted tests exist
- live GNU path did not yet meet complete-coverage conditions

## Failure and retry behavior

### Complete

1. Added visible failure state for computer turns.
2. Added `Retry Computer Move` action.
3. Added state invalidation and evaluation rerun on retry.
4. Preserved fail-closed posture.

### Partial

1. Browser verification showed the failure path on real partial GNU coverage.
2. I did not complete the entire scripted validation matrix for malformed output, timeout, provider-unavailable, and import-or-reset races.

## Pass behavior

### Complete

1. Engine-authoritative pass behavior remains intact.
2. Voluntary pass is still disabled when legal moves exist.
3. Pass control is no longer the dominant sandbox-owned primary action.

### Partial

1. `Pass Turn` remains visible in the new game bar for compatibility and clarity, but state-driven disabling prevents voluntary pass when legal moves exist.
2. I did not finish the final intended product behavior for explicit White no-legal-move wording versus fully automatic pass.

## Stale-result protections

### Complete

1. Evaluator results are associated with the current decision key.
2. Automatic opponent application ignores stale or mismatched results.
3. `New Game` and import clear evaluation state.

### Partial

1. `New Game` invalidation was covered in App tests.
2. Import and restore invalidation were not fully expanded into a complete matrix of new automatic-opponent scenarios.

## Learner-profile behavior

### Complete

1. Normal new games assign learner ownership to White.
2. Ownership remains in the profile/lineage layer rather than engine state.

### Pending

1. I did not complete the final explicit regression proof that automatic Black moves never enter learner observations under all runtime combinations.
2. I did not run the full cross-package progress/pattern/profile matrix after these changes.

## Layout and information hierarchy

### Complete

1. Header is more compact and less dominated by environment status.
2. Board-level game bar now exposes the core play loop nearer the board.
3. Coach column is taller and visually more useful.
4. Sidebar uses sticky desktop behavior to keep Coach near the top.

### Partial

1. Diagnostics still dominate too much of the board flow below the board.
2. `Remaining candidates`, `Legal Move Outcomes`, `Analysis Session`, and sandbox content still need stronger product/development separation.
3. The final intended desktop composition from the prompt is not yet fully achieved.

## Coach-panel changes

### Complete

1. Added quick prompts:

- `What should I do?`
- `Review my last move`
- `How am I doing?` when context supports it

2. Quick prompts submit through the existing Coach submission path.
3. Coach message history area is taller.
4. Composer remains more accessible near the bottom of the panel.

### Partial

1. Evidence disclosure remains functional, but I did not redesign its information density.
2. I did not fully verify all prompt-availability gating conditions in manual browser checks.

## Development-tool organization

### Complete

1. Core gameplay buttons moved out of the sandbox panel.
2. Learner profile, development controls, export, and import remain available in secondary surfaces.

### Partial

1. The secondary surfaces were not fully collapsed or reprioritized into the exact grouped structure described in the milestone prompt.

## Responsive and accessibility behavior

### Partial

1. Existing focus styles and explicit text status remain intact.
2. Turn and computer state are communicated in text, not only color.
3. I did not complete a formal responsive or accessibility pass across viewport sizes and keyboard-only flows.

## Public API and dependency impact

### Complete

1. No new package dependency edges were introduced.
2. No browser import of GNU Node-only code was introduced.
3. Shell-mode persistence extended local lineage metadata only.

### Pending

1. I did not perform a final public API or architecture report after all edits.

## Tests and validation completed

### Baseline before implementation

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg test`
- `CI=1 pnpm --filter @backgammon-trainer/server test`
- `CI=1 pnpm --filter @backgammon-trainer/web test`

### Focused development validation

- repeated focused runs of `CI=1 pnpm --filter @backgammon-trainer/web test -- src/App.test.tsx`
- targeted tests for automatic Black opening and one Black reply after White move
- `pnpm --filter @backgammon-trainer/web build`
- `CI=1 pnpm --filter @backgammon-trainer/server test`

### Current validated state at stop point

- `CI=1 pnpm --filter @backgammon-trainer/web test`
- `pnpm --filter @backgammon-trainer/web build`
- `CI=1 pnpm --filter @backgammon-trainer/server test`

### Browser verification completed

1. Reloaded the live app.
2. Confirmed the compact header and board-adjacent game bar rendered.
3. Confirmed Coach quick prompt rendered.
4. Confirmed normal shell entered Black opening state after `New Game`.
5. Observed live GNU partial coverage causing the computer to fail closed with retry rather than guessing.

## Validation not completed

1. Full final package matrix:

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test`
- `CI=1 pnpm --filter @backgammon-trainer/ai-contracts test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-knowledge test`
- `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg test` after final edits

2. End-of-milestone repo checks:

- `pnpm config:check`
- `CI=1 pnpm check`
- `CI=1 pnpm test`
- `git diff --check`

3. Full bounded real local gameplay verification checklist from the milestone prompt.
4. Final clean-tree, commit, and push verification.
5. Final sensitivity audit for tracked content after milestone completion.

## Deviations

1. Stopped before milestone completion at the user's direction.
2. Wrote a partial-state worklog rather than a full successful milestone-close worklog.
3. No commit or push was performed for the milestone changes.
4. No documentation updates beyond this partial worklog were made.

## Remaining limitations

1. Live GNU coverage for automatic opponent play was partial in browser verification, so the strongest real-opponent acceptance path was not achieved end to end.
2. Diagnostics and study panels still occupy too much main-page space for the fully player-first target.
3. Pass behavior and hint/best-move UI were not fully finalized for the normal player-facing flow.
4. Responsive and accessibility acceptance work remains incomplete.
5. Learner-profile exclusion of automatic Black moves was not fully revalidated through the entire final matrix.

## Deferred capabilities

Still deferred exactly as out of scope in the prompt:

- multiple difficulty levels
- random top-five move selection
- loss-threshold difficulty
- cube decisions
- match play
- doubling
- resignations
- opening-book optimization
- multiplayer
- drag-and-drop
- animation
- voice
- streaming
- cloud synchronization
- semantic retrieval
- additional providers

## Acceptance checklist

### Closure and git hygiene

- Active branch `main`: complete
- Retrieval integration committed: complete
- Retrieval integration present on `origin/main`: complete
- Final working tree clean: failed
- Milestone committed: failed
- Milestone pushed: failed
- Final git status checked: complete
- Repository safe to proceed under hard gate: failed

### Gameplay orchestration

- Player always White in normal flow: complete
- Computer always Black in normal flow: complete
- `New Game` performs opening roll: complete
- Opening winner uses opening dice: complete
- White opening waits for player: complete
- Black opening auto-turn: complete
- White commit triggers one Black turn: complete
- Engine remains sole move/passing/completion authority: complete
- Language model absent from opponent move selection: complete
- Black applies real GNU best move under complete trustworthy coverage: partial
- No-legal-move behavior productized: partial

### Evaluator and failure policy

- Uses provider-neutral evaluator path: complete
- Requires trustworthy non-fixture evidence: complete
- Requires complete coverage: complete
- Rejects stale responses: complete
- Fails closed on partial or malformed output: complete
- Retry path exposed: complete
- Does not silently switch to mock: complete

### UI and layout

- Compact header: complete
- Game status/action bar near board: complete
- Coach easier to read/use: partial
- Development controls no longer primary: partial
- Desktop no-scroll player-first target: pending
- Responsive behavior: pending
- Accessibility pass: pending

### Profile and coaching lifecycle

- Learner ownership White for normal new games: complete
- Ownership remains metadata: complete
- Current-position coaching remains intact: complete
- Quick prompts use existing coach pipeline: complete
- Computer turns do not invoke the language model: complete
- Black moves excluded from learner profile ingestion: pending final proof

### Validation and documentation

- Focused tests during implementation: complete
- Current web package tests pass: complete
- Current web build passes: complete
- Current server tests pass: complete
- Full final matrix: pending
- Full docs updates: failed
- Required worklog entry: complete as partial status record

## Suggested next steps

1. Investigate why live GNU evaluation is returning partial coverage for opening Black decisions and determine whether evaluator settings, adapter behavior, or route expectations need to change to satisfy the intended automatic-opponent acceptance path.
2. Finish the player-first layout by collapsing or moving diagnostic-heavy panels into clearer secondary and development-only surfaces.
3. Finalize pass behavior and player-facing placement for hint and best-move controls.
4. Run the remaining package/repo validation matrix.
5. Update top-level and architecture documentation.
6. Stage narrowly, review the staged diff, commit with the milestone message, push to `main`, and verify a clean tree.
