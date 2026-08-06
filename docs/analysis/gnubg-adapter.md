# GNU Backgammon Evaluator Adapter Spike

## Purpose

This document describes the Node-only GNU Backgammon evaluator adapter spike that normalizes GNU-oriented transcript output into the existing provider-neutral `PositionEvaluator` contract.

Current package:

- location: `packages/backgammon-evaluator-gnubg`
- package name: `@backgammon-trainer/backgammon-evaluator-gnubg`

This adapter now powers real checker-play evaluation behind the trusted server boundary while preserving provider-neutral analysis contracts.

## Runtime boundary and dependency direction

Dependency direction:

- `@backgammon-trainer/backgammon-engine` -> `@backgammon-trainer/backgammon-analysis` -> `@backgammon-trainer/backgammon-evaluator-gnubg` -> future Node host

Runtime boundary:

- the package is Node-only
- browser bundles must not import it
- `apps/web` continues to use no evaluator or the explicit synthetic fixture evaluator
- the package owns process execution only behind an injected runner abstraction

## Public API

Root exports:

- `createGnuBgPositionEvaluator(...)`
- `detectGnuBg(...)`
- `parseGnuBgEvaluationOutput(...)`

Node subpath:

- `@backgammon-trainer/backgammon-evaluator-gnubg/node`
- `createNodeGnuBgProcessRunner(...)`

Testing subpath:

- `@backgammon-trainer/backgammon-evaluator-gnubg/testing`
- fake process-runner helpers for transcript-driven tests

## Capability detection

`detectGnuBg(...)` checks:

- executable availability
- version invocation success
- help invocation success
- whether `--tty` and `--commands` are advertised

Capability result states distinguish:

- `available`
- `unavailable`
- `incompatible`
- `detection-failed`

Important limitation:

- availability does not imply live checker-play analysis is verified
- capability checks only executable/runtime prerequisites; request-time failures are still possible and must fail closed

## Observed environment status for this milestone

Local investigation result in this repository environment:

- `command -v gnubg` returned no path
- `gnubg --version` and `gnubg --help` were unavailable because the executable is not installed here

Reference used for CLI option grounding:

- Ubuntu and Debian `gnubg(6)` manpage mirrors advertise `--tty`, `--commands`, `--no-rc`, `--quiet`, and `--version`

Truth boundary:

- local runtime capability depends on the contributor environment
- CI and ordinary tests remain GNU-free by design

## Process-runner abstraction

The adapter defines an injectable boundary:

```ts
interface GnuBgProcessRunner {
  run(request: GnuBgProcessRequest): Promise<GnuBgProcessResult>;
}
```

Request shape:

- executable path or command name
- argument array
- stdin text
- timeout in milliseconds

Result shape:

- successful process execution with `exitCode`, `stdout`, and `stderr`
- normalized failures: `unavailable`, `timeout`, `spawn-failed`

Node implementation details:

- direct `spawn(...)`
- no shell interpolation
- stdout and stderr captured separately
- timeout kills the child process and returns normalized failure

## Position translation and orientation mapping

The translation layer produces deterministic GNU-oriented board state used for matching and request serialization.

Engine conventions remain authoritative:

- White moves `24 -> 1 -> off`
- Black moves `1 -> 24 -> off`
- White home board is `1..6`
- Black home board is `19..24`

Spike GNU-oriented normalization:

- board points are normalized to the player on roll
- GNU point `24` is the roller's farthest point
- GNU point `1` is the roller's home-board edge nearest bear off

Mapping rules:

- White on roll: engine point `p` maps to GNU point `p`
- Black on roll: engine point `p` maps to GNU point `25 - p`
- roller bar and opponent bar remain separate explicit counts
- roller off and opponent off remain separate explicit counts

This mapping is covered by focused tests for:

- starting position
- White-on-roll orientation
- Black-on-roll orientation
- bar counts
- borne-off counts
- mirrored positions
- invalid checker accounting rejection

## Move notation parsing and canonical matching

