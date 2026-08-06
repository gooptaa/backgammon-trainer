# Backgammon Trainer — Claude Code Guide

Inspected at: branch `main`, HEAD `7ce1f46` ("fix(server): accept bounded coach instruction sets"). Verify `git log -n 5` at the start of any session — this repo advances in fast, worklogged milestones and this snapshot ages quickly.

## What this is

Backgammon Trainer is a long-lived, open-source, AI-native educational backgammon app. It is **not** just a board, a game engine, an evaluator wrapper, or a chatbot — it combines a deterministic engine, a real GNU Backgammon evaluator, evidence-grounded conversational coaching, curated knowledge, deterministic mistake classification, and local learner-progress tracking. The goal is skill development, not just playing games. Read `README.md` for the current "Implemented now / Not implemented yet" list before assuming any capability exists — it is the single most current top-level status source, more current than `docs/roadmap.md` (which is stale — see Corrections below).

## Authority hierarchy — the load-bearing invariant

This is the idea every other rule in the repo exists to protect:

```
Engine legality & committed game state
  > Evaluator evidence (provider-neutral, coverage/provenance-tagged)
  > Deterministic recommendation / classification / pattern policy (versioned, in backgammon-coach)
  > Factual analysis (backgammon-analysis)
  > Curated knowledge (backgammon-knowledge — general teaching guidance, not position-specific authority)
  > Language-model interpretation (explains only what's already been decided deterministically)
```

The LLM must never decide: legality, which move was played, evaluator's top move, whether evaluator coverage is complete, whether a move was a mistake, which pattern is supported, mistake counts, or learner side. All of that resolves deterministically in `backgammon-coach` _before_ prompt construction. If you're about to let a prompt or model call make one of these decisions, stop — that's an architecture violation, not a shortcut.

Coverage semantics are not interchangeable: **complete / partial / fixture / missing / failed / unavailable** evaluator evidence must stay visibly distinct through UI, coach, classifier, and profile. Fixture evidence never supports authoritative move claims (ADR 0010).

## Package map (verified against `packages/` and `docs/architecture/overview.md`)

| Package                       | Owns                                                                                                                                                                        | Depends on                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `backgammon-domain`           | shared canonical types/constants                                                                                                                                            | nothing app/UI/provider                                       |
| `backgammon-engine`           | legal moves, application, turns, snapshots, history                                                                                                                         | domain only                                                   |
| `backgammon-analysis`         | factual position/move-outcome features, evaluator contract, ranking, fixture evaluator                                                                                      | engine                                                        |
| `backgammon-analysis-session` | versioned, committed-turn-linked interpretation records                                                                                                                     | analysis, engine                                              |
| `backgammon-evaluator-gnubg`  | Node-only GNU detection/invocation/parsing/move-mapping (`/node`, `/testing` subpaths)                                                                                      | analysis, engine, Node stdlib                                 |
| `ai-contracts`                | provider-neutral `ChatModel` request/response contracts                                                                                                                     | nothing backgammon-specific                                   |
| `backgammon-knowledge`        | authored Markdown → validated generated corpus → deterministic lexical retrieval                                                                                            | nothing app/UI/provider/rules                                 |
| `backgammon-coach`            | conversation model, context/evidence/retrieval-plan/prompt orchestration, recommendation authority, classification policy, learner-profile domain, pattern-detection policy | ai-contracts, engine, analysis, analysis-session, knowledge   |
| `shared`                      | tiny cross-cutting transport types                                                                                                                                          | nothing                                                       |
| `apps/server`                 | trusted execution of real providers/GNU, config loading, routes                                                                                                             | ai-contracts, shared, optionally domain                       |
| `apps/web`                    | board, gameplay, Coach UI, browser persistence, profile UI                                                                                                                  | most packages except `backgammon-evaluator-gnubg` (forbidden) |

Forbidden edges are enforced by `pnpm architecture:check` (`scripts/validate-architecture.mjs`) and ESLint `no-restricted-imports` — see `docs/architecture/dependency-guardrails.md` for the exact list before adding an import that feels boundary-adjacent. Notably: engine/analysis/analysis-session must never depend on coach or knowledge; ai-contracts must never depend on any backgammon package; web must never import `backgammon-evaluator-gnubg`.

