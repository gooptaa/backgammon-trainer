# Backgammon Knowledge

## Purpose

Provide browser-safe, repository-owned curated backgammon teaching content with a controlled taxonomy, deterministic validation, and deterministic local retrieval helpers.

## Responsibilities

- Own the canonical curated beginner knowledge corpus.
- Own the canonical curated beginner and intermediate knowledge corpus.
- Define the controlled taxonomy for curated coaching knowledge.
- Export browser-safe generated corpus data.
- Validate corpus integrity and topic coverage.
- Provide deterministic local retrieval helpers over the curated corpus.

## Allowed Dependencies

- No workspace package dependencies.

## Forbidden Dependencies

- `@backgammon-trainer/web`
- `@backgammon-trainer/backgammon-coach`
- Provider SDKs, vector databases, embeddings libraries, browser storage adapters, or Node-only runtime imports in `src`

## Public API

- Taxonomy and content model types.
- Generated curated knowledge corpus.
- Deterministic corpus validator.
- Deterministic local retrieval helper.

## Non-goals

- Coaching orchestration.
- Legal move generation or factual board analysis.
- Provider-specific retrieval adapters.
- Remote content loading.

## Authoring workflow

- Canonical authored markdown lives under `content/`.
- Regenerate browser-safe source with `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:generate`.
- Validate source and stale generated output with `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check`.
