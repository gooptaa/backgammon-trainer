# ADR 0013: Cross-Game Learner Progress Uses a Versioned Local Profile Derived from Committed Evidence

- Status: Accepted
- Date: 2026-08-04

## Context

Deterministic move classification now exists for committed historical decisions, but there was no authoritative cross-game learner identity or durable local profile boundary for progress questions such as:

- How am I doing?
- How many serious mistakes have I made lately?
- Am I improving?

Without explicit ownership and persistence boundaries, the system could misattribute opponent decisions, duplicate counts across repeated review/hydration paths, or let model prose invent progress claims.

## Decision

Adopt a versioned local learner-profile boundary under `@backgammon-trainer/backgammon-coach` and keep browser storage mechanics in `apps/web`.

Boundary commitments:

- learner ownership is explicit per lineage and separate from checker-color semantics
- eligible learner observations are derived from committed learner checker-play turns only
- observation identity and reconciliation are deterministic and idempotent
- classification policy identity/version are preserved per observation
- aggregation is policy-compatible (`current-policy-only`) and deterministic
- trend evidence is conservative and emitted only with sufficient compatible classified samples

Persistence commitments:

- profile payload is local-only browser storage in this milestone
- profile schema is versioned and validated on read
- malformed stored profile data fails safe to fresh in-memory/local state
- unsupported future profile versions are not destructively rewritten
- explicit clear operation exists for learner profile data

## Consequences

- progress evidence can be surfaced consistently without attributing opponent turns to the learner
- repeated review/reconciliation paths cannot inflate counts for the same committed learner turn
- policy-version compatibility is explicit, preventing silent semantic merge across incompatible policy versions
- gameplay remains available even when profile storage is unavailable or corrupt

## Rejected alternatives

### Persist learner profile inside engine `GameSnapshot`

Rejected because learner ownership/profile data is product metadata, not deterministic game-rule state.

### Let language-model output define progress and trends

Rejected because progress facts must be deterministic and auditable before model generation.

### Add server-side profile storage in this milestone

Rejected to preserve local-first privacy and avoid account/auth/database scope expansion.

## Stability commitment

This boundary is expected to remain stable across evaluator/provider changes:

- committed-turn evidence remains authoritative source material
- classification policy versions can evolve deliberately without rewriting historical meaning
- future export/import or sync features can compose on top of this local profile boundary