`backgammon-coach` is intentionally accumulating a lot (conversation, evidence, recommendation authority, classification, patterns, learner profile, knowledge retrieval planning). The repo's own docs flag this as worth _watching_, not casually splitting — don't refactor package boundaries without a concrete cohesion problem and an ADR.

## Documentation — read in this order

1. `README.md` — current implemented/not-implemented status (most current single source)
2. `docs/README.md` — full doc index
3. `docs/architecture/overview.md` + `docs/architecture/dependency-guardrails.md`
4. All 14 ADRs in `docs/adr/` (short, each ~30-70 lines) — these encode _why_, and rejected alternatives matter as much as decisions
5. `docs/coach/*`, `docs/analysis/*`, `docs/knowledge/*` for domain detail
6. `docs/worklog/` in reverse chronological order — most current record of what actually happened, including rejected approaches and deferred work. The latest worklog + `git log` outrank this guide and outrank `docs/roadmap.md`.
7. Package `README.md` files — each states Purpose, Responsibilities, Allowed/Forbidden Dependencies, Public API, Non-goals. Read the target package's README before touching it.

## Knowledge corpus workflow

Canonical source is authored Markdown in `packages/backgammon-knowledge/content/`. Generated TypeScript corpus (`src/generated/corpus.ts`) is a build artifact — do not hand-edit it. After editing content:

```bash
pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:generate
pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check
```

Retrieval is deterministic and lexical by design (no embeddings/vector store yet) behind the `CoachKnowledgeRetriever` boundary in `backgammon-coach`, so a future semantic retriever can swap in without touching orchestration. Cube content is intentionally unsupported — retrieval returns deterministic no-match, not irrelevant fallback content.

## Configuration and secrets

