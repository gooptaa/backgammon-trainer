# Backgammon Trainer Repository Guide

## Mission and product model

Backgammon Trainer is a long-lived, open-source, mobile-first PWA for learning backgammon. The product is not merely a board, evaluator wrapper, or chatbot: deterministic play, position analysis, real evaluator evidence, curated teaching material, and conversation are intended to form a training loop. Skill development and honest explanation matter more than winning or producing persuasive prose.

Keep these product principles visible:

- The board is the workspace.
- Conversation is the primary coaching interface.
- The engine owns rules and committed game state.
- Analysis reports facts.
- Evaluators supply attributed, bounded evidence.
- Versioned coach policy turns eligible evidence into recommendations, classifications, and learner-pattern signals.
- Curated knowledge supplies general teaching guidance.
- The language model explains supplied evidence; it does not create authority.

The practical authority order is: canonical domain/engine state and legality, then factual analysis and evaluator evidence with provenance, then deterministic coach policy, then curated knowledge, then model prose. Never let a downstream layer silently override an upstream one.

## Begin every session safely

Before changing anything, run read-only orientation commands:

```bash
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git log --oneline --decorate -n 20
```

Assume uncommitted files belong to the user or another agent. Do not reset, restore, stash, clean, checkout, reformat, or overwrite them. Identify overlap before editing and stop for direction if safe isolation is not possible. If files change during investigation, prefer committed versions (`git show HEAD:path`) and stable documentation; do not reconcile someone else's work.

Read the task-relevant recent worklogs and diff before inferring current behavior. This repository moves in milestone-sized commits, while some overview and roadmap documents lag implementation. At the inspected 2026-08-04 HEAD, the root README's milestone label, its suggested next milestone, and `docs/roadmap.md` were substantially stale.

Treat `.env.local` as sensitive, but inspect it when the user asks to start or diagnose the app, verify configuration completeness/correctness, or when configuration inspection is otherwise necessary to complete the task. Read only what is needed; never print, quote, copy, log, or commit secret values. Prefer reporting variable presence, selected modes, validation results, and redacted diagnostics. Do not modify `.env.local` unless the user requests a configuration change. Do not run live GNU or model-provider smoke tests, paid calls, generators, write-mode formatters, dependency updates, Git publishing, or other external mutations unless the task explicitly requires them.

## Repository map and dependency direction

This is a pnpm workspace (Node 20.11+, pnpm 9.15.4) without Nx or Turborepo.

- `packages/backgammon-domain`: dependency-free canonical board, checker, player, dice, cube-placeholder types and position validation. It does not own move rules.
- `packages/backgammon-engine`: pure rule authority for legal move generation/application, hits, bar entry, bearing off, dice-use rules, passes, turn progression, game completion, staged prefix projection, immutable turn records, and versioned game snapshots.
- `packages/backgammon-analysis`: deterministic position features and legal-move outcomes plus provider-neutral evaluator contracts, result validation, canonical move fingerprints, ranking, and loss calculation. It is factual, not pedagogical.
- `packages/backgammon-analysis-session`: separately versioned, immutable interpretation records linked to committed turns. Sessions can be sparse and are independent of `GameSnapshot` persistence.
- `packages/backgammon-evaluator-gnubg`: Node-only GNU capability detection, translation, canonical matching, parsing, process execution, timeout handling, and test fakes. It never owns legality or recommendations.
- `packages/ai-contracts`: dependency-free provider-neutral chat request/result contracts and deterministic fixtures.
- `packages/backgammon-knowledge`: authored educational Markdown, controlled taxonomy, validation, generated browser-safe corpus, and deterministic local retrieval. No rules or coaching orchestration.
- `packages/backgammon-coach`: context and per-turn intent resolution, evidence selection, recommendation authority, move classification, learner-profile and pattern policy, retrieval planning, prompt construction, and request orchestration. This package is large; note cohesion pressure, but do not split it without evidence and an architectural milestone.
- `packages/shared`: intentionally tiny generic API envelopes.
- `apps/server`: trusted Fastify host for provider-neutral coach and evaluator routes, server-only configuration, OpenAI-compatible calls, and GNU composition.
- `apps/web`: React/Vite/SVG board, gameplay orchestration, browser persistence adapters, analysis capture, coach UI, and development diagnostics. It may depend on domain packages but must not implement rules or import GNU/Node code.

