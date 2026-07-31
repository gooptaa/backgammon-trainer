# ADR 0001: Engine Authority for Deterministic Game Rules

- Status: Accepted

## Context

Gameplay correctness depends on deterministic and reproducible move legality, move application, and turn-state transitions. UI staging, evaluator integration, and analysis capture introduced additional layers that could accidentally duplicate or drift from rules behavior.

## Decision

`@backgammon-trainer/backgammon-engine` remains the single authority for deterministic game rules.

- Legal move generation, legality, move application, pass legality, and game completion stay in engine.
- Web and analysis layers consume engine outputs and do not reimplement transition logic.
- Staged UI previews must use engine projection APIs (`previewMovePrefix(...)`) rather than local transition code.

## Consequences

- Deterministic behavior remains testable with pure engine fixtures.
- Contributors can safely add UI or analysis features without changing rule semantics.
- Integration code must tolerate engine result contracts instead of forcing alternate behaviors.

## Alternatives Considered

- Duplicating lightweight rules in UI for responsiveness: rejected due to divergence risk.
- Moving rule helpers into analysis package: rejected because it weakens ownership boundaries.
- Treating evaluator output as move authority: rejected because evaluator is interpretive, not legal.
