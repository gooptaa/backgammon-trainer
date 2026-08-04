# Web Sandbox

## Purpose

The web app is a development sandbox for deterministic backgammon gameplay, factual legal-move inspection, fixture-backed analysis-capture orchestration, and text-first coaching conversation flow.

## Coach panel behavior

- Coach chat is text-only and in-memory.
- A single conversation is scoped to one active game lineage.
- New game and imported lineage replacement start a fresh empty conversation.
- Browser reload restores deterministic game snapshot but starts an empty conversation.
- One pending coach request is allowed at a time; gameplay stays enabled while pending.
- If a current-position evaluator is configured and analysis is still running, coach send is temporarily disabled and the panel shows `Position analysis pending...`.
- Full-game review is initiated by conversation requests (for example, "review this game" or "review game so far") and remains bound to committed turns present at submission time.
- Historical review and full-game review now surface deterministic move classifications from coach evidence (`best`, `reasonable`, `mistake`, `major mistake`, `unclassified`) with policy/provenance limits.
- Learner ownership is selected per game lineage (`white`, `black`, `both`, `unknown`) and remains separate from checker color semantics.
- A local learner progress profile stores eligible committed learner decisions only; opponent turns and ambiguous ownership are excluded.
- Progress-profile questions (for example, "How am I doing?" or "Show my recent progress") resolve to deterministic profile evidence.
- Current coach requests use selected legal move evidence rather than a broad move dump when current-turn legal outcomes exist.
- Current coach requests may include a small project-authored curated knowledge subset chosen deterministically from the question and trusted evidence.
- Current-position recommendations do not assign mistake labels because no move is committed yet.
- Fixture warning is explicit: `Development fixture coach - responses are not strategic advice.`
- No microphone, voice capture, speech synthesis, or audio-agent behavior is implemented.
- Coach failures are concise and non-fatal; gameplay and deterministic analysis remain available.

## Coach runtime modes

- `VITE_COACH_MODEL_MODE=fixture`: browser fixture model for deterministic local development.
- `VITE_COACH_MODEL_MODE=server`: provider-neutral server client (`/api/coach/status`, `/api/coach/complete`).
- `VITE_COACH_MODEL_MODE=none`: no coach model configured in browser runtime.

Invalid `VITE_COACH_MODEL_MODE` values fail closed to disabled mode with explicit status text.

When server mode is active and configured, the Coach panel discloses provider identity/model and notes that bounded context/evidence/knowledge is sent to the configured provider.

When server evaluator mode is configured, web evaluation uses:

- `GET /api/evaluator/status`
- `POST /api/evaluator/evaluate-position`

This preserves browser/Node separation while allowing current-position ranked evidence to flow into coaching evidence.

When server reports `gnubg` evaluator mode, the web still uses only provider-neutral routes and does not import or execute GNU code in the browser.

## Local configuration boundary

Browser configuration is loaded from repository root env files through Vite and is intentionally limited to `VITE_*` variables.

- safe/public browser variables: `VITE_*`
- server-private variables: everything else

Do not place API keys or server-only settings in `VITE_*` variables.

For local setup, copy `.env.example` to repository root `.env.local`.

## Current analysis capture behavior

This milestone adds development-only in-memory `AnalysisSession` capture.

Lifecycle:

1. identify the live decision with a deterministic decision key
2. run fixture-ranked move analysis for that decision
3. store completed analysis as pending decision state
4. wait for canonical committed `TurnRecord`
5. build and append record through `@backgammon-trainer/backgammon-analysis-session`
6. render factual inspection in the `Analysis Session` panel

## Policy and constraints

- Committed turn history is authoritative.
- Capture is sparse by design: turns without completed analysis are omitted.
- If commit occurs before analysis completion, the move still commits and no late record is appended.
- Evaluator failures do not block gameplay and do not create placeholder records.
- Fixture warning is explicit: `Development fixture scores - not strategic evaluation.`
- No strategic labels or coaching verdicts are shown.

## Session lifecycle

- One in-memory session per active game lineage.
- New game and imported different game snapshot create fresh empty sessions.
- Browser startup restore creates a fresh empty in-memory session for restored lineage.
- Historical restored turns are not automatically analyzed.

## Persistence boundary

Not implemented in this milestone:

- analysis-session local storage
- analysis-session import/export
- backend analysis-session persistence

`GameSnapshot` persistence remains independent and unchanged.

Learner-profile persistence behavior:

- profile data is local-only browser storage in this milestone
- schema is versioned and validated on read
- malformed profile payloads fail safe to fresh profile state
- unsupported future profile versions are not rewritten
- profile clear is explicit through UI control (`Clear Learner Profile`)

## Evaluator/runtime boundary

- Browser uses no evaluator or explicit fixture evaluator only.
- Browser does not import `@backgammon-trainer/backgammon-evaluator-gnubg`.
- No Node polyfills are added.
