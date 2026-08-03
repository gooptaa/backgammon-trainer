# AI Contracts

## Purpose

Define provider-neutral chat-model request/response contracts without coupling apps to vendor-specific SDK payloads.

## Responsibilities

- Type coaching request and response envelopes.
- Model capability flags and result failure taxonomy.
- Define non-streaming text completion interface.
- Provide deterministic fixture chat model for development and tests.

## Allowed Dependencies

- No workspace package dependencies.

## Forbidden Dependencies

- `@backgammon-trainer/web`
- `@backgammon-trainer/server`
- Provider SDK clients and runtime-specific transport code

## Public API

- Generic chat contracts (`ChatModelRequest`, `ChatModelResult`, message/provenance/usage types).
- Adapter interface (`ChatModel`) and capability types.
- Fixture adapter subpath (`@backgammon-trainer/ai-contracts/fixture`).

Why these exports are public:

- They provide a stable cross-application boundary shared by host adapters and callers.

## Non-goals

- Implementing provider SDK integrations.
- Defining backgammon strategy or move legality.
- Persisting conversations.

## Future Roadmap

- Preserve provider neutrality while adding provider adapters in host layers.
- Add optional streaming and tool-calling contracts in a dedicated milestone.
