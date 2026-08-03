# Architecture

## Packages

### backgammon-knowledge

Curated browser-safe educational content and retrieval helpers.

Responsibilities:

- canonical project-authored coaching knowledge
- controlled taxonomy for teaching concepts
- deterministic source validation
- browser-safe generated corpus export
- deterministic local retrieval helpers

Does not contain:

- React components
- game rules
- factual board analysis
- provider SDKs
- remote retrieval

### backgammon-engine

Pure game rules.

Responsibilities:

- move generation
- legality
- move application
- game completion
- turn orchestration

Does not contain:

- rendering
- animations
- coaching
- UI formatting

---

### web

User interface.

Responsibilities:

- rendering
- user interaction
- formatting
- state ownership
- analysis-capture orchestration for fixture-ranked decisions
- in-memory analysis-session inspection

Never implements game rules.

Always delegates to the engine.

Current knowledge boundaries:

- the browser consumes curated guidance through `@backgammon-trainer/backgammon-coach`
- authored markdown is canonical source, while generated TypeScript is the browser-safe delivery artifact
- no runtime filesystem access is used in browser coaching flows
- real provider execution (when configured) occurs in server runtime and does not change knowledge package responsibilities

Current analysis-capture boundaries:

- capture uses `@backgammon-trainer/backgammon-analysis-session` builders (`createAnalysisRecord`, `appendAnalysisRecord`)
- capture is triggered from canonical committed turn paths, not from staged preview state
- stale evaluator responses are dropped by request identity + decision-key checks
- analysis sessions are memory-only and excluded from game snapshot persistence
- browser code does not import `@backgammon-trainer/backgammon-evaluator-gnubg`
