# Local Environment Loading and Live Integration

Timestamp: 2026-08-03-1603

Previous worklog: docs/worklog/2026-08-03-1331-current-position-coaching.md

Goal:

Establish a safe, predictable local configuration and verification path so contributors can run web and server together, opt into a real-provider smoke check deliberately, and keep ordinary tests/builds credential-free and network-free.

## Previous milestone closure verification

Verified before implementation:

- active branch: `main`
- working tree: clean
- current commit before this milestone: `d5e1d5938a6c41e79eab1046a6bfbcfa69eff2c0`
- previous milestone implementation commit identified: `d5e1d5938a6c41e79eab1046a6bfbcfa69eff2c0`
- `origin/main` matched that commit at milestone start
- audited prior real-provider commit `f7df80589f010a58c2e09e44d604199ae023f30c` verified as ancestor of `HEAD`
- previous milestone worklog and implementation footprint checked for consistency

Full validation matrix was executed on the baseline and passed before new implementation work.

## Starting point

- active branch: `main`
- starting commit: `d5e1d5938a6c41e79eab1046a6bfbcfa69eff2c0`

Ending commit is recorded in completion report.

## Repository findings that shaped implementation

- server configuration previously read `process.env` only and had no local env-file loading.
- web already used `import.meta.env.VITE_*`, but Vite env root was implicit.
- root scripts already offered a clear integrated startup path (`pnpm dev`) and should be preserved.
- provider and evaluator status routes already provided non-secret runtime state suitable for verification flows.
- provider-neutral contracts and browser/Node separation were already in place and should not be redesigned.

## Local configuration experience delivered

Implemented a coherent local configuration boundary with:

- canonical repository-root `.env.local` local convention
- server startup loading of root `.env.local` and optional root `.env` without overriding explicit process env values
- explicit web Vite env root configuration and `VITE_*` exposure boundary
- explicit invalid-mode failures for server/provider and browser mode selections
- non-secret local server config validation command
- explicit opt-in live-provider smoke command through existing server routes

## Chosen environment-file convention

Chosen convention:

- repository root `.env.local`

Why:

- one setup path for contributors running monorepo web+server workflow
- server and web both resolve settings from same local source of truth
- preserves server-private and browser-public separation by variable naming and runtime boundaries

## Server-private and browser-public boundaries

Server-private values remain outside browser bundles:

- `MODEL_PROVIDER`
- `OPENAI_COMPAT_*`
- `EVALUATOR_PROVIDER`
- `SERVER_HOST`
- `SERVER_PORT`

Browser-public values remain intentionally `VITE_*` only:

- `VITE_COACH_MODEL_MODE`
- `VITE_API_BASE_URL`
- `VITE_ENABLE_FIXTURE_EVALUATOR`

No browser imports of server config/env parsing were introduced.

## Configuration precedence

Server precedence:

1. explicit process/shell/platform env values
2. root `.env.local`
3. root `.env`
4. in-code defaults

Browser (`VITE_*`) precedence via Vite:

1. explicit env passed to Vite process
2. root `.env.local`
3. root `.env`
4. in-app fallback behavior

## Missing and invalid configuration behavior

- invalid `MODEL_PROVIDER` now fails closed as unconfigured provider status with explicit message.
- invalid `EVALUATOR_PROVIDER` now fails closed as unconfigured evaluator status with explicit message.
- invalid `VITE_COACH_MODEL_MODE` now fails closed to browser-disabled mode with explicit message.
- `MODEL_PROVIDER=openai-compatible` without required `OPENAI_COMPAT_MODEL`/`OPENAI_COMPAT_API_KEY` reports explicit configuration issues and unconfigured runtime behavior.
- fixture and disabled modes continue to operate without provider credentials.

## Startup workflow

Contributor workflow remains short and explicit:

1. `pnpm install`
2. `cp .env.example .env.local`
3. edit `.env.local`
4. `pnpm dev`

Optional local validation:

- `pnpm config:check`

## Fixture, server, and disabled modes

- fixture mode: deterministic local output without credentials.
- server-backed real provider mode: uses existing server boundary and requires valid server-side configuration.
- disabled mode: model unavailable but UI remains usable.

No silent fallback from failed real-provider calls to fixture output was introduced.

## Evaluator configuration and limitations

Evaluator server mode remains limited to actual implemented modes:

- `none`
- `mock` (fixture evaluator)

No real GNU evaluator wiring was added.

OpenAI-compatible key configuration does not imply trustworthy non-fixture evaluator evidence.

## Test isolation

Isolation improvements and confirmations:

- new env-loading tests use temporary controlled directories and injected env objects.
- ordinary package tests remain deterministic and network-free.
- local `.env.local` convenience loading occurs in server startup entrypoint, not generic test bootstraps.
- live smoke remains outside normal test/check/build commands.

## Live smoke-test design

Added explicit opt-in command:

- `ALLOW_LIVE_PROVIDER_SMOKE=true pnpm smoke:live-provider`

Behavior:

- checks `/api/coach/status`
- sends one bounded non-streaming provider-neutral request to `/api/coach/complete`
- verifies non-empty text and provider/model provenance
- prints safe metadata only
- no key/header/full prompt/full response dump

## Live smoke-test execution result

- not performed — no local credential configured

