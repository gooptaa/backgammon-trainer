# Player-First UI Completion

Timestamp: 2026-08-05-1455 -0400

Previous worklogs:

- docs/worklog/2026-08-05-1958-player-first-game-shell.md
- docs/worklog/2026-08-05-2205-automatic-gnu-opponent-recovery.md

## Starting state

- Branch: main
- Starting HEAD: 51507a8168f46eb7222a08cb49c26d84434e6764
- Recovery implementation commit: 51507a8168f46eb7222a08cb49c26d84434e6764
- Recovery push status: commit already present on origin/main at session start
- Inherited dirty UI files at session start:
  - apps/web/src/App.module.css
  - apps/web/src/features/coach/CoachPanel.module.css
  - apps/web/src/features/coach/CoachPanel.tsx
  - apps/web/src/features/sandbox/EngineSandboxPanel.tsx
- Safety snapshot created before edits:
  - /tmp/backgammon-trainer-session2/player-first-ui-before-session-2.patch

## Recovery foundation verification

Verified before extending UI work:

- Current branch and HEAD matched origin/main.
- The automatic GNU opponent recovery commit was already committed and pushed.
- No core recovery files remained dirty.

## UI findings before completion

- The board-adjacent game bar existed but still surfaced pass as an ordinary always-visible action.
- Move analysis and diagnostics were still too prominent in the board column.
- Primary control ownership was partly moved out of sandbox, but surface organization needed final tightening.
- Coach quick prompts and larger conversation area were present but needed final integration with default-collapsed development surfaces.

## Header changes

- Preserved compact product identity header.
- Kept concise operational status in the header badge.
- Kept detailed diagnostics in secondary/disclosure surfaces.

## Game bar changes

- Kept board-adjacent ownership of primary gameplay actions.
- Preserved turn text, opening status, turn dice text, computer state text, retry state, and New Game.
- Added explicit game-bar test ids for opening phase/resolution and turn dice labels.

## Pass UX decision

Decision: explicit conditional pass button.

- White pass is now shown only when there are no legal moves.
- Label: No legal moves - Pass.
- When legal moves exist, pass action is not available.
- Black forced passes remain automatic in the computer-turn lifecycle.
- No voluntary pass was added.

## Hint and Show Best Move placement

- Kept Hint and Show Best Move as compact secondary actions near the board.
- Added evaluator gating:
  - enabled only when non-fixture complete evaluated ranking exists for current decision
  - disabled otherwise
- Hint shows a non-committing textual suggestion.
- Show Best Move enters move preview mode and does not commit a move.

## Coach layout and behavior

- Kept Coach near the top of the right column on desktop.
- Preserved larger message history and quick prompts.
- Preserved accessible composer label and existing pending/failure/evidence/provenance rendering.
- Added small responsive adjustment so sticky composer behavior relaxes on narrower widths.

## Development-tool organization

- Reorganized secondary surfaces:
  - Turn History remains player-facing and visible.
  - Move Analysis grouped under an open secondary disclosure.
  - Development Tools grouped under a collapsed disclosure by default.
- Kept sandbox capabilities and diagnostics, but removed duplicate primary gameplay controls from sandbox.

## Responsive behavior

Checked representative widths via browser automation:

- 1440: board remains visually dominant; coach composer reachable in viewport; development tools collapsed by default.
- 1024, 768, 390: single-column flow keeps board above coach and diagnostics; no control overlap observed; development tools remain collapsed by default.

## Accessibility behavior

Focused accessibility pass:

- Primary actions remain semantic buttons.
- Turn/computer/failure/pass states remain text-visible (not color-only).
- Disclosures remain keyboard-triggerable HTML details/summary controls.
- Coach quick prompts are buttons and keyboard reachable.
- Coach composer keeps explicit label Ask the coach.
- Focus-visible styling remains present for buttons/links.

## Manual acceptance

Bounded local acceptance completed with browser and test verification:

1. New Game starts a normal player-first shell and sets learner ownership to White.
2. Opening resolves automatically.
3. Automatic Black opening/reply orchestration remains active.
4. White move commit still triggers exactly one automatic Black response.
5. Black failure state exposes Retry Computer Move.
6. White pass is not available when legal moves exist; pass appears only when no legal moves exist.
7. Hint and Show Best Move are visible secondary actions and evaluator-gated.
8. Development tools are available and default collapsed.
9. Coach quick prompts route through existing coach pipeline.
10. No language-model selection/apply path was introduced for computer turns.

## Tests and validation

Focused checks during implementation:

- pnpm --filter @backgammon-trainer/web test
- pnpm --filter @backgammon-trainer/web build

Recovery-package coverage checks:

- pnpm --filter @backgammon-trainer/backgammon-analysis test
- pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg test

Repository gate:

- pnpm config:check
- pnpm check
- pnpm test
- git diff --check

Additional fix applied during gate:

- packages/backgammon-evaluator-gnubg/test/evaluator.test.ts
  - adjusted captured-request test typing to satisfy package typecheck under full gate

Safety checks:

- .env.local remains ignored and untracked.
- No secrets, GNU transcripts, private learner profile data, or model responses were staged intentionally.

## Files changed in this session

- apps/web/src/App.tsx
- apps/web/src/App.module.css
- apps/web/src/App.test.tsx
- apps/web/src/features/coach/CoachPanel.tsx
- apps/web/src/features/coach/CoachPanel.module.css
- apps/web/src/features/coach/CoachPanel.test.tsx
- apps/web/src/features/sandbox/EngineSandboxPanel.tsx
- docs/worklog/2026-08-05-1455-player-first-ui-completion.md
- docs/worklog/2026-08-05-1958-player-first-game-shell.md (format normalization required by repository format gate)
- packages/backgammon-analysis/test/evaluator.test.ts (format normalization required by repository format gate)
- packages/backgammon-evaluator-gnubg/test/evaluator.test.ts (typecheck-safe test capture typing plus formatting compatibility)

## Deviations

- Included minimal non-UI formatting normalization for two pre-existing tracked files because repository format gate failed otherwise.
- Included a minimal evaluator test typing correction required to pass repository-wide typecheck during pnpm check.

## Remaining limitations

- App-level effects in apps/web/src/App.tsx still report two existing react-hooks/exhaustive-deps warnings (warnings only; gate passes).
