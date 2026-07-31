# Backgammon Analysis Session

Versioned analysis-session domain model plus deterministic builder/orchestration APIs for durable analysis records.

## Purpose

This package exists so callers do not manually assemble nested analysis-session records.

It links three canonical facts safely:

- committed deterministic turn history from engine (`GameSnapshot` + `TurnRecord`)
- ranked factual/evaluated move analysis
- immutable durable `AnalysisSession` records

## What This Package Owns

- immutable `AnalysisSession` / `AnalysisRecord` / metadata contracts
- strict parse/serialize envelope validation
- deterministic game-reference and decision-position fingerprinting
- fail-closed record construction from committed turns
- immutable append workflow with idempotent retry behavior
- reconciliation against later deterministic snapshots

## What This Package Does Not Own

- evaluator invocation orchestration
- GNU process execution
- browser storage or local persistence wiring
- backend/database/HTTP persistence adapters
- coaching prose, mistake labels, lesson generation

## Dependency Direction

- depends on `@backgammon-trainer/backgammon-analysis`
- depends on `@backgammon-trainer/backgammon-engine`
- no React/DOM/browser storage/network/process API imports

## Public APIs

Serialization and summary:

- `serializeAnalysisSession(session)`
- `parseAnalysisSession(input)`
- `encodeAnalysisSession(session)`
- `decodeAnalysisSession(text)`
- `summarizeAnalysisSession(session)`

Builder/orchestration:

- `createAnalysisSession(input)`
- `createAnalysisRecord(input)`
- `appendAnalysisRecord(input)`
- `reconcileAnalysisSession(input)`

Deterministic identity helpers:

- `getAnalysisSessionGameReference(snapshot, explicitGameReference?)`
- `getDecisionPositionFingerprint({ position, player, dice })`

All orchestration APIs return discriminated result contracts (`ok: true|false`) for expected domain failures.

## Session Creation Rules

- explicit session id and timestamp input
- strict snapshot and metadata validation
- deterministic game reference derivation (or explicit caller override)
- initial empty records
- `createdAt === updatedAt`

## Record Construction Rules

`createAnalysisRecord(...)` verifies:

- snapshots and session refer to same game reference
- committed turn exists in snapshot-after history
- pre-turn and post-turn positions match committed history
- ranked analysis matches committed player and dice
- chosen move is derived from committed canonical move identity
- chosen move exists in factual outcomes
- chosen resulting position matches committed post-turn position
- evaluator consistency with session metadata

Pass/no-legal-move mapping is supported with strict invariants:

- pass turn -> `rankedAnalysis.kind = no-legal-moves`
- chosen move must be `null`
- fake pass moves are not synthesized

## Turn Numbering Policy

Sparse sessions are supported:

- turn numbers must be strictly ascending
- turn numbers must be unique
- gaps are allowed for intentionally partial analysis coverage

## Append and Idempotency

`appendAnalysisRecord(...)` is immutable and fail-closed.

- exact duplicate append for the same turn returns successful no-op (`idempotent: true`)
- conflicting duplicate append fails with `conflicting-record`
- decreasing or out-of-order appends fail

## Reconciliation

`reconcileAnalysisSession(...)` validates a stored session against a supplied snapshot.

Success statuses:

- `current`
- `game-advanced`

Failures include game mismatch, missing committed turns, move mismatch, and pre/post position mismatch.

The API never mutates or repairs session content.

## Annotation and Tag Policy

- trim strings
- reject empty values
- preserve first-seen order
- deduplicate exact duplicates

## Serialization

Envelope constants:

- `ANALYSIS_SESSION_FORMAT = backgammon-trainer-analysis-session`
- `ANALYSIS_SESSION_VERSION = 1`

Builder-created sessions are parse-compatible and deterministic through encode/decode round trips.