## Secret and Git safety

- `.env.local`, `.env.*.local`, and app-level local env variants are ignored by Git.
- `.env.example` remains tracked and placeholder-only.
- status routes remain non-secret.
- smoke command avoids secret output.

## Production and CI behavior

- local env files are convenience for local/self-hosted development.
- CI/production continue to rely on process/platform environment and secret stores.
- no change made that requires local env files in CI/production.

## Provider spend-boundary warning

Documentation reiterates that hiding provider key/upstream URL server-side does not make unauthenticated public deployments safe. Real-provider mode remains intended for local, private, or externally protected deployments.

## Public API and dependency impact

- no new workspace package exports.
- no new domain package introduced.
- env loading/parsing remains app-internal (`apps/server`, `apps/web`).
- provider-neutral contracts remain unchanged.

## Server impact

- added server local env loader
- moved server config resolution to runtime function
- added configuration issue detection helpers
- invalid provider mode handling is explicit
- added `config:check` command
- added opt-in live provider smoke script

## Web impact

- added runtime config helper for `VITE_*` mode/base-url parsing
- invalid browser mode handling is explicit
- explicit Vite `envDir` and `envPrefix` configuration

## Tests added/updated

Added:

- `apps/server/test/localEnv.test.ts`
- `apps/server/test/config.test.ts`
- `apps/web/src/runtimeConfig.test.ts`

Updated indirectly by behavior integration:

- existing server and web suites now validate against new runtime helpers without contract changes

## Documentation created/updated

Created:

- `docs/local-development.md`
- `docs/worklog/2026-08-03-1603-local-environment-integration.md`

Updated:

- `.env.example`
- `.gitignore`
- `README.md`
- `docs/README.md`
- `docs/architecture/overview.md`
- `docs/architecture/dependency-guardrails.md`
- `docs/architecture/public-api-audit.md`
- `docs/coach/conversation-foundation.md`
- `docs/coach/evidence-selection-knowledge-retrieval.md`
- `docs/coach/openai-compatible-provider.md`
- `apps/server/README.md`
- `apps/web/README.md`
- `package.json`
- `apps/server/package.json`

## Validation performed

Pre-implementation baseline closure matrix (all passed):

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test`
- `CI=1 pnpm --filter @backgammon-trainer/ai-contracts test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-knowledge test`
- `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg test`
- `CI=1 pnpm --filter @backgammon-trainer/server test`
- `CI=1 pnpm --filter @backgammon-trainer/web test`
- `CI=1 pnpm --filter @backgammon-trainer/web build`
- `CI=1 pnpm check`
- `CI=1 pnpm test`
- `git diff --check`
- `git status`

Focused environment validation (all passed):

- `CI=1 pnpm --filter @backgammon-trainer/server test -- --run test/config.test.ts test/localEnv.test.ts`
- `CI=1 pnpm --filter @backgammon-trainer/web test -- --run src/runtimeConfig.test.ts src/features/coach/serverChatModel.test.ts src/features/analysis-session/serverPositionEvaluator.test.ts`
- `pnpm config:check`

Milestone completion matrix (final status passed):

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-analysis-session test`
- `CI=1 pnpm --filter @backgammon-trainer/ai-contracts test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-knowledge test`
- `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test`
- `CI=1 pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg test`
- `CI=1 pnpm --filter @backgammon-trainer/server test`
- `CI=1 pnpm --filter @backgammon-trainer/web test`
- `CI=1 pnpm --filter @backgammon-trainer/web build`
- `CI=1 pnpm check`
- `CI=1 pnpm test`
- `git diff --check`

Safety checks:

- `git check-ignore -v .env.local apps/server/.env.local apps/web/.env.local .env.development.local`
- `CI=1 pnpm --filter @backgammon-trainer/web build`
- `grep -R -n -E "OPENAI_COMPAT|MODEL_PROVIDER|OPENAI_COMPAT_API_KEY|EVALUATOR_PROVIDER|process\.env" apps/web/dist || true`

Validation retries during implementation (resolved):

- initial `CI=1 pnpm check` failed on Prettier; fixed with `pnpm prettier --write ...`.
- subsequent `CI=1 pnpm check` failed on lint (`no-useless-escape`); fixed by string cleanup.
- subsequent `CI=1 pnpm check` failed on server typecheck (`dotenv` `processEnv` typing); fixed in `localEnv.ts`.
- final `CI=1 pnpm check` passed.

## Deviations from prompt

- browser production artifact scan used `grep` instead of `rg` because `rg` was unavailable in this environment.
- live-provider smoke test was not executed because no local credential was configured.

## Unresolved limitations

- evaluator real-provider/GNU integration remains out of scope and not wired.
- live smoke command assumes the server is already running.
- local env changes require process restart.

## Intentionally deferred capabilities

- Anthropic support
- Google support
- OpenRouter OAuth
- browser credential entry
- per-user credential storage
- hosted authentication/spend controls
- provider fallback/comparison
- streaming/tool-calling/multimodal
- semantic retrieval/embeddings/vector stores
- real GNU evaluator wiring
- last-move review
- full-game review
- mistake classification
- learner modeling
- conversation persistence
- voice
- cube analysis
- multiplayer
- committed-turn undo
- drag-and-drop
- animation
