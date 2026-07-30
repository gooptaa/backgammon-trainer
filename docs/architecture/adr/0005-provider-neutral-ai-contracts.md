# ADR 0005: Provider-neutral AI contracts

## Status

Accepted

## Context

The coaching system should support multiple model providers and changing capabilities over time.

## Decision

Define provider-neutral TypeScript contracts (`CoachingRequest`, `CoachingResponse`, `ModelAdapter`, streaming events, capabilities) in a dedicated package. Keep provider-specific payloads out of app-facing interfaces.

## Consequences

- Easier adapter swapping and testing
- Stable internal interfaces despite provider churn
- Requires capability checks for feature differences (streaming, tool calling, image input)