Expected dependency flow is upward: domain -> engine -> analysis -> analysis-session -> coach -> host apps, with coach also consuming knowledge and AI contracts. The GNU package depends on engine/analysis and is composed only by Node hosts. Knowledge and AI contracts remain lower-level and independent. Import only declared public exports; do not deep-import package internals.

Run `pnpm architecture:check` when dependency edges, imports, packages, or runtime boundaries change. The guardrail script and ESLint enforce forbidden edges, cycles, browser `node:*` imports, GNU leakage, and server-private environment access.

## Non-negotiable invariants

- Only engine APIs determine legal moves, apply transitions, validate passes, and complete games. UI staging uses `previewMovePrefix`; only complete canonical moves reach `applyGameMove`.
- A committed decision is identified by immutable lineage, turn number, acting player, decision-time `positionBefore`, exact dice, and canonical move metadata. Do not reconstruct a historical decision from the current board.
- `GameSnapshot` is deterministic resumable state. `AnalysisSession` is versioned evaluator interpretation. Conversation, pending requests, retrieved excerpts, and model output are separate and currently not persisted.
- Evaluator rows join to engine legal moves by canonical fingerprint. Higher normalized score is better for the player on roll; `lossFromBest = bestScore - moveScore`. Verify scale and perspective at every adapter boundary.
- Complete, partial, fixture, missing, unavailable, failed, and invalid evaluation are distinct. Partial coverage can support only “strongest evaluated”; fixture or missing evidence cannot support authoritative strategy. Invalid results fail closed.
- Current-position advice may identify the best supported candidate but cannot classify an uncommitted move. Historical labels require a committed checker play, complete trustworthy non-fixture coverage, supported equity-point semantics, and evaluator coverage of the played move.
- Move classification policy is `deterministic-loss-from-best` version `1.0.0`: tie/best through `0.000001`, reasonable through `0.08`, mistake through `0.2`, and major mistake above `0.2`. These are product-policy thresholds, not universal truth.
- Learner identity is per-lineage product metadata, not checker-color rule state. Only authoritative `white` or `black` ownership permits ingestion; opponent turns, passes, staged moves, `both`, and `unknown` are excluded. Observation ingestion must remain bounded, version-aware, and idempotent.
- Recurring patterns come only from versioned deterministic detectors comparing a committed learner move with a supported stronger alternative. The model may explain signals but may not invent habits, counts, causes, or psychology.
- Knowledge is general teaching guidance and cannot override the position, evaluator, or coach policy. No-match retrieval is valid.
- Submit-time context is immutable. Reset/import/new lineage and asynchronous evaluator/model completion require request identity and lineage checks. Same-lineage later play must not retarget an existing request; prior-lineage responses are stale.
- Provider credentials, executable choices, process flags, and protocol mapping stay on the server. Browser-supplied URLs must not choose arbitrary upstream destinations.

## Coaching and persistence behavior

The coach resolves context from explicit state and current wording. Supported scopes include current position, selected move outcome, selected/history turn, explicit game review, and explicit progress profile. Explicit selections outrank inferred targets. “Last move” falls back to the latest committed checker-play turn; game review snapshots the submitted committed-turn boundary. Follow-up subject resolution may use conversation context, but the requested operation is re-evaluated from each current message so a strategy question does not inherit a prior grading mode.

Evidence bundles are deterministic, JSON-safe, bounded, and transparent about omissions. Legal-move selection coverage is separate from evaluator coverage. Prompts currently bound recent messages, message lengths, selected move rows, warnings, and retrieved text. If changing any bound, keep the server schema and coach prompt output compatible and add boundary tests.

Browser persistence currently covers versioned game snapshots, separate lineage metadata, and a versioned local learner profile. Analysis sessions remain in-memory and sparse; conversations are in-memory and reset across reload/new lineage. Storage corruption must fail safely without blocking gameplay. Do not collapse these independently versioned concepts into one blob.

## Knowledge corpus workflow

Canonical content is flat Markdown in `packages/backgammon-knowledge/content/*.md`. `src/generated/corpus.ts` is checked-in delivery output and says “Do not edit manually.” Schema/taxonomy authority lives in `src/model.ts` and `scripts/knowledge-source.mjs`; stable IDs use `kg.` and provenance is project-authored. Cube content is intentionally unsupported in the runtime corpus despite discussion in the research report.

When a task authorizes knowledge changes:

