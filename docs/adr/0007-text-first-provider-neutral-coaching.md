# ADR 0007: Text-First, Provider-Neutral Coaching Foundation

- Status: Accepted

## Context

Backgammon Trainer has deterministic engine and analysis layers, but coaching conversation orchestration needs an explicit architecture boundary before real providers are integrated.

Without a dedicated boundary, provider-specific payloads, inferred strategy claims, or cross-lineage context leakage could weaken trust and violate existing architecture guardrails.

## Decision

Adopt a text-first coaching architecture with provider-neutral chat model integration and deterministic evidence-first orchestration.

- Text chat is the primary coaching channel.
- `@backgammon-trainer/ai-contracts` owns generic provider-neutral `ChatModel` transport contracts.
- `@backgammon-trainer/backgammon-coach` owns backgammon-specific conversation/context/evidence/prompt orchestration.
- Model generation is downstream from deterministic evidence built from engine/analysis/session data.
- Voice-agent architecture is explicitly out of scope.
- BYOM provider adapters live outside coach core boundaries.
- Conversation persistence is independent from game snapshot persistence.

## Consequences

- Deterministic rules and factual analysis remain authoritative.
- Model responses can be developed/tested with fixture adapters without production credentials.
- Conversation scope can be reset safely per game lineage.
- Provider adapter work can proceed later without changing coach-domain models.

## Alternatives considered

- Embedding provider-specific SDK request types directly in web state: rejected due to lock-in and boundary leakage.
- Persisting conversation into game snapshots now: rejected to keep persistence boundaries explicit.
- Building voice-first orchestration now: rejected as out-of-scope and not required for text coaching foundation.
