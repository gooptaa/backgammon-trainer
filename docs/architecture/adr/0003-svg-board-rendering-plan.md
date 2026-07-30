# ADR 0003: SVG as planned board-rendering technology

## Status

Accepted

## Context

Backgammon UI will require precise interaction and annotations on points, checkers, dice, and move indicators.

## Decision

Plan to render the production board in SVG. Do not implement full SVG board in this foundation milestone.

## Consequences

- Fine-grained, testable visual elements
- Resolution-independent rendering on mobile and desktop
- Future animation and accessibility design can target stable shape-level semantics
