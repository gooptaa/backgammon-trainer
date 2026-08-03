# ADR 0009: Real Providers Execute Behind a Trusted Server Boundary

- Status: Accepted
- Date: 2026-08-03

## Context

Backgammon Trainer now has a provider-neutral coach request pipeline that assembles bounded conversation context, deterministic evidence, and curated knowledge before model completion.

To connect this pipeline to a real provider, the architecture must preserve:

- coach-domain provider neutrality
- browser and Node runtime separation
- non-disclosure of credentials
- stable extension points for future providers

A browser-hosted provider call would expose secrets and create uncontrolled protocol coupling in UI code.

## Decision

Real model providers execute only in trusted Node/server code.

- Browser code sends provider-neutral `ChatModelRequest` payloads to server coaching routes.
- Server chooses and executes the configured provider adapter.
- Provider credentials remain server-side runtime configuration.
- Provider-specific request/response mapping stays inside adapter implementation.
- Coach-domain and AI-contract package APIs remain provider-neutral.

For the first vertical slice:

- supported protocol surface: OpenAI-compatible `POST /chat/completions` text generation
- no unrestricted destination forwarding from browser requests
- provider destination is trusted server configuration (`OPENAI_COMPAT_BASE_URL`)
- no browser credential entry or credential persistence

## Consequences

Positive:

- credentials do not enter browser bundles or browser state
- provider SDK/protocol types do not leak into coach-domain contracts
- future providers can be added by server composition without rewriting coach orchestration
- fixture, unconfigured, and real modes remain explicit and testable

Tradeoffs:

- one extra hop (browser -> server -> provider)
- server must enforce request validation, redaction, and failure mapping
- adapter behavior must be tested with controlled doubles rather than live credentials

## Rejected alternatives

### Browser-managed provider credentials and direct provider calls

Rejected because browser code is untrusted for secret storage and transport security policy.

### General-purpose forwarding proxy that accepts arbitrary browser-supplied provider URLs

Rejected because it introduces SSRF risk and collapses trust boundaries.

### Provider-specific types embedded in coach package contracts

Rejected because it would couple coaching domain APIs to one provider protocol.

## Stability commitment

The following remain stable as more providers are added:

- provider-neutral `ChatModel` contract
- coach evidence and prompt construction pipeline
- request snapshot and stale-response behavior
- browser conversation-centric UX

The following can evolve without breaking coach-domain callers:

- server adapter internals
- supported provider protocol variants
- server runtime configuration surface
