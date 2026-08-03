# OpenAI-Compatible Real Coach Provider

## Capability

Backgammon Trainer can now execute real non-streaming coach completions through a trusted server-side OpenAI-compatible adapter while preserving provider-neutral coach-domain contracts.

## Stable pipeline

1. Board + conversation state in web app
2. Context resolution in `@backgammon-trainer/backgammon-coach`
3. Deterministic evidence selection (v2) + curated knowledge retrieval
4. Provider-neutral `ChatModelRequest`
5. Server route `POST /api/coach/complete`
6. OpenAI-compatible adapter (`/chat/completions`)
7. Provider-neutral `ChatModelResult`
8. Coach conversation rendering with provider/model provenance

## Trusted execution boundary

- Browser does not hold provider credentials.
- Server owns provider endpoint/model/key configuration.
- Browser does not send arbitrary upstream provider URLs.
- Provider-specific request/response parsing stays in server adapter internals.

## Deployment access boundary and spend risk

`POST /api/coach/complete` is intentionally provider-neutral, but it is still a provider-backed route.

- A fixed upstream destination protects against unrestricted forwarding and SSRF-style abuse.
- A fixed upstream destination does not by itself prevent unauthorized callers from spending the configured provider key.

Current threat model for real-provider mode:

- local development
- trusted private network
- or deployment behind external access control (for example gateway authentication, VPN, or equivalent trusted boundary)

Current implementation does not provide built-in end-user authentication or per-user spend controls.

Operational requirement:

- do not expose provider-backed routes as unauthenticated public internet endpoints

## Runtime modes

- `MODEL_PROVIDER=none`: no provider configured, coach send unavailable.
- `MODEL_PROVIDER=mock`: fixture adapter mode.
- `MODEL_PROVIDER=openai-compatible`: real provider mode.

If `MODEL_PROVIDER` is unset or invalid, server runtime falls back to `mock` (fixture mode), not real-provider mode.

Browser mode is controlled by `VITE_COACH_MODEL_MODE`:

- `none`
- `fixture`
- `server`

## Compatibility surface

Implemented now:

- OpenAI-compatible `POST /chat/completions`
- text output extraction from first choice
- usage mapping (`prompt_tokens`, `completion_tokens`, `total_tokens`)
- non-streaming request/response only

Not claimed:

- streaming
- tool calling
- multimodal/audio/image generation
- arbitrary provider-specific extensions

## Error mapping

Provider/transport failures are normalized to provider-neutral `ChatModelResult` failures:

- `unavailable`
- `authentication-failed`
- `rate-limited`
- `timeout`
- `provider-failed`
- `invalid-response`

## Privacy and transmitted context

In real provider mode, requests may include:

- user question
- bounded recent conversation messages
- deterministic evidence bundle
- curated knowledge excerpts

Requests do not include:

- provider credentials
- browser storage contents
- unrelated app debug state
- cross-game learner profile data

## Extension path

Future providers can be added by composing additional server-side adapters behind the same provider-neutral route and `ChatModel` contract.
