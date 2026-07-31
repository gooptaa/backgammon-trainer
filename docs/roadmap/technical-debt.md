# Technical Debt Inventory

Date: 2026-07-31

Source scan command:

`grep -RInE "TODO|FIXME|HACK|XXX" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=dev-dist --exclude-dir=coverage --exclude-dir=test-results`

Result summary:

- No actionable architecture TODO/FIXME/HACK/XXX markers were found in source or docs.
- One `XXX` match appeared in `pnpm-lock.yaml` integrity text and was not a debt marker.

## Immediate

- None identified from repository marker scan.

## Future

- Add a markdown lint/link-check step to detect stale links and heading drift automatically.
- Add API surface diff checks when package exports change.

## Intentional

- GNU live checker-play invocation remains intentionally unverified and fail-closed pending validated transcripts.
- Analysis session persistence remains intentionally separate and not yet implemented in web/server persistence layers.

## Blocked

- Global game-identity uniqueness for analysis sessions remains blocked on introducing durable game IDs beyond origin-derived references.
