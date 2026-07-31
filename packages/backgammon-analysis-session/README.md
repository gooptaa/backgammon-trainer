# Backgammon Analysis Session

Versioned analysis-session domain model and validation boundary for analysis persistence.

What this package does:

- defines immutable session, record, metadata, and summary contracts
- separates deterministic game snapshots from versioned analysis interpretation
- validates analysis-session envelopes, versions, metadata, record ordering, and ranked-analysis integrity
- preserves evaluator provenance in canonical serialized form
- provides stable JSON encode/decode entry points

What this package does not do:

- browser storage
- backend persistence
- evaluator invocation
- coaching prose
- lesson generation

Dependency direction:

- depends on `@backgammon-trainer/backgammon-analysis` and `@backgammon-trainer/backgammon-engine`
- no React, DOM, browser storage, process, or network dependencies

Core APIs:

- `serializeAnalysisSession(session)`
- `parseAnalysisSession(input)`
- `encodeAnalysisSession(session)`
- `decodeAnalysisSession(text)`
- `summarizeAnalysisSession(session)`
