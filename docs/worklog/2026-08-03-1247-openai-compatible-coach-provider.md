# OpenAI-Compatible Real Coach Provider

Timestamp: 2026-08-03-1247

Previous worklog: docs/worklog/2026-08-03-1208-evidence-selection-knowledge-retrieval.md

Goal:

Connect the existing evidence-backed Coach flow to a real server-hosted OpenAI-compatible provider adapter while keeping coaching-domain contracts provider-neutral and preserving gameplay independence.

## Starting point

- active branch: `main`
- starting commit: `c48321c678c24533297af0b838a97c4501ca1766`

Ending commit is recorded after commit creation for this milestone.

## Repository findings that shaped the design

- Coach orchestration already produced bounded provider-neutral `ChatModelRequest` payloads from deterministic evidence and curated knowledge.
- `apps/server` already existed as the trusted Node boundary and could host real provider execution without creating a new package.
- Existing coaching UI and stale-response handling already supported pending/success/failure states and did not require a second orchestration path.
- Existing architecture guardrails already enforced browser/Node separation and provider-neutral package boundaries.

## Product capability delivered

Implemented a first real-provider vertical slice with:

- trusted server-side OpenAI-compatible adapter execution
- provider-neutral server completion route (`POST /api/coach/complete`)
- non-secret provider status route (`GET /api/coach/status`)
- browser server-chat-model adapter integration through existing coach pipeline
- explicit fixture/server/none runtime mode selection
- provider/model provenance visibility in coach messages
- provider-transparency disclosure in Coach panel
- bounded request validation and payload-size rejection at server route boundary
- focused adapter/server/web automated tests without live provider credentials

## Provider execution boundary

- provider credentials stay in server runtime env only
- browser calls provider-neutral server routes only
- provider destination is trusted server configuration
- browser cannot pass arbitrary upstream provider URL
- provider protocol parsing remains in server adapter internals

## Package-placement decision

Decision:

- keep real provider adapter implementation inside `apps/server`
- keep `@backgammon-trainer/ai-contracts` and `@backgammon-trainer/backgammon-coach` APIs unchanged and provider-neutral

Reason:

- avoids introducing package surface area before another host requires reuse
- preserves durable extension point through `ChatModel` contract and server composition

## Dependency direction

- web -> provider-neutral server client adapter (browser-safe)
- server -> `@backgammon-trainer/ai-contracts` + server-only provider adapter implementation
- no provider-specific types added to coach-domain package contracts
- engine, analysis, analysis-session, and knowledge dependencies unchanged

## Server and browser responsibilities

Server:

- provider mode/config parsing
- provider status disclosure without secrets
- provider-neutral request validation
- OpenAI-compatible protocol call and response validation
- failure mapping to generic chat failure taxonomy

Browser:

- mode bootstrap (`fixture` / `server` / `none`)
- provider status display and transparency text
- coach request submission through existing conversation/evidence pipeline
- no provider key handling

## Compatibility surface

Implemented and tested:

- OpenAI-compatible chat-completions style endpoint
- text completion extraction from first choice message content
- usage mapping from prompt/completion/total token fields
- non-streaming request/response only

Not claimed:

- streaming
- tool calling
- multimodal input/output
- arbitrary provider-specific extensions

## Provider configuration

Server env:

- `MODEL_PROVIDER` (`none` | `mock` | `openai-compatible`)
- `OPENAI_COMPAT_BASE_URL`
- `OPENAI_COMPAT_MODEL`
- `OPENAI_COMPAT_API_KEY`
- `OPENAI_COMPAT_TIMEOUT_MS` (optional)
- `OPENAI_COMPAT_PROVIDER_LABEL` (optional)

Browser env:

- `VITE_COACH_MODEL_MODE` (`none` | `fixture` | `server`)
- `VITE_API_BASE_URL`

## Credential and redaction policy

- no credential values are returned via status/completion routes
- adapter errors avoid raw provider payload forwarding
- browser-facing errors remain concise category-level messages

## Protection against unrestricted forwarding

- server adapter destination comes from trusted env config only
- completion route does not accept provider URL input from browser

## Provider adapter responsibilities

- translate provider-neutral request into OpenAI-compatible request payload
- execute authenticated request with timeout
- validate response shape and extract text
- map HTTP/transport failures into generic result taxonomy
- preserve provider/model provenance and usage when available

## Server route behavior

`GET /api/coach/status`:

- returns non-secret configured status, mode, provider label, and model id

`POST /api/coach/complete`:

- validates request shape and route body limit
- rejects oversized payload with `413`
- rejects unconfigured provider with `503`
- returns provider-neutral completion result on success/failure

