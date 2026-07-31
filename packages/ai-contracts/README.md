# AI Contracts

## Purpose

Define provider-neutral request/response contracts for coaching-oriented AI interactions without coupling apps to vendor-specific payloads.

## Responsibilities

- Type coaching request and response envelopes.
- Model capability flags for adapter feature negotiation.
- Define completion and optional streaming adapter interfaces.

## Allowed Dependencies

- No workspace package dependencies.

## Forbidden Dependencies

- `@backgammon-trainer/web`
- `@backgammon-trainer/server`
- Provider SDK clients and runtime-specific transport code

## Public API

- Contract types for coaching inputs/outputs and stream events.
- Adapter interface definitions (`ModelAdapter`) and capability/options types.

Why these exports are public:

- They provide a stable cross-application boundary shared by host adapters and callers.

## Non-goals

- Implementing provider SDK integrations.
- Deciding legal move correctness.
- Persisting coaching sessions.

## Future Roadmap

- Expand contract coverage as coaching feature requirements harden.
- Preserve provider neutrality while supporting richer structured outputs.
