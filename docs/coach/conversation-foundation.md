# Text Coach Conversation Foundation

## Vision and scope

Backgammon Trainer now includes a text-first coaching conversation foundation alongside the board workspace.

- Board state and legal transitions remain deterministic and engine-authoritative.
- Conversation is the primary coaching interface.
- The model receives structured evidence from trusted layers.

Current extension:

- selected legal move evidence and curated knowledge retrieval are documented in `docs/coach/evidence-selection-knowledge-retrieval.md`

Explicitly excluded in this milestone:

- live voice-agent architecture
- voice activity/silence detection
- recording/transcription pipelines
- speech synthesis

## Package placement decision

Placement adopted:

- Generic transport contracts remain in `@backgammon-trainer/ai-contracts`.
- Backgammon-specific coaching domain is implemented in `@backgammon-trainer/backgammon-coach`.

Boundary summary:

- `ai-contracts` owns provider-neutral chat model contracts only.
- `backgammon-coach` owns conversation models, context resolution, evidence building, and prompt construction.
- `backgammon-coach` composes deterministic engine/analysis/session outputs; it does not own rules.

Dependency direction:

- `backgammon-engine -> backgammon-analysis -> backgammon-analysis-session -> backgammon-coach`
- `ai-contracts -> backgammon-coach` (consumer direction only)
- host apps (`web`, future server adapters) depend on `backgammon-coach`

## Conversation model

The conversation is JSON-safe and in-memory only.

- explicit conversation/message IDs are injected
- explicit timestamps are injected
- no hidden random/clock use in pure domain functions
- message text is trimmed and non-empty
- duplicate message IDs are rejected
- message ordering remains append-only and stable

The canonical stored shape does not include provider SDK objects, React state, or HTML artifacts.

## Lineage lifecycle policy

Policy chosen for this milestone:

- one conversation per active game lineage
- new game creates a fresh empty conversation
- successful import of a different lineage creates a fresh empty conversation
- browser restore may restore game snapshot but starts a fresh empty conversation

No conversation data is persisted into game snapshot or local storage.

## Context types and precedence

Supported context types:

- `current-position`
- `move-outcome` (explicit preview selection)
- `history-turn` (explicit history inspection selection)
- `game-review` (explicit review intent over committed game history)
- `progress-profile` (explicit learner-progress intent over deterministic local profile evidence)

Full-game review activation policy:

- full-game review is user-initiated through conversation intent
- completed games are not auto-reviewed on every question
- game-review context is resolved when the user asks to review the game (for example: "review this game", "how did I play", or "review game so far")

Precedence on submit:

1. explicit selected move outcome
2. explicit selected history turn
3. current committed position
4. full-game review only when explicit review intent is present

Progress-profile activation policy:

- progress-profile is user-initiated through conversation intent (for example: "How am I doing?", "Show my recent progress")
- recurring-pattern questions are also user-initiated through deterministic progress-profile intent (for example: "What do I keep doing wrong?", "What is my main pattern?")
- explicit move-outcome/history-turn/full-game-review precedence is preserved
- progress-profile does not silently replace explicit selected-turn review questions

Historical-review extension:

- if the question explicitly asks to review the last move, submit resolves a historical target
- explicit selected history turn remains authoritative when present
- otherwise, the latest committed checker-play turn in the same lineage is selected
- if no committed checker-play turn exists, history review is not forced and evidence degrades honestly

Full-game review extension:

- review scope is resolved as `completed-game` or `game-so-far` from the submitted snapshot boundary
- committed turn boundary is captured at submit time and does not expand while the request is pending
- explicit inspected turn and explicit turn-number references are carried into deterministic key-decision selection
- if learner ownership is not authoritative, review scope remains all-players and is disclosed as ambiguous ownership
- unsupported non-checker decisions are excluded from checker-play grading and counted explicitly

Hover state, selected checker state, and uncommitted staged board projection are never treated as committed context.

## Current-turn context contract

Current-turn context reports deterministic status:

- `opening-unresolved`
- `waiting-for-dice`
- `decision-available`
- `no-legal-move`
- `game-complete`

When available it includes active player, dice, legal move outcomes, ranked analysis, and staged candidate intent summary.

