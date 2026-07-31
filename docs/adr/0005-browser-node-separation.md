# ADR 0005: Browser and Node Runtime Separation

- Status: Accepted

## Context

GNU Backgammon adapter work introduced Node-only process execution (`node:child_process`). Browser bundles must remain portable, secure, and free of Node runtime assumptions.

## Decision

Node-only evaluator concerns stay in `@backgammon-trainer/backgammon-evaluator-gnubg`, and browser source must not import Node-only modules.

- GNU process runner exports are isolated behind `@backgammon-trainer/backgammon-evaluator-gnubg/node`.
- Web app uses no evaluator or explicit fixture evaluator only.
- Repository lint and architecture validation enforce browser/runtime boundary guardrails.

## Consequences

- Browser builds avoid accidental Node polyfill pressure.
- GNU integration can evolve independently in Node host layers.
- Contributors get immediate feedback when crossing runtime boundaries.

## Alternatives Considered

- Shipping Node polyfills into browser build: rejected for correctness/security and bundle complexity.
- Embedding GNU process execution in web app: rejected because browser runtime cannot support it directly.
- Removing adapter package entirely: rejected because Node-side evaluation remains a valid architecture path.