## Provider-neutral result mapping

Mapped to existing `ChatModelResult` failure reasons:

- `unavailable`
- `authentication-failed`
- `rate-limited`
- `timeout`
- `provider-failed`
- `invalid-response`

## Provenance and usage behavior

- successful responses preserve provider/model/adapterVersion provenance
- usage mapping preserves prompt/completion/total token counts when present

## Timeout and cancellation behavior

- adapter enforces request timeout with abort controller
- no automatic retries were added
- no streaming was introduced

## Fixture, real, and no-model modes

- fixture mode remains deterministic and clearly labeled as non-strategic
- server real mode shows provider/model status and executes trusted server adapter
- none mode keeps coach visible with no-model behavior

## Web experience

Coach panel now additionally shows:

- configured provider/model status
- provider transparency note in production mode
- per-response provider/model provenance line

Existing pending/failure states, evidence disclosure, and stale-response behavior remain intact.

## Privacy and transmitted context

Real provider requests may include:

- user question
- bounded conversation history
- deterministic evidence
- curated knowledge excerpts

Requests do not include:

- provider credentials
- browser storage payloads
- unrelated app runtime state
- cross-game learner profile data

## Failure behavior

- malformed payloads rejected at server boundary
- provider auth/rate-limit/unavailable/timeout categories mapped and surfaced to UI
- no silent fallback from failed real provider to fixture output

## Conversation lifecycle impact

- request snapshot semantics preserved
- stale prior-lineage responses still ignored
- gameplay remains available while pending

## Persistence impact

No new persistence added for:

- conversations
- provider status
- provider responses outside existing in-memory conversation
- credentials in browser stores

## Public API impact

- no new package exports
- server app route and adapter internals changed
- provider-neutral package boundaries preserved

## Engine, analysis, evaluator, analysis-session, knowledge, web, and server impact

- engine impact: none
- analysis impact: none
- evaluator impact: none
- analysis-session impact: none
- knowledge impact: none
- web impact: coach runtime mode bootstrap + provider transparency/provenance rendering
- server impact: new provider runtime/config + status/completion routes + real adapter

## Tests added

- `apps/server/test/openAiCompatibleAdapter.test.ts`
- extended `apps/server/test/server.test.ts`
- `apps/web/src/features/coach/serverChatModel.test.ts`
- extended `apps/web/src/features/coach/CoachPanel.test.tsx`

## Documentation created and updated

Created:

- `docs/adr/0009-server-hosted-real-provider-boundary.md`
- `docs/coach/openai-compatible-provider.md`
- `apps/server/README.md`
- `docs/worklog/2026-08-03-1247-openai-compatible-coach-provider.md`

Updated:

- `.env.example`
- `README.md`
- `docs/README.md`
- `docs/architecture/overview.md`
- `docs/architecture/dependency-guardrails.md`
- `docs/architecture/public-api-audit.md`
- `docs/coach/conversation-foundation.md`
- `docs/coach/evidence-selection-knowledge-retrieval.md`
- `docs/knowledge/architecture.md`
- `packages/ai-contracts/README.md`
- `packages/backgammon-coach/README.md`
- `apps/web/README.md`

## Validation performed

Focused validation during implementation:

- `CI=1 pnpm --filter @backgammon-trainer/server test`
- `CI=1 pnpm --filter @backgammon-trainer/web test -- --run src/features/coach/CoachPanel.test.tsx src/features/coach/serverChatModel.test.ts`
- `CI=1 pnpm --filter @backgammon-trainer/web test`

Full required matrix is recorded after milestone completion.

## Manual smoke test

Not performed in this milestone run (no live credentials used during automated implementation).

## Deviations from prompt

- real provider adapter was implemented directly in `apps/server` instead of creating a new provider package
- no live-provider manual smoke run was executed

## Unresolved limitations

- OpenAI-compatible scope is intentionally narrow (non-streaming text)
- no server-side persistence/observability stack beyond current route-level behavior
- no user-specific provider credential management

## Intentionally deferred capabilities

- Anthropic/Google/local-model adapters
- browser credential entry or storage
- provider fallback/comparison routing
- streaming/tool calling/multimodal support
- semantic retrieval/embeddings/vector indexing
- conversation persistence and learner modeling

## Closure audit

Verified starting commit:

- `c48321c678c24533297af0b838a97c4501ca1766`

Milestone implementation commit:

- pending

Final HEAD:

- pending

Branch and push status:

- pending

Final Git status:

- pending

Validation results:

- pending full matrix