## Evidence bundle

`buildCoachEvidence(...)` constructs deterministic, bounded, JSON-safe evidence.

Evidence includes:

- context summary kind
- factual position features from analysis package
- bounded selected legal move evidence rows with canonical fingerprints
- legal move selection coverage and question-reference summaries for current-position requests
- optional ranked fields (`evaluatorRank`, `normalizedScore`, `lossFromTopScoredMove`)
- evaluator provenance and coverage when available
- recommendation-support status resolved before model generation
- historical turn facts and optional analysis linkage
- completed-game aggregate counts (only currently supported aggregates)
- deterministic learner-profile aggregate evidence (compatible policy only) for explicit progress questions
- conversation summary counts
- bounded warnings list

Facts are always separated from evaluator-attributed claims.

Recommendation authority is also separated from generation:

- coach-domain evidence decides whether strongest-move claims are supported
- complete trustworthy evaluator coverage can support an authoritative recommendation
- partial evaluator coverage can support only a strongest-evaluated claim
- fixture or missing evaluator evidence cannot support authoritative strongest-move claims
- non-decision and no-legal-move states explicitly block fabricated recommendations

Move classification authority is also separated from generation:

- committed historical checker-play moves may receive deterministic policy labels (`best`, `reasonable`, `mistake`, `major mistake`)
- classification is fail-closed and emitted as `unclassified` when evidence is insufficient or non-authoritative
- classification requires complete trustworthy evaluator coverage with valid score semantics and evaluator-covered played move
- fixture provenance, partial coverage, missing evaluator evidence, or unsupported turn kinds remain unclassified
- current-position coaching never assigns mistake labels before a move is committed

Learner profile authority is also separated from generation:

- learner ownership is explicit per lineage (`white`, `black`, `both`, `unknown`)
- only committed learner checker-play decisions are eligible for learner observations
- profile aggregation preserves classification-policy identity/version compatibility
- trend fields are deterministic and conservative; insufficient evidence is explicit

Pattern attribution authority is also separated from generation:

- recurring-skill patterns are assigned only by deterministic, versioned pattern detectors
- pattern detectors compare committed played moves with supported stronger evaluated alternatives
- pattern signals are persisted as bounded structured evidence tied to committed-turn identity
- main-pattern selection is deterministic, with explicit tie and insufficient-evidence outcomes
- the language model may explain supplied pattern evidence but may not invent counts, motives, or diagnoses

Historical review authority remains deterministic before generation:

- complete trustworthy coverage supports played-vs-best rank and loss claims
- partial trustworthy coverage supports strongest-evaluated claims only
- uncovered played moves receive no fabricated rank/loss claims
- fixture, unavailable, or failed evaluator output remains non-authoritative
- when eligible, the deterministic policy label and policy version are included in historical evidence before prompt construction

Fixture evaluator caveat:

- fixture provenance is flagged with explicit warning
- fixture outputs are never presented as expert/authoritative strategy

## Knowledge retriever boundary

Provider-neutral interface exists:

- `CoachKnowledgeRetriever.retrieve(request)`

Included in milestone:

- no-op retriever
- deterministic fixture retriever
- deterministic local curated-content retriever backed by `@backgammon-trainer/backgammon-knowledge`

Out of scope:

- embeddings
- vector stores
- semantic search
- web search
- external copyrighted corpus ingestion

Knowledge retrieval failures do not block coach request construction.

## Prompt construction and bounded context

`buildCoachModelRequest(...)` builds a provider-neutral `ChatModelRequest` with deterministic bounds.

Current bounds:

- max conversation messages included: 8
- max message chars per included message: 800
- max knowledge excerpts included: 4
- max selected legal move rows in evidence: 8
- max evidence warnings included: 8

Progress-profile defaults:

- rolling recent window: 20 eligible learner decisions
- profile observation cap: 500

Instruction policy includes:

- answer user question from supplied evidence
- first two sentences give a plain-language verdict and error magnitude
- response order: verdict, magnitude, main comparison, practical takeaway, then confidence note
- keep internal policy and implementation terms out of learner-facing prose
- do not invent legal moves or deterministic facts
- distinguish certainty vs uncertainty
- call out fixture/synthetic provenance explicitly
- avoid long-term habit claims without cross-game evidence

