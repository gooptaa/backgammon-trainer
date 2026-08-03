# Dependency Guardrails

This repository enforces architectural boundaries with lightweight checks in existing tooling.

## Automated checks

1. Root architecture validator script

- Command: `pnpm architecture:check`
- File: `scripts/validate-architecture.mjs`
- Enforces forbidden workspace dependency edges.
- Detects workspace dependency cycles.

2. ESLint import restrictions

- File: `eslint.config.mjs`
- Enforces package import boundaries and browser runtime restrictions.
- Runs through existing lint pipelines.

## Forbidden edges

- `@backgammon-trainer/backgammon-engine` must not depend on `@backgammon-trainer/backgammon-analysis-session`.
- `@backgammon-trainer/backgammon-engine` must not depend on `@backgammon-trainer/web`.
- `@backgammon-trainer/backgammon-analysis` must not depend on `@backgammon-trainer/web`.
- `@backgammon-trainer/backgammon-analysis` must not depend on `@backgammon-trainer/backgammon-analysis-session`.
- `@backgammon-trainer/backgammon-engine` must not depend on `@backgammon-trainer/backgammon-coach`.
- `@backgammon-trainer/backgammon-analysis` must not depend on `@backgammon-trainer/backgammon-coach`.
- `@backgammon-trainer/backgammon-analysis-session` must not depend on `@backgammon-trainer/backgammon-coach`.
- `@backgammon-trainer/backgammon-engine` must not depend on `@backgammon-trainer/backgammon-knowledge`.
- `@backgammon-trainer/backgammon-analysis` must not depend on `@backgammon-trainer/backgammon-knowledge`.
- `@backgammon-trainer/backgammon-analysis-session` must not depend on `@backgammon-trainer/backgammon-knowledge`.
- `@backgammon-trainer/ai-contracts` must not depend on any backgammon domain package.
- `@backgammon-trainer/backgammon-knowledge` must not depend on `@backgammon-trainer/backgammon-coach`.
- `@backgammon-trainer/backgammon-knowledge` must not depend on `@backgammon-trainer/web`.
- `@backgammon-trainer/web` must not depend on `@backgammon-trainer/backgammon-evaluator-gnubg`.

## Runtime boundary checks

- Browser source (`apps/web/src`) must not import `node:*` modules.
- Browser source must not import GNU adapter root/node/testing subpaths.
- Browser source must not import Node-only knowledge authoring helpers.
- Browser source must not read server-private env values; browser configuration is limited to `VITE_*` variables.
- Real model-provider credentials and protocol execution remain in server runtime code.
- Browser requests do not select arbitrary upstream provider destinations.
- Browser evaluator requests use server routes; browser code does not import GNU adapter or Node process code.

## Local environment file convention

- Repository-root `.env.local` is the canonical local convenience file.
- `.env.example` remains committed as the supported variable inventory.
- `.env.local` and local variants remain Git-ignored.
- Local env files are convenience only; CI and production continue to use process/platform environment.

## Validation workflow

`pnpm check` now includes architecture validation and curated knowledge validation before lint/typecheck/test/build.

When adding new packages or runtime boundaries:

1. Update `scripts/validate-architecture.mjs` forbidden edges if needed.
2. Update `eslint.config.mjs` restricted imports for source-level enforcement.
3. Document the change in an ADR.
