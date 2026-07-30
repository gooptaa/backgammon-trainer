# Blocked Point Rule

Timestamp: 2026-07-30-1405

Previous worklog: docs/worklog/2026-07-30-1402-dice-aware-move-generation.md

Goal:

Enforce blocked-point filtering for ordinary point-to-point move generation while preserving current unsupported behavior for single-opponent destinations.

Files changed:

- packages/backgammon-engine/src/index.ts
- packages/backgammon-engine/test/fixtures/boardFixtures.ts
- packages/backgammon-engine/test/engine.test.ts
- docs/worklog/2026-07-30-1405-blocked-point-rule.md

Architectural decisions:

- Added isolated helper functions to classify blocked and single-opponent destination occupancies.
- Kept move generation open-point behavior unchanged and continued to omit hit logic.
- Applied destination filtering inside existing simple generation flow to minimize API and control-flow changes.

Tests added:

- Legal move to an empty destination.
- Blocked destination excluded.
- Multiple blocked destinations excluded.
- Single opposing checker destination excluded as unsupported.
- Existing dice-aware behavior retained.

Validation performed:

- pnpm check
- git diff --check
- git status

Deviations from plan:

- None.

Follow-up suggestions:

- Add hit generation for single-opponent destinations.
- Add bar-entry generation with blocked-point checks on entry points.
- Add bearing-off and turn-sequencing milestones separately.

Open questions:

- Should future hit support keep using per-die independent candidates before full turn assembly?

Notes for future contributors:

- Keep blocked-point detection helper separate from hit behavior to avoid coupling milestones.
- Preserve dice-aware step dieIndex mapping when extending legality logic.