## Fixture chat model

A deterministic async fixture chat model is provided in `@backgammon-trainer/ai-contracts/fixture`.

Capabilities:

- success and failure modes (`unavailable`, `authentication-failed`, `rate-limited`, `timeout`, `provider-failed`, `invalid-response`)
- configurable delay
- explicit fixture provenance
- controlled promise model for stale-response tests

UI warning is always visible when fixture coach is enabled:

- `Development fixture coach - responses are not strategic advice.`

## No-model behavior

When no chat model is configured:

- Coach panel still renders
- context label remains visible
- Send is disabled
- message shown: `No coach model configured.`

Gameplay remains fully available.

## Request snapshot semantics and stale responses

On submit:

- context and evidence are captured for that request
- same-lineage board advancement does not rewrite prior message context

Historical review request capture:

- the resolved committed-turn identity is fixed at submit time
- subsequent move play does not retarget that request
- selecting another turn later affects only future requests
- completed-turn feedback uses a durable committed-turn record (player, dice, move, and before/after positions)
- latest-committed fallback may hydrate ranked analysis from analysis-session records when available
- coverage caveats are sourced from explicit structured evaluation status, not inferred by comparing unrelated arrays
- canonical-equivalent move variants (for example die-order variants) are normalized before coverage claims

Full-game review request capture:

- committed turns are snapshotted from the submitted lineage only
- new committed moves after submit do not alter in-flight full-game review evidence
- changing selected history turn after submit does not retarget the submitted full-game review

Stale policy:

- responses from prior lineage are ignored
- same-lineage late responses are accepted and remain attached to original request context

Concurrency policy:

- one pending coach request per conversation
- current-position send is disabled while evaluator analysis is pending when evaluator runtime is configured
- Send disabled while pending
- gameplay remains enabled

## Web UX, accessibility, and mobile behavior

Coach panel behavior:

- scrollable message history
- multiline textarea
- Enter to send
- Shift+Enter newline
- polite pending/failure status updates
- compact evidence disclosure

Accessibility:

- labeled conversation region and textarea
- labeled send button
- visible status text for pending/failure
- fixture warning is text (not color-only)

Layout:

- desktop: board workspace with sidebar (coach + sandbox)
- narrow/mobile: sections stack vertically
- chat history height is bounded to avoid board displacement

## Persistence exclusion

Conversation/coaching data is not persisted to:

- `GameSnapshot`
- analysis-session payloads
- local storage keys
- import/export payloads
- IndexedDB or backend stores

Conversation persistence remains a separate future milestone.

## BYOM boundary

Current implementation keeps `ChatModel` and `backgammon-coach` contracts provider-neutral while executing real provider calls behind trusted server routes.

Implemented:

- server-hosted OpenAI-compatible adapter (`/chat/completions` protocol slice)
- explicit fixture, real, and unconfigured runtime modes
- non-secret provider status disclosure to browser
- local configuration convention with root `.env.local` and explicit browser/public `VITE_*` boundary

Mode validation behavior:

- invalid server provider mode selection reports unconfigured status with explicit invalid-mode message
- invalid browser `VITE_COACH_MODEL_MODE` resolves to disabled mode with explicit invalid-mode message

Still not implemented:

- browser credential entry
- OAuth/SSO or account-linked credential storage
- per-user provider selection
- provider comparison/fallback routing

## Server impact decision

Decision for this milestone:

- server now exposes provider-neutral coach routes:
  - `GET /api/coach/status`
  - `POST /api/coach/complete`
- server owns real provider execution and credentials
- browser uses provider-neutral server client adapter for real mode
- fixture chat model remains available for deterministic local development/tests

## Known limitations

- conversation is not persisted
- no request queueing
- no streaming
- no semantic retrieval
- no strategic habit diagnosis from profile evidence yet
- OpenAI-compatible support is intentionally narrow (non-streaming text completion only)
- local environment file updates require process restart to take effect

## Next milestone

Recommended next step:

- add additional provider adapters (Anthropic/Google/local hosts) behind the same server boundary without changing coach-domain contracts.