The parser currently supports a narrow transcript notation subset using step tokens like:

- `8/7`
- `8/7*`
- `bar/24`
- `2/off`

Matching behavior:

- parse GNU-style coordinate text into ordered coordinate steps
- convert coordinates back into canonical engine coordinates using player-on-roll mapping
- compare against the complete canonical legal move set supplied by analysis
- support compressed GNU checker-play notation where one token may represent a multi-die path for one checker (for example `6/1*`)
- keep canonical `Move` identity internal by returning `getMoveFingerprint(canonicalMove)`

Ambiguity policy:

- if one parsed GNU move matches no canonical legal move, the adapter rejects the result
- if one parsed GNU move matches multiple canonical moves that resolve to different resulting positions, the adapter rejects the result
- if one parsed GNU move matches multiple canonical moves that resolve to one canonical-equivalent resulting position class (for example legal die-order variants), the adapter accepts the row and deterministically selects a canonical representative by stable fingerprint order
- coordinate-equivalent canonical moves that differ by die-index metadata remain distinct canonical identities even when one evaluator-equivalent class score is shared across them

## Transcript parser and score normalization

`parseGnuBgEvaluationOutput(...)` is a pure parser for a documented spike transcript form.

Current accepted transcript markers:

- `format: checker-play-v1`
- `coverage: complete|partial`
- `perspective: player-on-roll|opponent-of-player-on-roll`
- `score-scale: equity-points`

Current score interpretation:

- the adapter only labels scores as `equity` when the transcript explicitly marks `equity-points`
- normalized score direction remains: higher is better for the player on roll
- if a transcript explicitly says the source perspective is the opponent of the player on roll, the score sign is inverted during normalization

Parser behavior is still strict and fail-closed; malformed or unmatched output is mapped to shared invalid-provider-result failure semantics.

## Coverage policy

Preferred long-term behavior remains complete scoring of all legal moves.

Current spike behavior:

- supports `complete` and `partial` provider coverage
- coverage completion is interpreted over canonical-equivalent legal move classes (same resulting position), not raw canonical move rows
- partial coverage preserves explicit warnings and leaves remaining legal moves unevaluated in the shared analysis layer
- the adapter does not invent scores for omitted moves

## Provenance and failure mapping

Successful results include provenance with:

- `provider: "gnubg"`
- observed provider version or `unknown`
- adapter version
- JSON-safe settings

Settings currently record only spike-safe facts such as:

- executable basename
- invocation mode label
- output format label
- whether live analysis was verified

Adapter failure mapping uses shared analysis reasons:

- unavailable executable -> `unavailable`
- timeout -> `timeout`
- process spawn/exit failure -> `provider-failed`
- malformed transcript, unknown moves, ambiguity -> `invalid-provider-result`
- invalid board accounting -> `unsupported-position`

Raw stderr is intentionally not surfaced as the user-facing message.

## Transcript fixture origin

Fixture policy in this milestone:

- version/help capability expectations are grounded in public `gnubg(6)` manpage text
- checker-play transcript fixtures are synthetic spike fixtures
- synthetic fixtures are not described as captured real GNU output

The package tests do not require GNU Backgammon installation.

## Smoke command

Local smoke command:

```bash
pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg smoke
```

Current behavior:

- detect GNU Backgammon capability first
- print concise JSON-line status output
- return success with an unavailable message when `gnubg` is not installed
- when available, run a bounded checker-play request and report normalized result metadata
- avoid writing repository files

## Browser exclusion

This package is intentionally excluded from the browser sandbox:

- no web import was added
- no Node polyfills were introduced
- no executable paths are exposed to browser UI

## Known limitations

- command bridge depends on GNU Python bindings available in local installation
- no rollout support
- no cube state or match score
- no persistent evaluation records
- no coaching or recommendation labels

## Next production-integration step

The next required step is to capture and document one successful local or CI-optional GNU checker-play invocation transcript, then replace the current fail-closed request-factory placeholder with a verified command builder and smoke path.
