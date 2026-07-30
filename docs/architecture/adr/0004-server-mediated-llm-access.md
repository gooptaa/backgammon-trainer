# ADR 0004: Server-mediated LLM access

## Status

Accepted

## Context

Model provider credentials and usage controls must remain private. Browser bundles are public by design.

## Decision

All model interactions will be mediated by a Node server boundary. Initial implementation uses Fastify for a small, established HTTP framework and includes only mock coaching responses.

## Consequences

- Provider keys remain server-only
- Centralized place for future retries, rate limits, timeouts, and observability
- Adds one more runtime process in development
