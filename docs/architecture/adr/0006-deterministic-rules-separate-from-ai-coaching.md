# ADR 0006: Deterministic rules separate from AI coaching

## Status

Accepted

## Context

Training trust depends on consistent legal move handling. LLMs are probabilistic and can provide incorrect legality guidance.

## Decision

Keep deterministic backgammon rules in a dedicated domain package, independent from AI coaching contracts and adapters. AI can critique/explain but cannot authoritatively determine legal moves.

## Consequences

- Legality remains reproducible and testable
- Coaching can improve independently without risking rules integrity
- Requires explicit coordination between app workflow and deterministic engine
