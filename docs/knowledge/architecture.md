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

Never implements game rules.

Always delegates to the engine.
