# GNU Backgammon Evaluator Adapter

Node-only GNU Backgammon evaluator adapter spike for Backgammon Trainer.

What this package does:

- detects whether `gnubg` is available and advertises required CLI options
- defines an injectable process-runner boundary
- translates canonical engine positions into a deterministic GNU-oriented board model
- parses narrow transcript fixtures into normalized evaluator scores
- matches GNU-style move notation back to canonical legal moves
- returns results through the existing `PositionEvaluator` contract
- provides an unavailable-safe local smoke command

What this package does not do:

- run in the browser
- modify engine legality or move identity
- provide heuristic fallback scores
- generate coaching prose
- claim live checker-play automation is verified in this milestone

## Node-only warning

This package is Node-only. Do not import it into `apps/web` or any browser bundle.

## Installation boundary

This repository uses pnpm workspaces. The package is available internally as:

- `@backgammon-trainer/backgammon-evaluator-gnubg`
- `@backgammon-trainer/backgammon-evaluator-gnubg/node`
- `@backgammon-trainer/backgammon-evaluator-gnubg/testing`

## Minimal capability detection example

```ts
import { detectGnuBg } from "@backgammon-trainer/backgammon-evaluator-gnubg";
import { createNodeGnuBgProcessRunner } from "@backgammon-trainer/backgammon-evaluator-gnubg/node";

const capability = await detectGnuBg({
  processRunner: createNodeGnuBgProcessRunner()
});

if (!capability.ok) {
  console.log(capability.status, capability.message);
} else {
  console.log(capability.parsedVersion, capability.analysisInvocation.message);
}
```

## Minimal evaluator example

```ts
import { createGnuBgPositionEvaluator } from "@backgammon-trainer/backgammon-evaluator-gnubg";
import { createNodeGnuBgProcessRunner } from "@backgammon-trainer/backgammon-evaluator-gnubg/node";

const evaluator = createGnuBgPositionEvaluator({
  processRunner: createNodeGnuBgProcessRunner(),
  analysisRequestFactory: ({ executable, timeoutMs }) => ({
    ok: true,
    processRequest: {
      executable,
      args: ["-t", "-q", "-r", "--commands=/path/to/verified-commands-file"],
      stdin: "",
      timeoutMs
    },
    settings: {
      invocationMode: "host-verified",
      analysisCommandVerified: true
    }
  })
});
```

Important truth boundary:

- this milestone does not ship a verified default live checker-play command builder
- the default evaluator fails closed until a host supplies one

## Smoke command

```bash
pnpm --filter @backgammon-trainer/backgammon-evaluator-gnubg smoke
```

Current smoke behavior:

- prints unavailable status if `gnubg` is not installed
- prints skipped or unverified status when live checker-play automation is not verified
- never writes repository files

## Current limitations

- transcript parser shape is spike-specific
- checker-play command invocation remains unverified in this repository milestone
- no rollout, cube, or match-score support
- no browser integration