1. Edit canonical Markdown and, only deliberately, controlled taxonomy/schema.
2. Run `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:generate`.
3. Run `pnpm --filter @backgammon-trainer/backgammon-knowledge knowledge:check` and package tests.
4. Add coach/web tests when retrieval or prompt integration changes.

Never add copied prose, fabricated citations, unreviewed filler, or a runtime `content/README.md`.

## Documentation and investigation order

Start with `README.md` and `docs/README.md`, but verify them. Then read:

- `docs/architecture/overview.md`, dependency guardrails, and public API audit;
- all accepted ADRs in `docs/adr/` plus foundational ADRs in `docs/architecture/adr/`;
- relevant `docs/analysis/`, `docs/coach/`, `docs/knowledge/`, engine API, and legal-move contract documents;
- the README for every affected package/app;
- newest `docs/worklog/` entries in reverse chronology and the relevant older milestone;
- package manifests, public `src/index.ts` exports, tests, and actual implementation.

Worklogs are append-only historical records: useful for decisions and limitations, but later code/ADRs win when behavior evolved. Update durable docs and add a concise worklog with each completed milestone. Correct stale overview text when it is in task scope rather than copying it into new documentation.

## Testing and validation

Ordinary tests must be deterministic, credential-free, network-free, and GNU-installation-free. Use fixtures and injected clocks, IDs, random sources, process runners, storage, and model/evaluator adapters.

Inspect root and package scripts before running them. During work, run the narrowest affected baseline and focused tests. Examples:

```bash
CI=1 pnpm --filter @backgammon-trainer/backgammon-engine test
CI=1 pnpm --filter @backgammon-trainer/backgammon-coach test
CI=1 pnpm --filter @backgammon-trainer/server test
CI=1 pnpm --filter @backgammon-trainer/web test
CI=1 pnpm --filter @backgammon-trainer/web build
```

At milestone completion, normally run the full gate once:

```bash
pnpm config:check
CI=1 pnpm check
CI=1 pnpm test
git diff --check
```

`pnpm check` itself runs format-check, architecture validation, knowledge drift validation, lint, typecheck, tests, and build. Do not run `pnpm format` casually because it writes repository-wide. E2E is a separate web script and should be included when the affected user flow warrants it. Live provider/GNU smokes require explicit opt-in and are not normal validation.

## Milestone and Git discipline

Prefer a focused product outcome over broad refactoring. Study architecture first, establish a focused baseline, implement through the owning layer, add boundary and regression tests, validate proportionally, update docs/worklog, review the exact diff, then commit narrowly. Commit and push only when the user explicitly requests them. Never combine unrelated dirty files into a commit.

Before closure, inspect `git diff --stat`, the full relevant diff, `git diff --check`, staged files, branch/HEAD, and final status. Report validation honestly, including skipped live checks and environment limitations. Do not claim success solely because tests pass; coaching usefulness, latency, cost, mobile behavior, and failure experience require explicit acceptance testing.

## Current state, risks, and likely next work

At inspected HEAD `7ce1f462bd266aabb3bbbb5eb6a809d563a4ba79` on `main`, committed functionality includes deterministic play/history/snapshots, factual and GNU-backed evaluation through server routes, current/last-move/full-game coaching, deterministic classification, local learner progress, deterministic pattern detection, curated retrieval, follow-up intent resolution, and bounded OpenAI-compatible completion. The latest commit raises the server's bounded developer-instruction count to match current coach prompts.

The committed UI still calls itself a development sandbox. No automatic GNU-controlled opponent or completed player-first shell was found at that HEAD. Treat such work as proposed or in progress until current history/code proves otherwise. Other clear limitations include no conversation or analysis-session persistence, lexical rather than semantic retrieval, non-streaming single-provider-compatible text generation, no built-in public-route authentication/spend controls, origin-derived analysis game references that can collide, and no cube/match coaching.

High-risk areas are bearing-off/dice-use legality, canonical move equivalence, score perspective, partial coverage wording, lineage/turn identity, persistence migrations, stale async results, and coach package cohesion. Add exact regressions around these boundaries rather than duplicating rules in a host.

Stop and ask for clarification when a request would change the authority hierarchy, introduce a new persistence/public API schema, expose provider routes publicly, add telemetry/accounts/cloud sync, broaden supported backgammon scope (especially cube/match play), rewrite unrelated active work, or require destructive Git operations. Otherwise make conservative, repository-backed assumptions and keep the change within the owning layer.
