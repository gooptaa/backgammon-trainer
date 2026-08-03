# Server

## Purpose

Trusted runtime boundary for health checks and coach model execution.

The server owns provider credentials and real provider protocol execution so browser code stays provider-neutral and secret-free.

## Coach routes

- `GET /api/coach/status`
  - Returns non-secret provider status for UI/runtime mode display.
- `POST /api/coach/complete`
  - Accepts provider-neutral `ChatModelRequest` payload.
  - Validates shape and bounded payload size.
  - Invokes configured server-side chat model adapter.
  - Returns provider-neutral `ChatModelResult` payload.

## Runtime provider modes

Set `MODEL_PROVIDER` to one of:

- `none`: coach completion is unavailable
- `mock`: fixture adapter mode
- `openai-compatible`: real server-hosted adapter mode

OpenAI-compatible mode requires:

- `OPENAI_COMPAT_BASE_URL` (trusted server-configured endpoint)
- `OPENAI_COMPAT_MODEL`
- `OPENAI_COMPAT_API_KEY`

Optional:

- `OPENAI_COMPAT_TIMEOUT_MS` (default `15000`)
- `OPENAI_COMPAT_PROVIDER_LABEL` (default `openai-compatible`)

## Security and privacy

- Credentials remain server-side only.
- Browser requests cannot pick arbitrary upstream provider URLs.
- Request/response payloads are not persisted by server routes.
- Error mapping is normalized and avoids exposing raw provider internals by default.

## Deployment and spend-risk boundary

Provider-backed routes are not safe to expose publicly without an external access boundary.

- Keeping the upstream destination fixed prevents arbitrary forwarding.
- Keeping the upstream destination fixed does not prevent unauthenticated callers from spending the configured provider key.

Deploy real-provider mode only in one of these contexts:

- local development
- trusted private network
- behind external authentication/access control (gateway, VPN, reverse proxy policy, equivalent)

Built-in end-user authentication and per-user spend controls are not part of this milestone.

## Compatibility surface

Implemented now:

- OpenAI-compatible non-streaming text completion using `POST /chat/completions`
- single-choice extraction from `choices[0].message.content`
- usage mapping from `prompt_tokens`, `completion_tokens`, `total_tokens`

Not implemented now:

- streaming
- tool calling
- multimodal input/output
- provider-specific extensions

## Validation

Run:

```bash
CI=1 pnpm --filter @backgammon-trainer/server test
```
