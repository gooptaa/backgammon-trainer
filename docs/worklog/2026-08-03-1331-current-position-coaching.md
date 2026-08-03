# Evidence-Backed Current Position Coaching

Timestamp: 2026-08-03-1331

Previous worklog: docs/worklog/2026-08-03-1247-openai-compatible-coach-provider.md

Goal:

Establish a durable recommendation-authority boundary for current-position coaching so move-ranking claims are determined from evaluator evidence before language generation, while preserving provider-neutral model contracts and browser/Node separation.

## Starting point

- active branch: `main`
- starting commit: `53dbe654b427e2efc6cb801d20bff1d737da1c03`
- expected prior closure commit (`f7df80589f010a58c2e09e44d604199ae023f30c`) verified as ancestor of current `main`

Ending commit is recorded in milestone completion report.

## Repository findings that shaped implementation

- Coach evidence already separated deterministic facts, evaluator attribution, and curated knowledge.
- Current prompt guidance lacked an explicit recommendation-support decision object.
- Web already evaluated current positions when a `PositionEvaluator` is configured, but server-backed evaluator wiring was missing.
- Existing stale-response handling and request snapshot semantics were already implemented in the Coach panel.
- GNU adapter boundary remains Node-only; browser must continue using provider-neutral routes.

## Product capability delivered

Implemented evidence-backed current-position recommendation authority with:

- deterministic recommendation-support resolution before model generation
- explicit distinction between authoritative, strongest-evaluated, and not-supported recommendation states
- fixture-evaluator blocking for authoritative strongest-move claims
- missing evaluator and non-decision-state claim blocking
- prompt instructions conditioned on recommendation-support status
- server-hosted evaluator status and evaluate-position routes
- browser server evaluator adapter integration with existing evaluation pipeline
- Coach panel analysis-pending status and submit guard while current-position evaluation is running

## Recommendation authority behavior

Current-position recommendation support now resolves in coach evidence as one of:

- `supported` + `complete-trustworthy-coverage` with `authoritative` recommendation
- `supported` + `partial-coverage` with `strongest-evaluated` recommendation
- `not-supported` for:
  - fixture evaluator provenance
  - missing evaluator evidence
  - non-decision state
  - no legal move state

Language generation receives this state and is instructed accordingly.

## Evaluator availability and runtime path

Before milestone:

- web used only local dev fixture evaluator path (`VITE_ENABLE_FIXTURE_EVALUATOR=true`)
- no provider-neutral server evaluator route existed for browser evaluation requests

After milestone:

- server exposes:
  - `GET /api/evaluator/status`
  - `POST /api/evaluator/evaluate-position`
- server evaluator runtime modes:
  - `EVALUATOR_PROVIDER=none`
  - `EVALUATOR_PROVIDER=mock` (fixture evaluator)
- web can bootstrap server evaluator adapter when evaluator provider is configured
- browser remains GNU-free and Node-process-free

## Dependency direction and package placement

- Recommendation authority logic is in `@backgammon-trainer/backgammon-coach`.
- Factual analysis remains in `@backgammon-trainer/backgammon-analysis`.
- Evaluator provider execution remains in `apps/server`.
- Browser evaluator transport adapter is in `apps/web` and uses provider-neutral contracts.

No new package export surfaces were added.

## Complete, partial, fixture, and missing behavior

- complete trusted coverage: allows authoritative top-move claim
- partial trusted coverage: allows strongest-evaluated claim with caveat
- fixture coverage: ranking visible but blocked from authoritative coaching claims
- missing evaluator: no strongest-move claim permitted

## Candidate comparison and grounding

- Candidate selection and move-reference behavior remain deterministic and legal-move constrained.
- Any supported recommendation move identity must map to canonical legal move fingerprints.
- Omitted evidence rows are not treated as illegal.

## Prompt integration

Prompt construction now adds recommendation-state-specific instruction text while preserving provider neutrality and bounded structured evidence transport.

## Pending/stale behavior

- Request snapshot semantics unchanged.
- Prior-lineage stale model responses remain ignored.
- Coach submit is disabled when current-position evaluator analysis is pending and evaluator is configured.
- Gameplay remains usable during pending evaluation/model work.

## Failure and degradation behavior

- Unconfigured evaluator route returns explicit `503` unconfigured failure.
- Invalid/oversized evaluator requests are rejected with bounded error responses.
- Evaluator failures degrade to non-authoritative coaching guidance rather than fabricated strongest-move claims.
- No fallback from real provider failure to fixture model output was added.

## Persistence, security, and privacy impact

- No new persistence added for coach/evaluator requests or responses.
- Provider credentials remain server-side only.
- Browser does not select arbitrary upstream provider destinations.
- Browser does not import GNU adapter or Node-only process code.

## Public API impact

- `@backgammon-trainer/backgammon-coach` evidence now includes recommendation-support metadata.
- No new workspace package exports.
- Server evaluator routes are app internals.

## Engine, analysis, analysis-session, evaluator, server, web impact

- engine: no rule/legality changes
- analysis: no ranking contract changes; consumed as factual/evaluator source
- analysis-session: no format or persistence changes
- GNU adapter: unchanged, still optional Node boundary
- server: evaluator runtime and routes added
- web: server evaluator adapter + coach analysis-pending UX + runtime bootstrap wiring

## Tests added/updated

Updated:

- `packages/backgammon-coach/test/coach.test.ts`
  - recommendation support for complete trusted coverage
  - recommendation support for partial trusted coverage
  - fixture recommendation blocking
  - prompt instruction for missing evaluator evidence
- `apps/server/test/server.test.ts`
  - evaluator status route
  - evaluator evaluate-position route
  - evaluator unconfigured failure path
- `apps/web/src/features/coach/CoachPanel.test.tsx`
  - analysis-pending submit disable state

Added:

- `apps/web/src/features/analysis-session/serverPositionEvaluator.test.ts`

## Documentation created/updated

Created:

- `docs/adr/0010-recommendation-authority-before-generation.md`
- `docs/worklog/2026-08-03-1331-current-position-coaching.md`

Updated:

- `.env.example`
- `README.md`
- `docs/README.md`
- `docs/architecture/overview.md`
- `docs/architecture/dependency-guardrails.md`
- `docs/architecture/public-api-audit.md`
- `docs/coach/conversation-foundation.md`
- `docs/coach/evidence-selection-knowledge-retrieval.md`
- `docs/coach/openai-compatible-provider.md`
- `docs/knowledge/architecture.md`
- `packages/backgammon-coach/README.md`
- `packages/backgammon-analysis/README.md`
- `packages/backgammon-evaluator-gnubg/README.md`
- `apps/server/README.md`
- `apps/web/README.md`

## Validation performed during implementation

- `CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test`
- `CI=1 pnpm --filter @backgammon-trainer/server test`
- `CI=1 pnpm --filter @backgammon-trainer/web test -- --run src/features/coach/CoachPanel.test.tsx src/features/analysis-session/serverPositionEvaluator.test.ts`

Full matrix validation is recorded in completion report.

## Deviations from prompt

- Real non-fixture GNU checker-play invocation is still not enabled by default because GNU invocation wiring remains intentionally separate and optional; evaluator route currently ships with explicit `none` and fixture `mock` modes.

## Unresolved limitations

- No built-in real GNU checker-play command pipeline in server runtime by default.
- Evaluator server mode currently fixture-backed for deterministic CI/development behavior.

## Intentionally deferred capabilities

- last-move review
- full-game review
- mistake classification and habit modeling
- conversation persistence
- semantic retrieval
- additional model families
- streaming/tool-calling/multimodal
