# ADR 0008: Curated Knowledge Retrieval Boundary

Date: 2026-08-03

## Status

Accepted

## Context

The coaching pipeline needs a small amount of educational guidance in addition to deterministic facts and evaluator-attributed move evidence.

That guidance must be:

- repository-owned
- browser-safe
- deterministic and inspectable
- replaceable by future semantic retrieval
- independent from provider SDKs

The previous coaching milestone already established a provider-neutral knowledge retriever boundary in `@backgammon-trainer/backgammon-coach`, but only with no-op and fixture implementations.

This milestone needs a durable placement for real curated content without forcing the coach package to own content authoring, parsing, and validation details forever.

## Decision

Keep the retriever boundary in `@backgammon-trainer/backgammon-coach`.

Introduce `@backgammon-trainer/backgammon-knowledge` as a separate lower-level package that owns:

- curated knowledge taxonomy
- project-authored markdown source
- deterministic source validation
- browser-safe generated corpus delivery
- deterministic local retrieval helper implementation

`@backgammon-trainer/backgammon-coach` remains responsible for:

- deciding which factual retrieval concepts to derive from trusted evidence
- resolving move references from the question against legal candidates
- selecting bounded legal move evidence for the request
- composing deterministic evidence and curated guidance into the prompt request

## Consequences

Positive:

- curated knowledge can evolve independently from coach orchestration
- browser bundles receive checked-in generated source instead of runtime filesystem access
- future semantic retrieval can replace the local matcher without changing callers of `CoachKnowledgeRetriever`
- deterministic facts, evaluator evidence, and general guidance remain architecturally separate

Tradeoffs:

- one additional workspace package must be maintained
- markdown source and generated source must stay in sync
- taxonomy changes now require deliberate cross-file updates

## Rejected alternatives

### Keep curated content entirely inside `@backgammon-trainer/backgammon-coach`

Rejected because it would mix durable content ownership, validation, and browser-delivery mechanics into the orchestration layer.

### Put retrieval implementation in web code

Rejected because retrieval behavior needs to remain provider-neutral, testable outside React, and reusable by future non-web hosts.

### Introduce a semantic/vector dependency now

Rejected because it would add unnecessary infrastructure before the repository has validated the information boundary and inspection model.

## Stability commitment

Future retrieval implementations may change:

- matching algorithm
- index structure
- local versus remote retrieval mechanics
- semantic ranking approach

The following should remain stable across that evolution:

- `CoachKnowledgeRetriever` boundary
- coach orchestration flow
- evidence-selection responsibilities
- prompt structure responsibilities
- web conversation workflow
- persistence exclusions
