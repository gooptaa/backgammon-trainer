# Local Development Configuration

This guide defines the local environment-loading convention and live integration workflow.

## Configuration boundary

Server-private values:

- `MODEL_PROVIDER`
- `OPENAI_COMPAT_BASE_URL`
- `OPENAI_COMPAT_MODEL`
- `OPENAI_COMPAT_API_KEY`
- `OPENAI_COMPAT_TIMEOUT_MS`
- `OPENAI_COMPAT_PROVIDER_LABEL`
- `EVALUATOR_PROVIDER`
- `SERVER_HOST`
- `SERVER_PORT`

Browser-public values (intentionally visible in web bundles):

- `VITE_COACH_MODEL_MODE`
- `VITE_API_BASE_URL`
- `VITE_ENABLE_FIXTURE_EVALUATOR`

Any variable without `VITE_` is server-only and must not be read in browser code.

## Local file convention

Local file location:

- repository root `.env.local`

Why this location:

- `pnpm dev` launches web and server from one workspace workflow
- server startup now loads root `.env.local` and optional root `.env`
- web (Vite) now loads `VITE_*` from repository root explicitly
- one file is easier to explain and harder to misconfigure

Committed template:

- `.env.example` is the authoritative inventory
- copy it to `.env.local` and edit only local values

Git behavior:

- `.env.local` and `.env.*.local` are ignored
- app-level `.env.local` variants are also ignored
- `.env.example` remains tracked

## Setup from clean checkout

1. Install dependencies:

```bash
pnpm install
```

2. Create local environment file:

```bash
cp .env.example .env.local
```

3. Edit `.env.local`:

- keep `VITE_*` values browser-safe
- keep provider keys server-only

## Configuration precedence

Server configuration precedence:

1. explicit shell/platform env
2. `.env.local`
3. `.env`
4. server defaults in code

Browser configuration precedence for `VITE_*`:

1. explicit shell/platform env passed to Vite
2. `.env.local` at repository root
3. `.env` at repository root
4. in-app fallback defaults

Changing environment values requires restarting the process.

## Runtime modes

Coach model mode (`MODEL_PROVIDER` on server, `VITE_COACH_MODEL_MODE` on web):

- `none`: model disabled
- `mock`/`fixture`: deterministic fixture output
- `openai-compatible` + `server`: real provider through server boundary

Evaluator mode (`EVALUATOR_PROVIDER` on server):

- `none`: no evaluator
- `mock`: fixture evaluator only

Current evaluator limitations:

- no real GNU evaluator wiring in this milestone
- OpenAI-compatible key does not enable authoritative evaluator evidence by itself

## Start web + server

```bash
pnpm dev
```

Expected local URLs:

- web: `http://localhost:5173`
- server: `http://localhost:3001`

## Verify status without exposing secrets

Coach status:

```bash
curl -s http://localhost:3001/api/coach/status
```

Evaluator status:

```bash
curl -s http://localhost:3001/api/evaluator/status
```

These routes report mode/provider/model metadata without returning credentials.

## Fixture mode workflow (no credentials)

Recommended values:

- `VITE_COACH_MODEL_MODE=fixture`
- `MODEL_PROVIDER=mock`
- `EVALUATOR_PROVIDER=none` or `mock`

Behavior:

- deterministic fixture coach output
- optional fixture evaluator output if enabled
- no paid provider calls

## Real-provider server mode workflow

Recommended values:

- `VITE_COACH_MODEL_MODE=server`
- `MODEL_PROVIDER=openai-compatible`
- `OPENAI_COMPAT_MODEL=<model-id>`
- `OPENAI_COMPAT_API_KEY=<real-key>`
- `EVALUATOR_PROVIDER=none` or `mock`

If required provider values are missing, status and completion report unconfigured behavior clearly.

No silent fallback to fixture occurs after real-provider failures.

## Disable provider mode

Set one of:

- `MODEL_PROVIDER=none`
- `VITE_COACH_MODEL_MODE=none`

Restart web/server after changes.

## Opt-in live provider smoke test

Purpose:

- verify local env loading
- verify configured provider status
- verify one bounded provider-neutral request through server route

Safety:

- requires explicit opt-in env flag
- uses one short non-streaming request
- no retries
- no API key output
- no full prompt/response output by default

Command (with server running):

```bash
ALLOW_LIVE_PROVIDER_SMOKE=true pnpm smoke:live-provider
```

Optional API URL override:

```bash
ALLOW_LIVE_PROVIDER_SMOKE=true SMOKE_API_BASE_URL=http://localhost:3001 pnpm smoke:live-provider
```

## Manual Coach verification checklist

With a valid key configured:

1. Confirm `/api/coach/status` reports configured real provider without secrets.
2. Confirm Coach panel indicates server mode/provider.
3. Submit a current-position question and verify response provenance shows provider/model.
4. Confirm fixture evaluator evidence is not treated as authoritative move advice.
5. Confirm missing trustworthy evaluator evidence yields qualified (non-authoritative) coaching behavior.
6. Confirm gameplay remains usable while coach request is pending.
7. Switch to disabled or fixture mode and confirm behavior changes without source edits.

If no valid key is configured, mark live checks as not performed.

## Automated test isolation

Normal commands (`pnpm test`, `pnpm check`, package tests, web build) are designed to remain:

- network-free
- credential-free
- deterministic

Server tests do not load root `.env.local` by default because env loading is bound to server startup entrypoint, not package test bootstraps.

Live smoke remains outside normal test flows.

## CI and production behavior

CI/production should continue using platform environment/secret stores.

Local env files are a developer convenience, not a production requirement.

## Security and spend boundary warning

Hiding upstream URL/key in server code does not make provider-backed routes safe for public unauthenticated deployment.

Real-provider mode is intended for:

- local development
- trusted private networks
- or externally protected deployments with real access control and spend protection

Browser-visible shared values are not authentication.

## Troubleshooting

`Coach provider is not configured`:

- check `MODEL_PROVIDER` and required OpenAI-compatible values
- run `pnpm config:check`

`Invalid VITE_COACH_MODEL_MODE`:

- set to `none`, `fixture`, or `server`
- restart Vite

`Unable to load coach provider status from server`:

- check `VITE_API_BASE_URL`
- ensure server is running on expected host/port

`Evaluator provider is unavailable`:

- confirm `EVALUATOR_PROVIDER` is `none` or `mock`
- remember real GNU evaluator wiring is not part of current runtime modes
