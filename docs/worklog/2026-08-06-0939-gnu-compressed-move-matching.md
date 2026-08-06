# GNU Compressed Move Matching

Timestamp: 2026-08-06-0939 -0400

## Starting state

- Branch: `main`
- Starting HEAD: `5d12dcc4353ed8641fe8dae2dc68b656ab64f486`
- `origin/main`: `5d12dcc4353ed8641fe8dae2dc68b656ab64f486`
- Working tree at start: clean

Note: this start state is newer than the earlier milestone snapshot (`da4f317` / `51507a8`) and already includes an intermediate fix attempt commit (`5d12dcc`).

## Captured failure

Observed provider failure:

- `reason: invalid-provider-result`
- `message: GNU move is not present in the canonical legal move set: 6/1*.`
- request context: player `black`, dice `2,3`

## Sanitized deterministic reproduction

A focused deterministic regression was added in GNU matcher tests with this position:

- black checker on engine point 19
- white blot on engine point 24
- dice `2,3`
- black/white borne off counts `14/14`

Engine legal outcomes include both canonical variants:

1. `19 -> 21` (die 2), `21 -> 24` (die 3), hit on 24
2. `19 -> 22` (die 3), `22 -> 24` (die 2), hit on 24

Both variants resolve to the same `positionAfter`.

Pre-fix regression result: matcher returned `unknown-move` for GNU `6/1*`.

## Exact rejection layer

The rejection happened in `packages/backgammon-evaluator-gnubg/src/matching.ts` inside compressed-token collapse matching (`canCollapseMatch`).

Bug:

- intermediate-hit tracking incorrectly marked the final step hit (`*`) as an intermediate hit
- any compressed match that legitimately hit on the final destination was therefore rejected

This produced false `unknown-move` for valid compressed notation like `6/1*`.

## Point-orientation behavior

Verified and covered in tests:

- black GNU `6/1*` normalizes to engine `19/24*`
- white GNU `19/24*` normalizes to engine `19/24*`
- `*` is attached to and validated against final destination hit behavior

## `6/1*` interpretation

The adapter now correctly treats `6/1*` as compressed one-checker movement over multiple dice and matches legal engine outcomes by:

1. normalized source and destination
2. contiguous legal step chain
3. final hit marker agreement
4. resulting-position equivalence class

No independent rule application is introduced in adapter code.

## Matching design and identity boundary

Canonical identity remains unchanged:

- engine canonical move fingerprints still identify exact move variants
- committed history and application identity remain canonical

Evaluator-equivalent class identity remains distinct:

- class groups canonical variants that share resulting position
- one GNU row may score one evaluator-equivalent class
- class score propagates to canonical variants in ranked analysis

Deterministic representative rule:

- when one GNU row matches multiple canonical variants in one class, representative canonical move is chosen by stable lexical `getMoveFingerprint(...)` order

Fail-closed behavior preserved:

- no candidate -> invalid
- ambiguous candidates across different resulting positions -> invalid
- hit mismatch / orientation mismatch -> invalid

## Coverage and ranking effect

For the reproduced compressed case:

- raw canonical legal outcomes: `2`
- evaluator-equivalent class count: `1`
- GNU hint row count: `1`
- matched GNU row count: `1`
- matched class count: `1`
- unmatched rows: `0`
- coverage result: `complete`

Source-rank and score integrity:

- source rank (`providerRank`) preserved through parse -> match -> ranking
- normalized score preserved and attached to matched class
- `lossFromBest` remains deterministic (`0` for tied variants in same class)

## Diagnostics updates

Invalid GNU match failures now include bounded non-secret diagnostics in message text:

- source rank
- original notation
- normalized source/destination summary
- candidate count
- failure category (`unknown-move` or `ambiguous-move`)

No secret or raw subprocess output is surfaced.

## Tests added/updated

### Parser/matcher layer

- `packages/backgammon-evaluator-gnubg/test/matching.test.ts`
  - compressed black `6/1*` regression
  - black/white normalization assertions
  - malformed notation fail-safe check
  - hit-marker mismatch fail-closed checks
  - reversed-orientation mismatch check

### GNU evaluator package integration

- `packages/backgammon-evaluator-gnubg/test/evaluator.test.ts`
  - end-to-end compressed row fixture acceptance (`6/1*`)
  - class-level complete coverage with two canonical variants
  - deterministic rank/loss propagation checks

- Added fixture:
  - `packages/backgammon-evaluator-gnubg/test/fixtures/success-black-compressed-hit.txt`

### Server route deterministic regression

- `apps/server/test/server.test.ts`
  - evaluator route acceptance for captured black `2,3` compressed-hit case
  - verifies no `invalid-provider-result` for `6/1*` case

### Web lifecycle regression

- `apps/web/src/App.test.tsx`
  - complete class-level coverage from compressed-style scoring permits one automatic black move
  - confirms apply exactly once
  - confirms next turn becomes white
  - confirms no black learner observation attribution

## Direct route reproduction (real local GNU)

Local server status verified as configured and available in `gnubg` mode.

A sanitized direct POST to `/api/evaluator/evaluate-position` with real GNU returned:

- `ok: true`
- `coverage: complete`
- one scored row mapped to canonical engine fingerprint
- no `invalid-provider-result`

The route accepted the compressed case and produced evaluator provenance with GNU provider metadata.

## Real GNU acceptance (bounded)

Browser/app verification (bounded):

- active shell remained player-first (`You White`, `Computer Black`)
- automatic black opening turn application observed
- turn history recorded one black opening move
- control returned to white turn (`Turn: White`)

Compressed-notation mapping verification used direct real GNU route reproduction above, where GNU emitted compressed notation and adapter matched successfully.

## Remaining unmatched notation

- none in the captured compressed regression case

## Remaining limitations

- this fix is scoped to compressed checker-play matching and class mapping only
- no policy changes were made to opponent authority, coaching requirements, cube/match scope, or provider architecture

## Validation performed

Focused package checks:

- `pnpm --filter @backgammon-trainer/backgammon-analysis test`
- `pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg test`
- `pnpm --filter @backgammon-trainer/server test`
- `pnpm --filter @backgammon-trainer/web test`
- `pnpm --filter @backgammon-trainer/web build`

Targeted regression checks:

- GNU matcher regression test (`6/1*`)
- GNU evaluator compressed fixture regression
- server route compressed regression
- web lifecycle compressed-class auto-apply regression

## Commit/push

Pending at this worklog stage.

Implementation commit hash and push details are recorded after final repository gate and git operations complete.
