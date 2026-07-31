# GNU Backgammon Evaluator Adapter

## Purpose

Provide a Node-only adapter that translates GNU Backgammon capability/evaluation outputs into the shared `PositionEvaluator` contract.

## Responsibilities

- Detect GNU executable capability and CLI support.
- Encapsulate process-runner invocation and timeout handling.
- Translate/match GNU-oriented move data to canonical engine move identity.
- Parse supported transcript output into normalized evaluator responses.
- Expose smoke validation for local adapter availability checks.

## Allowed Dependencies

- `@backgammon-trainer/backgammon-analysis`
- `@backgammon-trainer/backgammon-engine`
- Node standard library runtime APIs

## Forbidden Dependencies

- `@backgammon-trainer/web`
- Browser runtime APIs and React UI concerns
- Engine rule mutations or legality overrides

## Public API

- Root export (`@backgammon-trainer/backgammon-evaluator-gnubg`): evaluator creation, capability detection, transcript parsing contracts.
- Node subpath (`@backgammon-trainer/backgammon-evaluator-gnubg/node`): Node process-runner implementation.
- Testing subpath (`@backgammon-trainer/backgammon-evaluator-gnubg/testing`): deterministic fake runners for tests.

Why these exports are public:

- Root APIs define adapter behavior used by host orchestration.
- Node subpath isolates runtime-specific process code from browser-safe surfaces.
- Testing subpath supports deterministic contract tests without real GNU installation.

## Non-goals

- Browser execution.
- Strategic recommendation generation.
- Heuristic fallback scoring.
- Verified default live checker-play command automation in this repository milestone.

## Future Roadmap

- Verified live command transcript capture against installed GNU versions.
- Expanded parser support for additional output variants.
- Optional host-level rollout/cube/match-context integration.
