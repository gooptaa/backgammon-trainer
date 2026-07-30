# ADR 0002: pnpm workspace without larger monorepo framework

## Status

Accepted

## Context

The repository needs multiple apps and packages, but early-stage complexity should stay low.

## Decision

Use pnpm workspaces only. Do not add Nx or Turborepo at this stage.

## Consequences

- Simple mental model and low tooling overhead
- Good dependency deduplication and workspace linking
- Build orchestration remains script-driven; if complexity grows, reevaluate later
