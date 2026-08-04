# 2026-08-04 13:05 Completed-turn coach feedback boundary

## 1. Architectural cause

Two boundary leaks caused false "missing" and false "partial" coaching responses.

- Latest-turn review routing relied on question heuristics and a current-position baseline; when a completed move was not explicitly selected, analysis linkage could be lost unless rehydrated.
- Historical move matching used strict move fingerprints. Equivalent checker plays that differed only by die-order representation could fail strict lookup, leading to false "played move not evaluated" and inflated partial-coverage language.

## 2. Implementation fix

The fix keeps engine and structured analysis authoritative while making completed-turn feedback self-contained.

- Latest-committed review resolution now carries analysis-session records into the resolved history-turn context when available.
- Historical evidence now includes explicit completed-turn fields: player, dice, played move fingerprint, and pre/post positions.
- Historical evidence now includes explicit evaluation coverage status with canonical counting basis:
  - status (complete or partial)
  - providerReportedStatus
  - evaluatedMoveCount
  - totalLegalMoveCount
  - unevaluatedMoveCount
  - countingBasis = canonical-move-fingerprint
- Historical played-move lookup and recommendation support now use canonical-equivalent matching in addition to strict fingerprint matching.
- Prompt policy now explicitly instructs the coach to trust structured completed-turn fields, name exact missing fields only when truly absent, and avoid inferring coverage from unrelated array counts.

## 3. Future extension point

If retrieval changes from deterministic-only to semantic-augmented retrieval, completed-turn coaching should continue to anchor on deterministic turn identity and structured payload.

- Source of truth remains: committed turn number plus structured turn/evaluation payload.
- Retrieval can add supporting instructional context, but must not override completed-turn facts, evaluation status, or canonical coverage counts.
