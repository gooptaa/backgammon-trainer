# Public API Audit

Date: 2026-07-31

Scope: workspace packages under `packages/*`.

## Summary

No unintended package exports were found in this audit. Public surfaces are currently controlled through explicit `exports` maps in package manifests.

## Package-by-package review

### `@backgammon-trainer/backgammon-domain`

- Export surface: root entry only.
- Public symbols: canonical domain types, constants, and validation helpers.
- Why public: they form the shared deterministic vocabulary consumed by engine and analysis.

### `@backgammon-trainer/backgammon-engine`

- Export surface: root entry only.
- Public symbols: deterministic rule APIs, turn/snapshot contracts, and parse/serialize helpers.
- Why public: web and analysis layers require engine-authoritative operations and contracts.

### `@backgammon-trainer/backgammon-analysis`

- Export surface: root entry plus `./fixture` subpath.
- Public symbols: factual analysis, evaluator contracts, ranking, canonical move fingerprinting, fixture evaluator.
- Why public: factual/evaluator boundary for host layers, plus deterministic fixtures for tests/dev.

### `@backgammon-trainer/backgammon-analysis-session`

- Export surface: root entry only.
- Public symbols: session contracts, serialization APIs, builder/reconciliation APIs, deterministic identity helpers.
- Why public: this is the supported integration surface for immutable analysis-session orchestration.

### `@backgammon-trainer/backgammon-evaluator-gnubg`

- Export surface: root entry plus `./node` and `./testing` subpaths.
- Public symbols: GNU adapter contract, capability detection, parser, Node process-runner, testing fakes.
- Why public: separates runtime-specific behavior (Node) and deterministic tests from core adapter contract.

### `@backgammon-trainer/ai-contracts`

- Export surface: root entry only.
- Public symbols: provider-neutral AI coaching contracts and adapter interfaces.
- Why public: enables host adapters and callers to share a stable vendor-agnostic contract.

### `@backgammon-trainer/shared`

- Export surface: root entry only.
- Public symbols: generic API envelope/result transport types.
- Why public: minimal cross-app transport typing.

## Changes made in this milestone

- No package exports were removed or added.
- Guardrails were strengthened through architecture checks and README responsibility sections.

## Follow-up trigger

If a package adds new export subpaths, update this audit and an ADR in the same milestone.