- Root `.env.local` (gitignored) is the single local dev config file, copied from tracked `.env.example`.
- Anything without a `VITE_` prefix is server-only and must never be read in browser code; provider/GNU credentials and process config stay server-side.
- `pnpm config:check` reports a non-secret config summary.
- I may read `.env.local` directly when the user asks me to start the app or to review it for completeness/correctness (e.g. checking required keys are present, catching typo'd variable names, confirming `VITE_`-prefix hygiene). This is expected working access, not an exception to ask permission for each time.
- Even with read access, don't gratuitously echo real secret values (API keys, tokens) into conversation output — describe findings ("`OPENAI_COMPAT_API_KEY` is set", "missing `EVALUATOR_PROVIDER`") rather than pasting the value. If the user explicitly asks to see a specific value, that's their call.
- Never commit, copy into a tracked file, or otherwise persist `.env.local` contents anywhere outside this local session.
- Fixture mode (`MODEL_PROVIDER=mock`/`EVALUATOR_PROVIDER=none|mock`) needs no credentials and is the default safe dev path.
- Live provider/GNU smoke tests are explicit opt-in only (`ALLOW_LIVE_PROVIDER_SMOKE=true`, `ALLOW_GNUBG_SMOKE=true`) and require a running server — never run these unprompted, and never in place of the normal deterministic test suite.

## Testing and validation

Every package uses plain `vitest run` (no `CI=1` gating convention in this repo — don't invent one). Normal tests are network-free, credential-free, GNU-free, deterministic. Composite gate:

```bash
pnpm check   # format:check -> architecture:check -> knowledge:check -> lint -> typecheck -> test -> build
```

During a milestone: run focused package tests while iterating (`pnpm --filter @backgammon-trainer/<pkg> test`), then run the full `pnpm check` once near the end rather than repeatedly. Don't reflexively rerun the whole matrix before _and_ after every small change.

## Milestone workflow (as practiced in worklogs)

1. Confirm branch/HEAD/clean tree.
2. Read relevant docs/ADRs/worklogs and code.
3. Run focused baseline tests.
4. Implement the scoped change.
5. Run focused tests while developing.
6. Run `pnpm check` once at the end.
7. Update docs and add a worklog entry under `docs/worklog/YYYY-MM-DD-HHMM-<slug>.md` (see existing entries for the expected sections: root cause/goal, architectural decisions, implementation decisions, tests, deviations, remaining limitations).
8. Review staged diff, commit narrowly, push to `main`, verify final `git status`.

This repo pushes directly to `main` per its own worklog pattern (no long-lived feature branches observed) — but **only take commit/push actions when the user actually asks**, per standing Claude Code instructions; don't assume the milestone rhythm authorizes autonomous commits.

## Collision avoidance

Another agent may be actively working in this tree.

- Never assume uncommitted or unfamiliar changes are safe to discard — always `git status` first, and if something looks mid-flight, leave it alone rather than reconciling it yourself.
- Don't run `git reset --hard`, `checkout .`, `restore .`, `clean -f`, or force-push without explicit user instruction.
- If files are visibly changing while you inspect them, work from stable committed history and docs rather than trying to chase or repair the concurrent edit.
- Keep exploratory/staged output outside tracked paths (e.g. `.tmp/`, which is gitignored) rather than inside `packages/` or `apps/`.

## Architectural traps worth remembering

- **Historical identity**: correct coaching depends on immutable game lineage, committed-turn identity, decision-time position/dice, and canonical played move. Never conflate similar-looking positions across different turns/games.
- **Score orientation**: don't assume "higher is better" or a specific `lossFromBest` sign without checking the current evaluator contract in `backgammon-analysis`.
- **Persistence is deliberately fragmented**: `GameSnapshot` (deterministic, versioned), `AnalysisSession` (versioned interpretation, currently in-memory/not persisted), learner profile (local browser storage, own schema version), classification/pattern policy (versioned, computed at request time, not persisted into analysis-session). Don't collapse these into one blob.
- **Browser/Node separation** is enforced both by lint and by `architecture:check` — GNU execution and provider credentials are server/Node-only, always.
- **Fail-closed by design**: unmatched evaluator move output, partial coverage, fixture provenance, malformed stored profile data, and unsupported profile versions all fail closed to a safe/unclassified state rather than guessing. Preserve that posture in new code.
- **AI restraint is the point of the product**: don't add code paths that let generated prose substitute for evidence, even when it would make output "feel" more helpful.

## Current state and likely next work

As of this HEAD, implemented (per README + latest worklogs): full engine/analysis/analysis-session pipeline, real GNU evaluator (server-hosted), OpenAI-compatible provider (server-hosted, fixture/none/real modes), current-position coaching with recommendation authority, Last Move Review, Full Game Review, deterministic move classification, learner ownership + persistent local progress profile, deterministic recurring skill-pattern detection, curated knowledge corpus with evidence-aware/intent-aware retrieval planning, per-turn follow-up intent resolution. Not yet implemented: streaming/tool-calling/multimodal provider features, browser credential entry, provider fallback/comparison routing, semantic/embedding retrieval, conversation persistence.

`docs/roadmap.md` is stale (it still describes an early "milestone 1 only" state) — trust the README status list and recent worklogs over it. A player-first UI and automatic GNU-controlled opponent may be under active development; verify against the latest worklog rather than assuming.

## When to stop and ask

- Before changing a forbidden-dependency edge, package export surface, or persistence schema/version.
- Before running any live provider/GNU smoke command.
- Before any destructive git operation, or commit/push the user hasn't asked for.
- Before writing coaching logic that would let the model infer something the authority hierarchy says must be deterministic.
- When a worklog/ADR appears to conflict with current code — flag it rather than silently trusting either one.

## Corrections to note (found while orienting, not assumed in advance)

- Actual packages are `ai-contracts`, `backgammon-analysis`, `backgammon-analysis-session`, `backgammon-coach`, `backgammon-domain`, `backgammon-engine`, `backgammon-evaluator-gnubg`, `backgammon-knowledge`, `shared` — a `backgammon-domain` and `shared` package exist that generic pre-inspection assumptions might miss.
- There is no `CI=1` test-gating convention anywhere in this repo's scripts; all package `test` scripts are plain `vitest run` (some with `--passWithNoTests`).
- `docs/roadmap.md` is stale relative to README/worklogs and should not be treated as current planning.
