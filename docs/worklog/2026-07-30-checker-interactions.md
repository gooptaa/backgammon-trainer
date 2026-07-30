# Checker Interactions

Date: 2026-07-30

Branch: main

Starting commit: 70593152102434a6a0c7f7e35e77d997c4a3c6ec

Ending commit: e3f7fe0806217445cdedad65cc93dacfbd17c3df

## Goal

Add checker selection and destination selection as presentation-only interaction state, including a non-applied proposed move summary.

## Files changed

- apps/web/src/features/board/BackgammonBoard.tsx
- apps/web/src/features/board/Point.tsx
- apps/web/src/features/board/checkerSelection.ts
- apps/web/src/features/board/BackgammonBoard.module.css
- apps/web/src/features/board/BackgammonBoard.test.tsx
- apps/web/src/features/board/CheckerStack.tsx

## Architectural decisions

- Kept all interaction state local to the board feature.
- Kept domain package untouched; no move legality or move application was added.
- Represented proposal state as origin checker selection plus canonical destination point index.
- Used canonical point indexes for proposal output in both board orientations.
- Enabled one destination target per point only when an origin checker is selected.

## Important interaction behavior

- User can select an exposed checker to establish origin.
- While an origin is selected, any point can be selected as destination (no legality filtering).
- Destination selection creates or replaces a proposed move.
- Selecting a different checker clears any prior destination.
- Clicking the selected checker again clears selection and proposal.
- Escape clears selection and proposal.
- Cancel Selection clears selection and proposal.
- Clear Destination clears only destination and keeps origin selected.
- Board position data is not mutated during selection/proposal interactions.

## Accessibility additions

- Exposed checkers use keyboard-selectable SVG button semantics and accessible labels.
- Destination points become keyboard-selectable only after origin selection.
- Destination labels distinguish available vs selected destination point.
- Proposal/status text is announced with polite live-region behavior.

## Tests added

Updated board tests in apps/web/src/features/board/BackgammonBoard.test.tsx to cover:

- destination controls inactive before checker selection
- destination targets visible after checker selection
- proposal creation for empty and occupied destinations
- canonical origin and destination index reporting
- destination replacement
- Clear Destination behavior
- checker replacement clearing prior destination
- selected-checker toggle clearing interaction
- Escape and Cancel Selection clearing interaction
- proposal callback transitions
- no position mutation during destination selection
- canonical index behavior under flipped orientation
- static rendering validity with no callbacks

## Validation performed

- Targeted board tests passed for destination and geometry flows.
- Full repository validation passed via pnpm check (format, lint, typecheck, tests, build).
- Diff hygiene check passed via git diff --check.

## Deviations from plan

- None within the intended milestone scope.

## Follow-up suggestions

- Introduce legal destination filtering once rules logic is wired (separate milestone).
- Add visual distinction for legal vs recommended targets in a later milestone.
- Add submit/apply move workflow after legality and move application are implemented.

## Open questions

- Whether future move-application milestone should keep the same callback shape or introduce controlled board interaction props.

## Notes for future contributors

- Keep proposal and selection as presentation state until rules and move application milestones explicitly expand scope.
- Preserve canonical point-index semantics in all user-facing move summaries.
