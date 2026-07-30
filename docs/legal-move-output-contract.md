# Legal Move Output Contract

## Scope

This document describes the observable output contract of `getLegalMoves(...)` and `applyMove(...)` as currently implemented in `packages/backgammon-engine/src/index.ts`.

## Public Move Application API

`applyMove(position, player, dice, move)` returns:

- `{ ok: true, position }` when the supplied move matches the current legal-move set.
- `{ ok: false, reason }` when the move is invalid.

Failure reasons are intentionally small:

- `illegal-move`: the supplied move is not currently legal for that position/player/dice.
- `invalid-step-sequence`: the supplied move shape is malformed (for example, empty or internally inconsistent step sequence).

Validation behavior:

- Supplied moves are validated against current legal moves from `getLegalMoves(...)`.
- Matching is explicit on ordered steps, step kinds, from/to points, die values, hit metadata, bear-off shape, and `dieIndex`.
- Final-board-only validation is not used.

Immutability behavior:

- On success, a new position is returned.
- On failure, no position is returned.
- Input position and supplied move are not mutated on success or failure.

## Move Meaning

- A `Move` is a completed turn candidate for one player.
- A `Move` contains ordered `MoveStep` values.
- Step order is part of move meaning.
- Distinct legal step orders are distinct `Move` values, even if they reach the same final board.

## MoveStep Semantics

Each step captures:

- `kind`: `point-to-point`, `enter-from-bar`, or `bear-off`
- `fromPoint` and `toPoint`
- `dieValue` used at that step
- hit metadata (`hitsBlot`, optional `hit`) when a blot is hit

## Doubles dieIndex Convention

Current convention:

- For non-doubles: `dieIndex` is `0` or `1` according to die-order traversal.
- For doubles: `dieIndex` is `0`, `1`, `2`, `3` for first through fourth doubles uses.

Contract decision for this milestone:

- `dieIndex` is execution metadata for die-use identity, not checker-identity semantics.
- Semantic duplicate analysis in tests treats ordered checker movements and hit/bear-off effects as primary identity and ignores `dieIndex`.
- For `applyMove(...)`, `dieIndex` must match exactly against a currently legal move.

## Duplicate Behavior (Current)

Confirmed by audit tests:

- No semantic duplicates were observed in audited branching non-double and doubles scenarios.
- No duplicate-producing path is currently confirmed in the implemented traversal.

Plausible paths reviewed:

- Non-doubles (two die orders): currently produce distinct ordered step sequences when both orders are legal.
- Doubles recursion: branches were reviewed for convergence to identical ordered step lists; none were confirmed in tested scenarios.

## Ordering Behavior (Current)

Current implementation is deterministic in practice for identical input:

- Non-doubles traverse die orders as `0->1` then `1->0`.
- Single-step generation traverses occupied points in ascending point index order.
- Recursive expansion is depth-first in generation order.
- Filtering preserves the relative order of retained candidates from assembled candidates.

## What Consumers May Rely On

Safe to rely on:

- Returned moves are legal under current implemented rules.
- Step order inside each `Move` is meaningful and preserved.
- Doubles steps use die indices `0..3` in order.
- Non-doubles and doubles use maximum-step filtering rules already implemented.

## Intentionally Unspecified

Not guaranteed by public API contract:

- Deterministic ordering of the `moves` array across versions.
- Deduplicated output.
- Stable ordering between semantically distinct alternatives beyond current implementation behavior.

Consumers should treat returned move ordering as an implementation detail unless a future API contract explicitly guarantees ordering.
