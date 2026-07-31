# Architectural Invariants and Repository Guardrails

Timestamp: 2026-07-31-1105

Previous worklog: docs/worklog/2026-07-31-0953-web-analysis-capture.md

Goal:

Strengthen repository-level architectural documentation and automated guardrails so package boundaries, runtime separation, and persistence responsibilities are harder to violate accidentally.

## ADRs added

New ADR directory and records:

- `docs/adr/0001-engine-authority.md`
- `docs/adr/0002-analysis-is-factual.md`
- `docs/adr/0003-analysis-session-boundary.md`
- `docs/adr/0004-evaluator-contract.md`
- `docs/adr/0005-browser-node-separation.md`
- `docs/adr/0006-snapshot-vs-analysis.md`

These ADRs document architecture as implemented and do not rewrite historical decisions.

## Dependency constraints

Automated dependency guardrails were added with lightweight existing tooling plus a small script:

- root script: `pnpm architecture:check`
- implementation: `scripts/validate-architecture.mjs`
- included in `pnpm check`

Blocked edges enforced:

- Engine <- Analysis Session
- Engine <- Web
- Analysis <- Web
- Analysis <- Analysis Session
- Browser <- GNU Adapter

Browser Node API restrictions are enforced in ESLint for `apps/web/src` imports (`node:*` restricted).

## Documentation improvements

- Added docs index: `docs/README.md`
- Added architecture guardrail guide: `docs/architecture/dependency-guardrails.md`
- Added public API audit: `docs/architecture/public-api-audit.md`
- Added technical debt inventory: `docs/roadmap/technical-debt.md`
- Updated architecture overview with current dependency direction and flow/persistence diagrams.
- Updated root README documentation map.

## Validation tooling

- Added workspace dependency and cycle checks in `scripts/validate-architecture.mjs`.
- Added ESLint import restrictions in `eslint.config.mjs` for package/runtime boundaries.
- Wired architecture validation into root `check` script.

## Package API audit

Audit file:

- `docs/architecture/public-api-audit.md`

Outcome:

- explicit package `exports` maps already constrain public API surfaces
- no unintended exports found
- no public-export removals/additions were needed in this milestone

## Package responsibility documentation

README standardization completed for all packages under `packages/*`.

Updated:

- `packages/backgammon-analysis/README.md`
- `packages/backgammon-analysis-session/README.md`
- `packages/backgammon-domain/README.md`
- `packages/backgammon-evaluator-gnubg/README.md`

Added:

- `packages/backgammon-engine/README.md`
- `packages/ai-contracts/README.md`
- `packages/shared/README.md`

Each now includes: Purpose, Responsibilities, Allowed dependencies, Forbidden dependencies, Public API, Non-goals, Future roadmap.

## Technical debt inventory

Created:

- `docs/roadmap/technical-debt.md`

Repository marker scan (`TODO|FIXME|HACK|XXX`) found no actionable architecture markers in source/docs.

## Worklog quality audit

Reviewed evaluator-milestone-forward worklogs:

- `2026-07-30-1948-evaluator-contract.md`
- `2026-07-31-0714-gnubg-adapter.md`
- `2026-07-31-0838-analysis-session.md`
- `2026-07-31-0927-analysis-session-builder.md`
- `2026-07-31-0953-web-analysis-capture.md`

No historical decision rewrites were made. Existing terminology and package naming were retained; this milestone focuses on forward guardrails and indexing.

## Repository cleanup and health

- Added missing package README coverage.
- Added a single documentation index entry-point.
- Added architecture guardrail docs to reduce drift.
- No persistence schema or gameplay logic changes were made.

## Engine impact

- No engine API or rule behavior changes.

## Analysis impact

- No analysis behavior or contract changes.

## Web impact

- No user-visible web features or UI redesign.
- Added lint-level import/runtime guardrails affecting future contributor changes.

## GNU impact

- No GNU adapter behavior changes.
- Browser import prohibition for GNU package is now enforced by lint rules.

## Validation

Commands executed:

- `CI=1 pnpm check`
- `CI=1 pnpm test`
- `git diff --check`
- `git status`

## Remaining risks

- ESLint import restrictions are path-based and rely on static import analysis.
- Architecture script enforces direct package dependencies and cycles, not dynamic runtime loading paths.
- Historical worklog terminology consistency remains partly manual without automated markdown-style policy checks.
