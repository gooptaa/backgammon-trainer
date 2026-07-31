# Architecture

## Packages

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

Current analysis-capture boundaries:

- capture uses `@backgammon-trainer/backgammon-analysis-session` builders (`createAnalysisRecord`, `appendAnalysisRecord`)
- capture is triggered from canonical committed turn paths, not from staged preview state
- stale evaluator responses are dropped by request identity + decision-key checks
- analysis sessions are memory-only and excluded from game snapshot persistence
- browser code does not import `@backgammon-trainer/backgammon-evaluator-gnubg`
